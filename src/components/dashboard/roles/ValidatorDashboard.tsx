import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileCheck, Headphones, Shield, Languages } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdvancedFilters } from '@/components/tasks/AdvancedFilters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ValidatorDashboard: React.FC = () => {
  const [userLanguages, setUserLanguages] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Mock data
  const validationStats = {
    totalValidated: 96,
    asrValidations: 35,
    ttsValidations: 28,
    transcriptionValidations: 23,
    translationValidations: 10
  };
  
  const validationTasks = [
    {
      id: 1,
      type: 'asr',
      title: "Market Scene Description",
      description: "Validate ASR accuracy for market scene descriptions in Akan",
      count: 25,
      language: "Akan",
      priority: "high",
      date: new Date('2024-03-15')
    },
    {
      id: 2,
      type: 'tts',
      title: "Traditional Proverbs",
      description: "Review TTS quality for traditional Akan proverbs",
      count: 15,
      language: "Akan",
      priority: "medium",
      date: new Date('2024-03-14')
    },
    {
      id: 3,
      type: 'transcription',
      title: "News Bulletin",
      description: "Verify transcription accuracy for Akan news broadcast",
      count: 30,
      language: "Akan",
      priority: "high",
      date: new Date('2024-03-13')
    },
    {
      id: 4,
      type: 'translation',
      title: "Health Information",
      description: "Review English to Akan health information translations",
      count: 20,
      language: "Akan",
      priority: "high",
      date: new Date('2024-03-12')
    },
    {
      id: 5,
      type: 'asr',
      title: "Cultural Storytelling",
      description: "Validate ASR for Ewe cultural stories",
      count: 18,
      language: "Ewe",
      priority: "medium",
      date: new Date('2024-03-11')
    },
    {
      id: 6,
      type: 'tts',
      title: "Educational Content",
      description: "Review TTS for Ewe educational materials",
      count: 22,
      language: "Ewe",
      priority: "high",
      date: new Date('2024-03-10')
    },
    {
      id: 7,
      type: 'transcription',
      title: "Radio Interview",
      description: "Verify transcription of Ewe radio interview",
      count: 12,
      language: "Ewe",
      priority: "medium",
      date: new Date('2024-03-09')
    },
    {
      id: 8,
      type: 'translation',
      title: "Government Announcements",
      description: "Review English to Ewe government announcements",
      count: 15,
      language: "Ewe",
      priority: "high",
      date: new Date('2024-03-08')
    },
    {
      id: 9,
      type: 'asr',
      title: "Traditional Music",
      description: "Validate ASR for Ga traditional music descriptions",
      count: 10,
      language: "Ga",
      priority: "medium",
      date: new Date('2024-03-07')
    },
    {
      id: 10,
      type: 'tts',
      title: "Cultural Practices",
      description: "Review TTS for Ga cultural practices",
      count: 8,
      language: "Ga",
      priority: "low",
      date: new Date('2024-03-06')
    },
    {
      id: 11,
      type: 'transcription',
      title: "Community Meeting",
      description: "Verify transcription of Ga community meeting",
      count: 15,
      language: "Ga",
      priority: "medium",
      date: new Date('2024-03-05')
    },
    {
      id: 12,
      type: 'translation',
      title: "Tourism Information",
      description: "Review English to Ga tourism translations",
      count: 12,
      language: "Ga",
      priority: "medium",
      date: new Date('2024-03-04')
    },
    {
      id: 13,
      type: 'asr',
      title: "Traditional Ceremony",
      description: "Validate ASR for Dagbani traditional ceremony",
      count: 20,
      language: "Dagbani",
      priority: "high",
      date: new Date('2024-03-03')
    },
    {
      id: 14,
      type: 'tts',
      title: "Historical Narratives",
      description: "Review TTS for Dagbani historical narratives",
      count: 15,
      language: "Dagbani",
      priority: "medium",
      date: new Date('2024-03-02')
    },
    {
      id: 15,
      type: 'transcription',
      title: "Religious Sermon",
      description: "Verify transcription of Dagbani religious sermon",
      count: 10,
      language: "Dagbani",
      priority: "low",
      date: new Date('2024-03-01')
    },
    {
      id: 16,
      type: 'translation',
      title: "Agricultural Information",
      description: "Review English to Dagbani agricultural translations",
      count: 18,
      language: "Dagbani",
      priority: "high",
      date: new Date('2024-02-29')
    },
    {
      id: 17,
      type: 'asr',
      title: "Market Transactions",
      description: "Validate ASR for Fante market transactions",
      count: 25,
      language: "Fante",
      priority: "medium",
      date: new Date('2024-02-28')
    },
    {
      id: 18,
      type: 'tts',
      title: "Local News",
      description: "Review TTS for Fante local news",
      count: 20,
      language: "Fante",
      priority: "high",
      date: new Date('2024-02-27')
    },
    {
      id: 19,
      type: 'transcription',
      title: "Community Radio",
      description: "Verify transcription of Fante community radio",
      count: 15,
      language: "Fante",
      priority: "medium",
      date: new Date('2024-02-26')
    },
    {
      id: 20,
      type: 'translation',
      title: "Educational Materials",
      description: "Review English to Fante educational translations",
      count: 22,
      language: "Fante",
      priority: "high",
      date: new Date('2024-02-25')
    }
  ];

  useEffect(() => {
    async function fetchUserLanguages() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('languages')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profileData?.languages && profileData.languages.length > 0) {
          setUserLanguages(profileData.languages);
          // Initialize selected languages with user preferences, but don't filter by default
          // This allows all tasks to be visible initially
          // setSelectedLanguages(profileData.languages);
        }
      } catch (error) {
        console.error('Error fetching user languages:', error);
        toast.error('Failed to load your language preferences');
      }
    }

    fetchUserLanguages();
  }, []);

  const filterTasks = (tasks: typeof validationTasks) => {
    return tasks.filter(task => {
      // Filter by selected languages only if languages are selected
      if (selectedLanguages.length > 0 && !selectedLanguages.some(lang => 
        task.language.toLowerCase().includes(lang.toLowerCase())
      )) {
        return false;
      }

      // Filter by date range
      if (dateRange.from && task.date < dateRange.from) return false;
      if (dateRange.to && task.date > dateRange.to) return false;

      // Filter by priority
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.language.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  const filteredTasks = filterTasks(validationTasks);

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <Card>
        <CardContent className="pt-6">
          <AdvancedFilters
            selectedLanguages={selectedLanguages}
            onLanguageChange={setSelectedLanguages}
            onDateRangeChange={setDateRange}
            onPriorityChange={setSelectedPriority}
            onSearchChange={setSearchQuery}
            dateRange={dateRange}
            selectedPriority={selectedPriority}
            searchQuery={searchQuery}
          />
        </CardContent>
      </Card>

      {/* Validator-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Total</CardTitle>
              <Shield className="h-5 w-5 text-afri-brown" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationStats.totalValidated}</div>
            <p className="text-xs text-gray-500">Items validated</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">ASR</CardTitle>
              <CheckCircle className="h-5 w-5 text-afri-orange" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationStats.asrValidations}</div>
            <p className="text-xs text-gray-500">Speech recordings validated</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">TTS</CardTitle>
              <Headphones className="h-5 w-5 text-afri-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationStats.ttsValidations}</div>
            <p className="text-xs text-gray-500">Voice recordings checked</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Transcriptions</CardTitle>
              <FileCheck className="h-5 w-5 text-afri-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationStats.transcriptionValidations}</div>
            <p className="text-xs text-gray-500">Text transcripts verified</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Translations</CardTitle>
              <Languages className="h-5 w-5 text-afri-purple" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationStats.translationValidations}</div>
            <p className="text-xs text-gray-500">Translations reviewed</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Validation tasks with tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Queue</CardTitle>
          <CardDescription>
            Review and verify the quality of submitted contributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="asr">ASR</TabsTrigger>
              <TabsTrigger value="tts">TTS</TabsTrigger>
              <TabsTrigger value="transcription">Transcriptions</TabsTrigger>
              <TabsTrigger value="translation">Translations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="space-y-4">
                {filteredTasks.map(task => (
                  <div key={task.id} className="p-4 border rounded-md hover:border-afri-brown/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {task.type === 'asr' && <CheckCircle className="h-5 w-5 text-afri-orange" />}
                          {task.type === 'tts' && <Headphones className="h-5 w-5 text-afri-blue" />}
                          {task.type === 'transcription' && <FileCheck className="h-5 w-5 text-afri-green" />}
                          {task.type === 'translation' && <Languages className="h-5 w-5 text-afri-purple" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {task.language}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.count} items</span>
                            {task.priority === "high" ? (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">High Priority</span>
                            ) : (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Medium Priority</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link to="/validate">
                        <Button variant="outline" size="sm">
                          Start Validation
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="asr" className="mt-4">
              <div className="space-y-4">
                {filteredTasks.filter(t => t.type === 'asr').map(task => (
                  <div key={task.id} className="p-4 border rounded-md hover:border-afri-brown/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <CheckCircle className="h-5 w-5 text-afri-orange" />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {task.language}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.count} items</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/validate">
                        <Button variant="outline" size="sm">
                          Review ASR
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="tts" className="mt-4">
              <div className="space-y-4">
                {filteredTasks.filter(t => t.type === 'tts').map(task => (
                  <div key={task.id} className="p-4 border rounded-md hover:border-afri-brown/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <Headphones className="h-5 w-5 text-afri-blue" />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {task.language}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.count} items</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/validate">
                        <Button variant="outline" size="sm">
                          Review TTS
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="transcription" className="mt-4">
              <div className="space-y-4">
                {filteredTasks.filter(t => t.type === 'transcription').map(task => (
                  <div key={task.id} className="p-4 border rounded-md hover:border-afri-brown/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <FileCheck className="h-5 w-5 text-afri-green" />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {task.language}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.count} items</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/validate">
                        <Button variant="outline" size="sm">
                          Review Transcriptions
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="translation" className="mt-4">
              <div className="space-y-4">
                {filteredTasks.filter(t => t.type === 'translation').map(task => (
                  <div key={task.id} className="p-4 border rounded-md hover:border-afri-brown/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <Languages className="h-5 w-5 text-afri-purple" />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {task.language}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.count} items</span>
                            {task.priority === "high" && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">High Priority</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link to="/validate">
                        <Button variant="outline" size="sm">
                          Review Translations
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Validation guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Guidelines</CardTitle>
          <CardDescription>Standards for quality assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">ASR Validation</h4>
              <p className="text-sm text-gray-600">• Check that speech clearly describes the image content</p>
              <p className="text-sm text-gray-600">• Verify pronunciation and speech clarity</p>
              <p className="text-sm text-gray-600">• Ensure no background noise impacts quality</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-1">TTS Validation</h4>
              <p className="text-sm text-gray-600">• Verify text is read accurately and completely</p>
              <p className="text-sm text-gray-600">• Check for natural intonation and appropriate pacing</p>
              <p className="text-sm text-gray-600">• Ensure consistent audio quality throughout the recording</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-1">Transcription Validation</h4>
              <p className="text-sm text-gray-600">• Verify word-for-word accuracy with the original audio</p>
              <p className="text-sm text-gray-600">• Check proper punctuation and formatting</p>
              <p className="text-sm text-gray-600">• Ensure consistent style following project guidelines</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
