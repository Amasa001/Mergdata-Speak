import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, BarChart2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// Type for tasks fetched from Supabase
type Task = Database['public']['Tables']['tasks']['Row'];
type Contribution = Database['public']['Tables']['contributions']['Row'];

interface DashboardTask extends Task {
  contribution_id?: number;
  // Assuming content has task_title and task_description
  task_title?: string; 
  task_description?: string;
  estimated_duration_mins?: number; // Add an estimated duration if available
}

export const TranscriberDashboard: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({ completed: 0, pendingCount: 0, accuracyRate: 0 });
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch User ID
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    fetchUser();
  }, []);

  // Fetch dashboard data (stats and tasks)
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return; // Don't fetch data if user ID is not available
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // --- Fetch Stats ---
        // 1. Count completed, pending validation, and rejected transcriptions
        const { count: transcriptionCount, error: completedError } = await supabase
          .from('contributions')
          .select('id, tasks!inner(type)', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('status', ['finalized', 'pending_transcript_validation', 'rejected', 'rejected_transcript'])
          .in('tasks.type', ['transcription', 'asr']);
          
        if (completedError) {
          console.error("Error fetching transcription count:", completedError);
          console.log("Query parameters:", { userId, statuses: ['finalized', 'pending_transcript_validation', 'rejected', 'rejected_transcript'], types: ['transcription', 'asr'] });
        } else {
          console.log("Transcription count query result:", transcriptionCount);
        }

        // 2. Pending tasks available for transcription (including rejected ones for this user)
        const { count: pendingCount, error: pendingError } = await supabase
          .from('contributions')
          .select('id', { count: 'exact', head: true })
          .or(`status.eq.ready_for_transcription,and(status.eq.rejected,user_id.eq.${userId}),and(status.eq.rejected_transcript,user_id.eq.${userId})`);
          
        if (pendingError) {
           console.error("Error fetching pending count:", pendingError);
        }

        // --- Fetch Tasks --- 
        // Fetch contributions ready for transcription or rejected for this user
        const { data: taskData, error: tasksError } = await supabase
          .from('contributions')
          .select(`
            id, 
            task_id,
            status,
            submitted_data,
            tasks!inner (id, type, language, content)
          `)
          .or(`status.eq.ready_for_transcription,and(status.eq.rejected,user_id.eq.${userId}),and(status.eq.rejected_transcript,user_id.eq.${userId})`)
          .limit(5); // Limit to 5 for the dashboard view

        if (tasksError) {
            console.error("Error fetching task data:", tasksError);
        }

        // Safely map tasks, ensuring task and content exist
        const mappedTasks: DashboardTask[] = taskData?.filter(c => c.tasks).map(c => {
          const task = c.tasks as Task;
          const content = task?.content as any;
          const isRejected = c.status === 'rejected' || c.status === 'rejected_transcript';
          
          // Get rejection reason from submitted_data if available
          const submittedData = c.submitted_data as any;
          const rejectionReason = (isRejected && submittedData?.rejection_reason) ? 
            submittedData.rejection_reason : 
            'This transcription was rejected and needs revision.';
            
          return {
            ...task,
            contribution_id: c.id,
            task_title: isRejected ? 
              `Rejected Contribution #${c.id} - Needs Revision` : 
              content?.task_title || `Contribution #${c.id}`,
            task_description: isRejected ? 
              `Reason for rejection: ${rejectionReason}` :
              content?.task_description || 'Transcribe the linked audio.',
          };
        }) || [];

        setStats({ 
          completed: transcriptionCount ?? 0,
          pendingCount: pendingCount ?? 0,
          accuracyRate: 0 // Placeholder
        });
        setTasks(mappedTasks);

      } catch (error: any) {
        // Catch errors potentially thrown above or during processing
        console.error("Error fetching transcriber dashboard data:", error);
        toast({
          title: "Error Loading Dashboard",
          description: "Could not load all dashboard data. " + (error.message || ''),
          variant: "destructive",
        });
        // Set defaults or empty states on error
        setStats({ completed: 0, pendingCount: 0, accuracyRate: 0 });
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, toast]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */} 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completed Card */} 
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Transcribed</CardTitle>
              <FileText className="h-5 w-5 text-afri-green" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.completed}</div>}
            <p className="text-xs text-gray-500">Tasks completed</p>
          </CardContent>
        </Card>
        
        {/* Accuracy Card (Placeholder) */} 
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Accuracy</CardTitle>
              <CheckCircle className="h-5 w-5 text-afri-orange" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">N/A</div>} 
            <p className="text-xs text-gray-500">Validation rate (coming soon)</p>
          </CardContent>
        </Card>
        
        {/* Placeholder Card - Can add avg time or other stats later */} 
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Avg. Time</CardTitle>
              <Clock className="h-5 w-5 text-afri-blue" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">N/A</div>}
            <p className="text-xs text-gray-500">Per task (coming soon)</p>
          </CardContent>
        </Card>
        
        {/* Pending Tasks Card */} 
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Available Tasks</CardTitle>
              <BarChart2 className="h-5 w-5 text-afri-brown" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.pendingCount}</div>}
            <p className="text-xs text-gray-500">Ready for transcription</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Transcription Tasks List */} 
      <Card>
        <CardHeader>
          <CardTitle>Available Transcription Tasks</CardTitle>
          <CardDescription>
            Select a task to start transcribing the audio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-afri-orange" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transcription tasks currently available.</p>
          ) : (
          <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.contribution_id} className="p-4 border rounded-md hover:border-afri-green/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <FileText className="h-5 w-5 text-afri-green" />
                    </div>
                    <div>
                        <h4 className="font-medium">{task.task_title || `Contribution #${task.contribution_id}`}</h4>
                        <p className="text-sm text-gray-500">{task.task_description || 'Transcribe this audio.'}</p>
                      <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="secondary">{task.language}</Badge>
                          {/* Add duration display if available */}
                          {/* {task.estimated_duration_mins && <Badge variant="outline">~{task.estimated_duration_mins} min</Badge>} */} 
                        </div>
                      </div>
                    </div>
                    <Link to={`/transcription?contribution_id=${task.contribution_id}`}>
                    <Button variant="outline" size="sm">
                        Start Transcribing
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
      
      {/* Placeholder for Transcription tools/guide */}
      {/* You can add the guide section back here if needed */}
    </div>
  );
};
