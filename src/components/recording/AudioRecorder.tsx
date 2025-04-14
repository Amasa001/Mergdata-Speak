import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AudioRecorderProps {
  maxDuration?: number; // in seconds
  onAudioDataAvailable?: (url: string | null, blob: Blob | null) => void; 
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  maxDuration = 15, 
  onAudioDataAvailable,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      if (onAudioDataAvailable) onAudioDataAvailable(null, null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
           audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        if (onAudioDataAvailable) {
            onAudioDataAvailable(url, blob);
        }
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
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

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        console.log("AudioRecorder unmounted, timer cleared.");
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") { 
         try {
             mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
             mediaRecorderRef.current.stop();
             console.log("AudioRecorder unmounted while recording, stream stopped.");
         } catch (e) {
             console.error("Error stopping media recorder on unmount:", e);
         }
      }
    };
  }, []);
  
  return (
    <div className="w-full max-w-xs space-y-4 flex flex-col items-center">
      <div className="w-full mb-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{formatTime(recordingTime)}</span>
          <span> / {formatTime(maxDuration)}</span>
        </div>
        <Progress value={(recordingTime / maxDuration) * 100} className="h-2" />
      </div>
      
      <div className="flex justify-center items-center space-x-4 h-16"> 
        {!isRecording ? (
          <Button 
            onClick={startRecording} 
            size="icon" 
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
            aria-label="Start recording"
          >
            <Mic className="h-7 w-7" />
          </Button>
        ) : (
          <Button 
            onClick={stopRecording} 
            variant="destructive"
            size="icon" 
            className="h-16 w-16 rounded-full"
            aria-label="Stop recording"
          >
            <Square className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
};
