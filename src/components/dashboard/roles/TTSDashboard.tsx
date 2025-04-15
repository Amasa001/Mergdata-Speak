import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headphones, FileText, Clock, BarChart, Loader2, CheckCircle, AlertCircle, Mic, ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// Type for storing fetched stats
interface TTSStats {
  recordingsCompleted: number;
  hoursRecorded: number;
  languagesContributed: number;
  completionRate: number;
}

// Type for recent activity item
interface RecentActivity {
  id: number;
  task_id: number;
  task_title: string;
  language: string;
  status: Database["public"]["Enums"]["contribution_status"];
  created_at: string;
}

// Type for available TTS tasks
interface TTSTask {
  id: number;
  title: string;
  description: string;
  duration: string;
  language: string;
  difficulty: string;
  needs_correction: boolean;
}

export const TTSDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isStandalonePage = location.pathname === '/tts-dashboard';
  
  const [stats, setStats] = useState<TTSStats>({
    recordingsCompleted: 0,
    hoursRecorded: 0,
    languagesContributed: 0,
    completionRate: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [ttsTasks, setTTSTasks] = useState<TTSTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLanguages, setUserLanguages] = useState<string[]>([]);
  const [submittedTaskIds, setSubmittedTaskIds] = useState<Set<number>>(new Set());

  // Fetch user ID and Profile (including languages)
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('languages')
          .eq('id', user.id)
          .single();
        if (!profileError && profileData?.languages) {
          setUserLanguages(profileData.languages);
        }
      }
    };
    fetchUserAndProfile();
  }, []);

  // Fetch data when userId is available
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch stats
        const { data: contributionData, error: statsError } = await supabase
          .from('contributions')
          .select('id, status, storage_url, tasks!inner(language, type)')
          .eq('user_id', userId)
          .eq('tasks.type', 'tts');

        if (statsError) throw statsError;

        const languages = new Set<string>();
        let validatedCount = 0;
        let pendingValidationCount = 0;
        let rejectedCount = 0;
        let totalCount = contributionData?.length || 0;

        // Estimate hours based on recordings (assuming avg 30 seconds per recording)
        const estimatedHours = (totalCount * 0.5) / 60; 

        contributionData?.forEach(c => {
          if (c.status === 'validated' || c.status === 'finalized') {
            validatedCount++;
          } else if (c.status === 'pending_validation') {
            pendingValidationCount++;
          } else if (c.status === 'rejected') {
            rejectedCount++;
          }
          
          if (c.tasks?.language) {
            languages.add(c.tasks.language);
          }
        });

        setStats({
          recordingsCompleted: totalCount,
          hoursRecorded: parseFloat(estimatedHours.toFixed(1)),
          languagesContributed: languages.size,
          completionRate: totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 0
        });
        
        console.log(`User stats: ${validatedCount} validated, ${pendingValidationCount} pending validation, ${rejectedCount} rejected`);

        // Fetch recent activity (last 5 contributions)
        const { data: activityData, error: activityError } = await supabase
          .from('contributions')
          .select('id, task_id, status, created_at, tasks!inner(content, language)')
          .eq('user_id', userId)
          .eq('tasks.type', 'tts')
          .order('created_at', { ascending: false })
          .limit(5);

        if (activityError) throw activityError;

        const mappedActivity: RecentActivity[] = activityData?.map(a => ({
          id: a.id,
          task_id: a.task_id,
          task_title: (a.tasks?.content as any)?.task_title || `Task ${a.task_id}`,
          language: a.tasks?.language || 'Unknown',
          status: a.status as Database["public"]["Enums"]["contribution_status"],
          created_at: a.created_at,
        })) || [];
        
        setRecentActivity(mappedActivity);

        // Fetch available TTS tasks
        // 1. Fetch PENDING tasks matching user's languages
        let pendingTasksQuery = supabase
          .from('tasks')
          .select('id, language, content, status, priority')
          .eq('type', 'tts')
          .eq('status', 'pending');
          
        if (userLanguages.length > 0) {
          // Use ilike for case-insensitive matching with any language in the array
          const conditions = userLanguages.map(lang => `language.ilike.${lang}`).join(',');
          pendingTasksQuery = pendingTasksQuery.or(conditions);
        }
        
        const { data: pendingTasksData, error: pendingTasksError } = await pendingTasksQuery;
        if (pendingTasksError) throw pendingTasksError;

        // 3. Fetch tasks that are already submitted by the user and awaiting validation
        // We need these to exclude them from the available tasks list
        const { data: pendingValidationContributions, error: pendingValidationError } = await supabase
          .from('contributions')
          .select('task_id')
          .eq('user_id', userId)
          .eq('status', 'pending_validation');
          
        if (pendingValidationError) throw pendingValidationError;
        
        // Get the task IDs from these contributions
        const submittedTaskIds = new Set(
          pendingValidationContributions?.map(contribution => contribution.task_id) || []
        );
        
        // Additionally, verify that these are TTS tasks by fetching their types
        if (submittedTaskIds.size > 0) {
          const taskIds = Array.from(submittedTaskIds);
          const { data: taskTypes, error: taskTypesError } = await supabase
            .from('tasks')
            .select('id, type')
            .in('id', taskIds);
            
          if (!taskTypesError && taskTypes) {
            // Reset the set to only include confirmed TTS task IDs
            const confirmedTTSTaskIds = new Set(
              taskTypes
                .filter(task => task.type === 'tts')
                .map(task => task.id)
            );
            
            setSubmittedTaskIds(confirmedTTSTaskIds);
            console.log(`Found ${confirmedTTSTaskIds.size} TTS tasks awaiting validation`);
          }
        } else {
          setSubmittedTaskIds(new Set());
        }
        
        // 2. Fetch REJECTED contributions for the current user
        // But exclude any tasks that already have pending validation submissions
        console.log("Fetching rejected TTS tasks for user", userId);
        
        // First, get all the user's rejected TTS contributions
        const { data: allRejectedContributions, error: rejectedFetchError } = await supabase
          .from('contributions')
          .select('id, task_id, tasks!inner(id, type, language, content)')
          .eq('user_id', userId)
          .eq('status', 'rejected')
          .eq('tasks.type', 'tts');
          
        if (rejectedFetchError) throw rejectedFetchError;
        
        // Filter out any tasks that also have pending validation submissions
        const rejectedContributionsData = allRejectedContributions?.filter(contrib => {
          // If this task ID is in the submittedTaskIds, it means we've already resubmitted
          // and it's now awaiting validation, so we should exclude it
          const taskAlreadyResubmitted = submittedTaskIds.has(contrib.task_id);
          
          if (taskAlreadyResubmitted) {
            console.log(`Filtering out rejected task ${contrib.task_id} as it has been resubmitted`);
          }
          
          return !taskAlreadyResubmitted;
        });
        
        console.log(`Found ${pendingTasksData?.length || 0} pending tasks and ${rejectedContributionsData?.length || 0} rejected tasks that need correction`);
        console.log(`Filtering out ${submittedTaskIds.size} tasks already submitted by the user`);

        // Process tasks
        const availableTasks: TTSTask[] = [];
        
        // Add pending tasks (excluding those already submitted by user)
        pendingTasksData?.forEach(task => {
          // Skip tasks already submitted by this user
          if (submittedTaskIds.has(task.id)) return;
          
          if (!task.content) return;
          
          const content = task.content as any;
          const taskTitle = content.task_title || 'Untitled TTS Task';
          const taskDescription = content.task_description || 'Record this text with clear pronunciation';
          const textPrompt = content.text_prompt || '';
          
          // Estimate duration - roughly 1 minute per 150 characters of text
          const textLength = textPrompt?.length || 0;
          const estimatedMinutes = Math.max(1, Math.ceil(textLength / 150));
          const duration = `${estimatedMinutes}-${estimatedMinutes + 1} min`;
          
          // Determine difficulty based on priority or text length
          let difficulty = 'medium';
          if (task.priority === 'high' || textLength > 500) {
            difficulty = 'hard';
          } else if (task.priority === 'low' || textLength < 200) {
            difficulty = 'easy';
          }
          
          availableTasks.push({
            id: task.id,
            title: taskTitle,
            description: taskDescription,
            duration,
            language: task.language || 'Unknown',
            difficulty,
            needs_correction: false
          });
        });
        
        // Add rejected tasks that need correction
        rejectedContributionsData?.forEach(contrib => {
          const task = contrib.tasks;
          if (!task || !task.content) return;
          
          const content = task.content as any;
          const taskTitle = content.task_title || 'Correction Needed';
          const taskDescription = content.task_description || 'This recording needs to be corrected and resubmitted';
          const textPrompt = content.text_prompt || 
                            content.text_to_speak || 
                            content.textPrompt || 
                            '';
          
          // Estimate duration - roughly 1 minute per 150 characters of text
          const textLength = textPrompt?.length || 0;
          const estimatedMinutes = Math.max(1, Math.ceil(textLength / 150));
          const duration = `${estimatedMinutes}-${estimatedMinutes + 1} min`;
          
          availableTasks.push({
            id: task.id,
            title: `Correction: ${taskTitle}`,
            description: taskDescription,
            duration,
            language: task.language || 'Unknown',
            difficulty: 'medium',
            needs_correction: true
          });
        });
        
        setTTSTasks(availableTasks);
      } catch (error: any) {
        console.error('Error fetching TTS dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, userLanguages]);

  // Format relative time
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`;
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`;
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`;
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`;
    
    return `${Math.floor(seconds)} second${seconds === 1 ? '' : 's'} ago`;
  };

  // Format status for display
  const formatStatus = (status: Database["public"]["Enums"]["contribution_status"]) => {
    switch (status) {
      case 'validated':
        return { label: 'Validated', icon: <CheckCircle className="h-4 w-4 text-green-500" /> };
      case 'rejected':
        return { label: 'Needs Correction', icon: <AlertCircle className="h-4 w-4 text-orange-500" /> };
      case 'pending_validation':
        return { label: 'Pending Review', icon: <Clock className="h-4 w-4 text-blue-500" /> };
      default:
        return { label: status, icon: null };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-afri-orange" />
        <span className="ml-2 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isStandalonePage && (
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-xl font-bold">TTS Recording Tasks</h1>
        </div>
      )}
      
      {/* TTS-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Recordings</CardTitle>
              <FileText className="h-5 w-5 text-afri-orange" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recordingsCompleted}</div>
            <p className="text-xs text-gray-500">Text passages recorded</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Hours</CardTitle>
              <Clock className="h-5 w-5 text-afri-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hoursRecorded}</div>
            <p className="text-xs text-gray-500">Total voice recording time</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Languages</CardTitle>
              <Headphones className="h-5 w-5 text-afri-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.languagesContributed}</div>
            <p className="text-xs text-gray-500">Languages contributed to</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Completion</CardTitle>
              <BarChart className="h-5 w-5 text-afri-brown" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-gray-500">Task completion rate</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest voice recording submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start justify-between border-b pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Mic className="h-4 w-4 text-afri-orange" />
                      <h4 className="font-medium">{activity.task_title}</h4>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {activity.language}
                      </span>
                    </div>
                    <div className="flex items-center mt-1 text-sm text-gray-500">
                      <span>Submitted {timeAgo(activity.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {formatStatus(activity.status).icon}
                    <span className="text-sm">{formatStatus(activity.status).label}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Pending validation summary */}
      {submittedTaskIds.size > 0 && (
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center text-blue-700">
                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                Recordings Awaiting Validation
              </CardTitle>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {submittedTaskIds.size} pending
              </span>
            </div>
            <CardDescription className="text-blue-700">
              Your recordings are being reviewed by validators
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm text-blue-900">
              Once validated, these recordings will not appear in your available tasks. 
              You'll be notified if any issues are found with your recordings.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* TTS-specific tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Text Recording Tasks</CardTitle>
          <CardDescription>
            {ttsTasks.length > 0
              ? `${ttsTasks.length} task${ttsTasks.length === 1 ? '' : 's'} available for recording${
                  ttsTasks.some(task => task.needs_correction) 
                    ? ' (including tasks needing correction)' 
                    : ''
                }`
              : 'Record text passages with clear pronunciation and natural intonation'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ttsTasks.length === 0 ? (
              <div className="text-center p-6 border rounded-md bg-gray-50">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">No Available Tasks</h3>
                
                <p className="text-gray-500 mb-2">
                  {submittedTaskIds.size > 0 
                    ? `You have ${submittedTaskIds.size} task${submittedTaskIds.size === 1 ? '' : 's'} awaiting validation.`
                    : "No recording tasks available for your languages right now."}
                </p>
                
                <div className="flex flex-col space-y-1 max-w-md mx-auto mt-4 text-sm">
                  <Link to="/profile" className="text-afri-blue hover:underline">
                    Update your language preferences
                  </Link>
                  <Button 
                    variant="outline" 
                    className="mt-2" 
                    size="sm"
                    onClick={() => navigate('/dashboard')}>
                    Return to main dashboard
                  </Button>
                </div>
              </div>
            ) : (
              ttsTasks.map(task => (
                <div key={task.id} className={`p-4 border rounded-md hover:border-afri-orange/50 transition-colors ${task.needs_correction ? 'bg-orange-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${task.needs_correction ? 'bg-orange-100' : 'bg-gray-100'}`}>
                        <FileText className={`h-5 w-5 ${task.needs_correction ? 'text-orange-500' : 'text-afri-blue'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-500">{task.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                          {task.language}
                        </span>
                          <span className="text-xs text-gray-500">{task.duration}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            task.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            task.difficulty === 'medium' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {task.difficulty}
                          </span>
                          {task.needs_correction && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                              Needs Correction
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link to={`/tts?task=${task.id}`}>
                    <Button variant="outline" size="sm">
                        {task.needs_correction ? 'Re-Record' : 'Start Recording'}
                    </Button>
                  </Link>
                </div>
              </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
