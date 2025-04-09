
import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from '@/components/recording/AudioRecorder';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const ASRTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState<Record<number, Blob>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock image prompts for ASR task
  const imageSamples = [
    { id: 1, title: "Market Scene", description: "Describe this bustling African marketplace in your language." },
    { id: 2, title: "Family Gathering", description: "Talk about what you see in this family celebration image." },
    { id: 3, title: "Rural Landscape", description: "Describe this rural village scene in your language." },
  ];
  
  const handleRecordingComplete = (audioBlob: Blob) => {
    setRecordedAudios(prev => ({
      ...prev,
      [currentImageIndex]: audioBlob
    }));
  };
  
  const goToNextImage = () => {
    if (currentImageIndex < imageSamples.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };
  
  const goToPrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };
  
  const handleSubmitAll = () => {
    setIsSubmitting(true);
    
    // Here you would typically send the recorded audio files to your server
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Submission successful",
        description: "Your ASR recordings have been submitted. Thank you for your contribution!",
      });
      navigate('/dashboard');
    }, 1500);
  };
  
  const isCurrentImageRecorded = !!recordedAudios[currentImageIndex];
  const allImagesRecorded = Object.keys(recordedAudios).length === imageSamples.length;

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
        
        <div className="max-w-2xl mx-auto">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-gray-50 border-b pb-3">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">
                  Image {currentImageIndex + 1} of {imageSamples.length}
                </h2>
                <span className="text-sm text-gray-500">
                  Recorded: {Object.keys(recordedAudios).length} of {imageSamples.length}
                </span>
              </div>
              <progress 
                value={Object.keys(recordedAudios).length} 
                max={imageSamples.length}
                className="w-full h-2"
              />
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    {imageSamples[currentImageIndex].title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {imageSamples[currentImageIndex].description}
                  </p>
                  
                  <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center mb-6">
                    {/* This would be an actual image in a real app */}
                    <div className="text-gray-400">
                      Image Sample {currentImageIndex + 1}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Instructions:
                    </h4>
                    <ul className="text-sm space-y-2 text-gray-600 list-disc pl-4">
                      <li>Look at the image and prepare what you want to say</li>
                      <li>Click the record button and start speaking</li>
                      <li>Speak clearly in your selected language</li>
                      <li>You have 15 seconds maximum for your recording</li>
                      <li>Click the stop button when finished</li>
                    </ul>
                  </div>
                </div>
                
                <div className="py-4">
                  <AudioRecorder 
                    maxDuration={15}
                    onRecordingComplete={handleRecordingComplete}
                  />
                </div>
                
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={goToPrevImage}
                    disabled={currentImageIndex === 0}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  
                  {currentImageIndex < imageSamples.length - 1 ? (
                    <Button
                      onClick={goToNextImage}
                      disabled={!isCurrentImageRecorded}
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      className="bg-afri-green hover:bg-afri-green/90"
                      onClick={handleSubmitAll}
                      disabled={!allImagesRecorded || isSubmitting}
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

export default ASRTask;
