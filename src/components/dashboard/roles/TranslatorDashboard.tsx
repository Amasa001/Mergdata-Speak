import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Languages, Book, BarChart, Clock, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Type for storing fetched stats
interface TranslatorStats {
  translationsCompleted: number;
  languagesWorkedOn: number;
  pendingValidation: number;
  needsCorrection: number;
}

// Type for recent activity item
interface RecentActivity {
  id: number;
  task_id: number;
  task_title: string;
  source_language: string;
  target_language: string;
  status: Database["public"]["Enums"]["contribution_status"];
  created_at: string;
}

// Type for available translation tasks
interface AvailableTaskGroupUpdated {
  language: string; // Target language
  sourceLanguage?: string; // Source language
  highestPriority: Database["public"]["Enums"]["priority_level"]; // Highest priority in group
  totalCount: number;
  pendingCount: number;
  needsCorrectionCount: number;
  domains: { 
    domain: string; 
    totalCount: number; 
    pendingCount: number;
    needsCorrectionCount: number; 
  }[];
}

export const TranslatorDashboard: React.FC = () => {
  const [stats, setStats] = useState<TranslatorStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [availableTasks, setAvailableTasks] = useState<AvailableTaskGroupUpdated[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [userLanguages, setUserLanguages] = useState<string[]>([]);

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
      setIsLoadingTasks(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setIsLoadingTasks(true);
      try {
        // Fetch stats
        const { data: contributionData, error: statsError } = await supabase
          .from('contributions')
          .select('status, tasks!inner(language, type, priority)')
          .eq('user_id', userId)
          .eq('tasks.type', 'translation');

        if (statsError) throw statsError;

        const fetchedStats: TranslatorStats = {
          translationsCompleted: 0,
          languagesWorkedOn: 0,
          pendingValidation: 0,
          needsCorrection: 0,
        };
        const languages = new Set<string>();

        contributionData?.forEach(c => {
          if (c.status === 'validated' || c.status === 'finalized') {
            fetchedStats.translationsCompleted++;
          }
          if (c.status === 'pending_validation') {
            fetchedStats.pendingValidation++;
          }
          if (c.status === 'rejected') { // Using 'rejected' as 'needs_correction'
            fetchedStats.needsCorrection++;
          }
          if (c.tasks?.language) {
            languages.add(c.tasks.language);
          }
        });
        fetchedStats.languagesWorkedOn = languages.size;
        setStats(fetchedStats);

        // Fetch recent activity (last 5 contributions)
        const { data: activityData, error: activityError } = await supabase
          .from('contributions')
          .select('id, task_id, status, created_at, tasks!inner(content, language)')
          .eq('user_id', userId)
          .eq('tasks.type', 'translation')
          .order('created_at', { ascending: false })
          .limit(5);

        if (activityError) throw activityError;

        const mappedActivity: RecentActivity[] = activityData?.map(a => ({
          id: a.id,
          task_id: a.task_id,
          task_title: (a.tasks?.content as any)?.task_title || `Task ${a.task_id}`,
          source_language: (a.tasks?.content as any)?.source_language || 'Unknown',
          target_language: a.tasks?.language || 'Unknown',
          status: a.status as Database["public"]["Enums"]["contribution_status"],
          created_at: a.created_at,
        })) || [];
        setRecentActivity(mappedActivity);

        // Fetch available translation tasks
        // 1. Fetch PENDING tasks matching user's languages (case-insensitive)
        let pendingTasksQuery = supabase
          .from('tasks')
          .select('id, language, content, status, priority')
          .eq('type', 'translation')
          .eq('status', 'pending');
        if (userLanguages.length > 0) {
            // Use ilike for case-insensitive matching with any language in the array
            const conditions = userLanguages.map(lang => `language.ilike.${lang}`).join(',');
            pendingTasksQuery = pendingTasksQuery.or(conditions);
        }
        const { data: pendingTasksData, error: pendingTasksError } = await pendingTasksQuery;
        if (pendingTasksError) throw pendingTasksError;

        // 2. Fetch tasks ASSIGNED to the user matching user's languages (case-insensitive)
        let assignedTasksQuery = supabase
          .from('tasks')
          .select('id, language, content, status, priority')
          .eq('type', 'translation')
          .eq('status', 'assigned')
          .eq('assigned_to', userId);
        if (userLanguages.length > 0) {
           // Use ilike for case-insensitive matching with any language in the array
           const conditions = userLanguages.map(lang => `language.ilike.${lang}`).join(',');
           assignedTasksQuery = assignedTasksQuery.or(conditions);
        }
        const { data: assignedTasksData, error: assignedTasksError } = await assignedTasksQuery;
        if (assignedTasksError) throw assignedTasksError;

        // 3. Fetch REJECTED contributions for the current user matching user's languages (case-insensitive)
        let rejectedContributionsQuery = supabase
          .from('contributions')
          .select('tasks!inner(id, language, content, status, priority)')
          .eq('user_id', userId)
          .eq('status', 'rejected');

        if (userLanguages.length > 0) {
           // Filter related tasks by user languages (case-insensitive)
           const conditions = userLanguages.map(lang => `language.ilike.${lang}`).join(',');
           rejectedContributionsQuery = rejectedContributionsQuery.or(conditions, { foreignTable: 'tasks' });
        }

        const { data: rejectedContributionsData, error: rejectedContributionsError } = await rejectedContributionsQuery;

        if (rejectedContributionsError) throw rejectedContributionsError;

        // Combine and process tasks
        const tasksMap: Record<number, {
             id: number; 
             language: string; // Target language
             source_language: string; // Source language
             content: any; 
             status: string; // Store the task status ('pending' or 'assigned')
             priority: Database["public"]["Enums"]["priority_level"]; // Task priority
             needsCorrection: boolean; 
            }> = {};

        // Add pending tasks
        pendingTasksData?.forEach(task => {
          const langKey = (task.language || 'Unknown').toLowerCase(); // Standardize key
          if (!tasksMap[task.id]) { 
            tasksMap[task.id] = {
              id: task.id,
              language: task.language || 'Unknown', // Keep original case for display
              source_language: (task.content as any)?.source_language || 'Unknown', // Extract source language
              content: task.content,
              status: task.status, // 'pending'
              priority: task.priority, // Store priority
              needsCorrection: false,
            };
          }
        });
        
        // Add assigned tasks (that aren't already pending)
        assignedTasksData?.forEach(task => {
            const langKey = (task.language || 'Unknown').toLowerCase(); // Standardize key
            if (!tasksMap[task.id]) { 
                tasksMap[task.id] = {
                    id: task.id,
                    language: task.language || 'Unknown', // Keep original case for display
                    source_language: (task.content as any)?.source_language || 'Unknown', // Extract source language
                    content: task.content,
                    status: task.status, // 'assigned'
                    priority: task.priority, // Store priority
                    needsCorrection: false, 
                };
            }
        });

        // Mark tasks needing correction (from rejected contributions)
        rejectedContributionsData?.forEach(contribution => {
          const task = contribution.tasks;
          if (task) {
            const langKey = (task.language || 'Unknown').toLowerCase(); // Standardize key
            if (tasksMap[task.id]) {
              // Task exists (either pending or assigned), mark it as needing correction
              tasksMap[task.id].needsCorrection = true;
            } else {
              // Task wasn't pending or assigned to user directly, but has a rejected contribution
              // matching user language filter. Add it.
              tasksMap[task.id] = {
                id: task.id,
                language: task.language || 'Unknown', // Keep original case for display
                source_language: (task.content as any)?.source_language || 'Unknown', // Extract source language
                content: task.content,
                status: task.status, // Status from the task itself
                priority: task.priority, // Store priority
                needsCorrection: true,
              };
            }
          }
        });

        // Process tasks into language groups (using standardized lowercase keys)
        const tasksByLanguage: Record<string, {
            totalCount: number;
            pendingCount: number; 
            needsCorrectionCount: number; 
            originalCaseLanguage: string; // Target Language
            sourceLanguage?: string; // Store a representative source language
            highestPriority: Database["public"]["Enums"]["priority_level"]; // Store highest priority
            domains: Record<string, { 
                totalCount: number; 
                pendingCount: number; 
                needsCorrectionCount: number; 
            }>;
        }> = {};

        // Filter tasksMap to include only those genuinely available for work/correction
        const availableTasksForGrouping = Object.values(tasksMap).filter(task => 
          task.status === 'pending' || task.needsCorrection
        );

        // Helper to compare priorities
        const priorityOrder = { low: 1, medium: 2, high: 3 };

        // Now process only the filtered tasks
        availableTasksForGrouping.forEach(task => {
          const languageKey = (task.language || 'Unknown').toLowerCase(); // Use lowercase for grouping
          const originalLanguage = task.language || 'Unknown'; // Keep original for display
          const domain = (task.content && typeof task.content === 'object') 
            ? ((task.content as any).domain || (task.content as any).batch_name || 'general') 
            : 'general';

          if (!tasksByLanguage[languageKey]) {
            tasksByLanguage[languageKey] = { 
              totalCount: 0, // This will now represent truly available tasks
              pendingCount: 0, 
              needsCorrectionCount: 0, 
              originalCaseLanguage: originalLanguage, 
              sourceLanguage: task.source_language, // Set initial source language
              highestPriority: 'low', // Initialize with lowest priority
              domains: {} 
            };
          } else if (!tasksByLanguage[languageKey].sourceLanguage && task.source_language && task.source_language !== 'Unknown') {
            // Update source language if it wasn't set yet or was 'Unknown'
            tasksByLanguage[languageKey].sourceLanguage = task.source_language;
          }
          
          // Update highest priority
          if (priorityOrder[task.priority] > priorityOrder[tasksByLanguage[languageKey].highestPriority]) {
            tasksByLanguage[languageKey].highestPriority = task.priority;
          }
          
          if (task.language) {
             tasksByLanguage[languageKey].originalCaseLanguage = task.language;
          }
          
          if (!tasksByLanguage[languageKey].domains[domain]) {
            tasksByLanguage[languageKey].domains[domain] = { totalCount: 0, pendingCount: 0, needsCorrectionCount: 0 };
          }

          // Increment counts for the available task
          tasksByLanguage[languageKey].totalCount++;
          tasksByLanguage[languageKey].domains[domain].totalCount++;

          if (task.needsCorrection) {
            tasksByLanguage[languageKey].needsCorrectionCount++;
            tasksByLanguage[languageKey].domains[domain].needsCorrectionCount++;
          } else if (task.status === 'pending') { // Only pending tasks count here now
            tasksByLanguage[languageKey].pendingCount++;
            tasksByLanguage[languageKey].domains[domain].pendingCount++;
          } 
        });

        // Convert to array format for rendering
        const taskGroups: AvailableTaskGroupUpdated[] = Object.entries(tasksByLanguage).map(([_, data]) => ({
          language: data.originalCaseLanguage, // Use original case language for display
          sourceLanguage: data.sourceLanguage,
          highestPriority: data.highestPriority,
          totalCount: data.totalCount,
          pendingCount: data.pendingCount,
          needsCorrectionCount: data.needsCorrectionCount,
          domains: Object.entries(data.domains).map(([domain, domainData]) => ({ 
            domain,
            totalCount: domainData.totalCount,
            pendingCount: domainData.pendingCount,
            needsCorrectionCount: domainData.needsCorrectionCount,
          }))
            .sort((a, b) => b.totalCount - a.totalCount), // Sort domains by count
        }));

        // Sort languages by total task count (most tasks first)
        taskGroups.sort((a, b) => b.totalCount - a.totalCount);

        setAvailableTasks(taskGroups);
        
      } catch (error: any) {
        console.error('Error fetching translator dashboard data:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingTasks(false);
      }
    };

    fetchData();
  }, [userId, userLanguages]);

  const formatStatus = (status: Database["public"]["Enums"]["contribution_status"]) => {
    switch (status) {
      case 'pending_validation': return <span className="text-xs text-yellow-600">Pending Validation</span>;
      case 'validated':
      case 'finalized': return <span className="text-xs text-green-600 flex items-center"><CheckCircle className="h-3 w-3 mr-1"/>Approved</span>;
      case 'rejected': return <span className="text-xs text-red-600 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>Needs Correction</span>;
      default: return <span className="text-xs text-gray-500">{status}</span>;
    }
  };
  
   const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const secondsPast = (now.getTime() - date.getTime()) / 1000;

        if (secondsPast < 60) {
            return parseInt(String(secondsPast)) + 's ago';
        }
        if (secondsPast < 3600) {
            return parseInt(String(secondsPast / 60)) + 'm ago';
        }
        if (secondsPast <= 86400) {
            return parseInt(String(secondsPast / 3600)) + 'h ago';
        }
        // For simplicity, return date if older than a day
        return date.toLocaleDateString();
    };

  const getPriorityBadge = (priority: Database["public"]["Enums"]["priority_level"]) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-afri-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-gray-600">Translations Completed</CardTitle>
              <Languages className="h-5 w-5 text-afri-purple" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.translationsCompleted ?? 0}</div>
            <CardDescription>Total approved translations</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-gray-600">Languages</CardTitle>
              <Book className="h-5 w-5 text-afri-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.languagesWorkedOn ?? 0}</div>
            <CardDescription>Unique languages translated to</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Validation</CardTitle>
               <Clock className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingValidation ?? 0}</div>
            <CardDescription>Submissions awaiting review</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
             <div className="flex justify-between items-center">
               <CardTitle className="text-sm font-medium text-gray-600">Needs Correction</CardTitle>
               <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{stats?.needsCorrection ?? 0}</div>
             <CardDescription>Tasks returned for revision</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Available Translation Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Available Translation Tasks</CardTitle>
            <CardDescription>Tasks available for translation, including any needing correction.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTasks ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-afri-purple" />
            </div>
          ) : availableTasks.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No translation tasks currently available for your languages.</p>
          ) : (
            <div className="space-y-4">
              {availableTasks.map((group) => (
                <Card key={group.language} className="p-4 border shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-afri-blue flex items-center gap-2">
                        <span>{group.sourceLanguage || 'Unknown'}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400"/>
                        <span>{group.language}</span> 
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                         {getPriorityBadge(group.highestPriority)} 
                        <span className="text-sm text-gray-500">Available Tasks: {group.totalCount}</span>
                         {group.needsCorrectionCount > 0 && (
                           <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                             <AlertCircle className="h-3 w-3 mr-1"/> {group.needsCorrectionCount} Need Correction
                           </span>
                         )}
                      </div>
                    </div>
                     <Button asChild size="sm">
                       <Link to={`/translate?language=${group.language.toLowerCase()}${group.sourceLanguage ? `&source_language=${group.sourceLanguage.toLowerCase()}` : ''}${group.needsCorrectionCount > 0 ? '&corrections=true' : ''}`}>
                         {group.needsCorrectionCount > 0 ? 'Correct Task(s)' : 'Translate'}
                       </Link>
                     </Button>
                  </div>
                  
                  {/* Domain Breakdown */}
                  <div className="space-y-1 pl-4 border-l-2 border-gray-200">
                    {group.domains.map(domain => (
                      <div key={domain.domain} className="text-sm text-gray-500 flex justify-between items-center">
                        <span>
                          <span className="capitalize font-medium text-gray-700">{domain.domain}:</span> {domain.totalCount} task(s)
                        </span>
                         {domain.needsCorrectionCount > 0 && (
                           <span className="text-xs text-red-600">({domain.needsCorrectionCount} correction needed)</span>
                         )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest translation submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500">No recent translation activity.</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    {item.status === 'rejected' ? (
                       <Link to={`/translate?contribution_id=${item.id}`} className="font-medium text-afri-blue hover:underline">
                          {item.task_title} (Needs Correction)
                       </Link>
                    ) : (
                       <p className="font-medium">{item.task_title}</p>
                    )}
                    <p className="text-sm text-gray-500">{item.source_language} → {item.target_language}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{timeAgo(item.created_at)}</p>
                    {formatStatus(item.status)}
                     {item.status === 'rejected' && (
                        <Button asChild variant="link" size="sm" className="p-0 h-auto text-afri-red">
                            <Link to={`/translate?contribution_id=${item.id}`}>Correct Task</Link>
                        </Button>
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 