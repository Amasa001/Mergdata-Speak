import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SkipForward, ThumbsUp, ThumbsDown, Play, Pause, Star, Globe, FastForward, Rewind, Languages, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { TranscriptionEditor } from '@/components/transcription/TranscriptionEditor';
import { LanguageFilter } from '@/components/tasks/LanguageFilter';
import { RejectionReasonDialog } from '@/components/validation/RejectionReasonDialog';
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Define type for validation status
interface ValidationStatus {
  status: 'pending' | 'approved' | 'rejected' | 'approved_for_transcription' | 'rejected_audio' | 'pending_validation';
  issues?: string[];
  rating?: number;
  submitted?: boolean;
}

// Define more specific types for tasks (improves type safety)
type BaseTask = { id: number; language: string; userInfo: string };
type ASRTaskItem = BaseTask & { imageUrl: string; recordingUrl: string };
type TTSTaskItem = BaseTask & { text: string; recordingUrl: string };
type TranscriptionTaskItem = BaseTask & { audioUrl: string; transcription: string };
// New type for translation validation tasks
type TranslationTaskItem = BaseTask & { 
  sourceText: string; 
  targetText: string; // This will be the CURRENT editable text
  sourceLanguage: string; 
  targetLanguage: string;
  audioUrl?: string; // Optional audio recording of the translation
  status: 'pending_validation' | 'rejected'; // Make status required
  previousTranslationText?: string; // Text from the rejected submission
  previousValidatorComment?: string; // Comment from the validator who rejected
};
type AnyTaskItem = ASRTaskItem | TTSTaskItem | TranscriptionTaskItem | TranslationTaskItem;

// Define rejection reasons (Corrected syntax)
const asrRejectionReasons = [
  { value: 'NOISY', label: 'Background noise too high' },
  { value: 'SILENT', label: 'Recording is silent or mostly silent' },
  { value: 'UNRELATED', label: 'Recording doesn\'t describe the image' }, // Escaped apostrophe
  { value: 'WRONG_LANG', label: 'Recording is in the wrong language' },
  { value: 'UNCLEAR', label: 'Speech is unclear/muffled' },
  { value: 'CUT_OFF', label: 'Recording seems incomplete/cut off' },
];
const ttsRejectionReasons = [
  { value: 'MISREAD', label: 'Did not read the provided text accurately' },
  { value: 'UNCLEAR', label: 'Speech is unclear/muffled' },
  { value: 'NOISY', label: 'Background noise too high' },
  { value: 'UNNATURAL', label: 'Pronunciation or intonation sounds unnatural' },
  { value: 'WRONG_LANG', label: 'Spoken in the wrong language' },
  { value: 'CUT_OFF', label: 'Recording seems incomplete/cut off' },
];
const transcriptionRejectionReasons = [
  { value: 'INACCURATE', label: 'Transcription doesn\'t match the audio significantly' }, // Escaped apostrophe
  { value: 'WRONG_LANG', label: 'Transcription is in the wrong language' },
  { value: 'MISSING_CONTENT', label: 'Significant parts of the audio are not transcribed' },
  { value: 'GARBLED', label: 'Transcription is nonsensical or garbled' },
];
// New set of reasons for translation validation
const translationRejectionReasons = [
  { value: 'INACCURATE', label: 'Translation is inaccurate or doesn\'t convey the original meaning' },
  { value: 'WRONG_LANG', label: 'Translation is not in the correct target language' },
  { value: 'GRAMMAR', label: 'Contains significant grammatical errors' },
  { value: 'INCOMPLETE', label: 'Translation is incomplete or missing key parts' },
  { value: 'NONSENSICAL', label: 'Translation is nonsensical or unintelligible' },
  { value: 'QUALITY', label: 'Translation quality is too low for use' },
];

// Helper to format time
const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Add interface for content structure
interface TaskContent {
  image_url?: string;
  task_title?: string;
  task_description?: string;
  text_to_speak?: string;
  text_prompt?: string;
  source_text?: string;
  source_language?: string;
  transcription?: string;
  translation?: string;
}

// Add interface for submitted data structure
interface SubmittedTranslationData {
  translation_text?: string;
  translation?: string;
  [key: string]: any;
}

// Mock task arrays for fallback
const mockASRTasks: ASRTaskItem[][] = [[]];
const mockTTSTasks: TTSTaskItem[][] = [[]];
const mockTranscriptionTasks: TranscriptionTaskItem[][] = [[]];
const mockTranslationTasks: TranslationTaskItem[][] = [[]];

