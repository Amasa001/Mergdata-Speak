
import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TranscriptionEditor } from '@/components/transcription/TranscriptionEditor';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const TranscribeTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [transcriptions, setTranscriptions] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCurrentTaskComplete, setIsCurrentTaskComplete] = useState(false);

  // Mock audio files for transcription task
  const audioSamples = [
    { 
      id: 1, 
      title: "Traditional Story",
      language: "Swahili",
      description: "A short recording of a traditional story. Transcribe what you hear.",
      // In a real app, this would be a path to an actual audio file
      audioSrc: "https://example.com/audio/sample1.mp3" 
    },
    { 
      id: 2,
      title: "Conversation",
      language: "Yoruba",
      description: "A short conversation between two people. Transcribe what you hear.",
      audioSrc: "https://example.com/audio/sample2.mp3"
    },
    { 
      id: 3,
      title: "News Bulletin",
      language: "Amharic",
      description: "A short news bulletin. Transcribe what you hear.",
      audioSrc: "https://example.com/audio/sample3.mp3"
    },
  ];
  
  // Check if current task is complete when component loads or currentAudioIndex changes
  useEffect(() => {
    setIsCurrentTaskComplete(!!transcriptions[currentAudioIndex]);
  }, [currentAudioIndex, transcriptions]);
  
  const handleSaveTranscription = (text: string) => {
    setTranscriptions(prev => ({
      ...prev,
      [currentAudioIndex]: text
    }));
    
    setIsCurrentTaskComplete(true);
    
    // Show success toast
    toast({
      title: "Transcription saved",
      description: "Your work has been saved successfully.",
    });
  };
  
  const goToNextAudio = () => {
    if (currentAudioIndex < audioSamples.length - 1) {
      setCurrentAudioIndex(prev => prev + 1);
    }
  };
  
  const goToPrevAudio = () => {
    if (currentAudioIndex > 0) {
      setCurrentAudioIndex(prev => prev - 1);
    }
  };
  
  const handleSubmitAll = () => {
    setIsSubmitting(true);
    
    // Here you would typically send the transcriptions to your server
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Submission successful",
        description: "Your transcriptions have been submitted. Thank you for your contribution!",
      });
      navigate('/dashboard');
    }, 1500);
  };
  
  const allAudiosTranscribed = Object.keys(transcriptions).length === audioSamples.length;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-xl font-bold">Transcription Task</h1>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-gray-50 border-b pb-3">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">
                  Audio {currentAudioIndex + 1} of {audioSamples.length}
                </h2>
                <span className="text-sm text-gray-500">
                  Transcribed: {Object.keys(transcriptions).length} of {audioSamples.length}
                </span>
              </div>
              <progress 
                value={Object.keys(transcriptions).length} 
                max={audioSamples.length}
                className="w-full h-2"
              />
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    {audioSamples[currentAudioIndex].title}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({audioSamples[currentAudioIndex].language})
                    </span>
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {audioSamples[currentAudioIndex].description}
                  </p>
                </div>
                
                <div className="py-4">
                  <TranscriptionEditor 
                    initialText={transcriptions[currentAudioIndex] || ''}
                    audioSrc={audioSamples[currentAudioIndex].audioSrc}
                    onSave={handleSaveTranscription}
                  />
                </div>
                
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={goToPrevAudio}
                    disabled={currentAudioIndex === 0}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  
                  {currentAudioIndex < audioSamples.length - 1 ? (
                    <Button
                      onClick={goToNextAudio}
                      disabled={!isCurrentTaskComplete}
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      className="bg-afri-green hover:bg-afri-green/90"
                      onClick={handleSubmitAll}
                      disabled={!allAudiosTranscribed || isSubmitting}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Submitting..." : "Submit All"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default TranscribeTask;
