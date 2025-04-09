
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw } from 'lucide-react';

interface TranscriptionEditorProps {
  initialText?: string;
  audioSrc?: string;
  onSave?: (text: string) => void;
}

export const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({
  initialText = '',
  audioSrc,
  onSave
}) => {
  const [transcription, setTranscription] = useState(initialText);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscription(e.target.value);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(transcription);
    }
  };

  const handleReset = () => {
    setTranscription(initialText);
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="space-y-4">
      {audioSrc && (
        <div className="p-4 bg-gray-50 rounded-md">
          <p className="text-sm font-medium mb-2">Audio Reference</p>
          <audio
            ref={audioRef}
            src={audioSrc}
            controls
            className="w-full"
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}

      <Textarea
        placeholder="Enter transcription here..."
        className="min-h-[200px]"
        value={transcription}
        onChange={handleTextChange}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset} className="flex items-center">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        
        <Button onClick={handleSave} className="flex items-center">
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
};
