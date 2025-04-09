
import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SkipForward, Check, ThumbsUp, ThumbsDown, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const ValidateTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [validations, setValidations] = useState<Record<number, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState('asr');
  const audioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({});

  // Mock ASR validation tasks in batches
  const asrTaskBatches = [
    [
      {
        id: 101,
        originalText: "The weather is beautiful today",
        recordingUrl: "https://example.com/audio/validation/asr1.mp3",
        language: "English",
        userInfo: "User ID: 2341"
      },
      {
        id: 102,
        originalText: "She walks to school every morning",
        recordingUrl: "https://example.com/audio/validation/asr2.mp3",
        language: "English",
        userInfo: "User ID: 1567"
      },
      {
        id: 103,
        originalText: "They are planning a trip to the mountains",
        recordingUrl: "https://example.com/audio/validation/asr3.mp3",
        language: "English",
        userInfo: "User ID: 8932"
      },
      {
        id: 104,
        originalText: "The library is open until nine o'clock",
        recordingUrl: "https://example.com/audio/validation/asr4.mp3",
        language: "English",
        userInfo: "User ID: 4521"
      },
      {
        id: 105,
        originalText: "He has been studying for three hours",
        recordingUrl: "https://example.com/audio/validation/asr5.mp3",
        language: "English",
        userInfo: "User ID: 3217"
      },
      {
        id: 106,
        originalText: "The flowers in the garden are blooming",
        recordingUrl: "https://example.com/audio/validation/asr6.mp3",
        language: "Yoruba",
        userInfo: "User ID: 9876"
      },
      {
        id: 107,
        originalText: "We should meet for lunch next week",
        recordingUrl: "https://example.com/audio/validation/asr7.mp3",
        language: "Swahili",
        userInfo: "User ID: 2468"
      },
      {
        id: 108,
        originalText: "The concert will be held at the city park",
        recordingUrl: "https://example.com/audio/validation/asr8.mp3",
        language: "English",
        userInfo: "User ID: 1357"
      },
      {
        id: 109,
        originalText: "She has finished reading the book",
        recordingUrl: "https://example.com/audio/validation/asr9.mp3",
        language: "English",
        userInfo: "User ID: 7531"
      },
      {
        id: 110,
        originalText: "The children are playing in the backyard",
        recordingUrl: "https://example.com/audio/validation/asr10.mp3",
        language: "English",
        userInfo: "User ID: 9512"
      },
    ],
    // Additional batches would be added here
  ];

  // Mock TTS validation tasks in batches
  const ttsTaskBatches = [
    [
      {
        id: 201,
        text: "Welcome to our community meeting",
        recordingUrl: "https://example.com/audio/validation/tts1.mp3",
        language: "English",
        userInfo: "User ID: 3456"
      },
      {
        id: 202,
        text: "Please remember to bring your identification",
        recordingUrl: "https://example.com/audio/validation/tts2.mp3",
        language: "English",
        userInfo: "User ID: 7890"
      },
      // Add more TTS tasks to complete the batch of 10
    ],
    // Additional batches would be added here
  ];

  // Mock transcription validation tasks in batches
  const transcriptionTaskBatches = [
    [
      {
        id: 301,
        audioUrl: "https://example.com/audio/validation/trans1.mp3",
        transcription: "The market opens early in the morning and closes at sunset.",
        language: "English",
        userInfo: "User ID: 4567"
      },
      {
        id: 302,
        audioUrl: "https://example.com/audio/validation/trans2.mp3",
        transcription: "She has been working in this hospital for fifteen years.",
        language: "English",
        userInfo: "User ID: 8901"
      },
      // Add more transcription tasks to complete the batch of 10
    ],
    // Additional batches would be added here
  ];

  const getTaskBatches = () => {
    switch (activeTab) {
      case 'asr':
        return asrTaskBatches;
      case 'tts':
        return ttsTaskBatches;
      case 'transcriptions':
        return transcriptionTaskBatches;
      default:
        return asrTaskBatches;
    }
  };

  const handleValidate = (taskId: number, isValid: boolean) => {
    setValidations(prev => ({
      ...prev,
      [taskId]: isValid
    }));
    
    toast({
      title: isValid ? "Marked as valid" : "Marked as invalid",
      description: isValid ? "The content has been approved." : "The content has been rejected.",
    });

    // Auto-advance to next task after validation
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
    const currentBatch = getTaskBatches()[currentBatchIndex];
    
    if (currentTaskIndex < currentBatch.length - 1) {
      // Move to next task within the batch
      setCurrentTaskIndex(prev => prev + 1);
    } else if (currentBatchIndex < getTaskBatches().length - 1) {
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
    
    // Here you would typically send the validations to your server
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Batch submitted",
        description: "Your validations have been submitted successfully. Thank you for your contribution!",
      });
      
      // Check if there are more batches to complete
      if (currentBatchIndex === getTaskBatches().length - 1) {
        navigate('/dashboard');
      } else {
        // Move to the next batch
        setCurrentBatchIndex(prev => prev + 1);
        setCurrentTaskIndex(0);
      }
    }, 1500);
  };
  
  const getCurrentTask = () => {
    return getTaskBatches()[currentBatchIndex][currentTaskIndex];
  };
  
  const togglePlayback = (taskId: string) => {
    const audioKey = `${activeTab}-${taskId}`;
    if (!audioRefs.current[audioKey]) return;
    
    const audio = audioRefs.current[audioKey];
    
    if (isPlaying[taskId]) {
      audio?.pause();
    } else {
      // Pause any currently playing audio
      Object.keys(isPlaying).forEach(key => {
        if (isPlaying[parseInt(key)] && audioRefs.current[`${activeTab}-${key}`]) {
          audioRefs.current[`${activeTab}-${key}`]?.pause();
        }
      });
      
      audio?.play();
    }
    
    setIsPlaying(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentTaskIndex(0);
    setCurrentBatchIndex(0);
    // Pause any playing audio when switching tabs
    Object.keys(isPlaying).forEach(key => {
      if (isPlaying[parseInt(key)]) {
        setIsPlaying(prev => ({
          ...prev,
          [key]: false
        }));
      }
    });
  };
  
  const currentTask = getCurrentTask();
  const tasksInCurrentBatch = getTaskBatches()[currentBatchIndex].length;
  const completedTasksInBatch = Object.keys(validations).filter(id => 
    getTaskBatches()[currentBatchIndex].some(task => task.id.toString() === id)
  ).length;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-xl font-bold">Validation Task</h1>
        </div>

        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="asr" onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="asr">ASR Validation</TabsTrigger>
              <TabsTrigger value="tts">TTS Validation</TabsTrigger>
              <TabsTrigger value="transcriptions">Transcriptions</TabsTrigger>
            </TabsList>
            
            <Card className="border-none shadow-md">
              <CardHeader className="bg-gray-50 border-b pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    Batch {currentBatchIndex + 1} - Task {currentTaskIndex + 1} of {tasksInCurrentBatch}
                  </CardTitle>
                  <span className="text-sm text-gray-500">
                    Validated: {completedTasksInBatch} of {tasksInCurrentBatch}
                  </span>
                </div>
                <progress 
                  value={completedTasksInBatch} 
                  max={tasksInCurrentBatch}
                  className="w-full h-2"
                />
                <CardDescription className="pt-2">
                  {activeTab === 'asr' && "Listen and verify if the recording matches the original text"}
                  {activeTab === 'tts' && "Listen and verify if the speech synthesis is clear and natural"}
                  {activeTab === 'transcriptions' && "Verify if the transcription accurately represents the audio"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <TabsContent value="asr" className="mt-0">
                  <div className="space-y-6">
                    <div className="p-5 bg-white rounded-lg border mb-4 shadow-sm">
                      <h3 className="font-medium text-lg mb-3">Original Text:</h3>
                      <p className="text-xl">{(currentTask as typeof asrTaskBatches[0][0]).originalText}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">User Recording</h3>
                        <span className="text-sm text-gray-500">{(currentTask as typeof asrTaskBatches[0][0]).language}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center"
                          onClick={() => togglePlayback(currentTask.id.toString())}
                        >
                          {isPlaying[currentTask.id] ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Play
                            </>
                          )}
                        </Button>
                        <audio 
                          ref={el => audioRefs.current[`asr-${currentTask.id}`] = el}
                          src={(currentTask as typeof asrTaskBatches[0][0]).recordingUrl}
                          onEnded={() => setIsPlaying(prev => ({ ...prev, [currentTask.id]: false }))}
                          className="hidden"
                        />
                        <span className="text-sm text-gray-500">
                          {(currentTask as typeof asrTaskBatches[0][0]).userInfo}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-2 mt-6">
                      {getTaskBatches()[currentBatchIndex].map((_, idx) => (
                        <button
                          key={idx}
                          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium ${
                            idx === currentTaskIndex
                              ? "bg-primary text-primary-foreground"
                              : validations[getTaskBatches()[currentBatchIndex][idx].id] !== undefined
                              ? validations[getTaskBatches()[currentBatchIndex][idx].id]
                                ? "bg-green-100 text-green-700 border border-green-300"
                                : "bg-red-100 text-red-700 border border-red-300"
                              : "bg-gray-100 text-gray-700"
                          }`}
                          onClick={() => setCurrentTaskIndex(idx)}
                        >
                          {idx + 1}
                        </button>
                      ))}
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
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex items-center border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleValidate(currentTask.id, false)}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        
                        <Button 
                          className="flex items-center bg-green-600 hover:bg-green-700"
                          onClick={() => handleValidate(currentTask.id, true)}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="tts" className="mt-0">
                  {/* Similar structure to ASR but with TTS specific content */}
                  <div className="space-y-6">
                    <div className="p-5 bg-white rounded-lg border mb-4 shadow-sm">
                      <h3 className="font-medium text-lg mb-3">Text Passage:</h3>
                      <p className="text-xl">{(currentTask as typeof ttsTaskBatches[0][0]).text}</p>
                    </div>
                    
                    {/* Add remaining TTS validation interface */}
                    <p className="text-center py-6">TTS validation functionality details would be implemented here</p>
                    
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={handleSkipTask}
                        className="flex items-center"
                      >
                        <SkipForward className="mr-2 h-4 w-4" />
                        Skip
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex items-center border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleValidate(currentTask.id, false)}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        
                        <Button 
                          className="flex items-center bg-green-600 hover:bg-green-700"
                          onClick={() => handleValidate(currentTask.id, true)}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="transcriptions" className="mt-0">
                  {/* Similar structure to ASR but with transcription specific content */}
                  <div className="space-y-6">
                    <div className="p-5 bg-white rounded-lg border mb-4 shadow-sm">
                      <h3 className="font-medium text-lg mb-3">Transcription:</h3>
                      <p className="text-xl">{(currentTask as typeof transcriptionTaskBatches[0][0]).transcription}</p>
                    </div>
                    
                    {/* Add remaining transcription validation interface */}
                    <p className="text-center py-6">Transcription validation functionality details would be implemented here</p>
                    
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={handleSkipTask}
                        className="flex items-center"
                      >
                        <SkipForward className="mr-2 h-4 w-4" />
                        Skip
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex items-center border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleValidate(currentTask.id, false)}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        
                        <Button 
                          className="flex items-center bg-green-600 hover:bg-green-700"
                          onClick={() => handleValidate(currentTask.id, true)}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default ValidateTask;
