
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Save } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AudioRecorderProps {
  maxDuration?: number; // in seconds
  onRecordingComplete?: (audioBlob: Blob) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  maxDuration = 15,
  onRecordingComplete 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }
        
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => {
          const newTime = prevTime + 1;
          
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };
  
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <div className="w-full mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Recording: {formatTime(recordingTime)}</span>
            <span>Max: {formatTime(maxDuration)}</span>
          </div>
          <Progress value={(recordingTime / maxDuration) * 100} className="h-2" />
        </div>
        
        <div className="flex justify-center items-center space-x-4">
          {!isRecording && !audioBlob && (
            <Button 
              onClick={startRecording} 
              className="h-16 w-16 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600"
            >
              <Mic className="h-6 w-6" />
            </Button>
          )}
          
          {isRecording && (
            <Button 
              onClick={stopRecording} 
              variant="destructive"
              className="h-16 w-16 rounded-full flex items-center justify-center"
            >
              <Square className="h-5 w-5" />
            </Button>
          )}
          
          {audioBlob && !isRecording && (
            <>
              <Button 
                onClick={playAudio} 
                variant="outline"
                className="h-12 w-12 rounded-full flex items-center justify-center"
                disabled={isPlaying}
              >
                <Play className="h-5 w-5" />
              </Button>
              
              <Button 
                onClick={startRecording}
                variant="outline"
                className="h-12 w-12 rounded-full flex items-center justify-center"
              >
                <Mic className="h-5 w-5" />
              </Button>
              
              <Button 
                className="h-12 w-12 rounded-full flex items-center justify-center bg-afri-orange hover:bg-afri-orange/90"
              >
                <Save className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl} 
          onEnded={() => setIsPlaying(false)} 
          className="hidden"
        />
      )}
    </div>
  );
};
