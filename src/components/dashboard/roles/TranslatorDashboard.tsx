
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Languages, Book, BarChart, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { AvailableTranslationTasks } from '@/components/dashboard/AvailableTranslationTasks';

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
interface AvailableTaskGroup {
  language: string;
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
  const [availableTasks, setAvailableTasks] = useState<AvailableTaskGroup[]>([]);
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
      try {
        // Fetch stats
        const { data: contributionData, error: statsError } = await supabase
          .from('contributions')
          .select('status, tasks!inner(language, type)')
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

      } catch (error: any) {
        console.error('Error fetching translator dashboard data:', error);
      } finally {
        setIsLoading(false);
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
      <AvailableTranslationTasks />

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
                    <p className="font-medium">{item.task_title}</p>
                    <p className="text-sm text-gray-500">{item.source_language} → {item.target_language}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{timeAgo(item.created_at)}</p>
                    {formatStatus(item.status)}
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
