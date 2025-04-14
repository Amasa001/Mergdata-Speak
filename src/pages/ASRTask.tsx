import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from '@/components/recording/AudioRecorder';
import { ArrowLeft, SkipForward, Mic, Check, XCircle, Globe, Loader2, RotateCcw, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { LanguageFilter } from '@/components/tasks/LanguageFilter';
import { Progress } from "@/components/ui/progress";

const ASRTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState<Record<number, Blob>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [reviewAudioUrl, setReviewAudioUrl] = useState<string | null>(null);
  const [currentRecordingBlob, setCurrentRecordingBlob] = useState<Blob | null>(null);
  const reviewAudioRef = useRef<HTMLAudioElement>(null);

  // TODO: Replace with actual API call to fetch tasks
  const taskBatches = [
    [
      { 
        id: 1, 
        imageUrl: "https://images.unsplash.com/photo-1472396961693-142e6e269027", 
        description: "Describe what you see in this image", 
        language: "English" 
      },
      // ... other mock tasks ...
      {
        id: 10,
        imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b",
        description: "Describe this artwork",
        language: "Dioula"
      },
    ],
    // Example second batch
    [
       { 
        id: 11, 
        imageUrl: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0", 
        description: "Describe this second landscape", 
        language: "English" 
      },
       { 
        id: 12, 
        imageUrl: "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5", 
        description: "Describe this lake scene", 
        language: "English" 
      },
    ]
  ];
  
  // Simulate fetching tasks
  useEffect(() => {
    setIsLoadingTasks(true);
    // Reset state when language changes or component mounts
    setCurrentTaskIndex(0);
    setCurrentBatchIndex(0);
    setRecordedAudios({});
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    setIsSubmitting(false);
    console.log(`Fetching ASR tasks for language: ${selectedLanguage}`);
    // Simulate API call delay
    setTimeout(() => {
      setIsLoadingTasks(false);
      // Need to recalculate filtered batches after loading
    }, 500);
  }, [selectedLanguage]);

  // Recalculate filtered tasks whenever source data or filter changes
  const filteredTaskBatches = React.useMemo(() => {
      return taskBatches.map(batch =>
          selectedLanguage === 'all'
            ? batch
            : batch.filter(task => task.language.toLowerCase() === selectedLanguage)
        ).filter(batch => batch.length > 0);
  }, [taskBatches, selectedLanguage]); // Dependency includes source data

  // Recalculate available languages
  const availableLanguages = React.useMemo(() => {
      return Array.from(new Set(taskBatches.flat().map(task => task.language)));
  }, [taskBatches]);

  // Adjust current index if filtered batches change
  useEffect(() => {
    if (!isLoadingTasks && filteredTaskBatches.length > 0) {
      const currentBatch = filteredTaskBatches[currentBatchIndex];
      if (!currentBatch || !currentBatch[currentTaskIndex]) {
         // If current task/batch index is invalid after filtering, reset
         setCurrentBatchIndex(0);
         setCurrentTaskIndex(0);
      }
    } else if (!isLoadingTasks && filteredTaskBatches.length === 0) {
        // Handle case where filter results in no tasks immediately after loading
        setCurrentBatchIndex(0);
        setCurrentTaskIndex(0);
    }
  }, [filteredTaskBatches, currentBatchIndex, currentTaskIndex, isLoadingTasks]);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    // Fetching and state reset is handled by useEffect
  };

  const handleAudioDataAvailable = (url: string | null, blob: Blob | null) => {
    console.log("ASRTask: handleAudioDataAvailable called with URL:", url);
    setReviewAudioUrl(url);
    setCurrentRecordingBlob(blob);
    if (url && blob) {
        toast({
            title: "Recording Ready for Review",
            description: "Listen to your recording below or re-record.",
        });
    } else {
        if (reviewAudioRef.current) {
            reviewAudioRef.current.pause();
            reviewAudioRef.current.currentTime = 0;
        }
    }
  };

  const handleSaveRecording = () => {
    const currentTask = getCurrentTask();
    if (!currentRecordingBlob || !currentTask) return;
    const taskId = currentTask.id;

    setRecordedAudios(prev => ({
      ...prev,
      [taskId]: currentRecordingBlob
    }));
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';

    toast({
      title: "Recording Saved",
      description: `Recording saved. Click Next Task to continue.`,
      variant: "default"
    });
  };

  const handleDiscardRecording = () => {
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';
    toast({ title: "Recording Discarded", description: "You can record again." });
    // AudioRecorder component internally handles allowing a new recording start
  };
  
  const handleSkipTask = () => {
    toast({
      title: "Task Skipped",
      description: "Moving to the next task."
    });
    handleNextTask(true); // Pass skip flag
  };
  
  const handleNextTask = (skipped = false) => {
    if (filteredTaskBatches.length === 0) return;
    
    const currentBatch = filteredTaskBatches[currentBatchIndex];
    if (!currentBatch) return;
    
    // Clear review state when explicitly moving next/skipping
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';

    if (currentTaskIndex < currentBatch.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else if (currentBatchIndex < filteredTaskBatches.length - 1) {
      setCurrentBatchIndex(prev => prev + 1);
      setCurrentTaskIndex(0);
      toast({ title: "New Batch Started" });
    } else {
      // Last task of last batch
      const finalRecordings = { ...recordedAudios };
      const currentTask = getCurrentTask();
      if (currentRecordingBlob && currentTask && !finalRecordings[currentTask.id]) {
         finalRecordings[currentTask.id] = currentRecordingBlob; // Include unsaved recording
      }
      if (Object.keys(finalRecordings).length > 0) {
         handleSubmitBatch();
      } else {
         toast({ title: "All tasks viewed", description: "Record or skip the last task to submit.", variant: "default" });
      }
    }
  };
  
  const handleSubmitBatch = () => {
    const finalRecordings = { ...recordedAudios };
    const currentTask = getCurrentTask();
    if (currentRecordingBlob && currentTask && !finalRecordings[currentTask.id]) {
        finalRecordings[currentTask.id] = currentRecordingBlob;
    }

    if (Object.keys(finalRecordings).length === 0) {
       toast({ title: "No recordings", description: "Record at least one description to submit.", variant: "destructive"});
       return;
    }

    setIsSubmitting(true);
    console.log("Submitting ASR recordings:", finalRecordings);
    // TODO: Implement actual submission logic
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Batch Submitted Successfully",
        description: "Thank you for your contribution!",
        variant: "default"
      });
      setRecordedAudios({});
      setCurrentRecordingBlob(null);
      setReviewAudioUrl(null);
      if (reviewAudioRef.current) reviewAudioRef.current.src = '';
      navigate('/dashboard');
    }, 1500);
  };
  
  const getCurrentTask = () => {
    if (isLoadingTasks || filteredTaskBatches.length === 0 || !filteredTaskBatches[currentBatchIndex] || !filteredTaskBatches[currentBatchIndex][currentTaskIndex]) {
      return null; // Return null if loading, no tasks, or indices are invalid
    }
    return filteredTaskBatches[currentBatchIndex][currentTaskIndex];
  };
  
  const currentTask = getCurrentTask();
  const tasksInCurrentBatch = isLoadingTasks || filteredTaskBatches.length === 0 ? 0 : (filteredTaskBatches[currentBatchIndex]?.length || 0);
  const completedTasksInBatch = Object.keys(recordedAudios).filter(id => 
      filteredTaskBatches.length > 0 && filteredTaskBatches[currentBatchIndex]?.some(task => task.id.toString() === id)
    ).length;

  const noTasksAvailable = !isLoadingTasks && filteredTaskBatches.length === 0;
  const isLastTaskInBatch = currentTaskIndex === tasksInCurrentBatch - 1;
  const isLastBatch = currentBatchIndex === filteredTaskBatches.length - 1;
  const isCurrentTaskRecorded = currentTask ? !!recordedAudios[currentTask.id] : false;

  // Log state just before rendering
  console.log("ASRTask: Rendering with reviewAudioUrl:", reviewAudioUrl);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Area */} 
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold">ASR Recording Task</h1>
      </div>
      
      <div className="max-w-3xl mx-auto">
        {/* Filters */}
        <div className="mb-6">
            <LanguageFilter 
                selectedLanguage={selectedLanguage}
                onLanguageChange={handleLanguageChange}
                availableLanguages={availableLanguages}
            />
        </div>

        {/* Loading State */}
        {isLoadingTasks && (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading tasks...</p>
            </div>
        )}

        {/* No Tasks State */}
        {!isLoadingTasks && noTasksAvailable && (
            <Card className="border-dashed border-gray-300 shadow-none">
                <CardContent className="p-6">
                    <div className="text-center py-12">
                    <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-700 mb-2">No Tasks Available</h3>
                    <p className="text-gray-500 mb-4">There are no ASR tasks matching your current language selection ({selectedLanguage === 'all' ? 'All Languages' : selectedLanguage}).</p>
                    {selectedLanguage !== 'all' && (
                        <Button 
                            variant="outline" 
                            onClick={() => setSelectedLanguage('all')}
                        >
                            Show All Languages
                        </Button>
                    )}
                    </div>
                </CardContent>
            </Card>
        )}

        {/* Task Display State */} 
        {!isLoadingTasks && currentTask && (
            <Card className="border-none shadow-md">
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <CardTitle className="text-lg">
                    Batch {currentBatchIndex + 1} / {filteredTaskBatches.length} - Task {currentTaskIndex + 1} / {tasksInCurrentBatch}
                  </CardTitle>
                  <span className="text-sm font-medium text-gray-500">{currentTask.language}</span>
                </div>
                <CardDescription>
                    Look at the image and describe what you see in {currentTask.language}. Aim for ~10-15 seconds.
                </CardDescription>
                 {/* Progress Bar for Batch */} 
                 <Progress value={(currentTaskIndex / tasksInCurrentBatch) * 100} className="mt-2 h-2" />
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="space-y-6 md:space-y-8">
                  {/* Image Display */}
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <img 
                      src={currentTask.imageUrl}
                      alt="Image to describe" 
                      className="w-full max-h-[400px] object-contain rounded-lg mx-auto"
                    />
                  </div>
                  
                  {/* Recorder & Review Section */}
                  <div className="border-t pt-6 space-y-4">
                      {isCurrentTaskRecorded ? (
                        <div className="text-center py-4 text-green-600 font-medium flex items-center justify-center">
                            <Check className="h-5 w-5 mr-2" />
                            Recording saved for this task.
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-4">
                            <AudioRecorder 
                                key={currentTask.id} 
                                maxDuration={15}
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
                                            Save Recording 
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                      )}
                  </div>
                  
                  {/* Task Navigation */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => handleSkipTask()}
                      disabled={isSubmitting || !!reviewAudioUrl}
                    >
                      <SkipForward className="mr-2 h-4 w-4" />
                      Skip Task
                    </Button>
                    
                    <Button
                      onClick={isLastTaskInBatch && isLastBatch ? handleSubmitBatch : () => handleNextTask()}
                      disabled={isSubmitting || !!reviewAudioUrl || !isCurrentTaskRecorded}
                      className={isLastTaskInBatch && isLastBatch ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    >
                      {isSubmitting ? (
                         <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                      ) : isLastTaskInBatch && isLastBatch ? (
                         "Submit Batch"
                      ) : (
                         "Next Task"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
};

export default ASRTask;
