import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2, AlertCircle } from 'lucide-react'; // Icons for recording
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';

// Define special characters directly here (copied from TranscriptionEditor)
const specialCharactersMap = {
    "twi": ["ɛ", "ɔ", "Ɛ", "Ɔ", "ŋ", "Ŋ"],
    "ewe": ["ɖ", "ƒ", "ɣ", "Ɖ", "Ƒ", "Ɣ", "ŋ", "Ŋ", "ɔ", "Ɔ", "ʋ", "Ʋ"],
    "baule": ["ɛ", "ɔ", "Ɛ", "Ɔ", "ɩ", "Ɩ", "ʋ", "Ʋ", "ŋ", "Ŋ"],
    "dioula": ["ɛ", "ɔ", "Ɛ", "Ɔ", "ɲ", "Ɲ", "ŋ", "Ŋ"]
};
const languagesWithSpecialChars = Object.keys(specialCharactersMap);

interface TranslationInputProps {
  targetLanguage: string;
  text: string;
  onTextChange: (text: string) => void;
  audioBlob: Blob | null;
  onAudioChange: (blob: Blob | null) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
}

export const TranslationInput: React.FC<TranslationInputProps> = ({
  targetLanguage,
  text,
  onTextChange,
  audioBlob,
  onAudioChange,
  isRecording,
  setIsRecording,
}) => {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Use the locally defined maps
  const lowerCaseTargetLanguage = targetLanguage.toLowerCase();
  const showSpecialChars = languagesWithSpecialChars.includes(lowerCaseTargetLanguage);
  const currentSpecialChars = specialCharactersMap[lowerCaseTargetLanguage as keyof typeof specialCharactersMap] || [];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clean up audio URL when blob changes
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url); // Clean up object URL
    } else {
      setAudioUrl(null);
    }
  }, [audioBlob]);

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    setPermissionError(null); // Reset error
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = []; // Reset chunks

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Adjust mime type if needed
          onAudioChange(blob);
          // Clean up stream tracks
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.onerror = (event) => {
           console.error("MediaRecorder error:", event);
           toast({ title: "Recording Error", description: "An error occurred during recording.", variant: "destructive" });
           setIsRecording(false);
           // Clean up stream tracks
           stream.getTracks().forEach(track => track.stop());
        }

        mediaRecorderRef.current.start();
        setIsRecording(true);
        onAudioChange(null); // Clear previous blob if starting new recording

      } catch (err) {
        console.error("Error accessing microphone:", err);
        if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
            setPermissionError("Microphone permission denied. Please allow access in your browser settings.");
        } else if (err instanceof DOMException && err.name === 'NotFoundError') {
            setPermissionError("No microphone found. Please ensure a microphone is connected and enabled.");
        } else {
            setPermissionError("Could not access microphone. Please check permissions and hardware.");
        }
        toast({ title: "Microphone Access Error", description: permissionError || "Could not start recording.", variant: "destructive" });
      }
    } else {
        toast({ title: "Unsupported Browser", description: "Audio recording is not supported in this browser.", variant: "destructive" });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDeleteRecording = () => {
    onAudioChange(null); // Clear the blob
    setAudioUrl(null);
     if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop(); // Stop recording if deleting during recording
     }
     setIsRecording(false);
  };

  const insertSpecialChar = (char: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = textarea.value;
      const newText = currentText.substring(0, start) + char + currentText.substring(end);
      onTextChange(newText);
      // Move cursor after the inserted character
      setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + char.length;
          textarea.focus();
      }, 0);
    }
  };


  return (
    <div className="space-y-4">
      {/* Written Translation */}
      <div>
        <Label htmlFor="translation-text" className="mb-1 block">Written Translation ({targetLanguage}):</Label>
        <Textarea
          id="translation-text"
          ref={textareaRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`Type your translation in ${targetLanguage} here...`}
          rows={4}
          className="mb-2"
        />
        {/* Special Characters Buttons (Optional based on language) */}
        {showSpecialChars && currentSpecialChars.length > 0 && (
          <div className="mt-2 space-x-1">
             <span className="text-sm font-medium mr-2">Special Characters:</span>
             {currentSpecialChars.map((char) => (
               <Button
                  key={char}
                  variant="outline"
                  size="sm"
                  className="px-2.5 py-1 h-auto text-base"
                  onClick={() => insertSpecialChar(char)}
                >
                  {char}
                </Button>
              ))}
          </div>
        )}
      </div>

      {/* Audio Recording */}
      <div>
        <Label className="mb-1 block">Audio Recording ({targetLanguage}):</Label>
        {permissionError && (
            <div className="flex items-center p-3 mb-3 text-sm text-red-700 bg-red-100 rounded-md border border-red-200">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{permissionError}</span>
            </div>
        )}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
          {!isRecording && !audioUrl && (
            <Button onClick={handleStartRecording} variant="outline" size="icon" aria-label="Start recording">
              <Mic className="h-5 w-5" />
            </Button>
          )}
          {isRecording && (
            <Button onClick={handleStopRecording} variant="destructive" size="icon" aria-label="Stop recording">
              <Square className="h-5 w-5 fill-white" />
            </Button>
          )}
           <div className="flex-grow text-sm text-gray-600">
             {isRecording && <span>Recording... Click stop when done.</span>}
             {!isRecording && !audioUrl && <span>Click the mic to start recording your translation.</span>}
             {audioUrl && (
                 <div className="flex items-center gap-2">
                    <audio controls src={audioUrl} className="h-10 w-full"></audio>
                    <Button onClick={handleDeleteRecording} variant="ghost" size="icon" aria-label="Delete recording">
                       <Trash2 className="h-5 w-5 text-red-600" />
                    </Button>
                 </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}; 