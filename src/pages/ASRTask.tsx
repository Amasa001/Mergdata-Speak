
import React, { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from '@/components/recording/AudioRecorder';
import { ArrowLeft, SkipForward, Mic, Check, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const ASRTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState<Record<number, Blob>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});

  // Mock image-based tasks for ASR (would come from API in production)
  const taskBatches = [
    [
      { 
        id: 1, 
        imageUrl: "/placeholder.svg", 
        description: "Describe what you see in this image", 
        language: "English" 
      },
      { 
        id: 2, 
        imageUrl: "https://source.unsplash.com/random/800x600?wildlife", 
        description: "Describe the animals in this image", 
        language: "English" 
      },
      { 
        id: 3, 
        imageUrl: "https://source.unsplash.com/random/800x600?technology", 
        description: "Describe this technology scene", 
        language: "English" 
      },
      { 
        id: 4, 
        imageUrl: "https://source.unsplash.com/random/800x600?nature", 
        description: "Describe this natural landscape", 
        language: "English" 
      },
      { 
        id: 5, 
        imageUrl: "https://source.unsplash.com/random/800x600?city", 
        description: "Describe this urban scene", 
        language: "English" 
      },
      { 
        id: 6, 
        imageUrl: "https://source.unsplash.com/random/800x600?food", 
        description: "Describe this food item", 
        language: "Twi" 
      },
      { 
        id: 7, 
        imageUrl: "https://source.unsplash.com/random/800x600?architecture", 
        description: "Describe this building or structure", 
        language: "Ewe" 
      },
      { 
        id: 8, 
        imageUrl: "https://source.unsplash.com/random/800x600?people", 
        description: "Describe the people in this scene", 
        language: "English" 
      },
      { 
        id: 9, 
        imageUrl: "https://source.unsplash.com/random/800x600?transport", 
        description: "Describe this mode of transportation", 
        language: "Baule" 
      },
      { 
        id: 10, 
        imageUrl: "https://source.unsplash.com/random/800x600?art", 
        description: "Describe this artwork", 
        language: "Dioula" 
      },
    ],
    // Additional task batches would be added here
  ];
  
  const handleRecordingComplete = (audioBlob: Blob) => {
    const taskId = getCurrentTask().id;
    
    setRecordedAudios(prev => ({
      ...prev,
      [taskId]: audioBlob
    }));
    
    toast({
      title: "Recording saved",
      description: "Your recording has been saved successfully."
    });

    // Auto-advance to next task after successful recording
    setTimeout(() => {
      handleNextTask();
    }, 1500);
  };
  
  const handleSkipTask = () => {
    toast({
      title: "Task skipped",
      description: "You can come back to this task later."
    });
    handleNextTask();
  };
  
  const handleNextTask = () => {
    const currentBatch = taskBatches[currentBatchIndex];
    
    if (currentTaskIndex < currentBatch.length - 1) {
      // Move to next task within the batch
      setCurrentTaskIndex(prev => prev + 1);
    } else if (currentBatchIndex < taskBatches.length - 1) {
      // Move to the next batch
      setCurrentBatchIndex(prev => prev + 1);
      setCurrentTaskIndex(0);
      toast({
        title: "New batch started",
        description: "You've started a new batch of tasks."
      });
    } else {
      // All batches completed
      handleSubmitBatch();
    }
  };
  
  const handleSubmitBatch = () => {
    setIsSubmitting(true);
    
    // Here you would typically send the recorded audio files to your server
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Batch submitted",
        description: "Your recordings have been submitted successfully. Thank you for your contribution!",
      });
      
      // Check if there are more batches to complete
      if (currentBatchIndex === taskBatches.length - 1) {
        navigate('/dashboard');
      } else {
        // Move to the next batch
        setCurrentBatchIndex(prev => prev + 1);
        setCurrentTaskIndex(0);
      }
    }, 1500);
  };
  
  const getCurrentTask = () => {
    return taskBatches[currentBatchIndex][currentTaskIndex];
  };
  
  const currentTask = getCurrentTask();
  const tasksInCurrentBatch = taskBatches[currentBatchIndex].length;
  const completedTasksInBatch = Object.keys(recordedAudios).filter(id => 
    taskBatches[currentBatchIndex].some(task => task.id.toString() === id)
  ).length;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-xl font-bold">ASR Recording Task</h1>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-gray-50 border-b pb-3">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">
                  Batch {currentBatchIndex + 1} - Task {currentTaskIndex + 1} of {tasksInCurrentBatch}
                </h2>
                <span className="text-sm text-gray-500">
                  Recorded: {completedTasksInBatch} of {tasksInCurrentBatch}
                </span>
              </div>
              <progress 
                value={completedTasksInBatch} 
                max={tasksInCurrentBatch}
                className="w-full h-2"
              />
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-10">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Look at the image and describe what you see in {currentTask.language}</p>
                  <div className="p-4 bg-white rounded-lg border mb-4 shadow-sm">
                    <img 
                      src={currentTask.imageUrl}
                      alt="Image to describe" 
                      className="w-full max-h-80 object-contain rounded-lg mx-auto"
                    />
                    <p className="mt-4 text-gray-700">{currentTask.description}</p>
                    <p className="mt-2 text-sm font-medium text-primary">Language: {currentTask.language}</p>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2 mt-6">
                    {taskBatches[currentBatchIndex].map((_, idx) => (
                      <button
                        key={idx}
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          idx === currentTaskIndex
                            ? "bg-primary text-primary-foreground"
                            : recordedAudios[taskBatches[currentBatchIndex][idx].id]
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-gray-100 text-gray-700"
                        }`}
                        onClick={() => setCurrentTaskIndex(idx)}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <AudioRecorder 
                    maxDuration={10}
                    onRecordingComplete={handleRecordingComplete}
                  />

                  {recordedAudios[currentTask.id] && (
                    <div className="mt-4 text-center">
                      <Check className="h-6 w-6 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-green-700">Recording saved!</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleSkipTask}
                    className="flex items-center"
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip
                  </Button>
                  
                  <Button
                    onClick={
                      currentTaskIndex === tasksInCurrentBatch - 1 && currentBatchIndex === taskBatches.length - 1
                        ? handleSubmitBatch
                        : handleNextTask
                    }
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : 
                      currentTaskIndex === tasksInCurrentBatch - 1 && currentBatchIndex === taskBatches.length - 1
                        ? "Submit All"
                        : "Next"
                    }
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ASRTask;
