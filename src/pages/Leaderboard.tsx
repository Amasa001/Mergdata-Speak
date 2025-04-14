import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trophy, Medal, Star, Award, Crown, MessageSquare, ThumbsUp, Zap, Clock, Calendar,
  Shield, Globe, Lightbulb, Eye, Check, CheckCircle, User, ChevronUp, ChevronDown, BarChart
} from 'lucide-react';
import { ProfileBadge } from '@/components/profile/ProfileBadge';

interface Contributor {
  id: number;
  rank: number;
  name: string;
  avatar?: string;
  contributionScore: number;
  languages: string[];
  tasksCompleted: number;
  badges: string[];
  joinDate: string;
}

// Mock badge data for the badge explanation section
const badgeExplanations = [
  { id: "consistency-contributor", label: "Consistent Contributor", icon: <Calendar className="h-5 w-5 text-blue-600" /> },
  { id: "quality-champion", label: "Quality Champion", icon: <Star className="h-5 w-5 text-green-600" /> },
  { id: "prolific-contributor", label: "Prolific Contributor", icon: <Award className="h-5 w-5 text-orange-600" /> },
  { id: "language-specialist", label: "Language Specialist", icon: <MessageSquare className="h-5 w-5 text-purple-600" /> },
  { id: "validator-virtuoso", label: "Validator Virtuoso", icon: <CheckCircle className="h-5 w-5 text-indigo-600" /> },
];

const Leaderboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('all');
  const [category, setCategory] = useState<string>('overall');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch more realistic mock data
  useEffect(() => {
    setLoading(true);
    // Simulate API call based on filters
    console.log(`Fetching leaderboard data for: ${timeRange} / ${category}`);
    setTimeout(() => {
      // Generate more diverse mock data
      const mockData: Contributor[] = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        rank: i + 1,
        name: `Contributor ${String.fromCharCode(65 + i)}`,
        avatar: `/avatars/avatar${(i % 10) + 1}.png`,
        contributionScore: Math.floor(Math.random() * 1000) + 50,
        languages: [['Akan', 'Ewe', 'Ga', 'Dagbani', 'Fante'][i % 5]],
        tasksCompleted: Math.floor(Math.random() * 200) + 10,
        badges: getRandomBadges(i),
        joinDate: `2023-${String(Math.floor(Math.random()*12)+1).padStart(2,'0')}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`
      })); 
      
      // Sort by score descending
      mockData.sort((a, b) => b.contributionScore - a.contributionScore);
      
      // Assign ranks after sorting
      mockData.forEach((c, index) => { c.rank = index + 1; });
      
      setContributors(mockData);
      setLoading(false);
    }, 800); // Simulate network delay
  }, [timeRange, category]);

  // Helper function to assign badges somewhat realistically
  const getRandomBadges = (index: number): string[] => {
    const availableBadges = badgeExplanations.map(b => b.id);
    const badges = new Set<string>();
    // Top contributors get more badges
    const maxBadges = Math.max(1, 5 - Math.floor(index / 5)); 
    while (badges.size < maxBadges) {
      badges.add(availableBadges[Math.floor(Math.random() * availableBadges.length)]);
    }
    return Array.from(badges);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500 font-bold";
    if (rank === 2) return "text-gray-400 font-bold";
    if (rank === 3) return "text-orange-400 font-bold";
    return "text-gray-600";
  };

  return (
    <div className="container mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center">
          <Trophy className="h-8 w-8 mr-2 text-yellow-500" /> AfriSpeak Leaderboard
        </h1>
        <p className="text-lg text-gray-600">Celebrating our top language contributors</p>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-600">Filter leaderboard by:</p>
          <div className="flex space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36">
                <Clock className="h-4 w-4 mr-1 text-gray-500" />
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                 <BarChart className="h-4 w-4 mr-1 text-gray-500" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Overall Score</SelectItem>
                <SelectItem value="asr">ASR Tasks</SelectItem>
                <SelectItem value="tts">TTS Tasks</SelectItem>
                <SelectItem value="transcription">Transcription</SelectItem>
                <SelectItem value="translation">Translation</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="leaderboard">Top Contributors</TabsTrigger>
          <TabsTrigger value="badges">Badge Explanations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Top Contributors</CardTitle>
              <CardDescription>Ranked by contribution score ({timeRange}, {category})</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                 <div className="text-center py-10">
                  <p>Loading leaderboard...</p> 
                </div>
              ) : contributors.length > 0 ? (
                <div className="space-y-2">
                  {contributors.map((contributor) => (
                    <div key={contributor.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3 flex-grow">
                        <span className={`text-lg w-8 text-center ${getRankColor(contributor.rank)}`}>
                          {contributor.rank}
                        </span>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contributor.avatar} alt={contributor.name} />
                          <AvatarFallback>{contributor.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm truncate max-w-[150px] sm:max-w-xs">{contributor.name}</p>
                          <p className="text-xs text-gray-500">Joined: {contributor.joinDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {/* Badges Display */}
                        <div className="flex flex-wrap gap-1 justify-end w-32 sm:w-48">
                           {contributor.badges.slice(0, 3).map(badgeId => (
                            <ProfileBadge key={badgeId} type={badgeId} size="sm" />
                           ))}
                           {contributor.badges.length > 3 && <span className="text-xs text-gray-400">+{contributor.badges.length - 3}</span>}
                        </div>
                        {/* Contribution Score */}
                        <div className="text-right w-20">
                           <p className="font-semibold text-sm">{contributor.contributionScore}</p>
                           <p className="text-xs text-gray-500">Score</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p>No contributors found for the selected filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="badges">
          <Card>
            <CardHeader>
              <CardTitle>Contribution Badges</CardTitle>
              <CardDescription>Recognizing different types of contributions to AfriSpeakNexus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {badgeExplanations.map((badge) => (
                  <div key={badge.id} className="flex items-start p-3 border rounded-lg">
                    <div className="mr-4 flex-shrink-0">
                       {badge.icon}
                    </div>
                    <div>
                      <p className="font-medium mb-1">{badge.label}</p>
                      <p className="text-sm text-gray-600">{badgeConfig[badge.id]?.description || ''}</p>
                    </div>
                  </div>
               ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper to access badge descriptions from ProfileBadge config
// This avoids duplicating the descriptions
const badgeConfig = {
  "consistency-contributor": { description: "Contributed regularly over an extended period." },
  "quality-champion": { description: "Maintained high quality ratings across tasks." },
  "prolific-contributor": { description: "Completed a significant volume of tasks." },
  "language-specialist": { description: "Demonstrated expertise in a specific language." },
  "validator-virtuoso": { description: "Excelled in validating contributions accurately." }
};

export default Leaderboard; 