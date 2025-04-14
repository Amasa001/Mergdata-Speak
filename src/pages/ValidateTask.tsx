import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SkipForward, ThumbsUp, ThumbsDown, Play, Pause, Star, Globe, FastForward, Rewind, Languages } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { TranscriptionEditor } from '@/components/transcription/TranscriptionEditor';
import { LanguageFilter } from '@/components/tasks/LanguageFilter';
import { RejectionReasonDialog } from '@/components/validation/RejectionReasonDialog';
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Define type for validation status
type ValidationStatus = 'pending' | 'approved' | 'rejected';

// Define more specific types for tasks (improves type safety)
type BaseTask = { id: number; language: string; userInfo: string };
type ASRTaskItem = BaseTask & { imageUrl: string; recordingUrl: string };
type TTSTaskItem = BaseTask & { text: string; recordingUrl: string };
type TranscriptionTaskItem = BaseTask & { audioUrl: string; transcription: string };
// New type for translation validation tasks
type TranslationTaskItem = BaseTask & { 
  sourceText: string; 
  targetText: string; 
  sourceLanguage: string; 
  targetLanguage: string;
  audioUrl?: string; // Optional audio recording of the translation
};
type AnyTaskItem = ASRTaskItem | TTSTaskItem | TranscriptionTaskItem | TranslationTaskItem;

// Define rejection reasons (Corrected syntax)
const asrRejectionReasons = [
  { value: 'NOISY', label: 'Background noise too high' },
  { value: 'SILENT', label: 'Recording is silent or mostly silent' },
  { value: 'UNRELATED', label: 'Recording doesn\'t describe the image' }, // Escaped apostrophe
  { value: 'WRONG_LANG', label: 'Recording is in the wrong language' },
  { value: 'UNCLEAR', label: 'Speech is unclear/muffled' },
  { value: 'CUT_OFF', label: 'Recording seems incomplete/cut off' },
];
const ttsRejectionReasons = [
  { value: 'MISREAD', label: 'Did not read the provided text accurately' },
  { value: 'UNCLEAR', label: 'Speech is unclear/muffled' },
  { value: 'NOISY', label: 'Background noise too high' },
  { value: 'UNNATURAL', label: 'Pronunciation or intonation sounds unnatural' },
  { value: 'WRONG_LANG', label: 'Spoken in the wrong language' },
  { value: 'CUT_OFF', label: 'Recording seems incomplete/cut off' },
];
const transcriptionRejectionReasons = [
  { value: 'INACCURATE', label: 'Transcription doesn\'t match the audio significantly' }, // Escaped apostrophe
  { value: 'WRONG_LANG', label: 'Transcription is in the wrong language' },
  { value: 'MISSING_CONTENT', label: 'Significant parts of the audio are not transcribed' },
  { value: 'GARBLED', label: 'Transcription is nonsensical or garbled' },
];
// New set of reasons for translation validation
const translationRejectionReasons = [
  { value: 'INACCURATE', label: 'Translation is inaccurate or doesn\'t convey the original meaning' },
  { value: 'WRONG_LANG', label: 'Translation is not in the correct target language' },
  { value: 'GRAMMAR', label: 'Contains significant grammatical errors' },
  { value: 'INCOMPLETE', label: 'Translation is incomplete or missing key parts' },
  { value: 'NONSENSICAL', label: 'Translation is nonsensical or unintelligible' },
  { value: 'QUALITY', label: 'Translation quality is too low for use' },
];

