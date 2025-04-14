import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, CheckCircle, ArrowLeft, SkipForward, Loader2, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder } from '@/components/recording/AudioRecorder';
import { useNavigate } from 'react-router-dom';
import { Progress } from "@/components/ui/progress";

const TTSTask: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState<Record<number, Blob>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRecordingBlob, setCurrentRecordingBlob] = useState<Blob | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [reviewAudioUrl, setReviewAudioUrl] = useState<string | null>(null);
  const reviewAudioRef = useRef<HTMLAudioElement>(null);

  // Text passages for TTS
  const passages = [
    {
      id: 1,
      title: "Local Market Description",
      text: "Soko hili kubwa lina wafanyabiashara wengi wanaouza matunda, mboga, na vitu vingine. Watu wanazungumza kwa sauti kubwa wakati wanajadiliana bei. Wateja wanachagua bidhaa kwa makini na kufanya manunuzi yao.",
      language: "Swahili",
      estimatedDuration: 30 // in seconds
    },
    {
      id: 2,
      title: "Family Gathering",
      text: "Familia imekusanyika pamoja kusherehekea sikukuu. Watoto wanacheza wakati wazee wanazungumza. Meza imejaa vyakula vitamu na kila mtu anafurahia muda pamoja. Wanasimulia hadithi za zamani na kucheka.",
      language: "Swahili",
      estimatedDuration: 45
    },
    {
      id: 3,
      title: "Weather Description",
      text: "Leo anga ni la samawati. Jua linang'aa na halijoto ni joto. Upepo mwanana unavuma polepole, ukileta baridi kidogo. Miti inasukumwa polepole na majani yanachelewa. Ni siku nzuri ya kuwa nje.",
      language: "Swahili",
      estimatedDuration: 25
    }
  ];

  useEffect(() => {
    setIsLoadingTasks(true);
    setCurrentPassageIndex(0);
    setRecordedAudios({});
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    setIsSubmitting(false);
    console.log("Fetching TTS passages...");
    setTimeout(() => {
      setIsLoadingTasks(false);
    }, 500);
  }, []);

  const currentPassage = isLoadingTasks ? null : passages[currentPassageIndex];
  const currentPassageId = currentPassage?.id;

  const handleAudioDataAvailable = (url: string | null, blob: Blob | null) => {
    setReviewAudioUrl(url);
    setCurrentRecordingBlob(blob);
    if (url && blob) {
        toast({
            title: "Recording Ready for Review",
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
    if (!currentRecordingBlob || !currentPassageId) return;

    setRecordedAudios(prev => ({
      ...prev,
      [currentPassageId]: currentRecordingBlob
    }));
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';

    toast({
      title: "Recording Saved",
      description: `Recording saved. Click Next Passage to continue.`,
      variant: "default"
    });
  };

  const handleDiscardRecording = () => {
    setCurrentRecordingBlob(null);
    setReviewAudioUrl(null);
    if (reviewAudioRef.current) reviewAudioRef.current.src = '';
    toast({ title: "Recording Discarded", description: "You can record again." });
  };

  const handleSkipPassage = () => {
    if (!currentPassage) return;
    toast({
      title: "Passage Skipped",
      description: `Skipped passage ${currentPassageIndex + 1}.`,
    });
    handleNextPassage(true);
  };

  const handleNextPassage = (skipped = false) => {
    if (currentPassageIndex < passages.length - 1) {
      setCurrentPassageIndex(prev => prev + 1);
      setCurrentRecordingBlob(null);
      setReviewAudioUrl(null);
      if (reviewAudioRef.current) reviewAudioRef.current.src = '';
    } else {
      const finalRecordings = { ...recordedAudios };
      if (currentRecordingBlob && currentPassageId && !finalRecordings[currentPassageId]) {
         finalRecordings[currentPassageId] = currentRecordingBlob;
      }
      if (Object.keys(finalRecordings).length > 0) {
         handleSubmitAll();
      } else {
         toast({ title: "All passages viewed", description: "Record or skip the last passage to submit.", variant: "default" });
      }
    }
  };

  const handleSubmitAll = () => {
    const finalRecordings = { ...recordedAudios };
    if (currentRecordingBlob && currentPassageId && !finalRecordings[currentPassageId]) {
        finalRecordings[currentPassageId] = currentRecordingBlob;
    }

    if (Object.keys(finalRecordings).length === 0) {
       toast({ title: "No recordings", description: "Record at least one passage to submit.", variant: "destructive"});
       return;
    }

    setIsSubmitting(true);
    console.log("Submitting TTS recordings:", finalRecordings);
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Recordings Submitted",
        description: "Thank you for your contributions!",
        variant: "default"
      });
      setRecordedAudios({});
      setCurrentRecordingBlob(null);
      setReviewAudioUrl(null);
      if (reviewAudioRef.current) reviewAudioRef.current.src = '';
      navigate('/dashboard');
    }, 1500);
  };

  const isCurrentPassageRecorded = currentPassageId ? !!recordedAudios[currentPassageId] : false;
  const isLastPassage = currentPassageIndex === passages.length - 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold">TTS Recording Task</h1>
      </div>

      {isLoadingTasks && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading passages...</p>
        </div>
      )}

      {!isLoadingTasks && currentPassage && (
        <div className="max-w-3xl mx-auto">
          <Card className="border-none shadow-md">
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <CardTitle className="text-lg">
                  Passage {currentPassageIndex + 1} / {passages.length}: {currentPassage.title}
                </CardTitle>
                <span className="text-sm font-medium text-gray-500">{currentPassage.language}</span>
              </div>
              <CardDescription>Read the text below clearly and naturally.</CardDescription>
              <Progress value={(currentPassageIndex / passages.length) * 100} className="mt-2 h-2" />
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg border max-h-60 overflow-y-auto">
                <p className="text-gray-800 text-lg leading-relaxed font-medium">
                  {currentPassage.text}
                </p>
              </div>

              <div className="border-t pt-6 space-y-4">
                {isCurrentPassageRecorded ? (
                   <div className="text-center py-4 text-green-600 font-medium flex items-center justify-center">
                     <CheckCircle className="h-5 w-5 mr-2" />
                     Recording saved for this passage.
                   </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                     <AudioRecorder
                        key={currentPassageId}
                        maxDuration={currentPassage.estimatedDuration + 15}
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

              <div className="border-t pt-6 flex justify-between items-center">
                <Button 
                  variant="outline" 
                  onClick={() => handleSkipPassage()} 
                  disabled={isSubmitting || !!reviewAudioUrl}
                 >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip Passage
                </Button>
                
                {isLastPassage ? (
                    <Button 
                        onClick={handleSubmitAll} 
                        disabled={isSubmitting || !!reviewAudioUrl || (!isCurrentPassageRecorded && Object.keys(recordedAudios).length === 0) }
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                      ) : (
                        "Submit All Recordings"
                      )}
                    </Button>
                ) : (
                    <Button 
                        onClick={() => handleNextPassage()} 
                        disabled={isSubmitting || !!reviewAudioUrl || !isCurrentPassageRecorded} 
                    >
                      Next Passage
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
