import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Languages, Book, BarChart, Clock, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Define structured types for task content
interface TaskContent {
  task_title?: string;
  source_language?: string;
  batch_name?: string;
  domain?: string;
  source_text?: string;
  [key: string]: unknown;
}

// Define the task structure
interface Task {
  id: number;
  language: string;
  content: TaskContent;
  status: string;
  priority: Database["public"]["Enums"]["priority_level"];
  source_language?: string;
  needsCorrection?: boolean;
}

// Define task from database
interface TaskFromDb {
  id: number;
  language: string;
  content: TaskContent;
  status: string;
  priority: Database["public"]["Enums"]["priority_level"];
  type?: string;
}

// Define contribution with task relationship
interface ContributionWithTask {
  id: number;
  task_id: number;
  status: Database["public"]["Enums"]["contribution_status"];
  created_at: string;
  tasks: TaskFromDb;
}

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

        if (contributionData) {
          contributionData.forEach(c => {
            if (c.status === 'validated' || c.status === 'finalized') {
              fetchedStats.translationsCompleted++;
            }
            if (c.status === 'pending_validation') {
              fetchedStats.pendingValidation++;
            }
            if (c.status === 'rejected') { 
              fetchedStats.needsCorrection++;
            }
            if (c.tasks && typeof c.tasks === 'object' && 'language' in c.tasks) {
              languages.add(c.tasks.language as string);
            }
          });
        }
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

        const mappedActivity: RecentActivity[] = [];
        if (activityData) {
          activityData.forEach(a => {
            if (a.tasks && typeof a.tasks === 'object' && 'content' in a.tasks && 'language' in a.tasks) {
              const content = a.tasks.content as TaskContent;
              mappedActivity.push({
                id: a.id,
                task_id: a.task_id,
                task_title: content?.task_title || `Task ${a.task_id}`,
                source_language: content?.source_language || 'Unknown',
                target_language: (a.tasks.language as string) || 'Unknown',
                status: a.status,
                created_at: a.created_at,
              });
            }
          });
        }
        setRecentActivity(mappedActivity);

        // TODO: Complete implementation of task fetching
        // This would include:
        // 1. Fetch PENDING tasks matching user's languages (case-insensitive)
        // 2. Fetch tasks ASSIGNED to the user matching user's languages (case-insensitive)
        // 3. Fetch REJECTED contributions for the current user matching user's languages

      } catch (error) {
        console.error('Error fetching translator data:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingTasks(false);
      }
    };

    fetchData();
  }, [userId]);

  const formatStatus = (status: Database["public"]["Enums"]["contribution_status"]) => {
    switch (status) {
      case 'pending_validation': return { label: 'Pending Validation', color: 'bg-yellow-100 text-yellow-800' };
      case 'validated': return { label: 'Validated', color: 'bg-green-100 text-green-800' };
      case 'rejected': return { label: 'Needs Correction', color: 'bg-red-100 text-red-800' };
      case 'finalized': return { label: 'Finalized', color: 'bg-blue-100 text-blue-800' };
      default: return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const getPriorityBadge = (priority: Database["public"]["Enums"]["priority_level"]) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">High</Badge>;
      case 'medium': return <Badge variant="default">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-afri-orange" />
        <p className="ml-2">Loading translator dashboard...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Stats Cards */}
      <div className="col-span-1 lg:col-span-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Translations Completed</CardDescription>
              <CardTitle className="text-3xl flex items-center">
                {stats?.translationsCompleted ?? 0}
                <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Languages</CardDescription>
              <CardTitle className="text-3xl flex items-center">
                {stats?.languagesWorkedOn ?? 0}
                <Languages className="ml-2 h-5 w-5 text-blue-500" />
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Validation</CardDescription>
              <CardTitle className="text-3xl flex items-center">
                {stats?.pendingValidation ?? 0}
                <Clock className="ml-2 h-5 w-5 text-orange-500" />
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Needs Correction</CardDescription>
              <CardTitle className="text-3xl flex items-center">
                {stats?.needsCorrection ?? 0}
                <AlertCircle className="ml-2 h-5 w-5 text-red-500" />
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
      
      {/* Recent Activity Card */}
      <div className="col-span-1 lg:col-span-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest translation submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No recent translation activity</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const { label, color } = formatStatus(activity.status);
                  return (
                    <div key={activity.id} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{activity.task_title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${color}`}>{label}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="flex items-center">
                          <Book className="h-3 w-3 mr-1" /> 
                          {activity.source_language} to {activity.target_language}
                        </span>
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>{timeAgo(activity.created_at)}</span>
                        <Link 
                          to={`/translate/${activity.task_id}`} 
                          className="text-afri-orange flex items-center hover:underline"
                        >
                          View <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Available Tasks Card */}
      <div className="col-span-1 lg:col-span-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Available Tasks
            </CardTitle>
            <CardDescription>Translation tasks available for you</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTasks ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-afri-orange" />
                <p className="ml-2 text-sm">Loading tasks...</p>
              </div>
            ) : availableTasks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-3">No tasks available for your languages</p>
                <Link to="/profile">
                  <Button variant="outline" size="sm">Update Your Languages</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {availableTasks.map((group, index) => (
                  <div key={index} className="border rounded-md">
                    <div className="p-3 bg-muted/50 border-b flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">
                          {group.sourceLanguage || 'Various'} ➝ {group.language}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {group.totalCount} task{group.totalCount !== 1 ? 's' : ''} available
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        {getPriorityBadge(group.highestPriority)}
                        <Link to={`/translate?language=${encodeURIComponent(group.language)}`}>
                          <Button size="sm">Translate</Button>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="p-3 space-y-2">
                      {group.domains.map((domain, dIdx) => (
                        <div key={dIdx} className="flex justify-between items-center text-sm">
                          <span className="capitalize">{domain.domain}</span>
                          <span className="text-muted-foreground">
                            {domain.totalCount} task{domain.totalCount !== 1 ? 's' : ''}
                            {domain.needsCorrectionCount > 0 && (
                              <span className="text-red-500 ml-2">
                                ({domain.needsCorrectionCount} need{domain.needsCorrectionCount !== 1 ? '' : 's'} correction)
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 