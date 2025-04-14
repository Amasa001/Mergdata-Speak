import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TranscriptionEditor } from '@/components/transcription/TranscriptionEditor';
import { ArrowLeft, SkipForward, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const TranscribeTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [transcriptions, setTranscriptions] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock audio files for transcription task in batches
  const taskBatches = [
    [
      { 
        id: 1, 
        title: "Traditional Story",
        language: "Twi",
        description: "A short recording of a traditional story. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample1.mp3" 
      },
      { 
        id: 2,
        title: "Conversation",
        language: "Ewe",
        description: "A short conversation between two people. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample2.mp3"
      },
      { 
        id: 3,
        title: "Proverb Explanation",
        language: "Baule",
        description: "An explanation of a local proverb. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample3.mp3"
      },
      { 
        id: 4,
        title: "Folk Tale",
        language: "Twi",
        description: "A folk tale narration. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample4.mp3"
      },
      { 
        id: 5,
        title: "Market Chatter",
        language: "Ewe",
        description: "Background chatter from a market. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample5.mp3"
      },
      { 
        id: 6,
        title: "Interview",
        language: "Dioula",
        description: "An interview with a local artist. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample6.mp3"
      },
      { 
        id: 7,
        title: "Recipe Instructions",
        language: "English",
        description: "Instructions for a traditional recipe. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample7.mp3"
      },
      { 
        id: 8,
        title: "Public Announcement",
        language: "Twi",
        description: "A public announcement. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample8.mp3"
      },
      { 
        id: 9,
        title: "Phone Conversation",
        language: "Ewe",
        description: "A phone conversation between two people. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample9.mp3"
      },
      { 
        id: 10,
        title: "Radio Drama",
        language: "English",
        description: "A short radio drama. Transcribe what you hear.",
        audioSrc: "https://example.com/audio/sample10.mp3"
      },
    ],
    // Additional batches would be added here
  ];
  
  const handleSaveTranscription = (text: string) => {
    const taskId = getCurrentTask().id;
    
    setTranscriptions(prev => ({
      ...prev,
      [taskId]: text
    }));
    
    toast({
      title: "Transcription saved",
      description: "Your work has been saved successfully.",
    });

    // Auto-advance to next task after successful save
    setTimeout(() => {
      handleNextTask();
    }, 1000);
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
    
    // Here you would typically send the transcriptions to your server
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Batch submitted",
        description: "Your transcriptions have been submitted successfully. Thank you for your contribution!",
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
    return taskBatches[currentBatchIndex][currentTaskIndex] as {
        id: number;
        title: string;
        language: string;
        description: string;
        audioSrc: string;
        // Add other properties from your mock data if necessary
    };
  };
  
  const currentTask = getCurrentTask();
  const tasksInCurrentBatch = taskBatches[currentBatchIndex].length;
  const completedTasksInBatch = Object.keys(transcriptions).filter(id => 
    taskBatches[currentBatchIndex].some(task => task.id.toString() === id)
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-xl font-bold">Transcription Task</h1>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <Card className="border-none shadow-md">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">
                Batch {currentBatchIndex + 1} - Task {currentTaskIndex + 1} of {tasksInCurrentBatch}
              </h2>
              <span className="text-sm text-gray-500">
                Transcribed: {completedTasksInBatch} of {tasksInCurrentBatch}
              </span>
            </div>
            <progress 
              value={completedTasksInBatch} 
              max={tasksInCurrentBatch}
              className="w-full h-2"
            />
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  {currentTask.title}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({currentTask.language})
                  </span>
                </h3>
                <p className="text-gray-600 mb-4">
                  {currentTask.description}
                </p>
                
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {taskBatches[currentBatchIndex].map((_, idx) => (
                    <button
                      key={idx}
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium ${
                        idx === currentTaskIndex
                          ? "bg-primary text-primary-foreground"
                          : transcriptions[taskBatches[currentBatchIndex][idx].id]
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
              
              <div className="py-4">
                <TranscriptionEditor 
                  key={currentTask.id}
                  initialText={transcriptions[currentTask.id] || ''}
                  audioSrc={currentTask.audioSrc}
                  onSave={handleSaveTranscription}
                  language={currentTask.language}
                />
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
  );
};

export default TranscribeTask;
