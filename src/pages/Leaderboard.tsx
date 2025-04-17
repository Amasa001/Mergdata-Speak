import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, Award, User, ChevronUp, ChevronDown
} from 'lucide-react';
import { ProfileBadge } from '@/components/profile/ProfileBadge';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';

// Define contributor interface for the leaderboard
interface Contributor {
  id: string;
  name: string;
  asr: number;
  tts: number;
  translation: number;
  transcription: number;
  validate: number;
  totalScore: number;
  rank?: number;
}

// Map task types to badge types
const taskTypeToBadgeType: Record<string, string> = {
  'asr': 'asr',
  'tts': 'tts',
  'translation': 'translate',
  'transcription': 'transcribe',
  'validate': 'validate'
};

const Leaderboard: React.FC = () => {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchContributors = async () => {
      setLoading(true);
      try {
        // Fetch all profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name');
        
        if (!profiles) {
          console.error('No profiles found');
          setLoading(false);
          return;
        }
        
        // Fetch all contributions with task types
        const { data: contribData } = await supabase
          .from('contributions')
          .select('user_id, task_id, tasks(type)');
          
        const contributorMap = new Map<string, Contributor>();
        
        // Initialize contributors from profiles
        profiles.forEach(profile => {
          const name = profile.full_name || 'Anonymous User';
          
          contributorMap.set(profile.id, {
            id: profile.id,
            name: name,
            asr: 0,
            tts: 0,
            translation: 0, 
            transcription: 0,
            validate: 0,
            totalScore: 0
          });
        });
        
        // Add contributions to the appropriate users
        if (contribData) {
          contribData.forEach(contrib => {
            if (!contrib.user_id || !contrib.tasks) return;
            
            const taskType = typeof contrib.tasks === 'object' ? contrib.tasks.type : null;
            if (!taskType) return;
            
            const contributor = contributorMap.get(contrib.user_id);
            if (contributor) {
              // Increment the appropriate task type count
              if (taskType === 'asr') contributor.asr++;
              else if (taskType === 'tts') contributor.tts++;
              else if (taskType === 'translation') contributor.translation++;
              else if (taskType === 'transcription') contributor.transcription++;
              else if (taskType === 'validate') contributor.validate++;
              
              // Increase total score
              contributor.totalScore++;
            }
          });
        }
        
        // Convert map to array, filter out zero contributions, and sort by score
        let contributorsArray = Array.from(contributorMap.values())
          .filter(c => c.totalScore > 0)
          .sort((a, b) => b.totalScore - a.totalScore);
          
        // Assign ranks
        contributorsArray.forEach((contributor, idx) => {
          contributor.rank = idx + 1;
        });
        
        setContributors(contributorsArray);
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

  // Filter and sort contributors based on active tab
  const getFilteredContributors = () => {
    if (activeTab === 'all') {
      return [...contributors].sort((a, b) => b.totalScore - a.totalScore);
    }
    
    if (activeTab === 'asr') {
      return [...contributors].filter(c => c.asr > 0).sort((a, b) => b.asr - a.asr);
    }
    
    if (activeTab === 'tts') {
      return [...contributors].filter(c => c.tts > 0).sort((a, b) => b.tts - a.tts);
    }
    
    if (activeTab === 'translate') {
      return [...contributors].filter(c => c.translation > 0).sort((a, b) => b.translation - a.translation);
    }
    
    if (activeTab === 'transcribe') {
      return [...contributors].filter(c => c.transcription > 0).sort((a, b) => b.transcription - a.transcription);
    }
    
    if (activeTab === 'validate') {
      return [...contributors].filter(c => c.validate > 0).sort((a, b) => b.validate - a.validate);
    }
    
    return contributors;
  };

  // Get the score for the current tab
  const getScoreForTab = (contributor: Contributor) => {
    if (activeTab === 'all') return contributor.totalScore;
    if (activeTab === 'asr') return contributor.asr;
    if (activeTab === 'tts') return contributor.tts;
    if (activeTab === 'translate') return contributor.translation;
    if (activeTab === 'transcribe') return contributor.transcription;
    if (activeTab === 'validate') return contributor.validate;
    return contributor.totalScore;
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
                          {contributor.asr > 0 && (
                            <ProfileBadge type="asr" count={contributor.asr} size="sm" />
                          )}
                          {contributor.tts > 0 && (
                            <ProfileBadge type="tts" count={contributor.tts} size="sm" />
                          )}
                          {contributor.translation > 0 && (
                            <ProfileBadge type="translate" count={contributor.translation} size="sm" />
                          )}
                          {contributor.transcription > 0 && (
                            <ProfileBadge type="transcribe" count={contributor.transcription} size="sm" />
                          )}
                          {contributor.validate > 0 && (
                            <ProfileBadge type="validate" count={contributor.validate} size="sm" />
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