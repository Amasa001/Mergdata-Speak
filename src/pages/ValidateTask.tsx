
import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SkipForward, ThumbsUp, ThumbsDown, Play, Pause, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { TranscriptionEditor } from '@/components/transcription/TranscriptionEditor';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const ValidateTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [validations, setValidations] = useState<Record<number, boolean>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState('asr');
  const [editedTranscription, setEditedTranscription] = useState("");
  const [transcriptionSaved, setTranscriptionSaved] = useState(false);
  const audioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({});

  // Mock ASR validation tasks in batches
  const asrTaskBatches = [
    [
      {
        id: 101,
        imageUrl: "https://source.unsplash.com/random/800x600?wildlife",
        recordingUrl: "https://example.com/audio/validation/asr1.mp3",
        language: "English",
        userInfo: "User ID: 2341"
      },
      {
        id: 102,
        imageUrl: "https://source.unsplash.com/random/800x600?technology",
        recordingUrl: "https://example.com/audio/validation/asr2.mp3",
        language: "English",
        userInfo: "User ID: 1567"
      },
      {
        id: 103,
        imageUrl: "https://source.unsplash.com/random/800x600?nature",
        recordingUrl: "https://example.com/audio/validation/asr3.mp3",
        language: "English",
        userInfo: "User ID: 8932"
      },
      {
        id: 104,
        imageUrl: "https://source.unsplash.com/random/800x600?city",
        recordingUrl: "https://example.com/audio/validation/asr4.mp3",
        language: "English",
        userInfo: "User ID: 4521"
      },
      {
        id: 105,
        imageUrl: "https://source.unsplash.com/random/800x600?food",
        recordingUrl: "https://example.com/audio/validation/asr5.mp3",
        language: "Twi",
        userInfo: "User ID: 3217"
      },
      {
        id: 106,
        imageUrl: "https://source.unsplash.com/random/800x600?architecture",
        recordingUrl: "https://example.com/audio/validation/asr6.mp3",
        language: "Yoruba",
        userInfo: "User ID: 9876"
      },
      {
        id: 107,
        imageUrl: "https://source.unsplash.com/random/800x600?people",
        recordingUrl: "https://example.com/audio/validation/asr7.mp3",
        language: "Swahili",
        userInfo: "User ID: 2468"
      },
      {
        id: 108,
        imageUrl: "https://source.unsplash.com/random/800x600?transport",
        recordingUrl: "https://example.com/audio/validation/asr8.mp3",
        language: "Ewe",
        userInfo: "User ID: 1357"
      },
      {
        id: 109,
        imageUrl: "https://source.unsplash.com/random/800x600?art",
        recordingUrl: "https://example.com/audio/validation/asr9.mp3",
        language: "Baule",
        userInfo: "User ID: 7531"
      },
      {
        id: 110,
        imageUrl: "https://source.unsplash.com/random/800x600?abstract",
        recordingUrl: "https://example.com/audio/validation/asr10.mp3",
        language: "Dioula",
        userInfo: "User ID: 9512"
      },
    ],
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
      {
        id: 203,
        text: "The seminar will begin at nine o'clock tomorrow",
        recordingUrl: "https://example.com/audio/validation/tts3.mp3",
        language: "English",
        userInfo: "User ID: 5678"
      },
      {
        id: 204,
        text: "Please contact us if you have any questions",
        recordingUrl: "https://example.com/audio/validation/tts4.mp3",
        language: "Swahili",
        userInfo: "User ID: 1234"
      },
      {
        id: 205,
        text: "All participants should register before attending",
        recordingUrl: "https://example.com/audio/validation/tts5.mp3",
        language: "English",
        userInfo: "User ID: 9012"
      },
      {
        id: 206,
        text: "The meeting will be held in the main conference room",
        recordingUrl: "https://example.com/audio/validation/tts6.mp3",
        language: "English",
        userInfo: "User ID: 3456"
      },
      {
        id: 207,
        text: "Please submit your reports by the end of the week",
        recordingUrl: "https://example.com/audio/validation/tts7.mp3",
        language: "English",
        userInfo: "User ID: 7890"
      },
      {
        id: 208,
        text: "The training session has been rescheduled to next month",
        recordingUrl: "https://example.com/audio/validation/tts8.mp3",
        language: "Yoruba",
        userInfo: "User ID: 2345"
      },
      {
        id: 209,
        text: "We appreciate your patience during this transition period",
        recordingUrl: "https://example.com/audio/validation/tts9.mp3",
        language: "English",
        userInfo: "User ID: 6789"
      },
      {
        id: 210,
        text: "Please review the attached document before our meeting",
        recordingUrl: "https://example.com/audio/validation/tts10.mp3",
        language: "English",
        userInfo: "User ID: 0123"
      }
    ],
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
      {
        id: 303,
        audioUrl: "https://example.com/audio/validation/trans3.mp3",
        transcription: "The children are playing in the park near the river.",
        language: "English",
        userInfo: "User ID: 2345"
      },
      {
        id: 304,
        audioUrl: "https://example.com/audio/validation/trans4.mp3",
        transcription: "He studies mathematics and physics at the university.",
        language: "Twi",
        userInfo: "User ID: 6789"
      },
      {
        id: 305,
        audioUrl: "https://example.com/audio/validation/trans5.mp3",
        transcription: "They will travel to the capital city next week for the conference.",
        language: "English",
        userInfo: "User ID: 0123"
      },
      {
        id: 306,
        audioUrl: "https://example.com/audio/validation/trans6.mp3",
        transcription: "The concert was postponed because of the heavy rain.",
        language: "English",
        userInfo: "User ID: 4567"
      },
      {
        id: 307,
        audioUrl: "https://example.com/audio/validation/trans7.mp3",
        transcription: "She reads many books during her summer vacation.",
        language: "Ewe",
        userInfo: "User ID: 8901"
      },
      {
        id: 308,
        audioUrl: "https://example.com/audio/validation/trans8.mp3",
        transcription: "The farmers planted corn and beans in their fields this season.",
        language: "English",
        userInfo: "User ID: 2345"
      },
      {
        id: 309,
        audioUrl: "https://example.com/audio/validation/trans9.mp3",
        transcription: "The committee meets every month to discuss new projects.",
        language: "English",
        userInfo: "User ID: 6789"
      },
      {
        id: 310,
        audioUrl: "https://example.com/audio/validation/trans10.mp3",
        transcription: "He learned to play the traditional drum from his grandfather.",
        language: "Dioula",
        userInfo: "User ID: 0123"
      }
    ],
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
    // Check if rating has been set for ASR tasks
    if (activeTab === 'asr' && !ratings[taskId]) {
      toast({
        title: "Rating required",
        description: "Please rate the accuracy of the description before approving or rejecting.",
        variant: "destructive"
      });
      return;
    }

    setValidations(prev => ({
      ...prev,
      [taskId]: isValid
    }));
    
    toast({
      title: isValid ? "Marked as valid" : "Marked as invalid",
      description: isValid ? "The content has been approved." : "The content has been rejected.",
    });

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
      setCurrentTaskIndex(prev => prev + 1);
    } else if (currentBatchIndex < getTaskBatches().length - 1) {
      setCurrentBatchIndex(prev => prev + 1);
      setCurrentTaskIndex(0);
      toast({
        title: "New batch started",
        description: "You've started a new batch of tasks."
      });
    } else {
      handleSubmitBatch();
    }
  };
  
  const handleSubmitBatch = () => {
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Batch submitted",
        description: "Your validations have been submitted successfully. Thank you for your contribution!",
      });
      
      if (currentBatchIndex === getTaskBatches().length - 1) {
        navigate('/dashboard');
      } else {
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

  const handleRating = (taskId: number, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [taskId]: rating
    }));
    
    toast({
      title: `Rating set: ${rating}/5`,
      description: "Your rating has been recorded.",
    });
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentTaskIndex(0);
    setCurrentBatchIndex(0);
    setEditedTranscription("");
    setTranscriptionSaved(false);

    Object.keys(isPlaying).forEach(key => {
      if (isPlaying[parseInt(key)]) {
        setIsPlaying(prev => ({
          ...prev,
          [key]: false
        }));
      }
    });
  };

  const handleSaveTranscription = (text: string) => {
    setEditedTranscription(text);
    setTranscriptionSaved(true);
    
    toast({
      title: "Transcription saved",
      description: "Your edited transcription has been saved."
    });
  };

  const handleTTSQualityRating = (rating: number, taskId: number) => {
    toast({
      title: `Quality rated: ${rating}/5`,
      description: "Your rating has been recorded."
    });
    
    setTimeout(() => {
      handleNextTask();
    }, 1000);
  };
  
  const currentTask = getCurrentTask();
  const tasksInCurrentBatch = getTaskBatches()[currentBatchIndex].length;
  const completedTasksInBatch = Object.keys(validations).filter(id => 
    getTaskBatches()[currentBatchIndex].some(task => task.id.toString() === id)
  ).length;

  const renderStars = (taskId: number, count: number, selectedRating: number | undefined) => {
    return (
      <div className="flex space-x-2 items-center">
        {Array.from({ length: count }).map((_, idx) => (
          <Button
            key={idx}
            variant="ghost"
            className={`p-1 h-auto ${selectedRating && idx < selectedRating ? 'text-yellow-500' : 'text-gray-300'}`}
            onClick={() => handleRating(taskId, idx + 1)}
          >
            <Star className="h-6 w-6 fill-current" />
          </Button>
        ))}
        {selectedRating && (
          <span className="text-sm font-medium ml-2">{selectedRating}/5</span>
        )}
      </div>
    );
  };

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
                  {activeTab === 'asr' && "Listen to the audio and verify if it accurately describes the image"}
                  {activeTab === 'tts' && "Listen and verify if the speech synthesis is clear and natural"}
                  {activeTab === 'transcriptions' && "Verify if the transcription accurately represents the audio"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <TabsContent value="asr" className="mt-0">
                  <div className="space-y-6">
                    <div className="p-5 bg-white rounded-lg border mb-4 shadow-sm">
                      <h3 className="font-medium text-lg mb-3">Image to Describe:</h3>
                      <img 
                        src={(currentTask as typeof asrTaskBatches[0][0]).imageUrl}
                        alt="Image for description" 
                        className="w-full max-h-80 object-contain rounded-lg mx-auto"
                      />
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
                      
                      <div className="mt-6">
                        <h3 className="font-medium mb-2">Rate the accuracy of the description:</h3>
                        {renderStars(currentTask.id, 5, ratings[currentTask.id])}
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
                          disabled={!ratings[currentTask.id]}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        
                        <Button 
                          className="flex items-center bg-green-600 hover:bg-green-700"
                          onClick={() => handleValidate(currentTask.id, true)}
                          disabled={!ratings[currentTask.id]}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="tts" className="mt-0">
                  <div className="space-y-6">
                    <div className="p-5 bg-white rounded-lg border mb-4 shadow-sm">
                      <h3 className="font-medium text-lg mb-3">Text Passage:</h3>
                      <p className="text-xl">{(currentTask as typeof ttsTaskBatches[0][0]).text}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Voice Recording</h3>
                        <span className="text-sm text-gray-500">{(currentTask as typeof ttsTaskBatches[0][0]).language}</span>
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
                          ref={el => audioRefs.current[`tts-${currentTask.id}`] = el}
                          src={(currentTask as typeof ttsTaskBatches[0][0]).recordingUrl}
                          onEnded={() => setIsPlaying(prev => ({ ...prev, [currentTask.id]: false }))}
                          className="hidden"
                        />
                        <span className="text-sm text-gray-500">
                          {(currentTask as typeof ttsTaskBatches[0][0]).userInfo}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="font-medium mb-2">Voice Quality Rating</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Rate the clarity, natural tone, and pronunciation of the voice recording.
                      </p>
                      
                      <div className="flex gap-2 justify-between">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Button
                            key={rating}
                            variant={rating < 3 ? "outline" : "default"}
                            className={`flex-1 ${
                              rating === 1 ? "border-red-200 hover:border-red-300" : 
                              rating === 2 ? "border-orange-200 hover:border-orange-300" :
                              rating === 3 ? "bg-yellow-500 hover:bg-yellow-600" :
                              rating === 4 ? "bg-lime-500 hover:bg-lime-600" :
                              "bg-green-500 hover:bg-green-600"
                            }`}
                            onClick={() => handleTTSQualityRating(rating, currentTask.id)}
                          >
                            {rating}
                            {rating === 1 && " - Poor"}
                            {rating === 3 && " - OK"}
                            {rating === 5 && " - Excellent"}
                          </Button>
                        ))}
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
                
                <TabsContent value="transcriptions" className="mt-0">
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Original Audio</h3>
                        <span className="text-sm text-gray-500">{(currentTask as typeof transcriptionTaskBatches[0][0]).language}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-2">
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
                          ref={el => audioRefs.current[`transcriptions-${currentTask.id}`] = el}
                          src={(currentTask as typeof transcriptionTaskBatches[0][0]).audioUrl}
                          onEnded={() => setIsPlaying(prev => ({ ...prev, [currentTask.id]: false }))}
                          className="hidden"
                        />
                        <span className="text-sm text-gray-500">
                          {(currentTask as typeof transcriptionTaskBatches[0][0]).userInfo}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5 bg-white rounded-lg border mb-4 shadow-sm">
                      <h3 className="font-medium text-lg mb-3">Submitted Transcription:</h3>
                      <p className="text-xl">{(currentTask as typeof transcriptionTaskBatches[0][0]).transcription}</p>
                    </div>
                    
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-medium mb-2">Edit Transcription (if needed)</h3>
                      <TranscriptionEditor
                        initialText={(currentTask as typeof transcriptionTaskBatches[0][0]).transcription}
                        audioSrc={(currentTask as typeof transcriptionTaskBatches[0][0]).audioUrl}
                        onSave={handleSaveTranscription}
                      />
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
                          disabled={!transcriptionSaved && editedTranscription !== ""}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        
                        <Button 
                          className="flex items-center bg-green-600 hover:bg-green-700"
                          onClick={() => handleValidate(currentTask.id, true)}
                          disabled={!transcriptionSaved && editedTranscription !== ""}
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
