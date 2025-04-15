import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardDescription, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, SkipForward, CheckCircle, FileText, Loader2, Save, Play, Pause, Rewind, FastForward } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { LanguageFilter } from '@/components/tasks/LanguageFilter';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Label } from '@/components/ui/label';
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the structure for transcription tasks
interface TranscriptionTask {
  id: number;
  audioUrl: string;
  language: string;
  originalTaskId: number;
  contributionId: number;
  status?: string;
}

// Define the structure for contribution data
interface ContributionData {
  id: number;
  storage_url: string;
  task_id: number;
  status: string;
  user_id: string;
  submitted_data: {
    transcription?: string;
    rejection_reason?: string;
  } | null;
  tasks: {
    id: number;
    language: string;
  } | null;
}

// Helper to format time
const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- Special Characters Map (Copied from TranslateTask, adjust if needed for transcription) ---
const specialCharsMap: Record<string, string[]> = {
  'akan': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ŋ', 'Ŋ'],
  'ewe': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ɖ', 'Ɖ', 'ƒ', 'Ƒ', 'ɣ', 'Ɣ', 'ŋ', 'Ŋ', 'ʋ', 'Ʋ'],
  'ga': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ŋ', 'Ŋ'],
  'fante': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ'], // Example, refine as needed
  'dagbani': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ɣ', 'Ɣ', 'ŋ', 'Ŋ', 'ʒ', 'Ʒ'] 
};

