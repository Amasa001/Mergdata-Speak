import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, CheckCircle, ArrowLeft, SkipForward, Loader2, Play, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { toast } from 'sonner'; // Using sonner for toasts
import { AudioRecorder } from '@/components/recording/AudioRecorder';
import { useNavigate, useLocation } from 'react-router-dom';
import { Progress } from "@/components/ui/progress";

// Define the structure for TTS task content
interface TaskContentTTS {
  task_title: string;
  task_description?: string;
  text_prompt: string;
}

// Define the structure for a fetched Task
type Task = Database['public']['Tables']['tasks']['Row'];

// Define extended task type with rejected task properties
interface RejectedTask extends Task {
  contribution_id?: number;
  rejection_data?: any;
  needs_resubmission?: boolean;
}

// Type guard to check if an object resembles TaskContentTTS
function isTaskContentTTS(content: Json | null | undefined): content is { task_title: string, text_prompt: string, task_description?: string } {
  if (!content) {
    console.warn("Task content is null or undefined");
    return false;
  }
  
  if (typeof content !== 'object' || Array.isArray(content)) {
    console.warn("Task content is not an object:", typeof content);
    return false;
  }
  
  const contentObj = content as Record<string, unknown>;
  
  // Check for required property: task_title
  const hasTaskTitle = typeof contentObj.task_title === 'string';
  
  // Check for any variation of text prompt fields
  const hasTextPrompt = 
    typeof contentObj.text_prompt === 'string' || 
    typeof contentObj.text_to_speak === 'string' ||
    typeof contentObj.textPrompt === 'string';
  
  // Get the actual text prompt from any of the possible fields
  if (!hasTaskTitle || !hasTextPrompt) {
    console.warn("Task content missing required properties:", {
      hasTaskTitle,
      hasTextPrompt,
      contentKeys: Object.keys(contentObj)
    });
  }
  
  return hasTaskTitle && hasTextPrompt;
}