const ValidateTask = () => {
  const navigate = useNavigate();
  const { contributionId } = useParams();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [validations, setValidations] = useState<Record<number, ValidationStatus>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState('asr');
  const [editedTranscription, setEditedTranscription] = useState<string>("");
  const [isTranscriptionEdited, setIsTranscriptionEdited] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionTarget, setRejectionTarget] = useState<{ taskId: number; type: 'asr' | 'tts' | 'transcription' | 'translation' } | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<number, number>>({});
  const [audioCurrentTimes, setAudioCurrentTimes] = useState<Record<number, number>>({});
  const [audioPlaybackRates, setAudioPlaybackRates] = useState<Record<number, number>>({});
  const [isSeeking, setIsSeeking] = useState<Record<number, boolean>>({});
  // Add state for translation feedback
  const [editedTranslation, setEditedTranslation] = useState<string>("");
  const [isTranslationEdited, setIsTranslationEdited] = useState(false);
  const [translationFeedback, setTranslationFeedback] = useState<Record<number, string>>({});
  const [realTaskBatches, setRealTaskBatches] = useState<AnyTaskItem[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [realContributions, setRealContributions] = useState<any[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);

  // State for real task data (replacing mock data)
  const [realASRTasks, setRealASRTasks] = useState<ASRTaskItem[][]>([]);
  const [realTTSTasks, setRealTTSTasks] = useState<TTSTaskItem[][]>([]);
  const [realTranscriptionTasks, setRealTranscriptionTasks] = useState<TranscriptionTaskItem[][]>([]);
  const [realTranslationTasks, setRealTranslationTasks] = useState<TranslationTaskItem[][]>([]);

  // Fetch user ID when component mounts
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    
    fetchUserId();
  }, []);

  // Add this at the beginning of the component function
  useEffect(() => {
    if (contributionId) {
      console.log(`Loading specific contribution ID: ${contributionId}`);
      loadSpecificContribution(parseInt(contributionId));
    }
  }, [contributionId]);

  // Function to load a specific contribution by ID
  const loadSpecificContribution = async (id: number) => {
    setIsLoading(true);
    try {
      const { data: contribution, error } = await supabase
        .from('contributions')
        .select('*, tasks(*)')
        .eq('id', id)
        .single();
      
      if (error || !contribution) {
        console.error('Error loading specific contribution:', error);
        toast({
          title: "Error",
          description: "Failed to load the validation task.",
          variant: "destructive"
        });
        navigate('/validate');
        return;
      }
      
      console.log('Loaded specific contribution:', contribution);
      
      // Set active tab based on the task type
      if (contribution.tasks?.type) {
        setActiveTab(contribution.tasks.type);
      }
      
      // Convert to the appropriate task format and add to state
      const task = convertContributionToTask(contribution);
      const taskBatch = [[task]]; // Create a batch with just this task
      
      // For translation tasks, initialize the edited translation state
      if (contribution.tasks?.type === 'translation') {
        const submittedData = contribution.submitted_data as SubmittedTranslationData;
        const translationText = submittedData?.translation_text || submittedData?.translation || '';
        setEditedTranslation(translationText);
        setIsTranslationEdited(false);
      }
      
      // Update the appropriate task array based on type
      if (contribution.tasks?.type === 'asr') {
        setRealASRTasks(taskBatch as ASRTaskItem[][]);
      } else if (contribution.tasks?.type === 'tts') {
        setRealTTSTasks(taskBatch as TTSTaskItem[][]);
      } else if (contribution.tasks?.type === 'transcription') {
        setRealTranscriptionTasks(taskBatch as TranscriptionTaskItem[][]);
      } else if (contribution.tasks?.type === 'translation') {
        setRealTranslationTasks(taskBatch as TranslationTaskItem[][]);
      }
      
      // Reset navigation indices
      setCurrentBatchIndex(0);
      setCurrentTaskIndex(0);
      
    } catch (err) {
      console.error('Error loading contribution:', err);
      toast({
        title: "Error",
        description: "Failed to load the requested validation task.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to convert a contribution to a task item
  const convertContributionToTask = (contribution: any): AnyTaskItem => {
    // Create base task properties
    const baseTask: BaseTask = {
      id: contribution.id,
      language: contribution.tasks.language,
      userInfo: `Task ID: ${contribution.task_id}`
    };
    
    // Parse content and submitted data
    const content = typeof contribution.tasks.content === 'object'
      ? contribution.tasks.content as TaskContent
      : {} as TaskContent;
      
    const submittedData = typeof contribution.submitted_data === 'object'
      ? contribution.submitted_data as SubmittedTranslationData
      : {} as SubmittedTranslationData;
    
    // Create the appropriate task based on type
    switch (contribution.tasks.type) {
      case 'asr':
        return {
          ...baseTask,
          imageUrl: content.image_url || '',
          recordingUrl: contribution.storage_url || ''
        } as ASRTaskItem;
        
      case 'tts':
        // Ensure we handle both text_to_speak and text_prompt from the content
        const ttsText = content.text_to_speak || content.text_prompt || '';
        console.log('[convertContributionToTask] Processing TTS task:', { contributionId: contribution.id, rawContent: content, extractedText: ttsText });
        return {
          ...baseTask,
          text: ttsText, // Use the 'text' field as defined in TTSTaskItem
          recordingUrl: contribution.storage_url || ''
        } as TTSTaskItem;
        
      case 'transcription':
        return {
          ...baseTask,
          audioUrl: contribution.storage_url || '',
          transcription: submittedData.transcription || ''
        } as TranscriptionTaskItem;
        
      case 'translation':
        return {
          ...baseTask,
          sourceText: content.source_text || '',
          targetText: submittedData.translation_text || submittedData.translation || '',
          sourceLanguage: content.source_language || '',
          targetLanguage: contribution.tasks.language,
          audioUrl: contribution.storage_url,
          status: contribution.status,
          previousTranslationText: contribution.previous_translation_text,
          previousValidatorComment: contribution.previous_validator_comment
        } as TranslationTaskItem;
        
      default:
        throw new Error(`Unknown task type: ${contribution.tasks.type}`);
    }
  };

  // Fetch contributions that need validation
  const fetchContributionsForValidation = async (taskType: string, language: string = 'all') => {
    setIsLoading(true);
    setError(null);
    setRealTaskBatches([]); // Clear previous batches

    try {
      // Fetch contributions pending validation or rejected
      const { data: contributions, error: contributionsError } = await supabase
        .from('contributions')
        .select('*, tasks(*)') // Select related task data
        .in('status', ['pending_validation', 'rejected']);

      if (contributionsError) throw contributionsError;

      if (!contributions || contributions.length === 0) {
        setIsLoading(false);
        return; // No tasks found
      }

      // Filter contributions by task type and language
      const filteredContributions = contributions.filter(contribution => {
        const task = contribution.tasks;
        if (!task) return false; // Skip if task data is missing

        if (taskType !== 'all' && task.type !== taskType) return false;
        if (language !== 'all' && task.language?.toLowerCase() !== language.toLowerCase()) return false;

        return true;
      });

      // Get IDs of rejected contributions to fetch validation comments
      const rejectedContributionIds = filteredContributions
        .filter(c => c.status === 'rejected')
        .map(c => c.id);

      // Fetch the latest validation comment for each rejected contribution
      let validationComments: Record<number, string> = {};
      if (rejectedContributionIds.length > 0) {
        const { data: validationsData, error: validationsError } = await supabase
          .from('validations')
          .select('contribution_id, comment')
          .in('contribution_id', rejectedContributionIds)
          .eq('is_approved', false)
          .order('created_at', { ascending: false }); // Get the latest first

        if (validationsError) {
          console.error('Error fetching validation comments:', validationsError);
          // Continue without comments, but log the error
        } else if (validationsData) {
          // Create a map of contributionId to the latest comment
          validationsData.forEach(v => {
            if (!validationComments[v.contribution_id]) { // Only take the first (latest) comment
              validationComments[v.contribution_id] = v.comment || 'No comment provided.';
            }
          });
        }
      }

      // Transform contributions into task items for the UI
      const taskItemsPromises = filteredContributions.map(async (contribution) => {
        const task = contribution.tasks;
        if (!task) return null; // Should not happen due to filter, but check anyway

        // Get user info for the contribution
        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', contribution.user_id)
          .single();
        const userInfo = userData?.full_name || `User ID: ${contribution.user_id}`;

        // Base task properties
        const baseTask: BaseTask = {
          id: contribution.id,
          language: task.language,
          userInfo: userInfo
        };

        const content = typeof task.content === 'object' ? task.content as TaskContent : {} as TaskContent;
        const submittedData = typeof contribution.submitted_data === 'object' ? contribution.submitted_data as SubmittedTranslationData : {} as SubmittedTranslationData;

        // Create the appropriate task type based on the task type
        switch (task.type) {
          case 'asr':
            return { ...baseTask, imageUrl: content.image_url || '', recordingUrl: contribution.storage_url || '' } as ASRTaskItem;
          case 'tts':
            // Ensure consistency here too
            const ttsText = content.text_to_speak || content.text_prompt || '';
            console.log('[fetchContributionsForValidation map] Processing TTS task:', { contributionId: contribution.id, rawContent: content, extractedText: ttsText });
            return { ...baseTask, text: ttsText, recordingUrl: contribution.storage_url || '' } as TTSTaskItem;
          case 'transcription':
            return { ...baseTask, audioUrl: contribution.storage_url || '', transcription: submittedData.transcription || '' } as TranscriptionTaskItem;
          case 'translation':
            const isRejected = contribution.status === 'rejected';
            const rejectedText = submittedData.translation_text || submittedData.translation || '';
            return {
              ...baseTask,
              sourceText: content.source_text || '',
              targetText: isRejected ? '' : rejectedText, // Start empty for rejected tasks
              sourceLanguage: content.source_language || '',
              targetLanguage: task.language,
              audioUrl: contribution.storage_url,
              status: contribution.status as 'pending_validation' | 'rejected', // Explicitly cast status
              previousTranslationText: isRejected ? rejectedText : undefined,
              previousValidatorComment: isRejected ? validationComments[contribution.id] : undefined
            } as TranslationTaskItem;
          default:
            console.warn(`Unknown task type encountered: ${task.type}`);
            return null; // Skip unknown task types
        }
      });

      const taskItems = (await Promise.all(taskItemsPromises)).filter(item => item !== null) as AnyTaskItem[];

      // Sort tasks to show rejected ones first
      taskItems.sort((a, b) => {
        const aStatus = (a as TranslationTaskItem)?.status;
        const bStatus = (b as TranslationTaskItem)?.status;
        if (aStatus === 'rejected' && bStatus !== 'rejected') return -1;
        if (bStatus === 'rejected' && aStatus !== 'rejected') return 1;
        return 0;
      });

      // Group tasks into batches
      const BATCH_SIZE = 10;
      const batches: AnyTaskItem[][] = [];
      for (let i = 0; i < taskItems.length; i += BATCH_SIZE) {
        batches.push(taskItems.slice(i, i + BATCH_SIZE));
      }

      // Update state based on the active tab
      if (taskType === 'asr') setRealASRTasks(batches as ASRTaskItem[][]);
      else if (taskType === 'tts') setRealTTSTasks(batches as TTSTaskItem[][]);
      else if (taskType === 'transcription') setRealTranscriptionTasks(batches as TranscriptionTaskItem[][]);
      else if (taskType === 'translation') setRealTranslationTasks(batches as TranslationTaskItem[][]);
      else setRealTaskBatches(batches); // Fallback for 'all' or unexpected type

    } catch (err: any) {
      console.error('Error fetching contributions for validation:', err);
      setError(err.message || 'Failed to fetch contributions');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch contributions when activeTab or selectedLanguage changes
  useEffect(() => {
    // Only run if contributionId is NOT present (we are not loading a specific one)
    if (!contributionId) {
        // Reset indices and state when tab or language changes
        setCurrentTaskIndex(0);
        setCurrentBatchIndex(0);
        setValidations({});
        setRatings({});
        setEditedTranscription("");
        setIsTranslationEdited(false);
        setTranslationFeedback({});
        
        // Map the activeTab to the correct task type in the database
        const taskTypeMap: Record<string, string> = {
          'asr': 'asr',
          'tts': 'tts',
          'transcription': 'transcription',
          'translation': 'translation'
        };
        
        const taskType = taskTypeMap[activeTab] || 'all';
        
        // Fetch contributions for validation
        console.log(`[useEffect fetchContributions] Triggered by tab/language change. Fetching ${taskType} for ${selectedLanguage}`);
        fetchContributionsForValidation(taskType, selectedLanguage);
    }
    
  // ONLY depend on activeTab, selectedLanguage, and contributionId (to know when *not* to run)
  }, [activeTab, selectedLanguage, contributionId]);

  // Helper function to get available languages
  const getAvailableLanguages = () => {
    // Extract unique languages from tasks
    const uniqueLanguages = new Set<string>();
    
    const addLanguagesFromTasks = (tasks: AnyTaskItem[][]) => {
      tasks.forEach(batch => {
        batch.forEach(task => {
          if (task && task.language) {
            uniqueLanguages.add(task.language);
          }
        });
      });
    };
    
    // Add languages from all task types
    addLanguagesFromTasks(realASRTasks);
    addLanguagesFromTasks(realTTSTasks);
    addLanguagesFromTasks(realTranscriptionTasks);
    addLanguagesFromTasks(realTranslationTasks);
    
    return Array.from(uniqueLanguages).filter(lang => lang && lang.trim() !== '');
  };

  // Update getFilteredTaskBatches to use real data
  const getFilteredTaskBatches = (): AnyTaskItem[][] => {
    if (activeTab === 'asr') {
      return realASRTasks.length > 0 ? realASRTasks : mockASRTasks;
    } else if (activeTab === 'tts') {
      return realTTSTasks.length > 0 ? realTTSTasks : mockTTSTasks;
    } else if (activeTab === 'transcription') {
      return realTranscriptionTasks.length > 0 ? realTranscriptionTasks : mockTranscriptionTasks;
    } else if (activeTab === 'translation') {
      return realTranslationTasks.length > 0 ? realTranslationTasks : mockTranslationTasks;
    }
    return [];
  };

  const filteredTaskBatches = getFilteredTaskBatches();
  const availableLanguages = getAvailableLanguages();

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    // Fetching logic is handled by useEffect
  };

  // Updated to use the ValidationStatus object structure
  const handleApprove = async (taskId: number) => {
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to validate tasks",
        variant: "destructive"
      });
      return;
    }
    
    // Update local state first
    setValidations({
      ...validations,
      [taskId]: { status: "approved", rating: ratings[taskId] || 5, submitted: true }
    });
    
    try {
      // 1. Insert validation record in the database
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          contribution_id: taskId,
          is_approved: true,
          validator_id: userId,
          comment: `Task approved. Rating: ${ratings[taskId] || 5}/5`
        });
      
      if (validationError) throw validationError;
      
      // 2. Update contribution status to validated
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ status: 'validated' })
        .eq('id', taskId);
      
      if (updateError) throw updateError;
      
      // 3. Get the task_id from the contribution and update the task status
      const { data: contribution, error: fetchError } = await supabase
        .from('contributions')
        .select('task_id')
        .eq('id', taskId)
        .single();
      
      if (fetchError) {
        console.warn(`Could not fetch task_id for contribution ${taskId}:`, fetchError);
      } else if (contribution?.task_id) {
        // Update the task status to completed
        const { error: taskUpdateError } = await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', contribution.task_id);
        
        if (taskUpdateError) {
          console.warn(`Could not update task status for task ${contribution.task_id}:`, taskUpdateError);
        }
      }
      
      toast({
        title: "Task Approved",
        description: "Task has been marked as validated",
      });
      
      // Move to the next task
      handleNextTask();
      
    } catch (error) {
      console.error("Error approving task:", error);
      toast({
        title: "Error",
        description: "Failed to approve the task. Please try again.",
        variant: "destructive"
      });
      
      // Revert local state on error
      setValidations(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    }
  };

  // --- TTS Validation (Approve part) --- 
  const handleTTSQualityRating = (rating: number, taskId: number) => {
    setRatings(prev => ({ ...prev, [taskId]: rating }));
  };
  
  const handleApproveTTS = async (taskId: number) => {
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to validate tasks",
        variant: "destructive"
      });
      return;
    }
    
    if (!ratings[taskId]) {
      // Use standard toast with destructive variant for warning
      toast({
        title: 'Rating Required',
        description: 'Please rate the audio quality before approving.',
        variant: 'destructive' // Use destructive style for warning
      });
      return;
    }
    
    // Update local state first
    setValidations(prev => ({ ...prev, [taskId]: { status: 'approved', rating: ratings[taskId], submitted: true } }));
    
    try {
      // 1. Insert validation record in the database
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          contribution_id: taskId,
          is_approved: true,
          validator_id: userId,
          comment: `TTS recording approved. Rating: ${ratings[taskId]}/5`
        });
      
      if (validationError) throw validationError;
      
      // 2. Update contribution status to validated
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ status: 'validated' })
        .eq('id', taskId);
      
      if (updateError) throw updateError;
      
      // 3. Get the task_id from the contribution and update the task status
      const { data: contribution, error: fetchError } = await supabase
        .from('contributions')
        .select('task_id')
        .eq('id', taskId)
        .single();
      
      if (fetchError) {
        console.warn(`Could not fetch task_id for contribution ${taskId}:`, fetchError);
      } else if (contribution?.task_id) {
        // Update the task status to completed
        const { error: taskUpdateError } = await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', contribution.task_id);
        
        if (taskUpdateError) {
          console.warn(`Could not update task status for task ${contribution.task_id}:`, taskUpdateError);
        }
      }
      
      toast({ 
        title: "Task Approved", 
        description: "TTS recording has been validated successfully" 
      });
      
      // Move to the next task
      handleNextTask();
      
    } catch (error) {
      console.error("Error approving TTS task:", error);
      toast({
        title: "Error",
        description: "Failed to approve the TTS recording. Please try again.",
        variant: "destructive"
      });
      
      // Revert local state on error
      setValidations(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    }
  };
  
  // --- Open Rejection Dialog --- 
  const openRejectionDialog = (taskId: number, type: 'asr' | 'tts' | 'transcription' | 'translation') => {
    setRejectionTarget({ taskId, type });
    setIsRejectionDialogOpen(true);
  };
  
  // --- Submit Rejection with Reason --- 
  const handleRejectionSubmit = (reason: string, otherText?: string) => {
    if (!rejectionTarget || !userId) return;
    const { taskId, type } = rejectionTarget;
    const finalReason = reason === 'other' && otherText ? otherText : reason;

    // Update local state first
    setValidations(prev => ({ ...prev, [taskId]: { status: 'rejected', submitted: true } }));

    // Construct rejection comment
    const comment = otherText ? `${reason}: ${otherText}` : reason;
    
    
    // Insert validation record in the database
    supabase.from('validations').insert({
      contribution_id: taskId,
      is_approved: false,
      validator_id: userId,
      comment: comment
    }).then(({ error }) => {
      if (error) {
        console.error('Error saving rejection:', error);
        toast({
          title: "Error",
          description: "Failed to save your rejection. Please try again.",
        variant: "destructive"
      });
      return;
    }

      // Get the contribution to find its associated task
      supabase.from('contributions')
        .select('task_id')
        .eq('id', taskId)
        .single()
        .then(({ data: contribution, error: fetchError }) => {
          if (fetchError || !contribution) {
            console.error("Error fetching contribution:", fetchError);
            return;
          }
          
          // Set contribution status to 'rejected' for all task types to allow resubmission
          const newStatus = 'rejected';
          
          supabase.from('contributions')
            .update({ status: newStatus })
            .eq('id', taskId)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error("Error updating contribution status:", updateError);
              }
              
              // For all tasks, ensure the task stays assigned to the same contributor for revisions
              // This matches the expected pattern for translation, TTS, etc.
              supabase.from('tasks')
                .update({ status: 'assigned' })
                .eq('id', contribution.task_id)
                .then(({ error: taskUpdateError }) => {
                  if (taskUpdateError) {
                    console.error("Error updating task status:", taskUpdateError);
                  }
                });
            });
        });
    
    toast({
        title: "Task Returned for Correction", 
        description: `The contributor will need to fix this submission. Reason: ${reason}`,
        variant: "destructive" 
      });
      
      setIsRejectionDialogOpen(false);
      setRejectionTarget(null);
      handleNextTask();
    });
  };

  // --- Transcription Validation (Approve part) --- 
  const handleTranscriptionChange = (text: string) => {
    setEditedTranscription(text);
    setIsTranscriptionEdited(true);
  };

  const handleApproveTranscription = async (taskId: number) => {
    if (!userId || !currentTask) return;
    
    // Update local validation state
    setValidations(prev => ({ ...prev, [taskId]: { status: 'approved', submitted: true } }));

    try {
      // 1. Get the contribution to find its associated task
      const { data: contribution, error: fetchError } = await supabase
        .from('contributions')
        .select('task_id, submitted_data')
        .eq('id', taskId)
        .single();
      
      if (fetchError || !contribution) {
        console.error("Error fetching contribution:", fetchError);
        throw fetchError;
      }
      
      // 2. Insert validation record
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          contribution_id: taskId,
          is_approved: true,
          validator_id: userId,
          comment: `Transcription approved.`
        });
      
      if (validationError) throw validationError;
      
      // 3. Update the submitted data with the edited transcription if it was changed
      const updatedSubmittedData = {
        ...(typeof contribution.submitted_data === 'object' ? contribution.submitted_data : {}),
        transcription: editedTranscription
      };
      
      // 4. Update contribution status to validated
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ 
          status: 'validated',
          submitted_data: updatedSubmittedData 
        })
        .eq('id', taskId);
      
      if (updateError) throw updateError;
      
      // 5. Update the task status to completed
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', contribution.task_id);
      
      if (taskUpdateError) {
        console.warn(`Could not update task status for task ${contribution.task_id}:`, taskUpdateError);
      }
      
      toast({
        title: "Transcription Approved",
        description: "The transcription has been approved and finalized."
      });
      
      setIsTranscriptionEdited(false); // Reset edit state
      handleNextTask();
      
    } catch (error) {
      console.error("Error approving transcription:", error);
      toast({
        title: "Error",
        description: "Failed to approve the transcription. Please try again.",
        variant: "destructive"
      });
      
      // Revert local state on error
      setValidations(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    }
  };
  
  // --- Navigation & Submission --- 
  const handleSkipTask = () => {
    toast({
      title: "Task skipped",
      description: "Moving to the next task."
    });
    handleNextTask();
  };
  
  const handleNextTask = () => {
    if (filteredTaskBatches.length === 0) return;
    const currentBatch = filteredTaskBatches[currentBatchIndex];
    if (!currentBatch) return;
    
    const nextTaskIndex = currentTaskIndex + 1;
    let nextBatchIndex = currentBatchIndex;

    if (nextTaskIndex >= currentBatch.length) {
      // Move to the next batch
      nextBatchIndex++;
      if (nextBatchIndex >= filteredTaskBatches.length) {
        // Last task of the last batch, submit
        handleSubmitBatch();
        return;
      } else {
        // Start of the next batch
        setCurrentBatchIndex(nextBatchIndex);
        setCurrentTaskIndex(0);
        toast({ title: "New batch started" });
      }
    } else {
      // Move to the next task in the current batch
      setCurrentTaskIndex(nextTaskIndex);
    }

    // Reset specific states for the next task
    const nextTask = getCurrentTask(currentTaskIndex, currentBatchIndex); // Get the task we are navigating TO

    // Reset Transcription State
    setIsTranscriptionEdited(false);
    if (activeTab === 'transcription' && nextTask && 'transcription' in nextTask) {
        setEditedTranscription(nextTask.transcription || '');
    } else {
        setEditedTranscription('');
    }

    // Reset Translation State
    setIsTranslationEdited(false);
    if (activeTab === 'translation' && nextTask && 'targetText' in nextTask) {
      // For rejected tasks, targetText is initially empty, so editedTranslation starts empty.
      // For pending tasks, targetText has the submitted value.
      setEditedTranslation(nextTask.targetText || ''); 
    } else {
      setEditedTranslation('');
    }
    // Clear feedback for the next task
    setTranslationFeedback(prev => ({ ...prev, [nextTask?.id || 0]: '' })); 

  };
  
  const handleSubmitBatch = async () => {
    setIsSubmitting(true);
    console.log("Submitting batch results:", { validations, ratings });
    
    try {
      // Only process validations that haven't been submitted individually
      const pendingValidations = Object.entries(validations).filter(([taskId, status]) => {
        // If the task has been explicitly approved or rejected, it would have been submitted already
        // This typically includes tasks that were skipped or not acted upon
        return !status.submitted;
      });
      
      if (pendingValidations.length === 0) {
        // No pending validations left, we can just move to the next batch
        handleNextBatch();
        return;
      }
      
      // Process all remaining validations
      const validationPromises = pendingValidations.map(async ([taskIdStr, validationStatus]) => {
        const taskId = parseInt(taskIdStr);
        const status = validationStatus.status;
        const rating = validationStatus.rating;
        
        // Skip if we don't have userId
        if (!userId) {
          console.error("Cannot submit validation without user ID");
          return { success: false, taskId, error: "No user ID" };
        }
        
        try {
          // 1. Insert validation record
          const { error: validationError } = await supabase
            .from('validations')
            .insert({
              contribution_id: taskId,
              is_approved: status === 'approved' || status === 'approved_for_transcription',
              validator_id: userId,
              comment: status === 'approved_for_transcription' 
                ? `Audio approved for transcription. Rating: ${rating || 5}/5`
                : status === 'approved'
                  ? `Task approved. Rating: ${rating || 5}/5`
                  : `Task ${status}. Rating: ${rating || 5}/5`
              // Removed metadata field as it doesn't exist in the table
            });
          
          if (validationError) throw validationError;
          
          // 2. Update contribution status
          let newStatus: "rejected" | "rejected_audio" | "pending_validation" | "validated" | "ready_for_transcription" | "in_transcription" | "pending_transcript_validation" | "rejected_transcript" | "finalized";

          if (status === 'rejected') {
            newStatus = 'rejected_audio';
          } else if (status === 'approved') {
            newStatus = 'validated';
          } else if (status === 'approved_for_transcription') {
            // Handle transcription separately (follow up with createTranscriptionTask)
            await handleApproveForTranscription(taskId);
            return { success: true, taskId };
          } else {
            // Default case
            newStatus = 'validated';
          }
          
          const { error: updateError } = await supabase
            .from('contributions')
            .update({ status: newStatus })
            .eq('id', taskId);
          
          if (updateError) throw updateError;
          
          // 3. If task was approved, also update the task status to completed
          if (status === 'approved') {
            // First get the task_id from the contribution
            const { data: contribution, error: fetchError } = await supabase
              .from('contributions')
              .select('task_id')
              .eq('id', taskId)
              .single();
            
            if (fetchError) {
              console.warn(`Could not fetch task_id for contribution ${taskId}:`, fetchError);
            } else if (contribution?.task_id) {
              // Update the task status
              const { error: taskUpdateError } = await supabase
                .from('tasks')
                .update({ status: 'completed' })
                .eq('id', contribution.task_id);
              
              if (taskUpdateError) {
                console.warn(`Could not update task status for task ${contribution.task_id}:`, taskUpdateError);
              }
            }
          }
          
          // Mark as submitted in local state
          setValidations(prev => ({
            ...prev,
            [taskId]: { ...prev[taskId], submitted: true }
          }));
          
          return { success: true, taskId };
        } catch (error) {
          console.error(`Error processing validation for task ${taskId}:`, error);
          return { success: false, taskId, error };
        }
      });
      
      const results = await Promise.all(validationPromises);
      const failedResults = results.filter(r => !r.success);
      
      if (failedResults.length > 0) {
        console.error("Some validations failed:", failedResults);
        toast({
          title: "Partial success",
          description: `${results.length - failedResults.length} validations submitted, ${failedResults.length} failed.`,
          variant: "destructive"
        });
      } else if (results.length > 0) {
        toast({
          title: "Batch submitted",
          description: "Your validations have been submitted successfully.",
        });
      }
      
      // Move to next batch
      handleNextBatch();
    } catch (error) {
      console.error("Error submitting batch:", error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your validations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to handle next batch navigation
  const handleNextBatch = () => {
    const nextBatchIndex = currentBatchIndex + 1;
    if (nextBatchIndex < filteredTaskBatches.length) {
      setCurrentBatchIndex(nextBatchIndex);
      setCurrentTaskIndex(0);
      setValidations({}); // Clear validations for new batch
      setRatings({}); // Clear ratings for new batch
      // Initialize first task in the new batch
      const nextTask = getCurrentTask(0, nextBatchIndex);
      if (activeTab === 'transcription' && nextTask && 'transcription' in nextTask) {
        setEditedTranscription(nextTask.transcription || '');
      } else {
        setEditedTranscription('');
      }
    } else {
      navigate('/dashboard');
    }
  };
  
  const getCurrentTask = (taskIndex = currentTaskIndex, batchIndex = currentBatchIndex): AnyTaskItem | null => {
    if (filteredTaskBatches.length === 0 || !filteredTaskBatches[batchIndex] || !filteredTaskBatches[batchIndex][taskIndex]) {
      return null; // No task available
    }
    return filteredTaskBatches[batchIndex][taskIndex];
  };

  const currentTask = getCurrentTask();
  
  const togglePlayback = (taskId: number) => {
    const audioId = `${activeTab}-${taskId}`;
    const audio = audioRefs.current[audioId];
    if (audio) {
    if (isPlaying[taskId]) {
        audio.pause();
    } else {
        // Pause other playing audio (if any)
        Object.keys(audioRefs.current).forEach(key => {
            if(key !== audioId && audioRefs.current[key]) {
                audioRefs.current[key]?.pause();
        }
      });
        // Reset isPlaying state for all other audios
        setIsPlaying(prev => Object.keys(prev).reduce((acc, key) => ({...acc, [key]: false}), {}));
        
        // Ensure playback rate is set before playing
        audio.playbackRate = audioPlaybackRates[taskId] || 1.0;
        // Start playing
        audio.play().catch(e => console.error("Error playing audio:", e));
      }
      // State update for isPlaying is handled by event listeners now
    }
  };

  const handleRateChange = (taskId: number, rateStr: string) => {
    const rate = parseFloat(rateStr);
    const audioId = `${activeTab}-${taskId}`;
    const audio = audioRefs.current[audioId];
    if (audio) {
      audio.playbackRate = rate;
      // State update handled by 'ratechange' listener
    }
  };

  const handleSeek = (taskId: number, value: number[]) => {
     const newTime = value[0];
     // Update visual slider state immediately
     setAudioCurrentTimes(prev => ({ ...prev, [taskId]: newTime }));
     // Actual seek happens on commit
  };

  const handleSeekCommit = (taskId: number, value: number[]) => {
      const newTime = value[0];
      const audioId = `${activeTab}-${taskId}`;
      const audio = audioRefs.current[audioId];
      if (audio) {
         audio.currentTime = newTime;
      }
      setIsSeeking(prev => ({ ...prev, [taskId]: false })); // Allow timeupdate listener to resume
  }
  
  const handlePointerDown = (taskId: number) => {
      setIsSeeking(prev => ({ ...prev, [taskId]: true })); // Set seeking flag
  }

  const seekRelative = (taskId: number, delta: number) => {
      const audioId = `${activeTab}-${taskId}`;
      const audio = audioRefs.current[audioId];
      const duration = audioDurations[taskId] || 0;
      if (audio) {
         const newTime = Math.max(0, Math.min(duration, audio.currentTime + delta));
         audio.currentTime = newTime;
         setAudioCurrentTimes(prev => ({ ...prev, [taskId]: newTime })); // Update UI state
      }
  }

  // --- Updated useEffect for Audio Refs & Listeners --- 
  useEffect(() => {
    if (!currentTask) return;

    const taskId = currentTask.id;
    const audioId = `${activeTab}-${taskId}`;
    let audioSrc = '';
    if ('recordingUrl' in currentTask) audioSrc = currentTask.recordingUrl;
    if ('audioUrl' in currentTask) audioSrc = currentTask.audioUrl;
    
    console.log(`[Audio useEffect] Task ID: ${taskId}, Audio Source URL: ${audioSrc}`);

    if (audioSrc && !audioRefs.current[audioId]) {
      console.log(`Creating new Audio element for ${audioId}`);
      const audio = new Audio(audioSrc);
      audioRefs.current[audioId] = audio;
      
      // Set initial state if not already set
      if (audioPlaybackRates[taskId] === undefined) {
         setAudioPlaybackRates(prev => ({ ...prev, [taskId]: 1.0 }));
      }
      if (audioCurrentTimes[taskId] === undefined) {
         setAudioCurrentTimes(prev => ({ ...prev, [taskId]: 0 }));
      }
      audio.playbackRate = audioPlaybackRates[taskId] || 1.0;

      // --- Attach Listeners --- 
      const handleLoadedMetadata = () => {
          console.log(`Loaded metadata for ${audioId}: Duration=${audio.duration}`);
          setAudioDurations(prev => ({ ...prev, [taskId]: audio.duration }));
          // Set current time to 0 if duration loads/reloads
          setAudioCurrentTimes(prev => ({ ...prev, [taskId]: 0 })); 
      };
      const handleTimeUpdate = () => {
          // Only update if not currently seeking this specific audio
          if (!isSeeking[taskId]) { 
             setAudioCurrentTimes(prev => ({ ...prev, [taskId]: audio.currentTime }));
          }
      };
      const handleError = (e: Event | string) => {
        console.error(`Error loading audio for ${audioId}:`, audio.error, e);
        // Optionally, provide feedback to the user
        toast({ 
          title: "Audio Error", 
          description: `Failed to load audio for task ${taskId}. The file might be corrupted or inaccessible.`, 
          variant: "destructive"
        });
        // Set duration to 0 to disable player if loading failed
        setAudioDurations(prev => ({ ...prev, [taskId]: 0 })); 
      };
      const handlePlay = () => setIsPlaying(prev => ({ ...prev, [taskId]: true }));
      const handlePause = () => setIsPlaying(prev => ({ ...prev, [taskId]: false }));
      const handleEnded = () => {
          setIsPlaying(prev => ({ ...prev, [taskId]: false }));
          // Optional: Reset time to 0 on end
          // setAudioCurrentTimes(prev => ({ ...prev, [taskId]: 0 })); 
  };
      const handleRateChange = () => setAudioPlaybackRates(prev => ({ ...prev, [taskId]: audio.playbackRate }));

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('error', handleError); // Add error listener
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('ratechange', handleRateChange);
      
      // --- Cleanup function for this specific audio element --- 
      return () => {
          console.log(`Cleaning up audio listeners for ${audioId}`);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('error', handleError); // Remove error listener
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('pause', handlePause);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('ratechange', handleRateChange);
          // Pause and remove ref on cleanup
          audio.pause();
          delete audioRefs.current[audioId];
      };
    }
  }, [currentTask, activeTab]); // Re-run when task or tab changes

  // Cleanup all remaining audio on component unmount
  useEffect(() => {
      return () => {
          Object.values(audioRefs.current).forEach(audio => audio?.pause());
          audioRefs.current = {};
      }
  }, []);

  // --- Rendering Functions --- 
  const renderStars = (taskId: number, count: number, selectedRating: number | undefined) => {
    return (
      <div className="flex space-x-1">
        {[...Array(count)].map((_, i) => (
          <button key={i} onClick={() => handleTTSQualityRating(i + 1, taskId)}>
            <Star
              className={`h-6 w-6 ${selectedRating && i < selectedRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderTaskContent = () => {
    if (!currentTask) return null; 
    const taskId = currentTask.id;
    const validationStatus = validations[taskId];
    const duration = audioDurations[taskId] || 0;
    const currentTime = audioCurrentTimes[taskId] || 0;
    const rate = audioPlaybackRates[taskId] || 1.0;

    // Common Audio Player UI function
    const renderAudioPlayer = (src: string | undefined) => {
        if (!src) return null;
  return (
            <div className="p-4 bg-gray-50 rounded-md border space-y-3">
                 {/* Controls Row */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="icon" onClick={() => togglePlayback(taskId)} aria-label={isPlaying[taskId] ? "Pause" : "Play"} disabled={duration === 0}>
                        {isPlaying[taskId] ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
                    <Button variant="outline" size="icon" onClick={() => seekRelative(taskId, -5)} aria-label="Rewind 5 seconds" disabled={duration === 0}>
                        <Rewind className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => seekRelative(taskId, 5)} aria-label="Forward 5 seconds" disabled={duration === 0}>
                        <FastForward className="h-5 w-5" />
                    </Button>
                    <div className="text-sm font-mono text-muted-foreground min-w-[100px] text-center">
                        {formatTime(currentTime)} / {formatTime(duration)}
        </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Label htmlFor={`rate-${taskId}`} className="text-sm">Speed:</Label>
                        <Select value={rate.toString()} onValueChange={(r) => handleRateChange(taskId, r)}>
                            <SelectTrigger id={`rate-${taskId}`} className="w-[80px] h-9">
                                <SelectValue placeholder="Speed" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0.5">0.5x</SelectItem>
                                <SelectItem value="0.75">0.75x</SelectItem>
                                <SelectItem value="1.0">1.0x</SelectItem>
                                <SelectItem value="1.25">1.25x</SelectItem>
                                <SelectItem value="1.5">1.5x</SelectItem>
                                <SelectItem value="2.0">2.0x</SelectItem>
                            </SelectContent>
                        </Select>
                          </div>
                        </div>
                {/* Progress Slider */}
                <Slider
                    value={[currentTime]}
                    max={duration}
                    step={0.1}
                    disabled={duration === 0}
                    onValueChange={(v) => handleSeek(taskId, v)}
                    onValueCommit={(v) => handleSeekCommit(taskId, v)}
                    onPointerDown={() => handlePointerDown(taskId)}
                    className="w-full cursor-pointer pt-1"
                />
                        </div>
        );
    };

    return (
            <Card className="border-none shadow-md mt-4">
              <CardHeader className="bg-gray-50 border-b pb-3">
                <div className="flex justify-between items-center">
             <h2 className="text-lg font-medium">
                Task #{taskId}
             </h2>
             <span className="text-xs text-gray-500">Batch {currentBatchIndex + 1} - Task {currentTaskIndex + 1} {currentTask.userInfo ? `(${currentTask.userInfo})` : ''}</span>
                </div>
              </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* ASR Validation */}
          {activeTab === 'asr' && 'imageUrl' in currentTask && 'recordingUrl' in currentTask && (
            <div className="space-y-4">
              <p>Listen to the recording and verify if it accurately describes the image.</p>
              <img src={currentTask.imageUrl} alt="ASR Task Image" className="rounded-md max-h-60 w-auto mx-auto border" />
              {renderAudioPlayer(currentTask.recordingUrl)}
              
              {/* Audio Quality Rating */}
              <div className="p-4 border rounded-md bg-gray-50">
                <h3 className="text-sm font-medium mb-3">Audio Quality Rating</h3>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button 
                      key={star}
                      variant={ratings[taskId] === star ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRatings({ ...ratings, [taskId]: star })}
                      disabled={!!validationStatus}
                      className="px-3 py-1 h-8"
                    >
                      {star} {star === 1 ? 'Star' : 'Stars'}
                    </Button>
                  ))}
                  </div>
                        </div>
                        
              {/* Issue Flags */}
              <div className="p-4 border rounded-md">
                <h3 className="text-sm font-medium mb-3">Common Issues (Optional)</h3>
                <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                    onClick={() => handleFlagIssue(taskId, 'background_noise')}
                    disabled={!!validationStatus}
                    className={typeof validations[taskId] === 'object' && validations[taskId]?.issues?.includes('background_noise') ? 'bg-red-50 border-red-200' : ''}
                  >
                    Background Noise
                            </Button>
                          <Button
                            variant="outline"
                    size="sm" 
                    onClick={() => handleFlagIssue(taskId, 'off_topic')}
                    disabled={!!validationStatus}
                    className={typeof validations[taskId] === 'object' && validations[taskId]?.issues?.includes('off_topic') ? 'bg-red-50 border-red-200' : ''}
                  >
                    Off Topic
                          </Button>
                            <Button 
                              variant="outline" 
                    size="sm" 
                    onClick={() => handleFlagIssue(taskId, 'unclear_speech')}
                    disabled={!!validationStatus}
                    className={typeof validations[taskId] === 'object' && validations[taskId]?.issues?.includes('unclear_speech') ? 'bg-red-50 border-red-200' : ''}
                  >
                    Unclear Speech
                            </Button>
                            <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleFlagIssue(taskId, 'too_quiet')}
                    disabled={!!validationStatus}
                    className={typeof validations[taskId] === 'object' && validations[taskId]?.issues?.includes('too_quiet') ? 'bg-red-50 border-red-200' : ''}
                  >
                    Too Quiet
                            </Button>
                          </div>
                        </div>
              
              <div className="flex justify-center space-x-4 pt-4 border-t">
                <Button variant="destructive" size="lg" onClick={() => openRejectionDialog(taskId, 'asr')} disabled={!!validationStatus}>
                  <ThumbsDown className="mr-2 h-5 w-5" /> Reject Audio
                </Button>
                <Button variant="default" size="lg" onClick={() => handleApproveForTranscription(taskId)} disabled={!!validationStatus || !ratings[taskId]}>
                  <CheckCircle className="mr-2 h-5 w-5" /> Approve for Transcription
                </Button>
                        </div>
                          </div>
          )}

          {/* TTS Validation */}
          {activeTab === 'tts' && 'text' in currentTask && 'recordingUrl' in currentTask && (
             <div className="space-y-4">
               <p>Listen to the recording and rate its quality based on the provided text.</p>
               <div className="bg-gray-50 p-4 rounded border">
                 <p className="text-lg font-medium">{currentTask.text}</p>
               </div>
               {renderAudioPlayer(currentTask.recordingUrl)}
               <div className="flex flex-col items-center space-y-3 pt-4 border-t">
                 <p className="font-medium">Rate pronunciation & clarity:</p>
                 {renderStars(taskId, 5, ratings[taskId])}
                 <div className="flex justify-center space-x-4 pt-4 w-full">
                    <Button variant="destructive" onClick={() => openRejectionDialog(taskId, 'tts')} disabled={!!validationStatus}>
                      <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button variant="default" onClick={() => handleApproveTTS(taskId)} disabled={!!validationStatus || ratings[taskId] === undefined}>
                      <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  </div>
               </div>
             </div>
          )}

          {/* Transcription Validation */}
          {activeTab === 'transcription' && 'audioUrl' in currentTask && 'transcription' in currentTask && (
            <div className="space-y-4">
              <p>Listen to the audio and verify/correct the transcription below.</p>
              {renderAudioPlayer(currentTask.audioUrl)}
              <TranscriptionEditor
                key={taskId}
                audioSrc={currentTask.audioUrl}
                initialText={currentTask.transcription}
                onTextChange={handleTranscriptionChange}
                language={currentTask.language}
              />
              <div className="flex justify-center space-x-4 pt-4 border-t">
                <Button variant="destructive" onClick={() => openRejectionDialog(taskId, 'transcription')} disabled={!!validationStatus}>
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button variant="default" onClick={() => handleApproveTranscription(taskId)} disabled={!!validationStatus || editedTranscription.trim() === ''}>
                  <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          )}

          {/* Translation Validation */}
          {activeTab === 'translation' && 'sourceText' in currentTask && 'targetText' in currentTask && (
            <div className="space-y-4">
              {/* Task Status Badge */}
              {'status' in currentTask && (
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  currentTask.status === 'rejected' 
                    ? 'bg-red-100 text-red-800 border border-red-200' 
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                }`}>
                  {currentTask.status === 'rejected' ? 'Needs Correction' : 'Pending Validation'}
                </div>
              )}

              <p className="text-gray-600">Review the translation for accuracy and clarity.</p>
              
              {/* Rejection Reason (if applicable) */}
              {currentTask.status === 'rejected' && currentTask.previousValidatorComment && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                  <h4 className="text-sm font-medium text-red-800 mb-1">Validator Comment:</h4>
                  <p className="text-red-700">{currentTask.previousValidatorComment}</p>
                </div>
              )}
              
              {/* Original text display */}
              <div className="space-y-2">
                <Label className="font-medium">Source Text ({currentTask.sourceLanguage}):</Label>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-900">
                  {currentTask.sourceText}
                </div>
              </div>

              {/* Previous Translation Text (if rejected) */}
              {currentTask.status === 'rejected' && currentTask.previousTranslationText && (
                <div className="space-y-2 mt-4">
                  <Label className="font-medium text-red-800">Rejected Translation:</Label>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-900 font-mono">
                    {currentTask.previousTranslationText}
                  </div>
                </div>
              )}
                          
              {/* Translation display and edit */}
              <div className="space-y-2 mt-4">
                <Label className="font-medium">{currentTask.status === 'rejected' ? 'Corrected Translation' : 'Translation'} ({currentTask.targetLanguage}):</Label>
                <Textarea
                  value={isTranslationEdited ? editedTranslation : currentTask.targetText} // targetText is now empty for rejected tasks initially
                  onChange={(e) => {
                    handleTranslationChange(e.target.value);
                    setIsTranslationEdited(true);
                  }}
                  placeholder={currentTask.status === 'rejected' ? 
                    "Enter the corrected translation here..." : 
                    "Enter the translation here..."}
                  rows={5}
                  className="w-full p-3 border border-gray-300 rounded-md font-mono"
                />
                {isTranslationEdited && (
                  <p className="text-xs text-blue-600">
                    You have edited the translation. Your changes will be saved when you approve.
                  </p>
                )}
              </div>
                        
              {/* Audio playback (if available) */}
              {currentTask.audioUrl && (
                <div className="space-y-2">
                  <Label className="font-medium">Audio Pronunciation:</Label>
                  {renderAudioPlayer(currentTask.audioUrl)}
                </div>
              )}
              
              {/* Feedback field */}
              <div className="space-y-2">
                <Label htmlFor="translation-feedback" className="font-medium">Feedback (Optional):</Label>
                <Textarea
                  id="translation-feedback"
                  placeholder="Provide feedback for the translator..."
                  value={translationFeedback[currentTask.id] || ''}
                  onChange={(e) => handleTranslationFeedbackChange(currentTask.id, e.target.value)}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
                        
              {/* Common Issues */}
              <div className="p-4 border rounded-md">
                <h3 className="text-sm font-medium mb-3">Common Issues (Optional)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFlagIssue(currentTask.id, 'inaccurate')}
                    disabled={!!validations[currentTask.id]}
                    className={getIssueButtonClass(currentTask, 'inaccurate')}
                  >
                    Inaccurate Translation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFlagIssue(currentTask.id, 'grammar')}
                    disabled={!!validations[currentTask.id]}
                    className={getIssueButtonClass(currentTask, 'grammar')}
                  >
                    Grammar Issues
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFlagIssue(currentTask.id, 'incomplete')}
                    disabled={!!validations[currentTask.id]}
                    className={getIssueButtonClass(currentTask, 'incomplete')}
                  >
                    Incomplete Translation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFlagIssue(currentTask.id, 'wrong_language')}
                    disabled={!!validations[currentTask.id]}
                    className={getIssueButtonClass(currentTask, 'wrong_language')}
                  >
                    Wrong Language
                  </Button>
                </div>
              </div>
                        
              {/* Action buttons */}
              <div className="flex justify-center space-x-4 pt-4 border-t">
                <Button 
                  variant="destructive" 
                  onClick={() => openRejectionDialog(currentTask.id, 'translation')} 
                  disabled={!!validations[currentTask.id]}
                >
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject Translation
                </Button>
                <Button 
                  variant="default" 
                  onClick={() => handleApproveTranslation(currentTask.id)} 
                  disabled={!!validations[currentTask.id] || (!currentTask.targetText && !editedTranslation)}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" /> {isTranslationEdited ? 'Approve with Changes' : 'Approve Translation'}
                </Button>
              </div>
            </div>
          )}

          {/* Show validation status if task has been validated */}
          {renderValidationStatus(taskId)}
        </CardContent>
      </Card>
    );
  };

  // New handler for the translation text change
  const handleTranslationChange = (text: string) => {
    setEditedTranslation(text);
    setIsTranslationEdited(true);
  };

  // New handler for feedback on the translation
  const handleTranslationFeedbackChange = (taskId: number, feedback: string) => {
    setTranslationFeedback(prev => ({ ...prev, [taskId]: feedback }));
  };

  // New handler for approving translations
  const handleApproveTranslation = (taskId: number) => {
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to validate tasks",
        variant: "destructive"
      });
      return;
    }

    const task = getCurrentTask() as TranslationTaskItem;
    if (!task) return;

    // Store the edited translation if it was changed
    const translationToSave = isTranslationEdited ? editedTranslation : task.targetText;
    console.log(`Approving translation for task ${taskId}, text: ${translationToSave}, feedback: ${translationFeedback[taskId] || 'None'}`);

    setValidations(prev => ({ ...prev, [taskId]: { status: 'approved' } }));
    
    // Insert validation record in the database
    supabase.from('validations').insert({
      contribution_id: taskId,
      is_approved: true,
      validator_id: userId,
      comment: translationFeedback[taskId] || ''
    }).then(({ error }) => {
      if (error) {
        console.error("Error saving translation validation:", error);
        toast({
          title: "Error",
          description: "Failed to save your validation",
          variant: "destructive"
        });
        return;
      }
      
      // Get the contribution to find its associated task
      supabase.from('contributions')
        .select('*, tasks(*)')
        .eq('id', taskId)
        .single()
        .then(({ data: contribution, error: fetchError }) => {
          if (fetchError || !contribution) {
            console.error("Error fetching contribution:", fetchError);
            return;
          }

          // If the translation was edited, update the submitted_data
          const updatedSubmittedData = isTranslationEdited ? 
            { ...(typeof contribution.submitted_data === 'object' ? contribution.submitted_data : {}), translation_text: translationToSave } : 
            contribution.submitted_data;
          
          // Update contribution status to 'validated'
          supabase.from('contributions')
            .update({ 
              status: 'validated',
              submitted_data: updatedSubmittedData
            })
            .eq('id', taskId)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error("Error updating contribution:", updateError);
              }
            });
            
          // Also update the task status to completed
          supabase.from('tasks')
            .update({ status: 'completed' })
            .eq('id', contribution.task_id)
            .then(({ error: taskUpdateError }) => {
              if (taskUpdateError) {
                console.error("Error updating task status:", taskUpdateError);
              }
            });
        });
      
      toast({ 
        title: "Translation Approved", 
        description: isTranslationEdited ? 
          "Your corrections have been saved and the translation is finalized." : 
          "The translation has been approved and finalized."
      });
      
      setTimeout(() => {
        handleNextTask();
      }, 500);
    });
  };

  // Update existing functions and add new ones
  const handleFlagIssue = (taskId: number, issue: string) => {
    const currentIssues = typeof validations[taskId] === 'object' 
      ? validations[taskId]?.issues || [] 
      : [];
    
    let newIssues: string[];
    
    if (currentIssues.includes(issue)) {
      // Remove the issue if already flagged
      newIssues = currentIssues.filter(i => i !== issue);
    } else {
      // Add the issue if not already flagged
      newIssues = [...currentIssues, issue];
    }
    
    setValidations(prev => {
      const current = prev[taskId];
      if (typeof current === 'object') {
        return {
          ...prev,
          [taskId]: { 
            ...current, 
            issues: newIssues 
          }
        };
      } else {
        return {
          ...prev,
          [taskId]: { 
            status: 'pending', 
            issues: newIssues 
          }
        };
      }
    });
  };

  // Add function to update contribution status in database
  const updateContributionStatus = async (contributionId: number, newStatus: Database["public"]["Enums"]["contribution_status"]) => {
    try {
      const { error } = await supabase
        .from('contributions')
        .update({ status: newStatus })
        .eq('id', contributionId);
        
      if (error) throw error;
    } catch (err) {
      console.error("Error updating contribution status:", err);
      toast({
        title: "Update Failed",
        description: "Failed to update contribution status in database",
        variant: "destructive"
      });
    }
  };

  // Add the missing functions
  const renderValidationStatus = (taskId: number) => {
    const statusObj = validations[taskId];
    if (!statusObj) return null;

    let statusText = '';
    let statusClass = '';

    switch (statusObj.status) {
      case 'approved':
      case 'approved_for_transcription':
        statusText = 'Approved';
        statusClass = 'bg-green-100 text-green-800';
        break;
      case 'rejected':
      case 'rejected_audio':
        statusText = 'Rejected';
        statusClass = 'bg-red-100 text-red-800';
        break;
      case 'pending_validation':
      case 'pending':
        statusText = 'Pending Review';
        statusClass = 'bg-yellow-100 text-yellow-800';
        break;
      default:
        return null;
    }

    return (
      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusClass}`}>
        {statusText}
      </span>
    );
  };

  // Add the function to approve audio for transcription
  const handleApproveForTranscription = async (taskId: number) => {
    if (!userId) return;
    
    try {
      // 1. Mark this audio as validated locally
      setValidations(prev => ({ ...prev, [taskId]: { status: 'approved_for_transcription', rating: ratings[taskId] } }));
      
      // 2. Get contribution details to find task and audio details
      const { data: contribution, error: fetchError } = await supabase
        .from('contributions')
        .select('id, task_id, storage_url, user_id, tasks!inner(language, content)')
        .eq('id', taskId)
        .single();
      
      if (fetchError || !contribution) {
        console.error("Error fetching contribution:", fetchError);
        toast({
          title: "Error", 
          description: "Couldn't fetch contribution details", 
          variant: "destructive" 
        });
        return;
      }
      
      // 3. Insert validation record
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          contribution_id: taskId,
          is_approved: true,
          validator_id: userId,
          comment: `Audio quality approved for transcription. Rating: ${ratings[taskId] || 5}/5`
        });
      
      if (validationError) {
        console.error("Error inserting validation:", validationError);
        throw validationError;
      }
      
      // 4. Update contribution status to approved
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ status: 'validated' })
        .eq('id', taskId);
      
      if (updateError) {
        console.error("Error updating contribution status:", updateError);
        throw updateError;
      }
      
      // 5. Create a new transcription task based on this audio
      // Extract text content from TTS task safely with proper type checking
      const ttsContentObj = contribution.tasks?.content;
      let audioText = '';
      let taskTitle = 'Transcribe Recording';

      // Type guard to safely access content properties
      if (ttsContentObj && typeof ttsContentObj === 'object') {
        // Type assertion for accessing properties
        const content = ttsContentObj as Record<string, unknown>;
        if (typeof content.text_prompt === 'string') {
          audioText = content.text_prompt;
        }
        if (typeof content.task_title === 'string') {
          taskTitle = content.task_title;
        }
      }
      
      // Create new transcription task
      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert({
          type: 'transcription',
          status: 'pending', // Will be assigned when someone picks it up
          language: contribution.tasks?.language,
          content: {
            task_title: `Transcribe: ${taskTitle}`,
            audio_source: 'tts', // Mark as coming from TTS
            source_contribution_id: contribution.id,
            original_text: audioText, // Store original text for later comparison
          },
          priority: 'medium',
          created_by: userId,
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error("Error creating transcription task:", createError);
        throw createError;
      }
      
      toast({ 
        title: "Audio Approved", 
        description: "A new transcription task has been created",
      });
      
      handleNextTask();
    } catch (error) {
      // Revert local state on error
      setValidations(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
      console.error("Error in approval process:", error);
      toast({ 
        title: "Error", 
        description: "Failed to complete the approval process",
        variant: "destructive" 
      });
    }
  };

  // Helper function to check if validation has issues
  const hasIssue = (validation: ValidationStatus | undefined, issue: string): boolean => {
    if (!validation || typeof validation !== 'object') return false;
    return validation.issues?.includes(issue) || false;
  };

  // Update the button className logic
  const getIssueButtonClass = (validation: ValidationStatus, issue: string): string => {
    const hasIssue = (val: ValidationStatus, iss: string): boolean => {
      if (typeof val === 'object' && val?.issues) {
        return val.issues.includes(iss);
      }
      return false;
    };
    
    return hasIssue(validation, issue) ? 'bg-red-50 border-red-200' : '';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold">Validation Tasks</h1>
      </div>
      
      {/* Task type tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setCurrentTaskIndex(0);
          setCurrentBatchIndex(0);
          setValidations({});
          setRatings({});
          setEditedTranscription("");
          setEditedTranslation("");
          setIsTranscriptionEdited(false);
          setIsTranslationEdited(false);
          setTranslationFeedback({});
        }}
        className="w-full mb-6"
      >
                          <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="asr">ASR</TabsTrigger>
            <TabsTrigger value="tts">TTS</TabsTrigger>
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
            <TabsTrigger value="translation">Translation</TabsTrigger>
          </TabsList>

          <LanguageFilter
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            availableLanguages={getAvailableLanguages()}
          />
                          </div>
                          
        {/* No tasks available message */}
        {!currentTask && (
          <Card className="border-none shadow-md mt-4">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">No tasks available</h3>
                <p className="text-gray-500">There are no {activeTab} validation tasks matching your current filter.</p>
                            <Button
                              variant="outline"
                  onClick={() => setSelectedLanguage('all')}
                  className="mt-4"
                >
                  Show all languages
                            </Button>
                          </div>
            </CardContent>
          </Card>
        )}
        
        <TabsContent value="asr">
          {currentTask && renderTaskContent()}
        </TabsContent>
        
        <TabsContent value="tts">
          {currentTask && renderTaskContent()}
        </TabsContent>
        
        <TabsContent value="transcription">
          {currentTask && renderTaskContent()}
        </TabsContent>
        
        <TabsContent value="translation">
          {currentTask && renderTaskContent()}
        </TabsContent>
      </Tabs>

      {/* Batch navigation */}
      {currentTask && (
        <div className="flex justify-end mt-6 space-x-4">
          <Button variant="outline" onClick={handleSkipTask} disabled={!currentTask || isSubmitting}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip Task
          </Button>
          <Button onClick={handleSubmitBatch} disabled={isSubmitting || (!currentTask && Object.keys(validations).length === 0)}>
            {isSubmitting ? 'Submitting...' : 'Submit Remaining & Continue'}
          </Button>
        </div>
      )}

      {/* Rejection dialog */}
      <RejectionReasonDialog
        isOpen={isRejectionDialogOpen}
        onOpenChange={setIsRejectionDialogOpen}
        reasons={(() => {
          switch (activeTab) {
            case 'asr':
              return [
                { value: 'incorrect-pronunciation', label: 'Incorrect pronunciation' },
                { value: 'unclear-speech', label: 'Unclear speech' },
                { value: 'wrong-language', label: 'Wrong language' },
                { value: 'background-noise', label: 'Background noise' },
                { value: 'wrong-description', label: 'Wrong description of image' },
                { value: 'other', label: 'Other (please specify)' }
              ];
            case 'tts':
              return ttsRejectionReasons;
            case 'transcription':
              return transcriptionRejectionReasons;
            case 'translation':
              return translationRejectionReasons;
            default:
              return [{ value: 'other', label: 'Other (please specify)' }];
          }
        })()}
        onSubmit={handleRejectionSubmit}
      />
      
      {/* Add loading and error states */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-afri-orange"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading tasks for validation...</p>
                        </div>
        </div>
      )}
                        
      {error && (
        <div className="p-8 text-center">
          <p className="text-destructive font-medium">Error: {error}</p>
                          <Button
                            variant="outline"
            className="mt-4"
            onClick={() => fetchContributionsForValidation(activeTab, selectedLanguage)}
                          >
            Try Again
                          </Button>
        </div>
      )}
      
      {/* Add loading state */}
      {loadingContributions && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-afri-orange" />
          <p className="ml-2 text-muted-foreground">Loading tasks for validation...</p>
                          </div>
                )}
        </div>
  );
};

export default ValidateTask;
