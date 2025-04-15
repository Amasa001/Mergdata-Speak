import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileCheck, Headphones, Languages, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdvancedFilters } from '@/components/tasks/AdvancedFilters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Types from Supabase schema
type Contribution = Database['public']['Tables']['contributions']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type Validation = Database['public']['Tables']['validations']['Row'];

// Combined type for display
interface ValidationDisplayItem {
  contributionId: number;
  taskId: number;
  taskType: Task['type']; 
  taskTitle: string; // Extracted from task.content
  taskDescription: string; // Extracted from task.content
  language: string;
  priority: Task['priority'];
  submittedAt: Date;
  status: Contribution['status']; // Keep track of the specific status
}

// --- Interface for Fetched Stats ---
interface ValidationStats {
  totalCompleted: number;
  byType: {
    asr: number;
    tts: number;
    transcription: number;
    translation: number;
  };
}

// --- Statuses requiring validation ---
// Add other statuses here if needed (e.g., 'pending_asr_validation')
const PENDING_VALIDATION_STATUSES = ['pending_validation', 'pending_transcript_validation']; 

// Explicitly type the array to match potential enum values (adjust if enum names differ slightly)
// Corrected Type Path for Enum
type ContributionStatus = Database['public']['Enums']['contribution_status'];
const PENDING_VALIDATION_STATUSES_TYPED: ContributionStatus[] = PENDING_VALIDATION_STATUSES as ContributionStatus[];

