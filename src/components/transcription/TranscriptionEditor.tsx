import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, CheckCircle, Play, Pause, FastForward, Rewind } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface TranscriptionEditorProps {
  initialText?: string;
  audioSrc?: string;
  onSave?: (text: string) => void;
  onTextChange?: (text: string) => void;
  language?: string;
}

const formatTime = (time: number) => {
  if (isNaN(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({
  initialText = '',
  audioSrc,
  onSave,
  onTextChange,
  language
}) => {
  const [transcription, setTranscription] = useState(initialText);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => {
        if (!isSeeking) {
           setCurrentTime(audio.currentTime);
        }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleRateChange = () => setPlaybackRate(audio.playbackRate);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('ratechange', handleRateChange);

    if (audio.readyState >= 1) {
        handleLoadedMetadata();
    }

    audio.playbackRate = playbackRate;

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('ratechange', handleRateChange);
    };
  }, [audioSrc, isSeeking]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscription(e.target.value);
    if (isSaved) {
      setIsSaved(false);
    }
  };

  const handleSave = useCallback(() => {
    if (onSave && transcription.trim() !== '') {
      onSave(transcription);
      setIsSaved(true);
    }
  }, [onSave, transcription]);

  const handleReset = () => {
    setTranscription(initialText);
    setIsSaved(false);
  };

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      if (Math.abs(audio.currentTime - currentTime) > 0.1) {
          audio.currentTime = currentTime;
      }
      audio.play();
    }
  }, [isPlaying, currentTime]);

  const handleRateChange = (rateStr: string) => {
    const rate = parseFloat(rateStr);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleSeek = (value: number[]) => {
     const newTime = value[0];
     setCurrentTime(newTime);
     if (audioRef.current && !isSeeking) {
         audioRef.current.currentTime = newTime;
     }
  };

  const handleSeekCommit = (value: number[]) => {
      const newTime = value[0];
      if (audioRef.current) {
         audioRef.current.currentTime = newTime;
      }
      setIsSeeking(false);
  }

  const seekRelative = (delta: number) => {
      if (audioRef.current) {
         const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
         audioRef.current.currentTime = newTime;
         setCurrentTime(newTime);
      }
  }

  const insertSpecialChar = (char: string) => {
    const textareaEl = textareaRef.current;
    if (!textareaEl) return;
    
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    
    const newText = transcription.substring(0, start) + char + transcription.substring(end);
    setTranscription(newText);
    
    setTimeout(() => {
      textareaEl.focus();
      textareaEl.setSelectionRange(start + char.length, start + char.length);
    }, 0);
    
    if (isSaved) {
      setIsSaved(false);
    }
  };

  const specialCharacters = {
    "Twi": ["ɛ", "ɔ", "Ɛ", "Ɔ", "ŋ", "Ŋ"],
    "Ewe": ["ɖ", "ƒ", "ɣ", "Ɖ", "Ƒ", "Ɣ", "ŋ", "Ŋ", "ɔ", "Ɔ", "ʋ", "Ʋ"],
    "Baule": ["ɛ", "ɔ", "Ɛ", "Ɔ", "ɩ", "Ɩ", "ʋ", "Ʋ", "ŋ", "Ŋ"],
    "Dioula": ["ɛ", "ɔ", "Ɛ", "Ɔ", "ɲ", "Ɲ", "ŋ", "Ŋ"]
  };
  const currentSpecialChars = language ? specialCharacters[language as keyof typeof specialCharacters] || [] : [];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.ctrlKey && event.code === 'Space') || event.code === 'Escape') {
            event.preventDefault();
            togglePlayPause();
        }
        if (event.ctrlKey && event.code === 'KeyS') {
            event.preventDefault();
            handleSave();
        }
        if (event.ctrlKey && event.shiftKey && event.code === 'ArrowLeft') {
             event.preventDefault();
             seekRelative(-5);
        }
        if (event.ctrlKey && event.shiftKey && event.code === 'ArrowRight') {
             event.preventDefault();
             seekRelative(5);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, togglePlayPause]);

  return (
    <div className="space-y-4 transcription-editor-container">
      {audioSrc && (
        <div className="p-4 bg-gray-50 rounded-md border space-y-3">
          <Label className="text-sm font-medium">Audio Controls</Label>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            <Button variant="outline" size="icon" onClick={() => seekRelative(-5)} aria-label="Rewind 5 seconds">
               <Rewind className="h-5 w-5" />
            </Button>

            <Button variant="outline" size="icon" onClick={() => seekRelative(5)} aria-label="Forward 5 seconds">
               <FastForward className="h-5 w-5" />
            </Button>

            <div className="text-sm font-mono text-muted-foreground min-w-[100px] text-center">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <div className="flex items-center gap-2 ml-auto">
                 <Label htmlFor="playbackRate" className="text-sm">Speed:</Label>
                 <Select value={playbackRate.toString()} onValueChange={handleRateChange}>
                     <SelectTrigger id="playbackRate" className="w-[80px] h-9">
                         <SelectValue placeholder="Speed" />
                     </SelectTrigger>
                     <SelectContent>
                         <SelectItem value="0.5">0.5x</SelectItem>
                         <SelectItem value="0.75">0.75x</SelectItem>
                         <SelectItem value="1.0">1.0x</SelectItem>
                         <SelectItem value="1.25">1.25x</SelectItem>
                         <SelectItem value="1.5">1.5x</SelectItem>
                         <SelectItem value="2.0">2.0x</SelectItem>
                     </SelectContent>
                 </Select>
            </div>

            <audio
              ref={audioRef}
              src={audioSrc}
              className="hidden"
            />
          </div>

          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            disabled={duration === 0}
            onValueChange={handleSeek}
            onValueCommit={handleSeekCommit}
            onPointerDown={() => setIsSeeking(true)}
            className="w-full cursor-pointer"
          />
        </div>
      )}

      <Textarea
        ref={textareaRef}
        placeholder="Enter transcription here... (Ctrl+Space to Play/Pause)"
        className="min-h-[200px] focus:ring-primary focus:border-primary"
        value={transcription}
        onChange={handleTextChange}
      />
      
      {currentSpecialChars.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-md border">
            <p className="text-sm font-medium mb-2">Special Characters ({language})</p>
            <div className="flex flex-wrap gap-2">
              {currentSpecialChars.map((char, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-9 w-9 p-0 font-medium text-lg"
                  onClick={() => insertSpecialChar(char)}
                >
                  {char}
                </Button>
              ))}
            </div>
          </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset} className="flex items-center">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        
        <Button 
          onClick={handleSave} 
          className="flex items-center"
          disabled={isSaved || transcription.trim() === ''}
        >
          {isSaved ? (
            <><CheckCircle className="mr-2 h-4 w-4" /> Saved</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Save (Ctrl+S)</>
          )}
        </Button>
      </div>
    </div>
  );
};
