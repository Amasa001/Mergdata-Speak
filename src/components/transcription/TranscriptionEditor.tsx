
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [isSaved, setIsSaved] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscription(e.target.value);
    // Reset saved state when text changes
    if (isSaved) {
      setIsSaved(false);
    }
  };

  const handleSave = () => {
    if (onSave && transcription.trim() !== '') {
      onSave(transcription);
      setIsSaved(true);
    }
  };

  const handleReset = () => {
    setTranscription(initialText);
    setIsSaved(false);
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

  const insertSpecialChar = (char: string) => {
    // Get cursor position
    const textareaEl = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textareaEl) return;
    
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    
    // Insert character at cursor position
    const newText = transcription.substring(0, start) + char + transcription.substring(end);
    setTranscription(newText);
    
    // Reset cursor position after state update
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
          <div className="mt-3 relative h-12 bg-gray-100 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
              Audio waveform visualization
            </div>
            {/* Audio waveform visualization would be rendered here */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                <path
                  d="M0,20 Q5,5 10,20 T20,20 T30,20 T40,20 T50,20 T60,20 T70,20 T80,20 T90,20 T100,20"
                  fill="none"
                  stroke="rgba(249, 115, 22, 0.5)"
                  strokeWidth="2"
                />
                <path
                  d="M0,20 Q5,35 10,20 T20,20 T30,20 T40,20 T50,20 T60,20 T70,20 T80,20 T90,20 T100,20"
                  fill="none"
                  stroke="rgba(249, 115, 22, 0.5)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      <Textarea
        placeholder="Enter transcription here..."
        className="min-h-[200px]"
        value={transcription}
        onChange={handleTextChange}
      />
      
      <div className="bg-gray-50 p-3 rounded-md">
        <p className="text-sm font-medium mb-2">Special Characters</p>
        <Tabs defaultValue="Twi" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            {Object.keys(specialCharacters).map((language) => (
              <TabsTrigger key={language} value={language}>{language}</TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(specialCharacters).map(([language, chars]) => (
            <TabsContent key={language} value={language} className="mt-2">
              <div className="flex flex-wrap gap-2">
                {chars.map((char, index) => (
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
            </TabsContent>
          ))}
        </Tabs>
      </div>

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
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
