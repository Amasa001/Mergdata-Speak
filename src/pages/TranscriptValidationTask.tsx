import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardDescription, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, ThumbsUp, ThumbsDown, FileCheck, Loader2, Edit, CheckCircle, 
  Play, Pause, Rewind, FastForward, SkipForward 
} from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { LanguageFilter } from '@/components/tasks/LanguageFilter';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Label } from '@/components/ui/label';

// Define the structure for transcript validation tasks
interface TranscriptValidationTask {
  id: number;
  audioUrl: string;
  language: string;
  originalTaskId: number;
  transcription: string;
  transcriberId: string;
  contributionId: number;
  submitted_data?: any; // Include submitted_data for rejection handling
}

// --- Helper Functions Added ---
const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- Special Characters Map ---
const specialCharsMap: Record<string, string[]> = {
  'akan': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ŋ', 'Ŋ'],
  'ewe': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ɖ', 'Ɖ', 'ƒ', 'Ƒ', 'ɣ', 'Ɣ', 'ŋ', 'Ŋ', 'ʋ', 'Ʋ'],
  'ga': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ŋ', 'Ŋ'],
  'fante': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ'], // Example, refine as needed
  'dagbani': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ɣ', 'Ɣ', 'ŋ', 'Ŋ', 'ʒ', 'Ʒ'] 
};
// --- End Helper Functions ---