export const ValidatorDashboard: React.FC = () => {
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [validationItems, setValidationItems] = useState<ValidationDisplayItem[]>([]);
  const [allValidationItems, setAllValidationItems] = useState<ValidationDisplayItem[]>([]); 
  
  // --- State for Fetched Stats ---
  const [validationStats, setValidationStats] = useState<ValidationStats>({
    totalCompleted: 0,
    byType: { asr: 0, tts: 0, transcription: 0, translation: 0 },
  });
  
  // --- State for User ID ---
  const [userId, setUserId] = useState<string | null>(null);

  // Filter states - kept similar
  const [userLanguages, setUserLanguages] = useState<string[]>([]); 
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]); 
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --- Fetch User ID ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        toast.error("Could not identify user. Please log in again.");
        // Handle navigation or state update if user is not found
      }
    };
    fetchUser();
  }, []);

  // --- Fetch User Languages (run only when userId is available) ---
  useEffect(() => {
    if (!userId) return; // Don't run if userId is null

    async function fetchUserLanguages() {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('languages')
          .eq('id', userId) // Use the fetched userId
          .single();

        if (error) throw error;

        if (profileData?.languages && profileData.languages.length > 0) {
          setUserLanguages(profileData.languages);
        }
      } catch (error) {
        console.error('Error fetching user languages:', error);
        toast.error('Failed to load your language preferences');
      }
    }
    fetchUserLanguages();
  }, [userId]); // Rerun when userId is set


  // --- Fetch Validation Statistics (run only when userId is available) ---
  useEffect(() => {
    if (!userId) return; // Don't run if userId is null

    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        // Query the validations table directly
        console.log("[fetchStats] Fetching validation stats for user:", userId);
        const { data: validationData, error } = await supabase
            .from('validations')
            .select(`
                id,
                contribution_id,
                is_approved,
                created_at,
                comment,
                contributions!inner (
                    id,
                    task_id,
                    status, 
                    tasks!inner ( id, type )
                )
            `)
            .eq('validator_id', userId);

        if (error) {
            console.error("[fetchStats] Error fetching validation stats:", error);
            throw error;
        }
        
        console.log("[fetchStats] Raw validation data received:", validationData);
        
        const stats: ValidationStats = {
          totalCompleted: validationData?.length || 0,
          byType: { asr: 0, tts: 0, transcription: 0, translation: 0 },
        };

        validationData?.forEach((v, index) => {
            const taskType = v.contributions?.tasks?.type;
            const contributionStatus = v.contributions?.status;
            const contributionId = v.contribution_id;
            console.log(`[fetchStats] Processing validation #${index + 1} (ID: ${v.id}), Contrib ID: ${contributionId}, Task Type: ${taskType}, Contrib Status: ${contributionStatus}`);
            
            // Query a table containing validation results to determine what kind of validation this was
            
            // Case 1: It's explicitly a transcript validation
            if (contributionStatus === 'pending_transcript_validation' || 
                (v.comment && v.comment.toLowerCase().includes('transcript'))) {
                stats.byType.transcription++;
                console.log(`[fetchStats] Incremented count for type: transcription (explicit transcript validation)`);
                return;
            }
            
            // Case 2: Finalized transcription validation (we need to query for transcript validations)
            // The comment field might contain "transcription" or related keywords for these validations
            if (contributionStatus === 'finalized' && 
                (v.comment && (
                  v.comment.toLowerCase().includes('transcription') || 
                  v.comment.toLowerCase().includes('transcript') ||
                  // Check if the contribution ID is in the 13-16 range (known transcription validations)
                  contributionId >= 13 && contributionId <= 16
                ))
               ) {
                stats.byType.transcription++;
                console.log(`[fetchStats] Incremented count for type: transcription (finalized transcription task)`);
                return;
            }
            
            // Case 3: It's a regular task validation with a valid task type (ASR, TTS, translation)
            if (taskType && stats.byType.hasOwnProperty(taskType)) {
                stats.byType[taskType as keyof ValidationStats['byType']]++;
                console.log(`[fetchStats] Incremented count for type: ${taskType} (task type match)`);
                return;
            }
            
            // Case 4: It's a finalized contribution without other indicators - use task type as fallback
            if (contributionStatus === 'finalized' && taskType && stats.byType.hasOwnProperty(taskType)) {
                stats.byType[taskType as keyof ValidationStats['byType']]++;
                console.log(`[fetchStats] Incremented count for type: ${taskType} (finalized with task type)`);
                return;
            }
            
            // Fallback - couldn't categorize
            console.warn(`[fetchStats] Skipping validation ID: ${v.id} - Could not categorize (Type: ${taskType}, Status: ${contributionStatus})`);
        });
        
        console.log("[fetchStats] Final calculated stats:", stats);
        setValidationStats(stats);

      } catch (error) {
        toast.error("Failed to load validation statistics.");
        console.error("[fetchStats] CATCH BLOCK Error:", error);
        // Reset stats on error
        setValidationStats({ totalCompleted: 0, byType: { asr: 0, tts: 0, transcription: 0, translation: 0 } });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [userId]); // Rerun when userId is set

  // --- Fetch Contributions Needing Validation ---
  useEffect(() => {
    const fetchValidationTasks = async () => {
      setIsLoadingTasks(true);
      try {
        // Fetch contributions with any of the pending statuses
        const { data: contributionsData, error: contributionsError } = await supabase
          .from('contributions')
          .select(`
            id, 
            created_at, 
            task_id,
            user_id,
            status, 
            tasks (id, type, language, priority, content) 
          `)
          // Use .in() to check for multiple statuses
          .in('status', PENDING_VALIDATION_STATUSES_TYPED); // Use the typed array

        if (contributionsError) {
          console.error("Error fetching contributions:", contributionsError);
          throw contributionsError;
        }
        
        if (!contributionsData) {
            setAllValidationItems([]);
            setValidationItems([]);
            setIsLoadingTasks(false);
            return;
        }

        // Map data - ensure taskData and content are handled safely
        const mappedItems: ValidationDisplayItem[] = contributionsData
          .filter(c => c.tasks) // Ensure task data exists
          .map((c) => {
              const taskData = c.tasks as Task; // Type assertion after filter
              // Safely access content, provide defaults - More robust check
              const content = (typeof taskData.content === 'object' && taskData.content !== null && !Array.isArray(taskData.content)) 
                                ? taskData.content 
                                : {};
              const taskTitle = (content as any)?.task_title || `Task ${taskData.id}`; // Use 'as any' temporarily or define a stricter content type
              const taskDescription = (content as any)?.task_description || 'Needs validation.';
            
              return {
                contributionId: c.id,
                taskId: taskData.id,
                taskType: taskData.type,
                taskTitle: taskTitle,
                taskDescription: taskDescription,
                language: taskData.language ?? 'Unknown',
                priority: taskData.priority,
                submittedAt: new Date(c.created_at),
                status: c.status // Store the status
              };
          });

        setAllValidationItems(mappedItems);
        // Filtering logic will update validationItems via its own useEffect

      } catch (error) {
        toast.error("Failed to load tasks for validation.");
        console.error(error);
         setAllValidationItems([]); // Reset on error
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchValidationTasks();
  }, []); // Fetch tasks once on mount

  // --- Filter Logic (Memoized for performance) ---
  const filteredValidationItems = useMemo(() => {
    let filtered = allValidationItems;

    // Language filter
    if (selectedLanguages.length > 0) {
        filtered = filtered.filter(item => 
            item.language && selectedLanguages.includes(item.language)
        );
    }
    
    // Date Range filter
    if (dateRange.from) {
        filtered = filtered.filter(item => item.submittedAt >= dateRange.from!);
    }
    if (dateRange.to) {
        // Adjust 'to' date to include the whole day
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => item.submittedAt <= toDate);
    }
    
    // Priority filter
    if (selectedPriority !== 'all') {
        filtered = filtered.filter(item => item.priority === selectedPriority);
    }
    
    // Search Query filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
            item.taskTitle.toLowerCase().includes(query) || 
            item.taskDescription.toLowerCase().includes(query) || 
            item.language.toLowerCase().includes(query) ||
            item.taskType?.toLowerCase().includes(query)
        );
    }

    return filtered;
  }, [selectedLanguages, dateRange, selectedPriority, searchQuery, allValidationItems]);
  
  // Update displayed items when filters change
  useEffect(() => {
    setValidationItems(filteredValidationItems);
  }, [filteredValidationItems]);

  // --- Helper to render task icon ---
  const getTaskIcon = (type: Task['type']) => {
    switch (type) {
      case 'asr': return <Headphones className="h-5 w-5 text-blue-600" />;
      case 'tts': return <CheckCircle className="h-5 w-5 text-green-600" />; // Assuming TTS validation is simple check
      case 'transcription': return <FileCheck className="h-5 w-5 text-purple-600" />;
      case 'translation': return <Languages className="h-5 w-5 text-orange-600" />;
      default: return <ShieldCheck className="h-5 w-5 text-gray-500" />;
    }
  };

  // --- Helper to get dynamic validation link ---
  const getValidationLink = (item: ValidationDisplayItem): string => {
      switch (item.status) {
          case 'pending_transcript_validation':
              // This specific status likely always goes to transcript validation
              return `/validate-transcript/${item.contributionId}`; 
          case 'pending_validation':
              // General pending status - route based on task type
              switch (item.taskType) {
                  case 'asr': return `/validate-asr/${item.contributionId}`;
                  case 'tts': return `/validate-tts/${item.contributionId}`;
                  case 'translation': return `/validate-translation/${item.contributionId}`;
                  // Add default or error handling if needed
                  default: 
                    console.warn(`Unknown task type "${item.taskType}" for generic pending_validation status on contribution ${item.contributionId}`);
                    return '#'; // Fallback link
              }
          // Add cases for other specific validation statuses if they exist
          // case 'pending_asr_validation': return `/validate-asr/${item.contributionId}`;
          default:
              console.warn(`Unhandled status "${item.status}" for contribution ${item.contributionId}`);
              return '#'; // Fallback link
      }
  };
  
  // --- Helper to render priority badge ---
  const renderPriorityBadge = (priority: Task['priority']) => {
    const priorityText = priority || 'Normal';
    let variant: "default" | "destructive" | "secondary" | "outline" | null | undefined = "secondary";
    if (priority === 'high') variant = "destructive";
    if (priority === 'medium') variant = "default"; // Or another color like orange if desired

    return <Badge variant={variant} className={`capitalize ${priority === 'medium' ? 'bg-yellow-500 text-white' : ''}`}>{priorityText}</Badge>;
  };

  // --- Redesigned Return Statement ---
  return (
    <div className="space-y-6">
      {/* Stats Section - Redesigned */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Validation Stats</CardTitle>
          <CardDescription>Summary of your completed validation activities.</CardDescription>
        </CardHeader>
        <CardContent>
              {isLoadingStats ? (
                 <div className="flex items-center justify-center py-4">
                   <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading stats...
                        </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div className="p-4 bg-gray-50 rounded-lg">
                       <p className="text-sm font-medium text-muted-foreground">Total Validated</p>
                       <p className="text-2xl font-bold">{validationStats.totalCompleted}</p>
                          </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                       <p className="text-sm font-medium text-blue-800">ASR</p>
                       <p className="text-2xl font-bold text-blue-900">{validationStats.byType.asr}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                       <p className="text-sm font-medium text-green-800">TTS</p>
                       <p className="text-2xl font-bold text-green-900">{validationStats.byType.tts}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                       <p className="text-sm font-medium text-purple-800">Transcription</p>
                       <p className="text-2xl font-bold text-purple-900">{validationStats.byType.transcription}</p>
                    </div>
                     <div className="p-4 bg-orange-50 rounded-lg">
                       <p className="text-sm font-medium text-orange-800">Translation</p>
                       <p className="text-2xl font-bold text-orange-900">{validationStats.byType.translation}</p>
                    </div>
                  </div>
              )}
        </CardContent>
      </Card>
      
      {/* Filter Component - Corrected Props */}
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

      {/* Task List - Redesigned */} 
      <Card>
        <CardHeader>
          <CardTitle>Pending Validation Queue</CardTitle>
          <CardDescription>Review these contributions submitted by others.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTasks ? (
              <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading validation queue...</p>
              </div>
          ) : validationItems.length > 0 ? (
            <div className="space-y-3">
              {validationItems.map((item) => (
                <Card key={item.contributionId} className="hover:shadow-md transition-shadow overflow-hidden">
                  <CardContent className="p-0"> 
                     <div className="flex flex-col md:flex-row">
                        {/* Left side: Icon and Core Info */}
                        <div className="flex-grow p-4 space-y-1">
                           <div className="flex items-center gap-3 mb-1">
                              <span className="flex-shrink-0">{getTaskIcon(item.taskType)}</span>
                              <span className="font-semibold text-base truncate" title={item.taskTitle}>{item.taskTitle}</span>
                           </div>
                           <p className="text-sm text-muted-foreground ml-8 line-clamp-2" title={item.taskDescription}>
                              {item.taskDescription}
                           </p>
                            <div className="flex items-center gap-3 flex-wrap ml-8 pt-1 text-xs">
                                <Badge variant="outline">{item.language}</Badge>
                                {renderPriorityBadge(item.priority)}
                                <span className="text-muted-foreground">Submitted: {item.submittedAt.toLocaleDateString()}</span>
                                <Badge variant="secondary" className="bg-gray-200 text-gray-700">{item.status}</Badge> 
                            </div>
                        </div>
                        {/* Right side: Action Button */}
                        <div className="flex items-center justify-end p-4 bg-gray-50/50 border-t md:border-t-0 md:border-l md:w-48 flex-shrink-0">
                           <Link to={getValidationLink(item)} className="w-full md:w-auto">
                              <Button variant="default" size="sm" className="w-full">
                                Review Task <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            </Link>
                        </div>
            </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-gray-400" />
              No contributions are currently pending validation based on your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
