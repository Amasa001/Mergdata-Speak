import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Languages, Clock, AlertCircle, Loader2, FileCheck, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Define interfaces for the data structure
interface Task {
  type: string;
  language: string;
}

interface Contribution {
  id: number;
  status: string;
  tasks: Task;
}

interface ASRStats {
  recordingsCompleted: number;
  languagesCovered: number;
  pendingValidation: number;
}

interface AvailableTask {
  id: number;
  title: string;
  description: string;
  language: string;
}

export const ASRDashboard: React.FC = () => {
  const [stats, setStats] = useState<ASRStats | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Fetch User ID
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingStats(true);
      setIsLoadingTasks(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error fetching user:", userError);
        const errorMsg = "Could not fetch user information.";
        setStatsError(errorMsg);
        setTasksError(errorMsg);
        setIsLoadingStats(false);
        setIsLoadingTasks(false);
        return;
      }
      if (user) {
        setUserId(user.id);
        // Loading continues in dependent effects
      } else {
        const errorMsg = "User not found.";
        setStatsError(errorMsg);
        setTasksError(errorMsg);
        setIsLoadingStats(false);
        setIsLoadingTasks(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch ASR Stats based on User ID
  useEffect(() => {
    if (!userId) {
      return;
    }

    const fetchStats = async () => {
      setIsLoadingStats(true);
      setStatsError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('contributions')
          .select(`
            id, 
            status,
            tasks!inner (type, language)
          `)
          .eq('user_id', userId)
          .eq('tasks.type', 'asr') as { data: Contribution[] | null, error: Error | null };

        if (fetchError) {
          console.error("Error fetching ASR contributions:", fetchError);
          throw new Error("Failed to fetch your ASR contribution data.");
        }
        
        if (data) {
          const recordingsCompleted = data.length;
          const languages = new Set(data.map(c => c.tasks.language || "Unknown"));
          const languagesCovered = languages.size;
          const pendingValidation = data.filter(c => 
            c.status === 'pending_validation' || c.status === 'pending_transcript_validation'
          ).length;
          
          setStats({
            recordingsCompleted,
            languagesCovered,
            pendingValidation
          });
        } else {
          setStats({
            recordingsCompleted: 0,
            languagesCovered: 0,
            pendingValidation: 0
          });
        }
      } catch (err) {
        console.error(err);
        const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred fetching stats.";
        setStatsError(errorMsg);
        toast.error("Error loading your ASR statistics.");
        setStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [userId]);
  
  // Fetch Available ASR Tasks based on User ID
  useEffect(() => {
    if (!userId) {
        return;
    }

    const fetchAvailableTasks = async () => {
      setIsLoadingTasks(true);
      setTasksError(null);
      try {
        const { data: contributionData, error: contributionError } = await supabase
          .from('contributions')
          .select('task_id')
          .eq('user_id', userId)
          .not('task_id', 'is', null);

        if (contributionError) {
            console.error("Error fetching user contributions:", contributionError);
            throw new Error("Could not check your previous contributions.");
        }

        const contributedTaskIds = contributionData?.map(c => c.task_id) || [];
        
        let query = supabase
          .from('tasks')
          .select('id, content, language')
          .eq('type', 'asr')
          .eq('status', 'pending');

        if (contributedTaskIds.length > 0) {
          query = query.not('id', 'in', `(${contributedTaskIds.join(',')})`);
        }

        const { data: taskData, error: taskError } = await query;

        if (taskError) {
            console.error("Error fetching available tasks:", taskError);
            throw new Error("Could not fetch available ASR tasks.");
        }

        const mappedTasks = taskData?.map(task => ({
          id: task.id,
          title: (task.content as any)?.task_title || `ASR Task ${task.id}`,
          description: (task.content as any)?.task_description || 'Describe the associated image.',
          language: task.language || 'Unknown',
        })) || [];

        setAvailableTasks(mappedTasks);

      } catch (err) {
        console.error("Error fetching available ASR tasks:", err);
        const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred fetching tasks.";
        setTasksError(errorMsg);
        toast.error("Error loading available ASR tasks.");
        setAvailableTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchAvailableTasks();
  }, [userId]);

  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
              <CardTitle>Your ASR Contribution Stats</CardTitle>
              <CardDescription>Summary of your automatic speech recognition contributions.</CardDescription>
          </CardHeader>
          <CardContent>
              {isLoadingStats ? (
                  <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading stats...
                  </div>
              ) : statsError ? (
                  <div className="flex items-center justify-center py-8 text-red-600">
                     <AlertCircle className="h-6 w-6 mr-2" /> {statsError}
                  </div>
              ) : stats ? (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-none shadow-sm bg-blue-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-blue-800">Recordings Made</CardTitle>
                          <Mic className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{stats.recordingsCompleted}</div>
                        <p className="text-xs text-blue-700">Total ASR samples</p>
          </CardContent>
        </Card>
        
                    <Card className="border-none shadow-sm bg-green-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-green-800">Languages</CardTitle>
                          <Languages className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
                        <div className="text-2xl font-bold text-green-900">{stats.languagesCovered}</div>
                        <p className="text-xs text-green-700">Distinct languages covered</p>
          </CardContent>
        </Card>
        
                    <Card className="border-none shadow-sm bg-yellow-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-yellow-800">Pending Validation</CardTitle>
                          <FileCheck className="h-5 w-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
                        <div className="text-2xl font-bold text-yellow-900">{stats.pendingValidation}</div>
                        <p className="text-xs text-yellow-700">Recordings awaiting review</p>
                      </CardContent>
                    </Card>
                  </div>
              ) : (
                 <div className="text-center py-8 text-gray-500">No statistics available.</div>
              )}
          </CardContent>
        </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Available ASR Tasks</CardTitle>
          <CardDescription>
            Contribute by recording descriptions for these tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTasks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading tasks...
            </div>
          ) : tasksError ? (
            <div className="flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="h-6 w-6 mr-2" /> {tasksError}
            </div>
          ) : availableTasks.length > 0 ? (
          <div className="space-y-4">
              {availableTasks.map(task => (
              <div key={task.id} className="p-4 border rounded-md hover:border-afri-orange/50 transition-colors">
                <div className="flex items-start justify-between">
                    <div className="flex-grow space-y-1 mr-4">
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-500">{task.description}</p>
                      <div className="flex items-center space-x-2 pt-1">
                        <Badge variant="outline">{task.language}</Badge>
                      </div>
                    </div>
                    <Link to={`/asr`}> 
                    <Button variant="outline" size="sm">
                      Start Recording
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ListChecks className="h-10 w-10 mx-auto mb-3 text-gray-400" />
              No new ASR tasks available for you right now.
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>ASR Recording Guide</CardTitle>
          <CardDescription>Tips for effective image descriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm">• Start with the central subject, then describe details</p>
            <p className="text-sm">• Use clear, natural speech at a moderate pace</p>
            <p className="text-sm">• Include important visual details like colors, actions, and environment</p>
            <p className="text-sm">• Maintain consistent recording volume</p>
            <p className="text-sm">• Use culturally appropriate terminology for local contexts</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