const TranscriptionTask: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contributionId = searchParams.get('contribution_id');
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [transcriptions, setTranscriptions] = useState<Record<number, { text: string, taskId: number }>>({});
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TranscriptionTask[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [wasTaskSkipped, setWasTaskSkipped] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // <-- Add ref for textarea
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Fetch User ID
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    fetchUser();
  }, []);

  // Fetch tasks that need transcription
  useEffect(() => {
    const fetchTranscriptionTasks = async () => {
      if (!userId) {
        setIsLoadingTasks(false);
        return;
      }
      
      setIsLoadingTasks(true);
      setTasks([]);
      setAvailableLanguages([]);
      setCurrentTaskIndex(0);
      setTranscriptions({});
      setCurrentTranscription('');
      
      try {
        // If we have a specific contribution_id, fetch just that one
        if (contributionId) {
          console.log("Fetching specific contribution:", contributionId);
          const { data: contribution, error: contribError } = await supabase
            .from('contributions')
            .select(`
              id, 
              storage_url,
              task_id,
              status,
              user_id,
              submitted_data,
              tasks (id, language)
            `)
            .eq('id', parseInt(contributionId))
            .single();
            
          if (contribError) throw contribError;
          
          if (contribution) {
            const typedContribution = contribution as ContributionData;
            
            // Check if this contribution is available for transcription
            if (typedContribution.status !== 'ready_for_transcription' && 
                !(typedContribution.status === 'rejected' && typedContribution.user_id === userId) &&
                !(typedContribution.status === 'rejected_transcript' && typedContribution.user_id === userId)) {
              toast({
                title: 'Task Unavailable',
                description: 'This task is not available for transcription.',
                variant: 'destructive'
              });
              navigate('/dashboard');
              return;
            }
            
            // Set existing transcription and rejection reason if task was rejected
            if (typedContribution.status === 'rejected' || typedContribution.status === 'rejected_transcript') {
              console.log('Loading rejected task with previous data:', typedContribution.submitted_data);
              
              if (typedContribution.submitted_data) {
                // Use indexed access to work around TypeScript's strict typing
                const submittedData = typedContribution.submitted_data as Record<string, any>;
                
                if (submittedData['transcription']) {
                  setCurrentTranscription(submittedData['transcription']);
                }
                
                if (submittedData['rejection_reason']) {
                  setRejectionReason(submittedData['rejection_reason']);
                }
              }
            }
            
            const task: TranscriptionTask = {
              id: typedContribution.id,
              audioUrl: typedContribution.storage_url as string,
              language: typedContribution.tasks?.language || 'Unknown',
              originalTaskId: typedContribution.task_id,
              contributionId: typedContribution.id,
              status: typedContribution.status
            };
            
            setTasks([task]);
            setAvailableLanguages([typedContribution.tasks?.language || 'Unknown']);
          } else {
            toast({
              title: 'Task Not Found',
              description: 'The requested transcription task was not found.',
              variant: 'destructive'
            });
            navigate('/dashboard');
          }
        } else {
          // Original logic for fetching all available tasks
          console.log("Fetching all available transcription tasks");
          const { data: readyContributions, error: contribError } = await supabase
            .from('contributions')
            .select(`
              id, 
              storage_url,
              task_id,
              status,
              user_id,
              submitted_data,
              tasks (id, language)
            `)
            .or(`status.eq.ready_for_transcription,and(status.eq.rejected,user_id.eq.${userId}),and(status.eq.rejected_transcript,user_id.eq.${userId})`);
            
          if (contribError) throw contribError;
          
          if (readyContributions && readyContributions.length > 0) {
            const languages = Array.from(
              new Set(
                readyContributions
                  .map(c => c.tasks?.language)
                  .filter((l): l is string => l !== null && l !== undefined && l.trim() !== '')
              )
            );
            setAvailableLanguages(languages);
            
            const mappedTasks: TranscriptionTask[] = readyContributions
              .filter(c => c.storage_url && c.tasks)
              .map(c => ({
                id: c.id,
                audioUrl: c.storage_url as string,
                language: c.tasks?.language || 'Unknown',
                originalTaskId: c.task_id,
                contributionId: c.id,
                status: c.status
              }));
              
            setTasks(mappedTasks);
            
            // If there's a rejected task and we're not looking at a specific task,
            // preload the first rejected task's data
            const rejectedTask = readyContributions.find(c => 
              (c.status === 'rejected' || c.status === 'rejected_transcript') && c.user_id === userId
            );
            if (rejectedTask && rejectedTask.submitted_data) {
              const submittedData = rejectedTask.submitted_data as Record<string, any>;
              
              if (submittedData['transcription']) {
                setCurrentTranscription(submittedData['transcription']);
              }
              
              if (submittedData['rejection_reason']) {
                setRejectionReason(submittedData['rejection_reason']);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching transcription tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to load transcription task(s). Please try again later.',
          variant: 'destructive'
        });
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };
    
    if (userId) {
      fetchTranscriptionTasks();
    }
  }, [userId, contributionId, navigate, toast]);
  
  // Filter tasks by language
  const filteredTasks = selectedLanguage === 'all'
    ? tasks
    : tasks.filter(task => task.language.toLowerCase() === selectedLanguage.toLowerCase());
  
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language.toLowerCase());
    setCurrentTaskIndex(0);
    setCurrentTranscription('');
    resetAudioState();
  };
  
  const handleTranscriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentTranscription(e.target.value);
  };
  
  // --- Function to Insert Special Character ---
  const insertSpecialChar = (char: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + char + text.substring(end);
      
      setCurrentTranscription(newText); // Update state
      
      // Set cursor position after insertion
      // Use setTimeout to ensure the state update has rendered before setting selection
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + char.length;
      }, 0);
  };
  
  const handleSaveTranscription = () => {
    const currentTask = getCurrentTask();
    if (!currentTask || !currentTranscription.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a transcription before saving.',
        variant: 'destructive'
      });
      return;
    }
    
    setTranscriptions(prev => ({
      ...prev,
      [currentTask.id]: { text: currentTranscription, taskId: currentTask.id }
    }));
    
    toast({
      title: 'Transcription Saved',
      description: 'Transcription saved. Click Next or Submit when done.',
    });
  };
  
  const handleSkipTask = () => {
    toast({
      title: 'Task Skipped',
      description: 'Moving to the next task'
    });
    setWasTaskSkipped(true);
    handleNextTask(true);
  };
  
  const handleNextTask = (skipped = false) => {
    if (filteredTasks.length === 0) return;
    
    const currentTask = getCurrentTask();
    // Save current transcription if not empty and not already saved
    if (!skipped && currentTask && currentTranscription.trim() && !transcriptions[currentTask.id]) {
      handleSaveTranscription(); 
    }
    
    setCurrentTranscription('');
    setWasTaskSkipped(skipped);
    resetAudioState();
    
    if (currentTaskIndex < filteredTasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      // Last task
      const finalTranscriptions = { ...transcriptions };
      if (currentTask && currentTranscription.trim() && !finalTranscriptions[currentTask.id]) {
        // Auto-save the last one if text exists
        finalTranscriptions[currentTask.id] = {
          text: currentTranscription,
          taskId: currentTask.id
        };
      }
      
      if (Object.keys(finalTranscriptions).length > 0) {
        handleSubmitBatch(finalTranscriptions);
      } else {
        toast({
          title: 'All Tasks Viewed',
          description: 'No transcriptions saved.'
        });
        navigate('/dashboard'); // Navigate away if nothing to submit
      }
    }
  };
  
  const handleSubmitBatch = async (transcriptionsToSubmit: Record<number, { text: string, taskId: number }>) => {
    if (Object.keys(transcriptionsToSubmit).length === 0 || !userId) {
      toast({
        title: 'No Transcriptions',
        description: 'Please save at least one transcription before submitting.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    toast({
      title: 'Submitting...',
      description: 'Saving your transcriptions.'
    });
    
    const submissionPromises = Object.values(transcriptionsToSubmit).map(async ({ text, taskId }) => {
      try {
        // 1. Update the contribution with transcription and change status
        console.log(`Updating contribution ${taskId} with status 'pending_transcript_validation'`);
        
        // Preserve rejection reason if it exists when resubmitting
        let submittedData: any = { transcription: text };
        
        // If this is a resubmission after rejection, preserve the rejection history
        if (rejectionReason) {
          submittedData = { 
            ...submittedData,
            rejection_history: [{ 
              reason: rejectionReason, 
              timestamp: new Date().toISOString() 
            }]
          };
        }
        
        const { error: updateError } = await supabase
          .from('contributions')
          .update({
            submitted_data: submittedData,
            status: 'pending_transcript_validation',
          })
          .eq('id', taskId);
          
        if (updateError) throw updateError;
        console.log(`Successfully updated contribution ${taskId}`);
        return { taskId, success: true };
      } catch (error) {
        console.error(`Error submitting transcription for task ${taskId}:`, error);
        return { taskId, success: false, error };
      }
    });
    
    try {
      const results = await Promise.all(submissionPromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (failureCount > 0) {
        toast({
          title: 'Submission Issues',
          description: `${failureCount} transcription(s) failed to submit. Please try again or contact support.`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Batch Submitted!',
          description: `Successfully submitted ${successCount} transcription(s). Thank you!`,
          variant: 'default'
        });
        
        // Reset state and navigate away
        setTranscriptions({});
        setCurrentTranscription('');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error during batch submission process:', error);
      toast({
        title: 'Submission Error',
        description: 'An unexpected error occurred during submission.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getCurrentTask = (): TranscriptionTask | null => {
    if (isLoadingTasks || filteredTasks.length === 0 || currentTaskIndex >= filteredTasks.length) {
      return null;
    }
    return filteredTasks[currentTaskIndex];
  };
  
  const currentTask = getCurrentTask();
  const isCurrentTaskSaved = currentTask ? !!transcriptions[currentTask.id] : false;
  const isLastTask = currentTaskIndex === filteredTasks.length - 1;
  
  // --- Audio Player Logic ---
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
  };
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      const newDuration = audio.duration;
      if (isFinite(newDuration) && newDuration > 0) {
        console.log("Audio loaded with valid duration:", newDuration);
        setDuration(newDuration);
      } else {
        console.warn(`Audio reported non-finite duration: ${newDuration}. Using fallback value 1.`);
        setDuration(1);
      }
      setIsLoading(false);
    };
    const handleTimeUpdate = () => {
        if (!isSeeking && isFinite(audio.currentTime)) {
           setCurrentTime(audio.currentTime);
        }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleRateChange = () => setPlaybackRate(audio.playbackRate);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('ratechange', handleRateChange);

    // Set initial duration if already loaded and finite
    if (audio.readyState >= 1 && isFinite(audio.duration)) {
        handleLoadedMetadata();
    }
    audio.playbackRate = playbackRate; // Ensure rate is set

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('ratechange', handleRateChange);
    };
  }, [audioRef, isSeeking]); // Re-attach if seeking state changes might affect listeners

  // Load audio when task changes
  useEffect(() => {
    if (!currentTask?.audioUrl) return;
    
    const audio = audioRef.current;
    if (!audio) return;

    // Reset states
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    
    let retryCount = 0;
    const maxRetries = 2;
    let timeoutId: NodeJS.Timeout;
    
    const loadAudio = (url: string) => {
      console.log(`Loading audio URL: ${url} (retry: ${retryCount})`);
      
      // Clean up previous listeners and sources
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      
      // Set new source
      audio.src = url;
      audio.load();
      
      // Set a timeout in case metadata doesn't load
      timeoutId = setTimeout(() => {
        console.warn("Audio metadata load timed out - using fallback duration");
        if (!isFinite(audio.duration) || audio.duration === 0) {
          setDuration(1); // Fallback duration
          setAudioError(false); // Still allow playback attempts
        }
      }, 2000);
    };
    
    const handleError = (e: Event) => {
      console.error("Audio loading error:", e);
      
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying audio load (${retryCount}/${maxRetries})`);
        // Small delay before retry
        setTimeout(() => {
          loadAudio(currentTask.audioUrl);
        }, 1000);
      } else {
        setAudioError(true);
        toast({
          title: "Audio Error",
          description: "Failed to load audio after multiple attempts. Please try another task.",
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
        console.warn(`Audio reported non-finite duration: ${newDuration}. Defaulting to 1s.`);
        setDuration(1); // Fallback to 1 second
      }
    };
    
    // Add event listeners
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Load the audio
    loadAudio(currentTask.audioUrl);
    
    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [currentTask?.audioUrl, toast]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        console.log("Pausing audio");
        await audio.pause();
        setIsPlaying(false);
      } else {
        console.log("Starting playback, readyState:", audio.readyState);
        console.log("Audio state - duration:", audio.duration, "currentTime:", audio.currentTime);
        
        // If audio seems loaded enough to play
        if (audio.readyState >= 2) {
          // Ensure we have a valid duration to work with
          if (!isFinite(audio.duration) || audio.duration === 0) {
            console.warn("Invalid duration detected, using buffered time if available");
            // Try to get duration from buffered ranges if available
            if (audio.buffered.length > 0) {
              const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
              if (bufferedEnd > 0) {
                setDuration(bufferedEnd);
              } else {
                setDuration(1); // Fallback
              }
            } else {
              setDuration(1); // Fallback if no buffer info
            }
          }
          
          try {
            const playPromise = audio.play();
            // Modern browsers return a promise from play()
            if (playPromise !== undefined) {
              await playPromise;
              setIsPlaying(true);
              console.log("Playback started successfully");
            }
          } catch (playError) {
            console.error("Playback failed:", playError);
            toast({
              title: "Playback Error",
              description: "Could not play the audio. Please try again.",
              variant: "destructive"
            });
          }
        } else {
          console.warn("Audio not ready yet, readyState:", audio.readyState);
          toast({
            title: "Audio Not Ready",
            description: "The audio is still loading. Please wait a moment and try again.",
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
      toast({
        title: "Playback Error",
        description: "An unexpected error occurred. Please try another task.",
        variant: "destructive"
      });
    }
  };

  const handleRateChangeSelect = (rateStr: string) => {
    const rate = parseFloat(rateStr);
    setPlaybackRate(rate); // Update state
    if (audioRef.current) {
      audioRef.current.playbackRate = rate; // Update audio element
    }
  };

  const handleSeekSlider = (value: number[]) => {
     const newTime = value[0];
     setCurrentTime(newTime); // Update UI immediately
     // Actual seek happens on commit
  };

  const handleSeekCommit = (value: number[]) => {
      const newTime = value[0];
      // Guard against non-finite values before setting currentTime
      if (audioRef.current && isFinite(newTime)) {
         audioRef.current.currentTime = newTime;
      } else {
         console.warn("Attempted to seek to non-finite time:", newTime);
      }
      setIsSeeking(false);
  }

  const seekRelative = (delta: number) => {
      if (audioRef.current) {
         const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
         audioRef.current.currentTime = newTime;
         setCurrentTime(newTime); // Update UI state
      }
  }
  
  // --- Render Logic ---
  const renderAudioPlayer = () => (
    <div className="p-4 bg-gray-50 rounded-md border space-y-3">
      <audio ref={audioRef} className="hidden" /> 
      {/* Controls Row */} 
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" onClick={togglePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => seekRelative(-5)} aria-label="Rewind 5 seconds" disabled={!isPlaying && duration === 0}>
          <Rewind className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => seekRelative(5)} aria-label="Forward 5 seconds" disabled={!isPlaying && duration === 0}>
          <FastForward className="h-5 w-5" />
        </Button>
        <div className="text-sm font-mono text-muted-foreground min-w-[100px] text-center">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="playbackRate" className="text-sm">Speed:</Label>
          <Select value={playbackRate.toString()} onValueChange={handleRateChangeSelect}>
            <SelectTrigger id="playbackRate" className="w-[80px] h-9">
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
        onValueChange={handleSeekSlider}
        onValueCommit={handleSeekCommit}
        onPointerDown={() => setIsSeeking(true)} 
        onPointerUp={() => setIsSeeking(false)} // Also reset seek flag on pointer up
        className="w-full cursor-pointer pt-1"
      />
    </div>
  );

  const currentSpecialChars = currentTask ? specialCharsMap[currentTask.language.toLowerCase()] || [] : [];

  // Render rejection notice if task was rejected
  const renderRejectionNotice = () => {
    if (!rejectionReason) return null;
    
    return (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-md">
        <h3 className="font-medium text-amber-800 mb-1">This transcription needs revision</h3>
        <p className="text-sm text-amber-700">{rejectionReason}</p>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */} 
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold ml-2">Transcription Task</h1>
        <div className="ml-auto">
          <LanguageFilter 
            availableLanguages={availableLanguages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      </div>
      
      {/* Loading State */} 
      {isLoadingTasks ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-afri-orange" />
          <p className="text-muted-foreground">Loading transcription tasks...</p>
        </div>
      ) : /* No Tasks Available State */ 
      filteredTasks.length === 0 ? (
        <Card className="text-center py-10 border-dashed">
          <CardHeader>
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <CardTitle className="text-xl font-medium text-gray-700">No Transcription Tasks</CardTitle>
            <CardDescription>
              There are currently no tasks ready for transcription{selectedLanguage !== 'all' ? ` in ${selectedLanguage}` : ''}. Check back later!
            </CardDescription>
          </CardHeader>
          {tasks.length > 0 && (
             <CardFooter className="justify-center">
                 <Button variant="outline" onClick={() => handleLanguageChange('all')}>Show All Languages</Button>
             </CardFooter>
          )}
        </Card>
      ) : /* Task Display Card */ 
      currentTask ? (
        <Card className="overflow-hidden shadow-md">
          <CardHeader className="bg-gray-50/50 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-medium">
                  {currentTask.status === 'rejected' ? 'Revise Transcription' : 'Transcribe Audio'} ({currentTaskIndex + 1}/{filteredTasks.length})
                </CardTitle>
                <CardDescription>Listen carefully and type what you hear in {currentTask.language}.</CardDescription>
                <Badge variant="secondary" className="mt-2">Language: {currentTask.language}</Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSkipTask} 
                disabled={isSubmitting}
                className="flex-shrink-0"
              >
                Skip Task <SkipForward className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <Progress 
              value={((currentTaskIndex + 1) / filteredTasks.length) * 100} 
              className="mt-4 h-2" 
            />
          </CardHeader>
          
          {/* Main Content Area - Redesigned */} 
          <CardContent className="grid md:grid-cols-2 gap-6 p-6">
            {/* Left Column: Audio Player */} 
            <div className="space-y-3">
              <Label className="font-medium text-base">Audio Recording</Label>
              {renderAudioPlayer()}
              <p className="text-xs text-muted-foreground">
                  Use the controls to play, pause, rewind, fast-forward, and change playback speed.
              </p>
            </div>
            
            {/* Right Column: Transcription Input */} 
            <div className="space-y-3 flex flex-col">
              <Label htmlFor="transcription-input" className="font-medium text-base">Your Transcription</Label>
              
              {/* Show rejection notice if applicable */}
              {renderRejectionNotice()}
              
              <Textarea 
                ref={textareaRef}
                id="transcription-input"
                placeholder={`Type the ${currentTask.language} transcription here...`}
                value={currentTranscription}
                onChange={handleTranscriptionChange}
                rows={10} 
                className="flex-grow resize-none border-gray-300 focus:border-afri-blue focus:ring-afri-blue text-base" 
                disabled={isSubmitting || isCurrentTaskSaved}
              />
              
              {/* Special Character Buttons */} 
              {currentSpecialChars.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500 mr-2 py-1">Insert:</span>
                  {currentSpecialChars.map(char => (
                      <Button 
                        key={char} 
                        variant="outline"
                        size="sm"
                        className="font-mono px-2 py-0.5 h-auto text-sm" 
                        onClick={() => insertSpecialChar(char)}
                        disabled={isSubmitting || isCurrentTaskSaved}
                      >
                        {char}
                      </Button>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end items-center mt-2">
                {isCurrentTaskSaved ? (
                  <div className="text-sm text-green-600 flex items-center font-medium">
                    <CheckCircle className="h-4 w-4 mr-1" /> Saved
                  </div>
                ) : (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleSaveTranscription} 
                    disabled={!currentTranscription.trim() || isSubmitting}
                  >
                    <Save className="h-4 w-4 mr-1" /> Save Progress
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
          
          {/* Footer Actions */} 
          <CardFooter className="flex justify-end border-t bg-gray-50/50 py-4 px-6">
            <Button 
              size="lg"
              onClick={() => handleNextTask()} 
              disabled={isSubmitting || (!isCurrentTaskSaved && !currentTranscription.trim() && !wasTaskSkipped)} 
              className="min-w-[120px]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLastTask ? 
                (Object.keys(transcriptions).length > 0 || currentTranscription.trim() ? 
                  'Submit Batch' : 'Finish Session') : // Changed Finish label
                'Next Task'}
            </Button>
          </CardFooter>
        </Card>
      ) : null /* Should not happen if loading/no tasks handled */}
    </div>
  );
};

export default TranscriptionTask; 