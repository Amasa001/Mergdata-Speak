import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, User, ChevronUp, ChevronDown } from 'lucide-react';
import { ProfileBadge } from '@/components/profile/ProfileBadge';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';

interface Contributor {
  id: string;
  name: string;
  asr_contributions: number;
  tts_contributions: number;
  translation_contributions: number;
  transcription_contributions: number;
  validated_contributions: number;
  total_contributions: number;
  rank?: number;
}

const Leaderboard: React.FC = () => {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchContributors = async () => {
      setLoading(true);
      try {
        const { data: stats, error } = await supabase
          .from('user_contribution_stats')
          .select('*')
          .order('total_contributions', { ascending: false });

        if (error) throw error;

        const contributorsData = stats?.map((stat, index) => ({
          id: stat.id,
          name: stat.full_name || 'Anonymous User',
          asr_contributions: stat.asr_contributions,
          tts_contributions: stat.tts_contributions,
          translation_contributions: stat.translation_contributions,
          transcription_contributions: stat.transcription_contributions,
          validated_contributions: stat.validated_contributions,
          total_contributions: stat.total_contributions,
          rank: index + 1
        })) || [];

        setContributors(contributorsData);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContributors();
  }, []);

  // Helper to get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Map task types to badge types
  const taskTypeToBadgeType: Record<string, string> = {
    'asr': 'asr',
    'tts': 'tts',
    'translation': 'translate',
    'transcription': 'transcribe',
    'validate': 'validate'
  };

  // Filter and sort contributors based on active tab
  const getFilteredContributors = () => {
    if (activeTab === 'all') {
      return [...contributors].sort((a, b) => b.total_contributions - a.total_contributions);
    }
    if (activeTab === 'asr') {
      return [...contributors].filter(c => c.asr_contributions > 0)
        .sort((a, b) => b.asr_contributions - a.asr_contributions);
    }
    if (activeTab === 'tts') {
      return [...contributors].filter(c => c.tts_contributions > 0)
        .sort((a, b) => b.tts_contributions - a.tts_contributions);
    }
    if (activeTab === 'translate') {
      return [...contributors].filter(c => c.translation_contributions > 0)
        .sort((a, b) => b.translation_contributions - a.translation_contributions);
    }
    if (activeTab === 'transcribe') {
      return [...contributors].filter(c => c.transcription_contributions > 0)
        .sort((a, b) => b.transcription_contributions - a.transcription_contributions);
    }
    if (activeTab === 'validate') {
      return [...contributors].filter(c => c.validated_contributions > 0)
        .sort((a, b) => b.validated_contributions - a.validated_contributions);
    }
    return contributors;
  };

  // Get the score for the current tab
  const getScoreForTab = (contributor: Contributor) => {
    if (activeTab === 'all') return contributor.total_contributions;
    if (activeTab === 'asr') return contributor.asr_contributions;
    if (activeTab === 'tts') return contributor.tts_contributions;
    if (activeTab === 'translate') return contributor.translation_contributions;
    if (activeTab === 'transcribe') return contributor.transcription_contributions;
    if (activeTab === 'validate') return contributor.validated_contributions;
    return contributor.total_contributions;
  };

  // Get the appropriate badge type based on active tab
  const getBadgeType = () => {
    if (activeTab === 'all') return null;
    return taskTypeToBadgeType[activeTab] as any; // Cast to any to avoid type errors
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">
            Top contributors ranked by their contributions across different tasks
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              <span>All Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="asr" className="flex items-center gap-1">
              ASR
            </TabsTrigger>
            <TabsTrigger value="tts" className="flex items-center gap-1">
              TTS
            </TabsTrigger>
            <TabsTrigger value="translate" className="flex items-center gap-1">
              Translate
            </TabsTrigger>
            <TabsTrigger value="transcribe" className="flex items-center gap-1">
              Transcribe
            </TabsTrigger>
            <TabsTrigger value="validate" className="flex items-center gap-1">
              Validate
            </TabsTrigger>
          </TabsList>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {activeTab === 'all' ? 'Top Contributors' : `${activeTab.toUpperCase()} Leaders`}
            </CardTitle>
            <CardDescription>
              {activeTab === 'all'
                ? 'Contributors ranked by total score across all tasks'
                : `Top contributors for ${activeTab} tasks`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              // Skeleton loading state
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-10" />
                  </div>
                ))}
              </div>
            ) : contributors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-2">
                  <Trophy className="h-10 w-10 mx-auto opacity-30" />
                </div>
                <p>No contributor data available yet</p>
                <p className="text-sm">Start contributing to appear on the leaderboard!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Contributor</TableHead>
                    <TableHead>Badges</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredContributors().map((contributor, index) => (
                    <TableRow key={contributor.id}>
                      <TableCell className="font-medium">
                        {/* Medal for top 3 */}
                        {index < 3 ? (
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full 
                            ${index === 0 ? 'bg-yellow-100 text-yellow-500' :
                              index === 1 ? 'bg-gray-100 text-gray-500' :
                                'bg-amber-100 text-amber-700'}`}>
                            {index + 1}
                          </div>
                        ) : (
                          index + 1
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(contributor.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{contributor.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {contributor.asr_contributions > 0 && (
                            <ProfileBadge type="asr" count={contributor.asr_contributions} size="sm" />
                          )}
                          {contributor.tts_contributions > 0 && (
                            <ProfileBadge type="tts" count={contributor.tts_contributions} size="sm" />
                          )}
                          {contributor.translation_contributions > 0 && (
                            <ProfileBadge type="translate" count={contributor.translation_contributions} size="sm" />
                          )}
                          {contributor.transcription_contributions > 0 && (
                            <ProfileBadge type="transcribe" count={contributor.transcription_contributions} size="sm" />
                          )}
                          {contributor.validated_contributions > 0 && (
                            <ProfileBadge type="validate" count={contributor.validated_contributions} size="sm" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {getScoreForTab(contributor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