// Helper to format time
const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const ValidateTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [validations, setValidations] = useState<Record<number, ValidationStatus>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState('asr');
  const [editedTranscription, setEditedTranscription] = useState<string>("");
  const [isTranscriptionEdited, setIsTranscriptionEdited] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionTarget, setRejectionTarget] = useState<{ taskId: number; type: 'asr' | 'tts' | 'transcription' | 'translation' } | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<number, number>>({});
  const [audioCurrentTimes, setAudioCurrentTimes] = useState<Record<number, number>>({});
  const [audioPlaybackRates, setAudioPlaybackRates] = useState<Record<number, number>>({});
  const [isSeeking, setIsSeeking] = useState<Record<number, boolean>>({});
  // Add state for translation feedback
  const [editedTranslation, setEditedTranslation] = useState<string>("");
  const [isTranslationEdited, setIsTranslationEdited] = useState(false);
  const [translationFeedback, setTranslationFeedback] = useState<Record<number, string>>({});

  // Mock ASR validation tasks in batches - now with real images
  const asrTaskBatches: ASRTaskItem[][] = [
    [
      {
        id: 101,
        imageUrl: "https://images.unsplash.com/photo-1472396961693-142e6e269027",
        recordingUrl: "https://example.com/audio/validation/asr1.mp3",
        language: "English",
        userInfo: "User ID: 2341"
      },
      {
        id: 102,
        imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
        recordingUrl: "https://example.com/audio/validation/asr2.mp3",
        language: "English",
        userInfo: "User ID: 1567"
      },
      {
        id: 103,
        imageUrl: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21",
        recordingUrl: "https://example.com/audio/validation/asr3.mp3",
        language: "English",
        userInfo: "User ID: 8932"
      },
      {
        id: 104,
        imageUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
        recordingUrl: "https://example.com/audio/validation/asr4.mp3",
        language: "English",
        userInfo: "User ID: 4521"
      },
      {
        id: 105,
        imageUrl: "https://images.unsplash.com/photo-1582562124811-c09040d0a901",
        recordingUrl: "https://example.com/audio/validation/asr5.mp3",
        language: "Twi",
        userInfo: "User ID: 3217"
      },
      {
        id: 106,
        imageUrl: "https://images.unsplash.com/photo-1487887235947-a955ef187fcc",
        recordingUrl: "https://example.com/audio/validation/asr6.mp3",
        language: "Yoruba",
        userInfo: "User ID: 9876"
      },
      {
        id: 107,
        imageUrl: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1",
        recordingUrl: "https://example.com/audio/validation/asr7.mp3",
        language: "Swahili",
        userInfo: "User ID: 2468"
      },
      {
        id: 108,
        imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
        recordingUrl: "https://example.com/audio/validation/asr8.mp3",
        language: "Ewe",
        userInfo: "User ID: 1357"
      },
      {
        id: 109,
        imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b",
        recordingUrl: "https://example.com/audio/validation/asr9.mp3",
        language: "Baule",
        userInfo: "User ID: 7531"
      },
      {
        id: 110,
        imageUrl: "https://images.unsplash.com/photo-1498936178812-4b2e558d2937",
        recordingUrl: "https://example.com/audio/validation/asr10.mp3",
        language: "Dioula",
        userInfo: "User ID: 9512"
      },
    ],
  ];

  // Mock TTS validation tasks in batches
  const ttsTaskBatches: TTSTaskItem[][] = [
    [
      {
        id: 201,
        text: "Welcome to our community meeting",
        recordingUrl: "https://example.com/audio/validation/tts1.mp3",
        language: "English",
        userInfo: "User ID: 3456"
      },
      {
        id: 202,
        text: "Please remember to bring your identification",
        recordingUrl: "https://example.com/audio/validation/tts2.mp3",
        language: "English",
        userInfo: "User ID: 7890"
      },
      {
        id: 203,
        text: "The seminar will begin at nine o'clock tomorrow",
        recordingUrl: "https://example.com/audio/validation/tts3.mp3",
        language: "English",
        userInfo: "User ID: 5678"
      },
      {
        id: 204,
        text: "Please contact us if you have any questions",
        recordingUrl: "https://example.com/audio/validation/tts4.mp3",
        language: "Swahili",
        userInfo: "User ID: 1234"
      },
      {
        id: 205,
        text: "All participants should register before attending",
        recordingUrl: "https://example.com/audio/validation/tts5.mp3",
        language: "English",
        userInfo: "User ID: 9012"
      },
      {
        id: 206,
        text: "The meeting will be held in the main conference room",
        recordingUrl: "https://example.com/audio/validation/tts6.mp3",
        language: "English",
        userInfo: "User ID: 3456"
      },
      {
        id: 207,
        text: "Please submit your reports by the end of the week",
        recordingUrl: "https://example.com/audio/validation/tts7.mp3",
        language: "English",
        userInfo: "User ID: 7890"
      },
      {
        id: 208,
        text: "The training session has been rescheduled to next month",
        recordingUrl: "https://example.com/audio/validation/tts8.mp3",
        language: "Yoruba",
        userInfo: "User ID: 2345"
      },
      {
        id: 209,
        text: "We appreciate your patience during this transition period",
        recordingUrl: "https://example.com/audio/validation/tts9.mp3",
        language: "English",
        userInfo: "User ID: 6789"
      },
      {
        id: 210,
        text: "Please review the attached document before our meeting",
        recordingUrl: "https://example.com/audio/validation/tts10.mp3",
        language: "English",
        userInfo: "User ID: 0123"
      }
    ],
  ];

  // Mock transcription validation tasks in batches
  const transcriptionTaskBatches: TranscriptionTaskItem[][] = [
    [
      {
        id: 301,
        audioUrl: "https://example.com/audio/validation/trans1.mp3",
        transcription: "The market opens early in the morning and closes at sunset.",
        language: "English",
        userInfo: "User ID: 4567"
      },
      {
        id: 302,
        audioUrl: "https://example.com/audio/validation/trans2.mp3",
        transcription: "She has been working in this hospital for fifteen years.",
        language: "English",
        userInfo: "User ID: 8901"
      },
      {
        id: 303,
        audioUrl: "https://example.com/audio/validation/trans3.mp3",
        transcription: "The children are playing in the park near the river.",
        language: "English",
        userInfo: "User ID: 2345"
      },
      {
        id: 304,
        audioUrl: "https://example.com/audio/validation/trans4.mp3",
        transcription: "He studies mathematics and physics at the university.",
        language: "Twi",
        userInfo: "User ID: 6789"
      },
      {
        id: 305,
        audioUrl: "https://example.com/audio/validation/trans5.mp3",
        transcription: "They will travel to the capital city next week for the conference.",
        language: "English",
        userInfo: "User ID: 0123"
      },
      {
        id: 306,
        audioUrl: "https://example.com/audio/validation/trans6.mp3",
        transcription: "The concert was postponed because of the heavy rain.",
        language: "English",
        userInfo: "User ID: 4567"
      },
      {
        id: 307,
        audioUrl: "https://example.com/audio/validation/trans7.mp3",
        transcription: "She reads many books during her summer vacation.",
        language: "Ewe",
        userInfo: "User ID: 8901"
      },
      {
        id: 308,
        audioUrl: "https://example.com/audio/validation/trans8.mp3",
        transcription: "The farmers planted corn and beans in their fields this season.",
        language: "English",
        userInfo: "User ID: 2345"
      },
      {
        id: 309,
        audioUrl: "https://example.com/audio/validation/trans9.mp3",
        transcription: "The committee meets every month to discuss new projects.",
        language: "English",
        userInfo: "User ID: 6789"
      },
      {
        id: 310,
        audioUrl: "https://example.com/audio/validation/trans10.mp3",
        transcription: "He learned to play the traditional drum from his grandfather.",
        language: "Dioula",
        userInfo: "User ID: 0123"
      }
    ],
  ];

  // Mock translation validation tasks in batches
  const translationTaskBatches: TranslationTaskItem[][] = [
    [
      {
        id: 401,
        sourceText: "Hello, how are you today?",
        targetText: "Meda wo ase, wo ho te sɛn ɛnnɛ?",
        sourceLanguage: "English",
        targetLanguage: "Twi",
        audioUrl: "https://example.com/audio/validation/trans-twi1.mp3",
        language: "Twi",
        userInfo: "User ID: 1234"
      },
      {
        id: 402,
        sourceText: "The weather is very nice this morning.",
        targetText: "Egbe ŋdi sia la yame nyoe ŋutɔ.",
        sourceLanguage: "English",
        targetLanguage: "Ewe",
        audioUrl: "https://example.com/audio/validation/trans-ewe1.mp3",
        language: "Ewe",
        userInfo: "User ID: 5678"
      },
      {
        id: 403,
        sourceText: "Please provide your name and address.",
        targetText: "Yeminga wa kpenmin ni wa adrɛsi.",
        sourceLanguage: "English",
        targetLanguage: "Baule",
        audioUrl: "https://example.com/audio/validation/trans-baule1.mp3",
        language: "Baule",
        userInfo: "User ID: 9012"
      },
      {
        id: 404,
        sourceText: "Where is the nearest market?",
        targetText: "Lote jatigin bɛ min?",
        sourceLanguage: "English",
        targetLanguage: "Dioula",
        audioUrl: "https://example.com/audio/validation/trans-dioula1.mp3",
        language: "Dioula",
        userInfo: "User ID: 3456"
      },
      {
        id: 405,
        sourceText: "I would like to buy some fresh fruits.",
        targetText: "Mo fẹ ra awọn eso tutu diẹ.",
        sourceLanguage: "English",
        targetLanguage: "Yoruba",
        audioUrl: "https://example.com/audio/validation/trans-yoruba1.mp3",
        language: "Yoruba",
        userInfo: "User ID: 7890"
      },
      {
        id: 406,
        sourceText: "This book contains important information.",
        targetText: "Saa nwoma yi wɔ nsɛm a ɛho hia paa wɔ mu.",
        sourceLanguage: "English", 
        targetLanguage: "Twi",
        language: "Twi",
        userInfo: "User ID: 2468"
      },
      {
        id: 407,
        sourceText: "The meeting will start at 10 AM sharp.",
        targetText: "Takpekpea adze le ŋdi ga 10 me pɛpɛpɛ.",
        sourceLanguage: "English",
        targetLanguage: "Ewe",
        language: "Ewe",
        userInfo: "User ID: 1357"
      },
      {
        id: 408,
        sourceText: "Can you help me with this translation?",
        targetText: "Unaweza kunisaidia na tafsiri hii?",
        sourceLanguage: "English",
        targetLanguage: "Swahili",
        language: "Swahili",
        userInfo: "User ID: 8642"
      }
    ]
  ];

  // TODO: Fetch tasks from backend based on activeTab and selectedLanguage
  useEffect(() => {
    // Reset indices and state when tab or language changes
    setCurrentTaskIndex(0);
    setCurrentBatchIndex(0);
    setValidations({});
    setRatings({});
    setEditedTranscription("");
    setIsTranscriptionEdited(false);

    // Fetch logic here
    console.log(`Fetching ${activeTab} tasks for language: ${selectedLanguage}`);
    // Placeholder: Update current task based on new filter/tab
    const currentTask = getCurrentTask();
    if (activeTab === 'transcription' && currentTask && 'transcription' in currentTask) {
        setEditedTranscription(currentTask.transcription || '');
    }

  }, [activeTab, selectedLanguage]);

  const getAvailableLanguages = (): string[] => {
    let batches: AnyTaskItem[][];
    switch (activeTab) {
      case 'asr': batches = asrTaskBatches; break;
      case 'tts': batches = ttsTaskBatches; break;
      case 'transcription': batches = transcriptionTaskBatches; break;
      default: batches = [];
    }
    return Array.from(new Set(batches.flat().map(task => task.language as string)));
  };

  const getFilteredTaskBatches = (): AnyTaskItem[][] => {
    if (activeTab === 'asr') {
      return asrTaskBatches.map(batch => 
      selectedLanguage === 'all' 
        ? batch 
          : batch.filter(task => task.language && task.language.toLowerCase() === selectedLanguage)
    ).filter(batch => batch.length > 0);
    } else if (activeTab === 'tts') {
      return ttsTaskBatches.map(batch => 
        selectedLanguage === 'all' 
          ? batch
          : batch.filter(task => task.language && task.language.toLowerCase() === selectedLanguage)
      ).filter(batch => batch.length > 0);
    } else if (activeTab === 'transcription') {
      return transcriptionTaskBatches.map(batch => 
        selectedLanguage === 'all' 
          ? batch
          : batch.filter(task => task.language && task.language.toLowerCase() === selectedLanguage)
      ).filter(batch => batch.length > 0);
    } else if (activeTab === 'translation') {
      return translationTaskBatches.map(batch => 
        selectedLanguage === 'all' 
          ? batch
          : batch.filter(task => task.language && task.language.toLowerCase() === selectedLanguage)
      ).filter(batch => batch.length > 0);
    }
    return [];
  };

  const filteredTaskBatches = getFilteredTaskBatches();
  const availableLanguages = getAvailableLanguages();

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    // Fetching logic is handled by useEffect
  };

  // Generic validation handler for ASR (Approve part)
  const handleApprove = (taskId: number) => {
    setValidations(prev => ({ ...prev, [taskId]: 'approved' }));
    toast({ title: `Task Approved` });
    // TODO: Submit ASR approval result to backend
    console.log(`ASR Task ${taskId} validation: approved`);
    setTimeout(() => {
      handleNextTask();
    }, 500);
  };
  
  // --- Open Rejection Dialog --- 
  const openRejectionDialog = (taskId: number, type: 'asr' | 'tts' | 'transcription' | 'translation') => {
    setRejectionTarget({ taskId, type });
    setIsRejectionDialogOpen(true);
  };
  
  // --- Submit Rejection with Reason --- 
  const handleRejectionSubmit = (reason: string, otherText?: string) => {
    if (!rejectionTarget) return;
    const { taskId, type } = rejectionTarget;

    setValidations(prev => ({ ...prev, [taskId]: 'rejected' }));
    toast({ title: `Task Rejected (Reason: ${reason})`, variant: "destructive" });
    // TODO: Submit rejected status and reason (and otherText if applicable) to backend
    console.log(`Task ${taskId} (${type}) rejected. Reason: ${reason}${otherText ? ": " + otherText : ""}`);

    setIsRejectionDialogOpen(false);
    setRejectionTarget(null);
      handleNextTask();
  };

  // --- Transcription Validation (Approve part) --- 
  const handleTranscriptionChange = (text: string) => {
    setEditedTranscription(text);
    setIsTranscriptionEdited(true);
  };

  const handleApproveTranscription = (taskId: number) => {
    setValidations(prev => ({ ...prev, [taskId]: 'approved' }));
    toast({ title: "Transcription Approved" });
    // TODO: Submit approved transcription (editedTranscription) to backend
    console.log(`Transcription Task ${taskId} approved with text: ${editedTranscription}`);
    setIsTranscriptionEdited(false); // Reset edit state
    handleNextTask();
  };
  
  // --- TTS Validation (Approve part) --- 
  const handleTTSQualityRating = (rating: number, taskId: number) => {
    setRatings(prev => ({ ...prev, [taskId]: rating }));
  };
  
  const handleApproveTTS = (taskId: number) => {
    const rating = ratings[taskId];
    if (rating === undefined) {
      toast({ title: "Please provide a rating before approving", variant: "destructive" });
      return;
    }
    setValidations(prev => ({ ...prev, [taskId]: 'approved' }));
    toast({ title: "TTS Recording Approved" });
    // TODO: Submit approved status and rating to backend
    console.log(`TTS Task ${taskId} approved with rating: ${rating}`);
    handleNextTask();
  };

  // --- Navigation & Submission --- 
  const handleSkipTask = () => {
    toast({
      title: "Task skipped",
      description: "Moving to the next task."
    });
    handleNextTask();
  };
  
  const handleNextTask = () => {
    if (filteredTaskBatches.length === 0) return;
    const currentBatch = filteredTaskBatches[currentBatchIndex];
    if (!currentBatch) return;
    
    if (currentTaskIndex < currentBatch.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else if (currentBatchIndex < filteredTaskBatches.length - 1) {
      setCurrentBatchIndex(prev => prev + 1);
      setCurrentTaskIndex(0);
      toast({ title: "New batch started" });
    } else {
      handleSubmitBatch();
    }

    // Reset specific states for the next task
    setIsTranscriptionEdited(false);
    const nextTask = getCurrentTask(currentTaskIndex + 1, currentBatchIndex); // Get potential next task
    if (activeTab === 'transcription' && nextTask && 'transcription' in nextTask) {
        setEditedTranscription(nextTask.transcription || '');
    } else {
        setEditedTranscription('');
    }

  };
  
  const handleSubmitBatch = () => {
    setIsSubmitting(true);
    // TODO: Consolidate validation results (validations, ratings, edited transcriptions) and submit to backend
    console.log("Submitting batch results:", { validations, ratings });
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Batch submitted",
        description: "Your validations have been submitted successfully.",
      });
      
      const nextBatchIndex = currentBatchIndex + 1;
      if (nextBatchIndex < filteredTaskBatches.length) {
        setCurrentBatchIndex(nextBatchIndex);
        setCurrentTaskIndex(0);
        setValidations({}); // Clear validations for new batch
        setRatings({}); // Clear ratings for new batch
        // Fetch data for the new batch (if needed, or handled by useEffect)
        const nextTask = getCurrentTask(0, nextBatchIndex);
        if (activeTab === 'transcription' && nextTask && 'transcription' in nextTask) {
            setEditedTranscription(nextTask.transcription || '');
        } else {
            setEditedTranscription('');
        }
      } else {
        navigate('/dashboard');
      }
    }, 1500);
  };
  
  const getCurrentTask = (taskIndex = currentTaskIndex, batchIndex = currentBatchIndex): AnyTaskItem | null => {
    if (filteredTaskBatches.length === 0 || !filteredTaskBatches[batchIndex] || !filteredTaskBatches[batchIndex][taskIndex]) {
      return null; // No task available
    }
    return filteredTaskBatches[batchIndex][taskIndex];
  };

  const currentTask = getCurrentTask();
  
  const togglePlayback = (taskId: number) => {
    const audioId = `${activeTab}-${taskId}`;
    const audio = audioRefs.current[audioId];
    if (audio) {
    if (isPlaying[taskId]) {
        audio.pause();
    } else {
        // Pause other playing audio (if any)
        Object.keys(audioRefs.current).forEach(key => {
            if(key !== audioId && audioRefs.current[key]) {
                audioRefs.current[key]?.pause();
        }
      });
        // Reset isPlaying state for all other audios
        setIsPlaying(prev => Object.keys(prev).reduce((acc, key) => ({...acc, [key]: false}), {}));
        
        // Ensure playback rate is set before playing
        audio.playbackRate = audioPlaybackRates[taskId] || 1.0;
        // Start playing
        audio.play().catch(e => console.error("Error playing audio:", e));
      }
      // State update for isPlaying is handled by event listeners now
    }
  };

  const handleRateChange = (taskId: number, rateStr: string) => {
    const rate = parseFloat(rateStr);
    const audioId = `${activeTab}-${taskId}`;
    const audio = audioRefs.current[audioId];
    if (audio) {
      audio.playbackRate = rate;
      // State update handled by 'ratechange' listener
    }
  };

  const handleSeek = (taskId: number, value: number[]) => {
     const newTime = value[0];
     // Update visual slider state immediately
     setAudioCurrentTimes(prev => ({ ...prev, [taskId]: newTime }));
     // Actual seek happens on commit
  };

  const handleSeekCommit = (taskId: number, value: number[]) => {
      const newTime = value[0];
      const audioId = `${activeTab}-${taskId}`;
      const audio = audioRefs.current[audioId];
      if (audio) {
         audio.currentTime = newTime;
      }
      setIsSeeking(prev => ({ ...prev, [taskId]: false })); // Allow timeupdate listener to resume
  }
  
  const handlePointerDown = (taskId: number) => {
      setIsSeeking(prev => ({ ...prev, [taskId]: true })); // Set seeking flag
  }

  const seekRelative = (taskId: number, delta: number) => {
      const audioId = `${activeTab}-${taskId}`;
      const audio = audioRefs.current[audioId];
      const duration = audioDurations[taskId] || 0;
      if (audio) {
         const newTime = Math.max(0, Math.min(duration, audio.currentTime + delta));
         audio.currentTime = newTime;
         setAudioCurrentTimes(prev => ({ ...prev, [taskId]: newTime })); // Update UI state
      }
  }

  // --- Updated useEffect for Audio Refs & Listeners --- 
  useEffect(() => {
    if (!currentTask) return;

    const taskId = currentTask.id;
    const audioId = `${activeTab}-${taskId}`;
    let audioSrc = '';
    if ('recordingUrl' in currentTask) audioSrc = currentTask.recordingUrl;
    if ('audioUrl' in currentTask) audioSrc = currentTask.audioUrl;

    if (audioSrc && !audioRefs.current[audioId]) {
      console.log(`Creating new Audio element for ${audioId}`);
      const audio = new Audio(audioSrc);
      audioRefs.current[audioId] = audio;
      
      // Set initial state if not already set
      if (audioPlaybackRates[taskId] === undefined) {
         setAudioPlaybackRates(prev => ({ ...prev, [taskId]: 1.0 }));
      }
      if (audioCurrentTimes[taskId] === undefined) {
         setAudioCurrentTimes(prev => ({ ...prev, [taskId]: 0 }));
      }
      audio.playbackRate = audioPlaybackRates[taskId] || 1.0;

      // --- Attach Listeners --- 
      const handleLoadedMetadata = () => {
          console.log(`Loaded metadata for ${audioId}: Duration=${audio.duration}`);
          setAudioDurations(prev => ({ ...prev, [taskId]: audio.duration }));
          // Set current time to 0 if duration loads/reloads
          setAudioCurrentTimes(prev => ({ ...prev, [taskId]: 0 })); 
      };
      const handleTimeUpdate = () => {
          // Only update if not currently seeking this specific audio
          if (!isSeeking[taskId]) { 
             setAudioCurrentTimes(prev => ({ ...prev, [taskId]: audio.currentTime }));
          }
      };
      const handlePlay = () => setIsPlaying(prev => ({ ...prev, [taskId]: true }));
      const handlePause = () => setIsPlaying(prev => ({ ...prev, [taskId]: false }));
      const handleEnded = () => {
          setIsPlaying(prev => ({ ...prev, [taskId]: false }));
          // Optional: Reset time to 0 on end
          // setAudioCurrentTimes(prev => ({ ...prev, [taskId]: 0 })); 
  };
      const handleRateChange = () => setAudioPlaybackRates(prev => ({ ...prev, [taskId]: audio.playbackRate }));

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('ratechange', handleRateChange);
      
      // --- Cleanup function for this specific audio element --- 
      return () => {
          console.log(`Cleaning up audio listeners for ${audioId}`);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('pause', handlePause);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('ratechange', handleRateChange);
          // Pause and remove ref on cleanup
          audio.pause();
          delete audioRefs.current[audioId];
      };
    }
  }, [currentTask, activeTab]); // Re-run when task or tab changes

  // Cleanup all remaining audio on component unmount
  useEffect(() => {
      return () => {
          Object.values(audioRefs.current).forEach(audio => audio?.pause());
          audioRefs.current = {};
      }
  }, []);

  // --- Rendering Functions --- 
  const renderStars = (taskId: number, count: number, selectedRating: number | undefined) => {
    return (
      <div className="flex space-x-1">
        {[...Array(count)].map((_, i) => (
          <button key={i} onClick={() => handleTTSQualityRating(i + 1, taskId)}>
            <Star
              className={`h-6 w-6 ${selectedRating && i < selectedRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderTaskContent = () => {
    if (!currentTask) return null; 
    const taskId = currentTask.id;
    const validationStatus = validations[taskId];
    const duration = audioDurations[taskId] || 0;
    const currentTime = audioCurrentTimes[taskId] || 0;
    const rate = audioPlaybackRates[taskId] || 1.0;

    // Common Audio Player UI function
    const renderAudioPlayer = (src: string | undefined) => {
        if (!src) return null;
  return (
            <div className="p-4 bg-gray-50 rounded-md border space-y-3">
                 {/* Controls Row */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="icon" onClick={() => togglePlayback(taskId)} aria-label={isPlaying[taskId] ? "Pause" : "Play"} disabled={duration === 0}>
                        {isPlaying[taskId] ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
                    <Button variant="outline" size="icon" onClick={() => seekRelative(taskId, -5)} aria-label="Rewind 5 seconds" disabled={duration === 0}>
                        <Rewind className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => seekRelative(taskId, 5)} aria-label="Forward 5 seconds" disabled={duration === 0}>
                        <FastForward className="h-5 w-5" />
                    </Button>
                    <div className="text-sm font-mono text-muted-foreground min-w-[100px] text-center">
                        {formatTime(currentTime)} / {formatTime(duration)}
        </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Label htmlFor={`rate-${taskId}`} className="text-sm">Speed:</Label>
                        <Select value={rate.toString()} onValueChange={(r) => handleRateChange(taskId, r)}>
                            <SelectTrigger id={`rate-${taskId}`} className="w-[80px] h-9">
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
                        </div>
                {/* Progress Slider */}
                <Slider
                    value={[currentTime]}
                    max={duration}
                    step={0.1}
                    disabled={duration === 0}
                    onValueChange={(v) => handleSeek(taskId, v)}
                    onValueCommit={(v) => handleSeekCommit(taskId, v)}
                    onPointerDown={() => handlePointerDown(taskId)}
                    className="w-full cursor-pointer pt-1"
                />
                        </div>
        );
    };

    return (
            <Card className="border-none shadow-md mt-4">
              <CardHeader className="bg-gray-50 border-b pb-3">
                <div className="flex justify-between items-center">
             <h2 className="text-lg font-medium">
                Task #{taskId}
             </h2>
             <span className="text-xs text-gray-500">Batch {currentBatchIndex + 1} - Task {currentTaskIndex + 1} {currentTask.userInfo ? `(${currentTask.userInfo})` : ''}</span>
                </div>
              </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* ASR Validation */}
          {activeTab === 'asr' && 'imageUrl' in currentTask && 'recordingUrl' in currentTask && (
            <div className="space-y-4">
              <p>Listen to the recording and verify if it accurately describes the image.</p>
              <img src={currentTask.imageUrl} alt="ASR Task Image" className="rounded-md max-h-60 w-auto mx-auto border" />
              {renderAudioPlayer(currentTask.recordingUrl)}
              <div className="flex justify-center space-x-4 pt-4 border-t">
                <Button variant="destructive" size="lg" onClick={() => openRejectionDialog(taskId, 'asr')} disabled={!!validationStatus}>
                  <ThumbsDown className="mr-2 h-5 w-5" /> Reject
                          </Button>
                <Button variant="default" size="lg" onClick={() => handleApprove(taskId)} disabled={!!validationStatus}>
                  <ThumbsUp className="mr-2 h-5 w-5" /> Approve
                    </Button>
                  </div>
                        </div>
          )}

          {/* TTS Validation */}
          {activeTab === 'tts' && 'text' in currentTask && 'recordingUrl' in currentTask && (
             <div className="space-y-4">
               <p>Listen to the recording and rate its quality based on the provided text.</p>
               <div className="bg-gray-50 p-4 rounded border">
                 <p className="text-lg font-medium">{currentTask.text}</p>
                          </div>
               {renderAudioPlayer(currentTask.recordingUrl)}
               <div className="flex flex-col items-center space-y-3 pt-4 border-t">
                 <p className="font-medium">Rate pronunciation & clarity:</p>
                 {renderStars(taskId, 5, ratings[taskId])}
                 <div className="flex justify-center space-x-4 pt-4 w-full">
                    <Button variant="destructive" onClick={() => openRejectionDialog(taskId, 'tts')} disabled={!!validationStatus}>
                      <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                            </Button>
                    <Button variant="default" onClick={() => handleApproveTTS(taskId)} disabled={!!validationStatus || ratings[taskId] === undefined}>
                      <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                            </Button>
                          </div>
                          </div>
                        </div>
          )}

          {/* Transcription Validation */}
          {activeTab === 'transcription' && 'audioUrl' in currentTask && 'transcription' in currentTask && (
            <div className="space-y-4">
              <p>Listen to the audio and verify/correct the transcription below.</p>
              {renderAudioPlayer(currentTask.audioUrl)}
              <TranscriptionEditor
                key={taskId}
                audioSrc={currentTask.audioUrl}
                initialText={currentTask.transcription}
                onTextChange={handleTranscriptionChange}
                language={currentTask.language}
              />
              <div className="flex justify-center space-x-4 pt-4 border-t">
                <Button variant="destructive" onClick={() => openRejectionDialog(taskId, 'transcription')} disabled={!!validationStatus}>
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                          </Button>
                <Button variant="default" onClick={() => handleApproveTranscription(taskId)} disabled={!!validationStatus || editedTranscription.trim() === ''}>
                  <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                            </Button>
                          </div>
                        </div>
          )}

          {/* Translation Validation */}
          {activeTab === 'translation' && 'sourceText' in currentTask && 'targetText' in currentTask && (
            <div className="space-y-4">
              <p>Review the translation for accuracy and clarity.</p>
              
              {/* Original text display */}
              <div className="space-y-2">
                <Label className="font-medium">Source Text ({currentTask.sourceLanguage}):</Label>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-900">
                  {currentTask.sourceText}
                </div>
                          </div>
                          
              {/* Translation display and edit */}
              <div className="space-y-2">
                <Label className="font-medium">Translation ({currentTask.targetLanguage}):</Label>
                <Textarea
                  value={isTranslationEdited ? editedTranslation : currentTask.targetText}
                  onChange={(e) => handleTranslationChange(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500">
                  Edit the translation if needed to correct any issues.
                </p>
                        </div>

              {/* Audio playback (if available) */}
              {'audioUrl' in currentTask && currentTask.audioUrl && (
                <div className="space-y-2">
                  <Label className="font-medium">Audio Pronunciation:</Label>
                  {renderAudioPlayer(currentTask.audioUrl)}
                        </div>
              )}
              
              {/* Feedback field */}
              <div className="space-y-2">
                <Label htmlFor="translation-feedback" className="font-medium">Feedback (Optional):</Label>
                <Textarea
                  id="translation-feedback"
                  placeholder="Provide feedback for the translator..."
                  value={translationFeedback[taskId] || ''}
                  onChange={(e) => handleTranslationFeedbackChange(taskId, e.target.value)}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
                        </div>
                        
              {/* Action buttons */}
              <div className="flex justify-center space-x-4 pt-4 border-t">
                          <Button
                  variant="destructive" 
                  onClick={() => openRejectionDialog(taskId, 'translation')} 
                  disabled={!!validationStatus}
                >
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                          </Button>
                            <Button 
                  variant="default" 
                  onClick={() => handleApproveTranslation(taskId)} 
                  disabled={!!validationStatus || (isTranslationEdited && editedTranslation.trim() === '')}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                            </Button>
                          </div>
                        </div>
          )}

          {/* Show validation status if task has been validated */}
          {validationStatus && (
            <div className={`text-center p-3 rounded ${
              validationStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {validationStatus === 'approved' ? 'Task Approved ✓' : 'Task Rejected ✗'}
                          </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // New handler for the translation text change
  const handleTranslationChange = (text: string) => {
    setEditedTranslation(text);
    setIsTranslationEdited(true);
  };

  // New handler for feedback on the translation
  const handleTranslationFeedbackChange = (taskId: number, feedback: string) => {
    setTranslationFeedback(prev => ({ ...prev, [taskId]: feedback }));
  };

  // New handler for approving translations
  const handleApproveTranslation = (taskId: number) => {
    const task = getCurrentTask() as TranslationTaskItem;
    if (!task) return;

    // Store the edited translation if it was changed
    const translationToSave = isTranslationEdited ? editedTranslation : task.targetText;
    console.log(`Approving translation for task ${taskId}, text: ${translationToSave}, feedback: ${translationFeedback[taskId] || 'None'}`);

    setValidations(prev => ({ ...prev, [taskId]: 'approved' }));
    toast({
      title: "Translation Approved",
      description: "Moving to the next task..."
    });
    handleNextTask();
  };

  // Get rejection reasons based on the task type
  const getRelevantRejectionReasons = () => {
    if (!rejectionTarget) return asrRejectionReasons;
    
    switch (rejectionTarget.type) {
      case 'asr':
        return asrRejectionReasons;
      case 'tts':
        return ttsRejectionReasons;
      case 'transcription':
        return transcriptionRejectionReasons;
      case 'translation':
        return translationRejectionReasons;
      default:
        return asrRejectionReasons;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
                            </Button>
        <h1 className="text-xl font-bold">Validation Tasks</h1>
                        </div>
                        
      {/* Task type tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setCurrentTaskIndex(0);
          setCurrentBatchIndex(0);
          setValidations({});
          setRatings({});
          setEditedTranscription("");
          setEditedTranslation("");
          setIsTranscriptionEdited(false);
          setIsTranslationEdited(false);
          setTranslationFeedback({});
        }}
        className="w-full mb-6"
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="asr">ASR</TabsTrigger>
            <TabsTrigger value="tts">TTS</TabsTrigger>
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
            <TabsTrigger value="translation">Translation</TabsTrigger>
          </TabsList>

          <LanguageFilter
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            availableLanguages={getAvailableLanguages()}
                          />
                        </div>
                        
        {/* No tasks available message */}
        {!currentTask && (
          <Card className="border-none shadow-md mt-4">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">No tasks available</h3>
                <p className="text-gray-500">There are no {activeTab} validation tasks matching your current filter.</p>
                          <Button
                            variant="outline"
                  onClick={() => setSelectedLanguage('all')}
                  className="mt-4"
                          >
                  Show all languages
                          </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <TabsContent value="asr">
          {currentTask && renderTaskContent()}
        </TabsContent>
        
        <TabsContent value="tts">
          {currentTask && renderTaskContent()}
        </TabsContent>
        
        <TabsContent value="transcription">
          {currentTask && renderTaskContent()}
        </TabsContent>
        
        <TabsContent value="translation">
          {currentTask && renderTaskContent()}
        </TabsContent>
      </Tabs>

      {/* Batch navigation */}
      {currentTask && (
        <div className="flex justify-end mt-6 space-x-4">
          <Button variant="outline" onClick={handleSkipTask} disabled={!currentTask || isSubmitting}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip Task
          </Button>
          <Button onClick={handleSubmitBatch} disabled={isSubmitting || (!currentTask && Object.keys(validations).length === 0)}>
            {isSubmitting ? 'Submitting...' : 'Submit All Validations'}
                            </Button>
                          </div>
      )}

      {/* Rejection dialog */}
      <RejectionReasonDialog
        isOpen={isRejectionDialogOpen}
        onOpenChange={setIsRejectionDialogOpen}
        reasons={getRelevantRejectionReasons()}
        onSubmit={handleRejectionSubmit}
      />
        </div>
  );
};

export default ValidateTask;
