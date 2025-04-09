
import React, { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Save, RotateCcw, CheckCircle, Mic, AlertCircle, Volume2, StopCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const TTSTask: React.FC = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Mock audio blob for playback simulation
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const passages = [
    {
      id: 1,
      title: "Local Market Description",
      text: "Soko hili kubwa lina wafanyabiashara wengi wanaouza matunda, mboga, na vitu vingine. Watu wanazungumza kwa sauti kubwa wakati wanajadiliana bei. Wateja wanachagua bidhaa kwa makini na kufanya manunuzi yao.",
      language: "Swahili",
      length: "30 sec"
    },
    {
      id: 2,
      title: "Family Gathering",
      text: "Familia imekusanyika pamoja kusherehekea sikukuu. Watoto wanacheza wakati wazee wanazungumza. Meza imejaa vyakula vitamu na kila mtu anafurahia muda pamoja. Wanasimulia hadithi za zamani na kucheka.",
      language: "Swahili",
      length: "45 sec"
    },
    {
      id: 3, 
      title: "Weather Description",
      text: "Leo anga ni la samawati. Jua linang'aa na halijoto ni joto. Upepo mwanana unavuma polepole, ukileta baridi kidogo. Miti inasukumwa polepole na majani yanachelewa. Ni siku nzuri ya kuwa nje.",
      language: "Swahili",
      length: "25 sec"
    }
  ];
  
  // Simulate waveform drawing
  const drawWaveform = () => {
    if (!canvasRef.current || !isRecording) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up wave properties
    const centerY = canvas.height / 2;
    const amplitude = Math.random() * 30 + 10; // Random amplitude for visualization
    
    // Draw waveform
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    
    for (let x = 0; x < canvas.width; x++) {
      // Create random oscillation for visualization
      const y = centerY + amplitude * Math.sin(x * 0.05 + Date.now() * 0.005) * Math.random();
      ctx.lineTo(x, y);
    }
    
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Continue animation
    animationRef.current = requestAnimationFrame(drawWaveform);
  };
  
  const handleRecord = () => {
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      // Start recording
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });
      
      // Initialize animation
      if (canvasRef.current) {
        animationRef.current = requestAnimationFrame(drawWaveform);
      }
      
      // Simulate recording finish after 5 seconds
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 10000); // Auto-stop after 10 seconds for demo purposes
    } else {
      stopRecording();
    }
  };
  
  const stopRecording = () => {
    setIsRecording(false);
    setRecordingComplete(true);
    
    // Stop animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Create a mock audio blob
    const mockAudio = new Blob([], { type: 'audio/wav' });
    setAudioBlob(mockAudio);
    
    toast({
      title: "Recording complete",
      description: "You can now review your recording",
    });
  };
  
  const handleReset = () => {
    setIsRecording(false);
    setRecordingComplete(false);
    setAudioBlob(null);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };
  
  const handleSave = () => {
    setIsSaving(true);
    
    // Simulate saving process
    setTimeout(() => {
      toast({
        title: "Recording saved",
        description: "Your recording has been saved successfully",
      });
      handleReset();
      setIsSaving(false);
    }, 1500);
  };
  
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        // This is just a mock playback, so we simulate it
        setTimeout(() => setIsPlaying(false), 3000);
      });
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const handleSelectPassage = (index: number) => {
    setSelectedPassage(index);
    handleReset();
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Text-to-Speech Contribution</h1>
            <p className="text-gray-500">Record high-quality voice recordings of text passages</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Voice Recording Studio</CardTitle>
                <CardDescription>
                  Record yourself reading the text passage below clearly and at a natural pace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <h3 className="text-lg font-medium mb-2">{passages[selectedPassage].title} <span className="text-sm font-normal text-gray-500">({passages[selectedPassage].language})</span></h3>
                  <p className="text-gray-800 text-lg leading-relaxed font-medium">
                    {passages[selectedPassage].text}
                  </p>
                  <div className="mt-4 flex justify-between text-sm text-gray-500">
                    <span>Estimated time: {passages[selectedPassage].length}</span>
                    <span>Passage {selectedPassage + 1} of {passages.length}</span>
                  </div>
                </div>
                
                <div className="border-t pt-5">
                  <div className="flex flex-col items-center space-y-4">
                    {recordingComplete ? (
                      <div className="w-full bg-gray-100 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CheckCircle className="text-green-500 h-6 w-6 mr-2" />
                            <span className="font-medium">Recording complete!</span>
                          </div>
                          <div className="space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleReset}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Discard & Re-record
                            </Button>
                            <Button 
                              size="sm"
                              onClick={handleSave}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <>
                                  <span className="animate-spin mr-1">◌</span>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-1" />
                                  Save Recording
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-4 w-full h-12 bg-gray-200 rounded-lg relative overflow-hidden">
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <path 
                              d="M0,15 Q5,5 10,15 T20,15 T30,15 T40,15 T50,15 T60,15 T70,15 T80,15 T90,15 T100,15" 
                              fill="none" 
                              stroke="rgba(249, 115, 22, 0.7)" 
                              strokeWidth="2"
                            />
                            <path 
                              d="M0,15 Q5,25 10,15 T20,15 T30,15 T40,15 T50,15 T60,15 T70,15 T80,15 T90,15 T100,15" 
                              fill="none" 
                              stroke="rgba(249, 115, 22, 0.7)" 
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                        
                        <audio ref={audioRef} className="hidden" />
                        
                        <div className="mt-2 flex justify-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={togglePlayback}
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Play Back
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="text-center mb-4">
                          <Button
                            className={isRecording ? "bg-red-500 hover:bg-red-600" : ""}
                            onClick={handleRecord}
                            size="lg"
                          >
                            {isRecording ? (
                              <>
                                <StopCircle className="h-5 w-5 mr-1" />
                                Stop Recording
                              </>
                            ) : (
                              <>
                                <Mic className="h-5 w-5 mr-1" />
                                Start Recording
                              </>
                            )}
                          </Button>
                          
                          {isRecording && (
                            <div className="mt-2 flex items-center justify-center text-red-500">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              <span>Recording in progress...</span>
                            </div>
                          )}
                        </div>
                        
                        {isRecording && (
                          <div className="w-full h-12 bg-gray-200 rounded-lg overflow-hidden">
                            <canvas ref={canvasRef} className="w-full h-full"></canvas>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Text Passages</CardTitle>
                <CardDescription>
                  Select a passage to record
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="all">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="swahili">Swahili</TabsTrigger>
                    <TabsTrigger value="amharic">Amharic</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-4">
                    {passages.map((passage, index) => (
                      <div 
                        key={passage.id}
                        className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2 ${selectedPassage === index ? 'border-afri-blue bg-blue-50' : ''}`}
                        onClick={() => handleSelectPassage(index)}
                      >
                        <h4 className="font-medium">{passage.title}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                            {passage.language}
                          </span>
                          <span className="text-xs text-gray-500">{passage.length}</span>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="swahili" className="mt-4">
                    {passages.filter(p => p.language === "Swahili").map((passage, index) => (
                      <div 
                        key={passage.id}
                        className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 mb-2 ${passages.findIndex(p => p.id === passage.id) === selectedPassage ? 'border-afri-blue bg-blue-50' : ''}`}
                        onClick={() => handleSelectPassage(passages.findIndex(p => p.id === passage.id))}
                      >
                        <h4 className="font-medium">{passage.title}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                            {passage.language}
                          </span>
                          <span className="text-xs text-gray-500">{passage.length}</span>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="amharic" className="mt-4">
                    <p className="text-center py-6 text-gray-500">No Amharic passages available yet.</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recording Tips</CardTitle>
                <CardDescription>
                  Follow these guidelines for optimal recording quality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">• Use a quiet environment with minimal background noise</p>
                <p className="text-sm">• Maintain consistent distance from the microphone</p>
                <p className="text-sm">• Speak clearly and at a moderate pace</p>
                <p className="text-sm">• Use natural intonation and pronunciation</p>
                <p className="text-sm">• Complete the entire passage in one recording session</p>
                <p className="text-sm">• Review your recording before submitting</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TTSTask;
