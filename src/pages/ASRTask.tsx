import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from '@/components/recording/AudioRecorder';
import { ArrowLeft, SkipForward, Mic, Check, XCircle, Globe, Loader2, RotateCcw, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { LanguageFilter } from '@/components/tasks/LanguageFilter';
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/lib/supabase';
import type { Database } from '@/integrations/supabase/types';
import { Badge } from "@/components/ui/badge";

// Define the expected structure of the content field for ASR tasks
interface ASRTaskContent {
  task_title: string;
  task_description: string;
  image_url?: string;
}

// Define the structure for tasks fetched from the DB
// Uses the Row type from generated Supabase types for the 'tasks' table
type Task = Database['public']['Tables']['tasks']['Row'];

// Define the structure the component uses internally (mapping DB task)
interface MappedASRTask {
  id: number; 
  imageUrl?: string;
  description: string;
  title: string;
  language: string;
}

const ASRTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState<Record<number, { blob: Blob, taskId: number }>>({}); // Store blob and taskId
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [reviewAudioUrl, setReviewAudioUrl] = useState<string | null>(null);
  const [currentRecordingBlob, setCurrentRecordingBlob] = useState<Blob | null>(null);
  const reviewAudioRef = useRef<HTMLAudioElement>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [allTasks, setAllTasks] = useState<MappedASRTask[]>([]); // Store all fetched tasks before filtering
  const [filteredTasks, setFilteredTasks] = useState<MappedASRTask[]>([]); // Store filtered tasks for display
  const [userId, setUserId] = useState<string | null>(null);
  const [wasTaskSkipped, setWasTaskSkipped] = useState(false); // Track if the current task was skipped

  // Fetch User ID
  useEffect(() => {
     const fetchUser = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       setUserId(user?.id ?? null);
     };
     fetchUser();
  }, []);

  // Fetch tasks from Supabase when component mounts or language changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) {
        return; // Don't fetch if no user ID
      }

      setIsLoadingTasks(true);
      setAllTasks([]);
      setFilteredTasks([]);
      setCurrentTaskIndex(0);
      setRecordedAudios({});
      setCurrentRecordingBlob(null);
      setReviewAudioUrl(null);

      try {
        // First, get all the task IDs that this user has already contributed to
        const { data: userContributions, error: contributionsError } = await supabase
          .from('contributions')
          .select('task_id')
          .eq('user_id', userId);

        if (contributionsError) {
          console.error("Error fetching user contributions:", contributionsError);
          toast({ title: "Error", description: "Failed to check your previous contributions.", variant: "destructive" });
          throw contributionsError;
        }

        // Extract the task IDs into an array
        const completedTaskIds = userContributions?.map(cont => cont.task_id) || [];
        console.log("User has already contributed to these tasks:", completedTaskIds);

        // Then get all pending ASR tasks
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('type', 'asr')
          .eq('status', 'pending'); // Fetch only pending tasks

        if (error) {
          console.error("Error fetching ASR tasks:", error);
          toast({ title: "Error", description: "Failed to load ASR tasks.", variant: "destructive" });
          throw error;
        }

        if (data) {
          // Filter out tasks the user has already contributed to
          const availableTasks = data.filter(task => !completedTaskIds.includes(task.id));
          console.log(`Found ${data.length} total tasks, ${availableTasks.length} available for you`);

          // Extract unique languages, filtering null, undefined, and empty strings
          const languages = Array.from(
            new Set(
              availableTasks
                .map(task => task.language)
                .filter((l): l is string => l !== null && l !== undefined && l.trim() !== '') 
            )
          );
          setAvailableLanguages(languages);

          // Map fetched data safely
          const mappedTasks: MappedASRTask[] = availableTasks.reduce((acc: MappedASRTask[], task) => {
            // Cast to unknown first, then attempt to cast to ASRTaskContent
            const content = task.content as unknown as Partial<ASRTaskContent>; // Use Partial for safer access

            // Check if essential fields exist
            if (content && typeof content === 'object' && 
                typeof content.task_title === 'string' &&
                typeof content.task_description === 'string') {
              
              acc.push({
                id: task.id,
                title: content.task_title,
                description: content.task_description,
                imageUrl: content.image_url, // Access potentially undefined field
                language: task.language ?? 'Unknown'
              });
            } else {
              console.warn(`Task ${task.id} has unexpected content format:`, task.content);
            }
            return acc;
          }, []);
          
          setAllTasks(mappedTasks);
          
          // Apply initial filter
          if (selectedLanguage === 'all') {
              setFilteredTasks(mappedTasks);
          } else {
              setFilteredTasks(mappedTasks.filter(task => task.language.toLowerCase() === selectedLanguage.toLowerCase()));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    if (userId) {
      fetchTasks();
    }
  // Add userId as a dependency 
  }, [userId, toast]);

   // Effect to filter tasks when selectedLanguage changes
    useEffect(() => {
        if (selectedLanguage === 'all') {
            setFilteredTasks(allTasks);
        } else {
            setFilteredTasks(allTasks.filter(task => task.language.toLowerCase() === selectedLanguage.toLowerCase()));
        }
        // Reset index when filter changes
        setCurrentTaskIndex(0); 
        setCurrentRecordingBlob(null);
        setReviewAudioUrl(null);
        setWasTaskSkipped(false); // Reset skip status on filter change
    }, [selectedLanguage, allTasks]);
  
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language.toLowerCase()); // Ensure lowercase comparison
  };

  const handleAudioDataAvailable = (url: string | null, blob: Blob | null) => {
    setReviewAudioUrl(url);
    setCurrentRecordingBlob(blob);
    if (url && blob) {
        toast({ title: "Recording Ready", description: "Review your recording below or re-record.", });
    } else {
        if (reviewAudioRef.current) {
            reviewAudioRef.current.pause();
            reviewAudioRef.current.currentTime = 0;
        }
    }
  };

  const handleSaveRecording = () => {
    const currentTask = getCurrentTask();
    if (!currentRecordingBlob || !currentTask || !userId) return;
    const taskId = currentTask.id;

    // Store blob and taskId together
    setRecordedAudios(prev => ({
      ...prev,
      [taskId]: { blob: currentRecordingBlob, taskId: taskId }
    }));
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';

    toast({ title: "Recording Saved", description: `Recording saved for Task ${taskId}. Click Next Task.` });
  };

  const handleDiscardRecording = () => {
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';
    toast({ title: "Recording Discarded", description: "You can record again." });
  };
  
  const handleSkipTask = () => {
    toast({ title: "Task Skipped", description: "Moving to the next task." });
    setWasTaskSkipped(true); // Set skip status
    handleNextTask(true); // Pass skip flag
  };
  
  const handleNextTask = (skipped = false) => {
    if (filteredTasks.length === 0) return;
    
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';
    setWasTaskSkipped(skipped); // Update skip status for the next task

    if (currentTaskIndex < filteredTasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      // Last task
       const finalRecordings = { ...recordedAudios };
       const currentTask = getCurrentTask();
       if (currentRecordingBlob && currentTask && !finalRecordings[currentTask.id]) {
           finalRecordings[currentTask.id] = { blob: currentRecordingBlob, taskId: currentTask.id };
       }
      if (Object.keys(finalRecordings).length > 0) {
         handleSubmitBatch(finalRecordings);
      } else {
         toast({ title: "All tasks viewed", description: "No recordings saved.", variant: "default" });
         // Optionally navigate away or show a final message
         // navigate('/dashboard');
      }
    }
  };
  
  // Modified to accept recordings data
  const handleSubmitBatch = async (recordingsToSubmit: Record<number, { blob: Blob, taskId: number }>) => {
    if (Object.keys(recordingsToSubmit).length === 0 || !userId) {
       toast({ title: "No recordings", description: "Record at least one description to submit.", variant: "destructive"});
       return;
    }

    setIsSubmitting(true);
    toast({ title: "Submitting...", description: "Uploading your contributions." });
    console.log(`Preparing to submit ${Object.keys(recordingsToSubmit).length} recordings`);

    const submissionPromises = Object.values(recordingsToSubmit).map(async ({ blob, taskId }) => {
        const timestamp = Date.now();
        const filePath = `asr-recordings/${userId}/${taskId}-${timestamp}.webm`; // Changed path structure
        console.log(`Processing upload for task ${taskId} to path: ${filePath}`);

        try {
            // First ensure the user session is still valid
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error("Your session has expired. Please log in again.");
            }

            // 1. Upload audio blob to Storage with explicit content type
            console.log(`Step 1: Uploading blob of type ${blob.type} and size ${blob.size} bytes`);
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('asr-task-images') // Using the correct bucket name
                .upload(filePath, blob, { 
                    contentType: 'audio/webm',
                    upsert: false
                });
            
            if (uploadError) {
                console.error(`Upload error for task ${taskId}:`, uploadError);
                throw new Error(`Audio upload failed for task ${taskId}: ${uploadError.message}`);
            }
            
            console.log(`Step 1 complete: Upload successful, data:`, uploadData);

            // 2. Get public URL
            console.log(`Step 2: Getting public URL for ${filePath}`);
            const { data: urlData } = supabase.storage.from('asr-task-images').getPublicUrl(filePath);
            const storageUrl = urlData?.publicUrl;
            console.log(`Step 2 complete: URL obtained: ${storageUrl}`);

            if (!storageUrl) {
                throw new Error("Failed to get public URL for uploaded audio.");
            }

            // 3. Insert contribution record with more detailed metadata
            console.log(`Step 3: Creating contribution record for task ${taskId}`);
            const { error: insertError } = await supabase
              .from('contributions')
              .insert({
                  task_id: taskId,
                  user_id: userId,
                  submitted_data: { 
                      timestamp: new Date().toISOString(),
                      source: 'asr_web_interface',
                      content_type: blob.type,
                      file_size: blob.size
                  },
                  storage_url: storageUrl,
                  status: 'pending_validation',
              });
            
            if (insertError) {
                console.error(`Insert error for task ${taskId}:`, insertError);
                throw new Error(`Failed to save contribution record for task ${taskId}: ${insertError.message}`);
            }
            
            console.log(`Step 3 complete: Contribution record created for task ${taskId}`);
            return { taskId, success: true };
        } catch (error: any) {
            console.error(`Error processing task ${taskId}:`, error);
            return Promise.reject({ taskId, error: error.message });
        }
    });

    try {
        console.log(`Submitting all ${submissionPromises.length} promises`);
        const results = await Promise.allSettled(submissionPromises);
        const successfulSubmissions = results.filter(r => r.status === 'fulfilled').length;
        const failedSubmissions = results.filter(r => r.status === 'rejected');

        console.log(`Results: ${successfulSubmissions} succeeded, ${failedSubmissions.length} failed`);
        
        if (failedSubmissions.length > 0) {
            console.error("Failed submissions:", failedSubmissions);
            toast({ title: "Submission Issue", description: `${failedSubmissions.length} recording(s) failed to submit. Please try again later.`, variant: "destructive" });
        } else {
            toast({ title: "Batch Submitted!", description: `Successfully submitted ${successfulSubmissions} contribution(s). Thank you!`, variant: "default" });
        }
        
        // Reset state and navigate away only if all successful or handle partial success
        setRecordedAudios({});
        setCurrentRecordingBlob(null);
        setReviewAudioUrl(null);
        if (reviewAudioRef.current) reviewAudioRef.current.src = '';
        navigate('/dashboard'); // Navigate away after submission

    } catch (error: any) {
        console.error("Error during batch submission:", error);
        toast({ title: "Submission Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const getCurrentTask = (): MappedASRTask | null => {
    if (isLoadingTasks || filteredTasks.length === 0 || currentTaskIndex >= filteredTasks.length) {
      return null; 
    }
    return filteredTasks[currentTaskIndex];
  };
  
  const currentTask = getCurrentTask();
  const tasksInCurrentSet = filteredTasks.length;
  const completedTasksInSet = Object.keys(recordedAudios).length;

  const noTasksAvailable = !isLoadingTasks && filteredTasks.length === 0;
  const isLastTask = currentTaskIndex === tasksInCurrentSet - 1;
  const isCurrentTaskRecorded = currentTask ? !!recordedAudios[currentTask.id] : false;

  // --- Render Logic ---
  return (
      <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
          </Button>
        <h1 className="text-2xl font-semibold ml-2">ASR Task: Describe Image</h1>
        <div className="ml-auto">
          <LanguageFilter 
             availableLanguages={availableLanguages} 
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            />
        </div>
      </div>

      {isLoadingTasks ? (
         <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading ASR tasks...</p>
                </div>
      ) : noTasksAvailable ? (
          <Card className="text-center py-10">
              <CardHeader>
                  <CardTitle>No Tasks Available</CardTitle>
                  <CardDescription>There are currently no ASR tasks matching your selected language '{selectedLanguage}'. Please try changing the filter or check back later.</CardDescription>
              </CardHeader>
            </Card>
      ) : currentTask ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{currentTask.title} ({currentTaskIndex + 1}/{tasksInCurrentSet})</CardTitle>
                    <CardDescription>{currentTask.description}</CardDescription>
                    <Badge variant="outline" className="mt-2"><Globe className="h-3 w-3 mr-1" /> {currentTask.language}</Badge>
                </div>
                 <Button variant="outline" size="sm" onClick={handleSkipTask} disabled={isSubmitting}>
                     Skip Task <SkipForward className="h-4 w-4 ml-1" />
                 </Button>
            </div>
             <Progress value={((currentTaskIndex + 1) / tasksInCurrentSet) * 100} className="mt-4 h-2" />
              </CardHeader>
              
          <CardContent className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/2 flex justify-center items-center bg-gray-100 rounded-md overflow-hidden min-h-[250px]">
              {currentTask.imageUrl ? (
                 <img src={currentTask.imageUrl} alt="Task visual aid" className="max-w-full max-h-96 object-contain" />
              ) : (
                  <p className="text-gray-500 p-4 text-center">No image provided for this task. Please describe based on the title and description.</p>
              )}
            </div>
            
            <div className="md:w-1/2 flex flex-col justify-between">
               <div>
                 <h3 className="font-medium mb-2 flex items-center">
                     <Mic className="h-5 w-5 mr-2 text-afri-orange"/> Your Recording
                 </h3>
                 <AudioRecorder 
                    onAudioDataAvailable={handleAudioDataAvailable}
                    key={currentTask.id} 
                 />
                    </div>
                    
              {reviewAudioUrl && (
                <div className="mt-4 p-3 border rounded-md bg-gray-50">
                    <p className="text-sm font-medium mb-2">Review Recording:</p>
                    <audio ref={reviewAudioRef} src={reviewAudioUrl} controls className="w-full" />
                    <div className="flex justify-end gap-2 mt-2">
                       <Button variant="destructive" size="sm" onClick={handleDiscardRecording} disabled={isSubmitting}>
                           <RotateCcw className="h-4 w-4 mr-1"/> Re-record
                       </Button>
                       <Button variant="default" size="sm" onClick={handleSaveRecording} disabled={isSubmitting || isCurrentTaskRecorded}>
                           <Save className="h-4 w-4 mr-1"/> Save Recording
                       </Button>
                    </div>
                  </div>
              )}

               {isCurrentTaskRecorded && (
                 <div className="mt-4 p-3 border rounded-md bg-green-50 text-green-700 flex items-center">
                   <Check className="h-5 w-5 mr-2"/>
                   <p className="text-sm font-medium">Recording saved for this task.</p>
                      </div>
                    )}
                  
               <div className="mt-6 flex justify-end">
                    <Button
                    size="lg"
                    onClick={() => handleNextTask()} 
                    disabled={isSubmitting || (!isCurrentTaskRecorded && !currentRecordingBlob && !wasTaskSkipped)} 
                    className="w-full md:w-auto"
                 >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLastTask ? (Object.keys(recordedAudios).length > 0 || currentRecordingBlob ? 'Submit Batch' : 'Finish') : 'Next Task'}
                    </Button>
                  </div>
                </div>
              </CardContent>
        </Card>
      ) : (
         <Card className="text-center py-10">
             <CardHeader>
                 <CardTitle>All Tasks Completed</CardTitle>
                 <CardDescription>You have viewed all available ASR tasks for the selected language. Submit your recordings or change the filter.</CardDescription>
             </CardHeader>
              {Object.keys(recordedAudios).length > 0 && (
                 <Button onClick={() => handleSubmitBatch(recordedAudios)} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                     Submit {Object.keys(recordedAudios).length} Recording(s)
                 </Button>
              )}
            </Card>
          )}
        </div>
  );
};

export default ASRTask;