// Helper function to parse URL parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const TTSTask: React.FC = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const taskIdParam = query.get('task');
  
  const [tasks, setTasks] = useState<RejectedTask[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState<Record<number, { blob: Blob, taskId: number }>>({}); // Store blob and taskId
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRecordingBlob, setCurrentRecordingBlob] = useState<Blob | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [reviewAudioUrl, setReviewAudioUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const reviewAudioRef = useRef<HTMLAudioElement>(null);

  // Fetch User ID and Tasks
  useEffect(() => {
    const initializeTasks = async () => {
      setIsLoadingTasks(true);
      setRecordedAudios({}); // Clear previous recordings
      setCurrentRecordingBlob(null);
      setReviewAudioUrl(null);

      // Check if the tts-recordings bucket exists by trying to list files
      try {
        console.log("Checking tts-recordings bucket existence...");
        
        const { data, error } = await supabase.storage
          .from('tts-recordings')
          .list('', { limit: 1 });
        
        if (error) {
          console.warn("Warning: Error accessing 'tts-recordings' bucket:", error.message, error);
          
          // Only show the toast warning once per session
          if (!sessionStorage.getItem('ttsBucketWarningShown')) {
            toast.warning(
              "Storage configuration issue", 
              { description: "The TTS recordings bucket doesn't exist or isn't accessible. Please contact an administrator." }
            );
            sessionStorage.setItem('ttsBucketWarningShown', 'true');
          }
        } else {
          console.log("Successfully connected to 'tts-recordings' bucket, found", data?.length || 0, "files");
        }
      } catch (err) {
        console.error("Error checking storage bucket:", err);
      }

      // 1. Fetch User ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication Error", { description: "Please log in to contribute." });
        navigate('/login');
        return;
      }
      setUserId(user.id);

      try {
        // Initialize arrays for tasks
        let pendingTasks: RejectedTask[] = [];
        let rejectedTasks: RejectedTask[] = [];
        
        // If a specific task ID was specified in the URL
        if (taskIdParam) {
          const taskId = parseInt(taskIdParam);
          if (!isNaN(taskId)) {
            // First check if it's a pending task
            const { data: specificTask, error: specificTaskError } = await supabase
              .from('tasks')
              .select('*')
              .eq('id', taskId)
              .eq('type', 'tts')
              .single();
              
            if (specificTaskError && specificTaskError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
              throw specificTaskError;
            }
            
            if (specificTask) {
              pendingTasks = [specificTask as RejectedTask];
            } else {
              // If not a pending task, check if it's a rejected contribution task
              const { data: rejectedContribution, error: rejectedContribError } = await supabase
                .from('contributions')
                .select(`
                  id,
                  status,
                  submitted_data,
                  tasks!inner(*)
                `)
                .eq('tasks.id', taskId)
                .eq('user_id', user.id)
                .eq('status', 'rejected')
                .eq('tasks.type', 'tts')
                .single();
                
              if (rejectedContribError && rejectedContribError.code !== 'PGRST116') {
                throw rejectedContribError;
              }
              
              if (rejectedContribution) {
                const task = rejectedContribution.tasks;
                rejectedTasks = [{
                  ...task,
                  contribution_id: rejectedContribution.id,
                  rejection_data: rejectedContribution.submitted_data,
                  needs_resubmission: true
                } as RejectedTask];
              }
              
              // If we couldn't find the task at all
              if (!specificTask && !rejectedContribution) {
                toast.error("Task Not Found", { description: "The requested task doesn't exist or you don't have access to it." });
                setTasks([]);
                setIsLoadingTasks(false);
                return;
              }
            }
          }
        } else {
          // 2. Fetch pending TTS tasks (only if no specific task was requested)
          const { data: fetchedPendingTasks, error: pendingError } = await supabase
            .from('tasks')
            .select('*')
            .eq('type', 'tts')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

          if (pendingError) throw pendingError;
          pendingTasks = fetchedPendingTasks as RejectedTask[] || [];

          // 3. Fetch user's assigned+rejected TTS tasks to allow resubmission
          const { data: rejectedContributions, error: rejectedError } = await supabase
            .from('contributions')
            .select(`
              id,
              status,
              submitted_data,
              tasks!inner(*)
            `)
            .eq('user_id', user.id)
            .eq('status', 'rejected')
            .eq('tasks.type', 'tts');

          if (rejectedError) throw rejectedError;

          // 4. Extract tasks from rejected contributions and convert format
          rejectedTasks = rejectedContributions?.map(contrib => {
            const task = contrib.tasks;
            // Add metadata to help identify this as a rejected task for re-recording
            return {
              ...task,
              contribution_id: contrib.id,
              rejection_data: contrib.submitted_data,
              needs_resubmission: true
            } as RejectedTask;
          }) || [];
        }

        // 5. Combine pending tasks and rejected tasks from contributions
        const allTasks = [...pendingTasks, ...rejectedTasks];

        if (allTasks.length > 0) {
          console.log(`Found ${pendingTasks.length} pending TTS tasks and ${rejectedTasks.length} rejected tasks for correction`);
          
          // Log the content of tasks for debugging
          allTasks.forEach((task, index) => {
            console.log(`Task ${index} (ID: ${task.id}) content:`, task.content);
          });
          
          setTasks(allTasks);
          setCurrentTaskIndex(0);
        } else {
          setTasks([]);
          toast.info("No TTS tasks available right now.");
        }
      } catch (error: any) {
        console.error("Error fetching TTS tasks:", error);
        toast.error("Failed to load tasks", { description: error.message });
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    initializeTasks();
  }, [navigate, taskIdParam]);

  const currentTask = tasks.length > 0 ? tasks[currentTaskIndex] : null;
  
  // Extract content with fallbacks for different field naming
  const extractTextPrompt = (content: any): string => {
    if (!content || typeof content !== 'object') return '';
    
    // Check different field names that might contain the text prompt
    return content.text_prompt || 
           content.text_to_speak || 
           content.textPrompt || 
           '';
  };
  
  // Only run type check if we have a task
  const currentTaskContent = currentTask && isTaskContentTTS(currentTask.content) 
    ? {
        task_title: (currentTask.content as any).task_title || '',
        task_description: (currentTask.content as any).task_description || '',
        text_prompt: extractTextPrompt(currentTask.content)
      }
    : null;
  
  const currentTaskId = currentTask?.id;
  
  // Add a fallback mechanism for missing content
  const fallbackTaskContent = currentTask && !currentTaskContent ? {
    task_title: 'TTS Recording Task',
    text_prompt: typeof currentTask.content === 'object' && currentTask.content !== null 
      ? extractTextPrompt(currentTask.content) || JSON.stringify(currentTask.content)
      : 'Please record this text (content details unavailable)',
    task_description: 'Read the text clearly with natural intonation'
  } : null;
  
  // Use the actual content or fallback
  const displayTaskContent = currentTaskContent || fallbackTaskContent;

  const handleAudioDataAvailable = (url: string | null, blob: Blob | null) => {
    setReviewAudioUrl(url);
    setCurrentRecordingBlob(blob);
    if (url && blob) {
        toast.info("Recording Ready for Review", {
            description: "Listen to your recording below.",
        });
    } else {
        if (reviewAudioRef.current) {
            reviewAudioRef.current.pause();
            reviewAudioRef.current.currentTime = 0;
        }
    }
  };

  const handleSaveRecording = () => {
    if (!currentRecordingBlob || !currentTaskId) return;

    setRecordedAudios(prev => ({
      ...prev,
      [currentTaskId]: { blob: currentRecordingBlob, taskId: currentTaskId } // Save blob and taskId
    }));
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';

    toast.success("Recording Saved", {
      description: `Ready for the next task or final submission.`,
    });
     // Automatically move to next task after saving
    handleNextTask();
  };

  const handleDiscardRecording = () => {
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';
    toast.info("Recording Discarded", { description: "You can record again." });
  };

  const handleSkipTask = () => {
    if (!currentTask) return;
    toast.info("Task Skipped", {
      description: `Skipped task ${currentTaskIndex + 1}.`,
    });
    handleNextTask(true);
  };

  const handleNextTask = (skipped = false) => {
    // Save the current recording if it exists and hasn't been explicitly saved/discarded
    // This ensures recordings aren't lost if user just clicks Next without Save
    if (currentRecordingBlob && currentTaskId && !recordedAudios[currentTaskId]) {
        setRecordedAudios(prev => ({
            ...prev,
            [currentTaskId]: { blob: currentRecordingBlob, taskId: currentTaskId }
        }));
    }

    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
      setCurrentRecordingBlob(null);
      setReviewAudioUrl(null);
      if (reviewAudioRef.current) reviewAudioRef.current.src = '';
    } else {
      // This is the last task, attempt final submission
       if (Object.keys(recordedAudios).length > 0 || currentRecordingBlob) {
         handleSubmitAll();
      } else {
         toast.info("All tasks viewed", { description: "Record or skip the last task to submit.", });
      }
    }
  };

  const handleSubmitAll = async () => {
    if (!userId || !tasks.length) return;
    
    // Collect all recorded tasks
    const recordingsToSubmit = Object.values(recordedAudios);
    if (recordingsToSubmit.length === 0) {
      if (currentRecordingBlob && currentTaskId) {
        // Add the current recording if it exists
        recordingsToSubmit.push({ blob: currentRecordingBlob, taskId: currentTaskId });
      } else {
        toast.error("No Recordings", { description: "Record at least one task before submitting." });
        return;
      }
    }
    
    if (recordingsToSubmit.length === 0) return;
    
    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const recording of recordingsToSubmit) {
      const { blob, taskId } = recording;
      
      try {
        const timestamp = new Date().getTime();
        const filePath = `tts/${userId}/${taskId}-${timestamp}.webm`;
        
        // Upload to tts-recordings bucket
        const { error: uploadError } = await supabase.storage
          .from('tts-recordings') // Use the dedicated TTS recordings bucket
          .upload(filePath, blob, {
            contentType: blob.type || 'audio/webm' // Specify content type
          });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage.from('tts-recordings').getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;
        
        // Find the task by ID to check if it's a resubmission
        const typedTask = tasks.find(t => t.id === taskId) as RejectedTask;
        const existingContributionId = typedTask?.contribution_id;
        
        if (existingContributionId) {
          // Update existing contribution (resubmission for rejected task)
          const { error: updateError } = await supabase
            .from('contributions')
            .update({
              storage_url: publicUrl,
              status: 'pending_validation',
              submitted_data: { 
                recording_path: filePath,
                resubmission: true,
                resubmitted_at: new Date().toISOString()
              }
            })
            .eq('id', existingContributionId);
          
          if (updateError) throw updateError;
          
          console.log(`Successfully resubmitted rejected task ${taskId} with contribution ID ${existingContributionId}`);
        } else {
          // Create new contribution record
          const { error: contributeError } = await supabase
            .from('contributions')
            .insert({
              task_id: taskId,
              user_id: userId,
              storage_url: publicUrl,
              status: 'pending_validation',
              submitted_data: { recording_path: filePath }
            });
          
          if (contributeError) throw contributeError;
          
          // Update task status to assigned
          const { error: taskUpdateError } = await supabase
            .from('tasks')
            .update({ status: 'assigned', assigned_to: userId })
            .eq('id', taskId);
          
          if (taskUpdateError) throw taskUpdateError;
        }
        
        successCount++;
      } catch (error) {
        console.error(`Error submitting recording for task ${taskId}:`, error);
        failCount++;
      }
    }
    
    setIsSubmitting(false);
    
    if (successCount > 0) {
      toast.success(`Recordings Submitted`, {
        description: `${successCount} recording${successCount !== 1 ? 's' : ''} successfully submitted.`
      });
      
      // Clear recordings state and navigate away
      setRecordedAudios({});
      setCurrentRecordingBlob(null);
      setReviewAudioUrl(null);
      
      // If a specific task was requested, go back to dashboard after submission
      if (taskIdParam) {
        navigate('/tts-dashboard');
      } else {
        // Otherwise, reload the page to get new tasks
        navigate('/tts');
      }
    }
    
    if (failCount > 0) {
      toast.error(`Submission Issues`, { 
        description: `${failCount} recording${failCount !== 1 ? 's' : ''} failed to submit.`
      });
    }
  };

  const isCurrentTaskRecorded = currentTaskId ? !!recordedAudios[currentTaskId] : false;
  const isLastTask = currentTaskIndex === tasks.length - 1;

  // --- Logging before Render Logic --- //
  console.log("Rendering TTSTask - State:", {
    isLoadingTasks,
    tasksLength: tasks.length,
    currentTaskIndex,
    currentTaskId,
    hasCurrentTask: !!currentTask,
    hasCurrentTaskContent: !!displayTaskContent
  });
  // Log the specific content before attempting to render the main card
  if (!isLoadingTasks && currentTask) {
      console.log("Rendering Task Card - Content:", displayTaskContent);
  }

  return (
      <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/tts-dashboard')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to TTS Dashboard
        </Button>
        <h1 className="text-xl font-bold">TTS Recording Task</h1>
          </div>

      {isLoadingTasks && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading TTS tasks...</p>
        </div>
      )}

      {!isLoadingTasks && tasks.length === 0 && (
        <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>No Tasks Available</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">There are currently no Text-to-Speech tasks available for you.</p>
                <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </CardContent>
        </Card>
      )}

      {!isLoadingTasks && currentTask && (
        <div className="max-w-3xl mx-auto">
          <Card className="border-none shadow-md">
              <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <CardTitle className="text-lg">
                  Task {currentTaskIndex + 1} / {tasks.length}: {displayTaskContent?.task_title || 'TTS Task'}
                </CardTitle>
                <span className="text-sm font-medium text-gray-500">{currentTask.language}</span>
              </div>
              <CardDescription>{displayTaskContent?.task_description || 'Read the text below clearly and naturally.'}</CardDescription>
              <Progress value={((currentTaskIndex + 1) / tasks.length) * 100} className="mt-2 h-2" />
              </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg border max-h-60 overflow-y-auto">
                  <p className="text-gray-800 text-lg leading-relaxed font-medium">
                  {displayTaskContent?.text_prompt || 'No text prompt available for this task.'}
                  </p>
                </div>
                
              <div className="border-t pt-6 space-y-4">
                {isCurrentTaskRecorded ? (
                   <div className="text-center py-4 text-green-600 font-medium flex items-center justify-center">
                     <CheckCircle className="h-5 w-5 mr-2" />
                     Recording saved for this task.
                   </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                     <AudioRecorder
                        key={currentTaskId}
                        onAudioDataAvailable={handleAudioDataAvailable}
                     />

                     {reviewAudioUrl && (
                        <div className="w-full max-w-md p-4 border rounded-md bg-muted/40 space-y-3">
                            <p className="text-sm font-medium text-center">Review your recording:</p>
                            <audio
                                ref={reviewAudioRef}
                                src={reviewAudioUrl}
                                controls
                                className="w-full"
                             />
                            <div className="flex justify-center space-x-3 pt-2">
                                <Button variant="outline" size="sm" onClick={handleDiscardRecording} disabled={isSubmitting}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                              Discard & Re-record
                            </Button>
                                <Button size="sm" onClick={handleSaveRecording} disabled={isSubmitting}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save & Next
                          </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
          </div>
          
              <div className="border-t pt-6 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handleSkipTask}
                  disabled={isSubmitting || !!reviewAudioUrl}
                 >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip Task
                </Button>

                {isLastTask ? (
                    <Button
                        onClick={handleSubmitAll}
                        disabled={isSubmitting || (Object.keys(recordedAudios).length === 0 && !currentRecordingBlob)}
                    >
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Submit All Recordings
                    </Button>
                ) : (
                    <Button
                        onClick={() => handleNextTask()}
                        disabled={isSubmitting || (!isCurrentTaskRecorded && !currentRecordingBlob)}
                     >
                        Next Task <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                )}
                      </div>
              </CardContent>
            </Card>
        </div>
      )}
      </div>
  );
};

export default TTSTask;