const TranscriptValidationTask: React.FC = () => {
  const navigate = useNavigate();
  const { contributionId: contributionIdParam } = useParams<{ contributionId?: string }>(); // Get ID from URL
  const contributionId = contributionIdParam ? parseInt(contributionIdParam, 10) : null; // Parse ID to number or null
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [correctedTranscripts, setCorrectedTranscripts] = useState<Record<number, { text: string, taskId: number }>>({});
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TranscriptValidationTask[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingTaskId, setRejectingTaskId] = useState<number | null>(null);
  const [validationResults, setValidationResults] = useState<Record<number, 'approved' | 'rejected' | null>>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // <-- Add ref for textarea

  // --- Audio Player State Added ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [audioError, setAudioError] = useState(false);
  // --- End Audio Player State ---

  // Fetch User ID
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    fetchUser();
  }, []);

  // Fetch tasks that need transcript validation
  useEffect(() => {
    const fetchValidationTasks = async () => {
      if (!userId) return;
      
      console.log("TranscriptValidationTask: fetchValidationTasks called", { contributionId });
      
      setIsLoadingTasks(true);
      setTasks([]);
      setAvailableLanguages([]);
      setCurrentTaskIndex(0);
      setValidationResults({});
      setCorrectedTranscripts({});
      resetCurrentTask();
      
      try {
        let fetchedContributions: any[] = [];
        let fetchError: any = null;

        if (contributionId && !isNaN(contributionId)) {
          // --- Fetch Single Task by ID --- 
          console.log(`Fetching single contribution with ID: ${contributionId}`);
          const { data, error } = await supabase
            .from('contributions')
            .select(`
              id, storage_url, task_id, submitted_data, user_id, status,
              tasks (id, language)
            `)
            .eq('id', contributionId)
            .maybeSingle(); // Fetch one or null
          
          console.log("Single contribution fetch result:", { data, error, status: data?.status });
          
          if (error) {
            fetchError = error;
          } else if (data) {
            // For debugging: Log status to check if it's really 'pending_transcript_validation'
            console.log(`Contribution ${contributionId} status: ${data.status}`);
            fetchedContributions = [data]; // Put the single result in an array
          } else {
            // Contribution not found or not pending transcript validation
            toast({
                title: "Task Not Found",
                description: `Could not find a pending transcript validation task with ID ${contributionId}. You may have already processed it.`,
                variant: "destructive"
            });
            console.warn(`Contribution ${contributionId} not found or not pending transcript validation.`);
          }
          // --- End Fetch Single Task ---
        } else {
          // --- Fetch All Pending Transcript Tasks (Original Logic) ---
          console.log("Fetching all contributions with status 'pending_transcript_validation'");
          const { data, error } = await supabase
            .from('contributions')
            .select(`
              id, storage_url, task_id, submitted_data, user_id, status,
              tasks (id, language)
            `)
            .eq('status', 'pending_transcript_validation');
          
          console.log("All contributions fetch result:", { count: data?.length || 0, error });
          
          if (error) {
            fetchError = error;
          } else if (data) {
            fetchedContributions = data;
            // Extract languages properly handling tasks as array or object
            const languages = Array.from(
                new Set(
                    data.map(c => {
                      if (!c.tasks) return null;
                      if (Array.isArray(c.tasks) && c.tasks.length > 0) {
                        return c.tasks[0]?.language;
                      }
                      return (c.tasks as any)?.language;
                    }).filter((l): l is string => !!l?.trim())
                )
            );
            setAvailableLanguages(languages);
          }
          // --- End Fetch All --- 
        }

        if (fetchError) throw fetchError; // Throw if any fetch error occurred
        
        // --- Map Fetched Data (Common Logic) ---
        if (fetchedContributions && fetchedContributions.length > 0) {
          // Log raw data for debugging
          console.log("Raw data structure sample:", JSON.stringify(fetchedContributions[0], null, 2));

          const mappedTasks: TranscriptValidationTask[] = fetchedContributions
            .filter(c => {
              // More detailed logging to identify exact filter issue
              const hasStorageUrl = !!c.storage_url;
              const hasSubmittedData = !!c.submitted_data;
              const isSubmittedDataObject = typeof c.submitted_data === 'object';
              const hasTranscription = hasSubmittedData && isSubmittedDataObject && 'transcription' in c.submitted_data;
              const hasTasks = !!c.tasks;
              
              console.log(`Contribution ${c.id} filter check:`, {
                hasStorageUrl,
                hasSubmittedData,
                isSubmittedDataObject,
                hasTranscription,
                hasTasks,
                tasksType: hasTasks ? Array.isArray(c.tasks) ? 'array' : 'object' : 'missing'
              });
              
              // Modified to allow tasks without storage_url but with valid transcription
              return hasSubmittedData && isSubmittedDataObject && hasTranscription && hasTasks;
            })
            .map(c => {
              const submittedData = c.submitted_data as { transcription?: string };
              
              // Handle tasks properly whether it's an array or single object
              let taskLanguage = 'Unknown';
              let taskId = c.task_id;
              
              if (c.tasks) {
                if (Array.isArray(c.tasks) && c.tasks.length > 0) {
                  // If tasks is an array, use the first item
                  taskLanguage = c.tasks[0]?.language || 'Unknown';
                  taskId = c.tasks[0]?.id || c.task_id;
                } else {
                  // If tasks is a single object
                  const taskData = c.tasks as { id: number, language: string };
                  taskLanguage = taskData?.language || 'Unknown';
                  taskId = taskData?.id || c.task_id;
                }
              }
              
              return {
                id: c.id,
                audioUrl: c.storage_url as string || '', // Provide empty string fallback for null storage_url
                language: taskLanguage,
                originalTaskId: taskId,
                transcription: submittedData.transcription || '',
                transcriberId: c.user_id,
                contributionId: c.id,
                submitted_data: c.submitted_data 
              };
            });
            
          console.log(`Mapped ${mappedTasks.length} validation tasks from ${fetchedContributions.length} fetched contributions`);
          
          // Debug what might be filtered out
          if (mappedTasks.length < fetchedContributions.length) {
            console.log("Some contributions were filtered out. Details:", fetchedContributions.map(c => ({
              id: c.id,
              has_storage_url: !!c.storage_url,
              has_submitted_data: !!c.submitted_data,
              is_submitted_data_object: typeof c.submitted_data === 'object',
              has_transcription: !!c.submitted_data && typeof c.submitted_data === 'object' && 'transcription' in c.submitted_data,
              has_tasks: !!c.tasks,
              tasks_structure: c.tasks ? JSON.stringify(c.tasks).substring(0, 100) + '...' : 'null'
            })));
          }
          
          setTasks(mappedTasks);
        } else {
           if (!contributionId) {
             console.log("No contributions found pending transcript validation.");
           }
          // If fetching single and not found, the message was shown earlier
          setTasks([]);
        }
        // --- End Map Fetched Data ---

      } catch (error) {
        console.error('Error fetching transcript validation tasks:', error);
        toast({
          title: 'Error Loading Task',
          description: 'Failed to load validation task(s). Please try again.',
          variant: 'destructive'
        });
        setTasks([]); // Ensure tasks are empty on error
      } finally {
        setIsLoadingTasks(false);
      }
    };
    
    if (userId) {
      fetchValidationTasks();
    }
  }, [userId, contributionId, toast]);
  
  // Filter tasks by language
  const filteredTasks = useMemo(() => {
    // If a specific ID was requested, filtering is usually not needed/desired
    if (contributionIdParam && tasks.length === 1) {
        return tasks;
    }
    // Apply language filter only when viewing multiple tasks
    return selectedLanguage === 'all'
        ? tasks
        : tasks.filter(task => task.language.toLowerCase() === selectedLanguage.toLowerCase());
  }, [tasks, selectedLanguage, contributionIdParam]);
  
  const handleLanguageChange = (language: string) => {
    // Language change only makes sense when viewing multiple tasks
    if (!contributionIdParam) { 
        setSelectedLanguage(language.toLowerCase());
        setCurrentTaskIndex(0);
        resetCurrentTask();
        resetAudioState();
    }
  };
  
  const resetCurrentTask = () => {
    setCurrentTranscript('');
    setIsEditing(false);
    // Don't reset correctedTranscripts or validationResults here,
    // as they pertain to specific tasks, not just the current view
  };
  
  // --- Audio Player Logic Added ---
  const resetAudioState = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackRate(1.0);
    setIsSeeking(false);
    setAudioError(false);
  };
  
  // Event handlers for the audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
        if (!isSeeking) {
            setCurrentTime(audio.currentTime);
        }
    };
    const handleDurationChange = () => {
        if (isFinite(audio.duration)) {
             setDuration(audio.duration);
        } else {
             setDuration(0); // Reset or handle invalid duration
             console.warn("Invalid duration received:", audio.duration);
        }
    };
    const handleEnded = () => setIsPlaying(false);
    const handleRateChange = () => setPlaybackRate(audio.playbackRate);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('ratechange', handleRateChange);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('ratechange', handleRateChange);
    };
  }, [audioRef, isSeeking]);

  const getCurrentTask = (): TranscriptValidationTask | null => {
    console.log("getCurrentTask called with:", { 
      currentTaskIndex, 
      tasksLength: tasks.length,
      tasks: tasks.length > 0 ? tasks.map(t => ({ id: t.id, transcription: t.transcription?.substring(0, 20) + '...' })) : []
    });
    
    if (isLoadingTasks || tasks.length === 0 || currentTaskIndex >= tasks.length) {
      return null;
    }
    return tasks[currentTaskIndex];
  };
  
  const currentTask = getCurrentTask();
  const isCurrentTaskValidated = currentTask ? !!validationResults[currentTask.id] : false;
  // Modified: isLastTask is always true in single-task mode (or if only 1 task loaded)
  const isSingleTaskMode = !!contributionIdParam;
  const isLastTask = isSingleTaskMode || currentTaskIndex >= filteredTasks.length - 1;
  
  // Load audio when task changes or audioUrl changes
  useEffect(() => {
    const currentTaskAudio = getCurrentTask();
    if (!currentTaskAudio?.audioUrl || currentTaskAudio.audioUrl.trim() === '') {
      resetAudioState(); // Reset if no URL
      return;
    }
    
    const audio = audioRef.current;
    if (!audio) return;

    // Reset states before loading new source
    resetAudioState();
    setAudioError(false);
    
    let retryCount = 0;
    const maxRetries = 2;
    let timeoutId: NodeJS.Timeout;
    
    const loadAudio = (url: string) => {
      console.log(`Loading audio URL for validation: ${url} (retry: ${retryCount})`);
      
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // Important to reset internal state
      
      audio.src = url;
      audio.load();
      
      timeoutId = setTimeout(() => {
        console.warn("Audio metadata load timed out - using fallback duration");
        if (!isFinite(audio.duration) || audio.duration === 0) {
          setDuration(1); 
        }
      }, 3000); // Increased timeout slightly
    };
    
    const handleError = (e: Event) => {
      console.error("Audio loading error:", e);
      clearTimeout(timeoutId); // Clear timeout on error
      
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying audio load (${retryCount}/${maxRetries})`);
        setTimeout(() => {
          loadAudio(currentTaskAudio.audioUrl);
        }, 1000);
      } else {
        setAudioError(true);
        toast({
          title: "Audio Error",
          description: "Failed to load audio. Please try another task or check the audio source.",
          variant: "destructive"
        });
      }
    };
    
    const handleLoadedMetadata = () => {
      clearTimeout(timeoutId);
      const newDuration = audio.duration;
      console.log("Audio metadata loaded, duration:", newDuration);
      
      if (isFinite(newDuration) && newDuration > 0) {
        setDuration(newDuration);
        setAudioError(false);
      } else {
        console.warn(`Audio reported non-finite/zero duration: ${newDuration}. Defaulting to 1s.`);
        setDuration(1); 
      }
    };
    
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    loadAudio(currentTaskAudio.audioUrl);
    
    return () => {
      clearTimeout(timeoutId);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      // Cleanup: Pause and reset src when component unmounts or task changes drastically
      if(audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
      }
    };
  }, [currentTask?.audioUrl, toast]); // Depend on the audioUrl from the current task

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;

    try {
      if (isPlaying) {
        await audio.pause();
        setIsPlaying(false);
      } else {
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or more
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
          }
        } else {
          console.warn("Audio not ready, trying to load/play again");
          audio.load(); // Attempt to reload
          try {
            await audio.play();
            setIsPlaying(true);
          } catch (playError) {
             console.error("Playback failed after trying to reload:", playError);
             toast({ title: "Playback Error", description: "Could not play audio.", variant: "destructive"});
          }
        }
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
      toast({ title: "Playback Error", description: "Failed to play/pause audio.", variant: "destructive"});
      setIsPlaying(false); // Ensure state consistency
    }
  };

  const handleRateChangeSelect = (rateStr: string) => {
    const rate = parseFloat(rateStr);
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleSeekSlider = (value: number[]) => {
     const newTime = value[0];
     setCurrentTime(newTime);
  };

  const handleSeekCommit = (value: number[]) => {
      const newTime = value[0];
      if (audioRef.current && isFinite(newTime)) {
         audioRef.current.currentTime = newTime;
      }
      setIsSeeking(false);
  }

  const seekRelative = (delta: number) => {
      if (audioRef.current) {
         const newTime = Math.max(0, Math.min(duration || 0, audioRef.current.currentTime + delta));
         audioRef.current.currentTime = newTime;
         setCurrentTime(newTime);
      }
  }
  // --- End Audio Player Logic ---

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentTranscript(e.target.value);
  };

  // --- Function to Insert Special Character Added ---
  const insertSpecialChar = (char: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + char + text.substring(end);
      
      setCurrentTranscript(newText); // Update state
      
      // Set cursor position after insertion
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + char.length;
      }, 0);
  };
  // --- End Function to Insert Special Character ---
  
  // Set current transcript when task changes, use original from task
  useEffect(() => {
    const task = getCurrentTask();
    if (task) {
        // Always reset to the original transcription when task changes
        // Correction is handled separately by editing state
        setCurrentTranscript(task.transcription || ''); 
        setIsEditing(false); // Ensure editing mode is off when task changes
        // Check if there's a prior correction for this task to potentially display
    } else {
        setCurrentTranscript('');
        setIsEditing(false);
    }
    // Don't reset audio here, handled by audioUrl effect
  }, [currentTaskIndex, tasks]); // Rerun when task changes
  
  const handleStartEdit = () => {
    if (currentTask) {
        // Pre-fill with existing correction if available, otherwise use original
        setCurrentTranscript(
            correctedTranscripts[currentTask.id]?.text || currentTask.transcription || ''
        );
        setIsEditing(true);
    }
  };
  
  const handleSaveCorrection = () => {
    if (!currentTask || !currentTranscript.trim()) {
        toast({ title: "Cannot Save", description: "Corrected transcript cannot be empty.", variant: "destructive" });
        return;
    }
    
    setCorrectedTranscripts(prev => ({
      ...prev,
      [currentTask.id]: { text: currentTranscript, taskId: currentTask.id }
    }));
    
    setIsEditing(false); // Exit editing mode after saving
    
    toast({
      title: 'Correction Saved',
      description: 'Your correction is ready. You can now approve or reject.'
    });
  };
  
  const handleCancelEdit = () => {
    if (currentTask) {
        // Revert to the original transcription when cancelling edit
        setCurrentTranscript(currentTask.transcription || '');
    }
    setIsEditing(false);
  };
  
  const handleApproveTranscript = async () => {
    if (!currentTask || !userId) return;
    
    setIsSubmitting(true);
    
    try {
      // Use the saved correction if available, otherwise use the original transcript
      const finalTranscript = correctedTranscripts[currentTask.id]?.text ?? currentTask.transcription;
      const wasCorrected = !!correctedTranscripts[currentTask.id];

      console.log(`Approving contribution ${currentTask.id}. Corrected: ${wasCorrected}. Final text: ${finalTranscript}`);

      // 1. Update the contribution record
      const { error: updateError } = await supabase
        .from('contributions')
        .update({
          status: 'finalized', // Final state after successful validation
          submitted_data: { 
            // Preserve existing data, update relevant fields
            ...currentTask.submitted_data, // Keep original submitted_data structure
            transcription: finalTranscript, // Update with the final text
            validated_by: userId,
            validated_at: new Date().toISOString(),
            was_corrected: wasCorrected, // Mark if corrections were made
            rejection_reason: null // Clear any previous rejection reason
          }
        })
        .eq('id', currentTask.id);
        
      if (updateError) {
        console.error("Error updating contribution on approve:", updateError);
        throw updateError;
      }
      
      // 2. Add a validation record
      console.log(`Inserting validation record for contribution ${currentTask.id}`);
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          contribution_id: currentTask.id,
          is_approved: true,
          validator_id: userId,
          comment: wasCorrected ? 'Approved with corrections' : 'Approved as is'
        });
        
      if (validationError) {
         console.error("Error inserting validation record:", validationError);
         // Throw the error to be caught by the main catch block
         throw new Error(`Failed to save validation record: ${validationError.message}`);
      }
      
      // 3. Update the task status to completed
      console.log(`Updating task status to completed for task ID: ${currentTask.originalTaskId}`);
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', currentTask.originalTaskId);
      
      if (taskUpdateError) {
        console.warn(`Could not update task status for task ${currentTask.originalTaskId}:`, taskUpdateError);
        // Continue without failing the whole operation
      } else {
        console.log(`Successfully marked task ${currentTask.originalTaskId} as completed`);
      }
      
      // Update local state
      setValidationResults(prev => ({
        ...prev,
        [currentTask.id]: 'approved'
      }));
      // Clear any saved correction for this task locally after successful submission
      setCorrectedTranscripts(prev => {
          const newState = {...prev};
          delete newState[currentTask.id];
          return newState;
      });

      toast({
        title: 'Transcript Approved',
        description: 'Transcript finalized and ready for use.'
      });
      
      // Move to next task OR navigate back after a short delay
      setTimeout(() => {
        if (isSingleTaskMode) {
            // If validating a single task via URL, go back to dashboard (or previous page)
            navigate('/dashboard'); // Or use navigate(-1) to go back
        } else {
            handleNextTask(); // Proceed to next task in the queue
        }
      }, 1000);

    } catch (error) {
      console.error('Error approving transcript:', error);
      toast({
        title: 'Approval Error',
        description: `Failed to approve transcript: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const openRejectionDialog = (taskId: number) => {
    if (isEditing) {
        toast({ title: "Cannot Reject", description: "Please save or cancel your edits before rejecting.", variant: "default" });
        return;
    }
    setRejectingTaskId(taskId);
    setRejectionReason('');
    setIsRejectionDialogOpen(true);
  };
  
  const handleRejectTranscript = async () => {
    if (!rejectingTaskId || !userId || !rejectionReason.trim()) {
      if (!rejectionReason.trim()) {
          toast({ title: "Reason Required", description: "Please provide a reason for rejection.", variant: "destructive" });
      }
      // Keep dialog open if reason missing, otherwise close if other issue
      if(rejectionReason.trim()){
          setIsRejectionDialogOpen(false);
          setRejectingTaskId(null); // Reset ID if closing without submitting
      }
      return;
    }
    
    setIsSubmitting(true);
    const taskToReject = tasks.find(t => t.id === rejectingTaskId);

    try {
        console.log(`Rejecting contribution ${rejectingTaskId} with reason: ${rejectionReason}`);
      // 1. Update the contribution status
      const { error: updateError } = await supabase
        .from('contributions')
        .update({
          status: 'rejected_transcript', // Mark as rejected
          submitted_data: { 
            // Preserve existing data, add rejection info
            ...taskToReject?.submitted_data, // Get original submitted data
            transcription: taskToReject?.transcription, // Keep the original transcription for reference if needed
            rejection_reason: rejectionReason,
            rejected_by: userId,
            rejected_at: new Date().toISOString(),
            validated_by: null, // Clear potential previous validation info
            validated_at: null,
            was_corrected: null,
          }
        })
        .eq('id', rejectingTaskId);
        
      if (updateError) {
          console.error("Error updating contribution on reject:", updateError);
          throw updateError;
      }
      
      // 2. Add a validation record (marking as not approved)
      console.log(`Inserting validation record (rejected) for contribution ${rejectingTaskId}`);
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          contribution_id: rejectingTaskId,
          is_approved: false, // Mark as rejected
          validator_id: userId,
          comment: rejectionReason // Store the reason
        });
        
      if (validationError) {
          console.error("Error inserting validation record:", validationError);
          // Decide if this is critical enough to rollback or just warn
          toast({ title: "Warning", description: "Could not save validation record, but contribution updated.", variant: "default" });
      }
      
      // Update local state
      setValidationResults(prev => ({
        ...prev,
        [rejectingTaskId]: 'rejected'
      }));
      // Clear any saved correction for this task locally after successful rejection
       setCorrectedTranscripts(prev => {
          const newState = {...prev};
          delete newState[rejectingTaskId];
          return newState;
       });

      toast({
        title: 'Transcript Rejected',
        description: 'Feedback sent. Transcriber may revise.'
      });
      
      // Close dialog and move to next task OR navigate back
      setIsRejectionDialogOpen(false);
      setTimeout(() => {
         if (isSingleTaskMode) {
            // If validating a single task via URL, go back to dashboard (or previous page)
            navigate('/dashboard'); // Or use navigate(-1)
        } else {
            handleNextTask(); // Proceed to next task in the queue
        }
      }, 1000);

    } catch (error) {
      console.error('Error rejecting transcript:', error);
      toast({
        title: 'Rejection Error',
        description: `Failed to reject transcript: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setRejectingTaskId(null); // Reset ID after attempt
    }
  };
  
  const handleNextTask = () => {
    // This function should ideally only be called when isSingleTaskMode is false
    if (isSingleTaskMode) {
        console.warn("handleNextTask called in single task mode, navigating back instead.");
        navigate('/dashboard'); // Or navigate(-1)
        return;
    }

    resetCurrentTask();
    resetAudioState(); 

    if (currentTaskIndex < filteredTasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      toast({
        title: 'All Tasks Reviewed',
        description: 'No more transcripts in this filter.'
      });
      // Optionally navigate away when queue is finished
      // navigate('/dashboard'); 
    }
  };

  // --- Render Audio Player Function Added ---
  const renderAudioPlayer = () => {
    // Check if we have a valid audio URL
    const hasAudio = currentTask?.audioUrl && currentTask.audioUrl.trim() !== '';
    
    if (!hasAudio) {
      return (
        <div className="p-4 bg-gray-50 rounded-md border text-center">
          <p className="text-muted-foreground mb-2">No audio available for this task.</p>
          <p className="text-sm">This is a text-only transcription that needs validation.</p>
        </div>
      );
    }
    
    return (
      <div className="p-4 bg-gray-50 rounded-md border space-y-3">
        <audio ref={audioRef} className="hidden" /> 
        {/* Controls Row */} 
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={togglePlayPause} 
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={audioError || !duration}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => seekRelative(-5)} aria-label="Rewind 5 seconds" disabled={audioError || !duration}>
            <Rewind className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => seekRelative(5)} aria-label="Forward 5 seconds" disabled={audioError || !duration}>
            <FastForward className="h-5 w-5" />
          </Button>
          <div className="text-sm font-mono text-muted-foreground min-w-[100px] text-center">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="playbackRateValidator" className="text-sm whitespace-nowrap">Speed:</Label>
            <Select value={playbackRate.toString()} onValueChange={handleRateChangeSelect} disabled={audioError || !duration}>
              <SelectTrigger id="playbackRateValidator" className="w-[80px] h-9">
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
          max={duration || 1} // Ensure max is at least 1 to prevent errors
          step={0.1}
          disabled={audioError || !duration}
          onValueChange={handleSeekSlider}
          onValueCommit={handleSeekCommit}
          onPointerDown={() => setIsSeeking(true)} 
          onPointerUp={() => setIsSeeking(false)} 
          className="w-full cursor-pointer pt-1"
        />
        {audioError && <p className="text-xs text-red-600">Error loading audio.</p>}
      </div>
    );
  };
  // --- End Render Audio Player Function ---
  
  const currentSpecialChars = currentTask ? specialCharsMap[currentTask.language.toLowerCase()] || [] : [];

  // --- Updated Return Statement ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header - Modified: Hide Language Filter in single task mode */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}> {/* Navigate back */} 
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {/* Title adjusted slightly based on mode */} 
        <h1 className="text-2xl font-semibold ml-2">
            {isSingleTaskMode ? 'Validate Transcript' : 'Transcript Validation Queue'}
        </h1>
        {!isSingleTaskMode && (
            <div className="ml-auto">
                <LanguageFilter 
                    availableLanguages={availableLanguages}
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={handleLanguageChange}
                />
            </div>
        )}
      </div>
      
      {/* Loading State */}
      {isLoadingTasks ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-afri-orange" />
          <p className="text-muted-foreground">Loading validation tasks...</p>
        </div>
      ) : /* No Tasks Available State */ 
      filteredTasks.length === 0 ? (
        <Card className="text-center py-10 border-dashed">
          <CardHeader>
            <FileCheck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <CardTitle className="text-xl font-medium text-gray-700">No Validation Tasks</CardTitle>
            <CardDescription>
              There are currently no transcripts awaiting validation{selectedLanguage !== 'all' ? ` in ${selectedLanguage}` : ''}.
            </CardDescription>
          </CardHeader>
           {tasks.length > 0 && ( // Show if tasks exist but not in current filter
             <CardFooter className="justify-center">
                 <Button variant="outline" onClick={() => handleLanguageChange('all')}>Show All Languages</Button>
             </CardFooter>
          )}
        </Card>
      ) : /* Task Display Card */ 
      currentTask ? (
        <Card className="overflow-hidden shadow-md">
          <CardHeader className="bg-gray-50/50 border-b">
             {/* Header Content: Title, Progress, Language - Modified: Progress bar hidden in single task */}
             <div className="flex justify-between items-start mb-3">
               <div>
                 {/* Task Counter Title adjusted for single task mode */} 
                 <CardTitle className="text-lg font-medium">
                     {isSingleTaskMode 
                         ? `Reviewing Contribution #${currentTask.contributionId}`
                         : `Validate Transcript (${currentTaskIndex + 1}/${filteredTasks.length})`
                     }
                 </CardTitle>
                 <CardDescription>Listen and compare the transcript for accuracy.</CardDescription>
                 <Badge variant="secondary" className="mt-2">Language: {currentTask.language}</Badge>
               </div>
               {/* Status Indicator */}
               <div className="text-right">
                    {validationResults[currentTask.id] === 'approved' && (
                      <Badge color="green" className="bg-green-100 text-green-800">Approved</Badge>
                    )}
                    {validationResults[currentTask.id] === 'rejected' && (
                      <Badge color="red" className="bg-red-100 text-red-800">Rejected</Badge>
                    )}
               </div>
             </div>
             {/* Hide progress bar if only one task is loaded */} 
             {!isSingleTaskMode && filteredTasks.length > 1 && (
                <Progress 
                    value={((currentTaskIndex + 1) / filteredTasks.length) * 100} 
                    className="h-2" 
                />
             )}
          </CardHeader>
          
          {/* Main Content Area - Two Columns */} 
          <CardContent className="grid md:grid-cols-2 gap-6 p-6">
            {/* Left Column: Audio Player */} 
            <div className="space-y-3">
              <Label className="font-medium text-base">Audio Recording</Label>
              {renderAudioPlayer()}
              <p className="text-xs text-muted-foreground">
                  Review the audio. Use controls for playback.
              </p>
            </div>
            
            {/* Right Column: Transcript Review & Edit */} 
            <div className="space-y-4 flex flex-col">
                {/* Original/Corrected Transcript Area */}
                <div className="space-y-2 flex-grow">
                    <div className="flex justify-between items-center mb-1">
                         <Label htmlFor="transcript-text" className="font-medium text-base">
                             {isEditing ? "Corrected Transcript" : "Original Transcript"}
                         </Label>
                         {/* Edit/Save/Cancel Buttons */}
                         {!isCurrentTaskValidated && (
                            <div className="flex space-x-2">
                                {!isEditing ? (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleStartEdit}
                                        disabled={isSubmitting}
                                    >
                                        <Edit className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                ) : (
                                    <>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            variant="default" 
                                            size="sm" 
                                            onClick={handleSaveCorrection}
                                            disabled={!currentTranscript.trim()}
                                        >
                                            Save Correction
                                        </Button>
                                    </>
                                )}
                           </div>
                         )}
                    </div>

                    {/* Display Area */}
                    {!isEditing ? (
                        // Read-only view of original or corrected text
                        <div className={`p-3 border rounded-md bg-gray-50 min-h-[150px] text-sm ${correctedTranscripts[currentTask.id] ? 'border-blue-300' : 'border-gray-200'}`}>
                            <p className="whitespace-pre-wrap">{correctedTranscripts[currentTask.id]?.text ?? currentTranscript}</p>
                            {correctedTranscripts[currentTask.id] && (
                                <div className="mt-2 text-xs text-blue-600 flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Correction saved (not yet submitted)
                                </div>
                            )}
                        </div>
                    ) : (
                        // Editing view
                        <>
                            <Textarea 
                                ref={textareaRef}
                                id="transcript-text"
                                value={currentTranscript}
                                onChange={handleTranscriptChange}
                                rows={8} // Adjust rows as needed
                                className="flex-grow resize-none border-blue-500 focus:ring-blue-500 text-base" 
                                disabled={isSubmitting}
                            />
                             {/* Special Character Buttons - Shown during edit */} 
                             {currentSpecialChars.length > 0 && (
                                <div className="pt-1 flex flex-wrap gap-1">
                                    <span className="text-xs text-gray-500 mr-2 py-1 self-center">Insert:</span>
                                    {currentSpecialChars.map(char => (
                                        <Button 
                                            key={char} 
                                            variant="outline"
                                            size="sm"
                                            className="font-mono px-2 py-0.5 h-auto text-sm" 
                                            onClick={() => insertSpecialChar(char)}
                                            disabled={isSubmitting}
                                        >
                                            {char}
                                        </Button>
                                    ))}
                                </div>
                             )}
                        </>
                    )}
                </div>

                {/* Approval/Rejection Actions */}
                {!isCurrentTaskValidated && (
                    <div className="flex justify-end space-x-3 pt-3 border-t">
                         <Button 
                            variant="destructive" 
                            onClick={() => openRejectionDialog(currentTask.id)} 
                            disabled={isSubmitting || isEditing} // Disable if editing
                        >
                            <ThumbsDown className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button 
                            variant="default" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleApproveTranscript} 
                            disabled={isSubmitting || isEditing} // Disable if editing
                        >
                            <ThumbsUp className="h-4 w-4 mr-1" /> Approve
                        </Button>
                    </div>
                )}
            </div> 
          </CardContent>
          
          {/* Footer - Modified: Next Task Button logic */}
          <CardFooter className="flex justify-end border-t pt-4 bg-gray-50/50">
            {/* Show 'Return to Dashboard' if validated in single mode, else show 'Next Task' logic */} 
            {isSingleTaskMode && isCurrentTaskValidated ? (
                <Button size="lg" onClick={() => navigate('/dashboard')}> 
                    Return to Dashboard
                </Button>
            ) : (
                <Button 
                    size="lg"
                    onClick={handleNextTask} 
                    // Disable Next if editing, submitting, or if it's the last task (and not validated yet)
                    // OR if in single task mode and not yet validated
                    disabled={isSubmitting || isEditing || (!isCurrentTaskValidated && (isLastTask || isSingleTaskMode))}
                    // Hide button completely if it's the only task and it's already validated
                    className={isSingleTaskMode && isCurrentTaskValidated ? 'hidden' : ''}
                >
                    {isSubmitting && !isCurrentTaskValidated ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {/* Text changes based on state */} 
                    {isLastTask || isSingleTaskMode 
                      ? (isCurrentTaskValidated ? 'Task Complete' : 'Proceed After Validation') 
                      : 'Next Task'
                    }
                    {/* Add skip icon only if multiple tasks and not validated */} 
                    {!isSingleTaskMode && !isLastTask && !isCurrentTaskValidated && <SkipForward className="ml-2 h-4 w-4" />} 
                </Button>
            )}
          </CardFooter>
        </Card>
      ) : (
         // Fallback if currentTask is somehow null after loading & filtering
        <Card className="text-center py-10"><CardContent>Error displaying task.</CardContent></Card>
      )}
      
      {/* Rejection Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transcript</DialogTitle>
            <DialogDescription>
              Provide feedback for the transcriber. Why is this transcript being rejected?
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Inaccurate transcription, missing words, significant background noise not noted..."
            rows={4}
            className="mt-2"
          />
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsRejectionDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectTranscript}
              disabled={!rejectionReason.trim() || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TranscriptValidationTask; 