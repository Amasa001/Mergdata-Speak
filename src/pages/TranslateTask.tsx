import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LanguageFilter } from '@/components/tasks/LanguageFilter'; // Re-use for filtering
import { TranslationInput } from '@/components/translation/TranslationInput'; // Import the new component
import { ArrowLeft, SkipForward, Check, Languages, Mic, Globe } from 'lucide-react';
import { Label } from "@/components/ui/label"; // Import Label

// Define type for translation tasks
type TranslationTaskItem = {
  id: number;
  sourceText: string;
  targetLanguage: string;
  sourceLanguage: string; // Typically English, but could vary
  userInfo?: string; // Optional user info like in validation
};

// Mock Translation task batches
const translationTaskBatches: TranslationTaskItem[][] = [
  [
    { id: 401, sourceText: "Hello, how are you today?", targetLanguage: "Twi", sourceLanguage: "English", userInfo: "Task ID: TR-101" },
    { id: 402, sourceText: "The weather is very nice this morning.", targetLanguage: "Ewe", sourceLanguage: "English", userInfo: "Task ID: TR-102" },
    { id: 403, sourceText: "Please provide your name and address.", targetLanguage: "Baule", sourceLanguage: "English", userInfo: "Task ID: TR-103" },
    { id: 404, sourceText: "Where is the nearest market?", targetLanguage: "Dioula", sourceLanguage: "English", userInfo: "Task ID: TR-104" },
    { id: 405, sourceText: "I would like to buy some fresh fruits.", targetLanguage: "Yoruba", sourceLanguage: "English", userInfo: "Task ID: TR-105" },
  ],
  [
    { id: 406, sourceText: "This book contains important information.", targetLanguage: "Twi", sourceLanguage: "English", userInfo: "Task ID: TR-106" },
    { id: 407, sourceText: "The meeting will start at 10 AM sharp.", targetLanguage: "Ewe", sourceLanguage: "English", userInfo: "Task ID: TR-107" },
    { id: 408, sourceText: "Can you help me with this translation?", targetLanguage: "Swahili", sourceLanguage: "English", userInfo: "Task ID: TR-108" },
    { id: 409, sourceText: "How much does this cost?", targetLanguage: "Twi", sourceLanguage: "English", userInfo: "Task ID: TR-109" },
    { id: 410, sourceText: "Thank you for your assistance.", targetLanguage: "Yoruba", sourceLanguage: "English", userInfo: "Task ID: TR-110" },
  ],
];

const TranslateTask: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [submissions, setSubmissions] = useState<Record<number, { text: string; audioBlob: Blob | null }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('all'); // For filtering by target language

  // State for the TranslationInput component
  const [currentTranslationText, setCurrentTranslationText] = useState("");
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // TODO: Fetch tasks from backend
  useEffect(() => {
    console.log(`Fetching Translation tasks for language: ${selectedLanguage}`);
    // Reset indices when language changes
    setCurrentTaskIndex(0);
    setCurrentBatchIndex(0);
    setSubmissions({});
    resetInputState();
  }, [selectedLanguage]);

  // Reset input state when task changes
  useEffect(() => {
     resetInputState();
  }, [currentTaskIndex, currentBatchIndex]);

  const resetInputState = () => {
      setCurrentTranslationText("");
      setCurrentAudioBlob(null);
      setIsRecording(false);
      // Note: We don't reset submissions here, only the current input fields
  }

  const getAvailableLanguages = (): string[] => {
    // Get target languages from the mock data
    return Array.from(new Set(translationTaskBatches.flat().map(task => task.targetLanguage)));
  };

  const getFilteredTaskBatches = (): TranslationTaskItem[][] => {
    return translationTaskBatches.map(batch =>
      selectedLanguage === 'all'
        ? batch
        : batch.filter(task => task.targetLanguage && task.targetLanguage.toLowerCase() === selectedLanguage)
    ).filter(batch => batch.length > 0);
  };

  const filteredTaskBatches = getFilteredTaskBatches();
  const availableLanguages = getAvailableLanguages();

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    // Fetching/filtering is handled by useEffect
  };

  const getCurrentTask = (taskIndex = currentTaskIndex, batchIndex = currentBatchIndex): TranslationTaskItem | null => {
    if (filteredTaskBatches.length === 0 || !filteredTaskBatches[batchIndex] || !filteredTaskBatches[batchIndex][taskIndex]) {
      return null; // No task available
    }
    return filteredTaskBatches[batchIndex][taskIndex];
  };

  const currentTask = getCurrentTask();

  const handleNextTask = (submittedTask?: TranslationTaskItem) => {
    if (!currentTask) return;

    // Store submission if provided (i.e., not skipped)
    if (submittedTask) {
        setSubmissions(prev => ({
            ...prev,
            [submittedTask.id]: { text: currentTranslationText, audioBlob: currentAudioBlob }
        }));
        console.log(`Submission for task ${submittedTask.id}:`, { text: currentTranslationText, audioBlob: currentAudioBlob });
    }

    if (filteredTaskBatches.length === 0) return;
    const currentBatch = filteredTaskBatches[currentBatchIndex];
    if (!currentBatch) return;

    if (currentTaskIndex < currentBatch.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else if (currentBatchIndex < filteredTaskBatches.length - 1) {
      setCurrentBatchIndex(prev => prev + 1);
      setCurrentTaskIndex(0);
      toast({ title: "New translation batch started" });
    } else {
      handleSubmitBatch(); // Submit if it was the last task
    }
  };

  const handleSkipTask = () => {
    toast({
      title: "Task skipped",
      description: "Moving to the next translation task."
    });
    handleNextTask(); // Move to next without storing submission
  };

  const handleSubmitTask = () => {
    if (!currentTask) return;
    if (!currentTranslationText.trim() && !currentAudioBlob) {
      toast({
        title: "Input Required",
        description: "Please provide either a written translation or an audio recording.",
        variant: "destructive"
      });
      return;
    }

    toast({ title: "Translation Submitted", description: `Task ${currentTask.id} recorded.` });
    handleNextTask(currentTask); // Move to next and store submission
  };

  const handleSubmitBatch = () => {
    // Check if there are pending submissions before navigating
    if (Object.keys(submissions).length === 0 && currentTask) {
        // If the last task was submitted via handleSubmitTask, submissions are already recorded.
        // If the last task wasn't submitted yet, we might want to prompt or handle it here.
        // For now, assume handleNextTask called this after the last submission or skip.
    }

    setIsSubmitting(true);
    // TODO: Submit all collected submissions (text + audio blobs) to the backend
    console.log("Submitting batch translations:", submissions);
    // Convert blobs to URLs or FormData for actual submission

    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Batch submitted successfully!",
        description: "Your translations have been sent.",
      });
      setSubmissions({}); // Clear submissions after successful batch send
      navigate('/dashboard'); // Go back to dashboard after submitting the final batch
    }, 1500);
  };

  const renderTaskContent = () => {
    if (!currentTask) {
      return (
          <Card className="border-none shadow-md mt-4">
             <CardContent className="p-6">
                 <div className="text-center py-12">
                   <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                   <h3 className="text-xl font-medium text-gray-700 mb-2">No tasks available</h3>
                   <p className="text-gray-500">There are no translation tasks matching your current filter.</p>
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
      );
    }

    return (
        <Card className="border-none shadow-md mt-4">
            <CardHeader className="bg-gray-50 border-b pb-3">
              <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">
                      Translate from {currentTask.sourceLanguage} to {currentTask.targetLanguage}
                  </h2>
                  <span className="text-xs text-gray-500">Batch {currentBatchIndex + 1} - Task {currentTaskIndex + 1} {currentTask.userInfo ? `(${currentTask.userInfo})` : ''}</span>
              </div>
              <CardDescription>Provide both a written translation and an audio recording in {currentTask.targetLanguage}.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {/* Source Text Display */}
                <div className="space-y-2">
                    <Label className="font-semibold">Source Text ({currentTask.sourceLanguage}):</Label>
                    <p className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-900">
                        {currentTask.sourceText}
                    </p>
                </div>

                {/* Translation Input Component */}
                <TranslationInput
                    key={currentTask.id} // Ensure component resets state correctly on task change
                    targetLanguage={currentTask.targetLanguage}
                    text={currentTranslationText}
                    onTextChange={setCurrentTranslationText}
                    audioBlob={currentAudioBlob}
                    onAudioChange={setCurrentAudioBlob}
                    isRecording={isRecording}
                    setIsRecording={setIsRecording}
                />

                {/* Action Buttons per Task */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                     <Button
                       variant="outline"
                       onClick={handleSkipTask}
                       disabled={isSubmitting || isRecording}
                     >
                       <SkipForward className="mr-2 h-4 w-4" /> Skip Task
                    </Button>
                    <Button
                       onClick={handleSubmitTask}
                       disabled={isSubmitting || isRecording || (!currentTranslationText.trim() && !currentAudioBlob)}
                       className="bg-green-600 hover:bg-green-700"
                     >
                       <Check className="mr-2 h-4 w-4" /> Submit Translation
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold flex items-center">
            <Languages className="h-5 w-5 mr-2" /> Translation Tasks
        </h1>
      </div>

      {/* Filters */}
      <div className="flex justify-end items-center mb-6 gap-2">
          <Label className="text-sm font-medium">Filter by Target Language:</Label>
          <LanguageFilter
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              availableLanguages={availableLanguages}
          />
      </div>

      {/* Task Content Area */}
      {renderTaskContent()}

      {/* Batch submission status/button (optional, handled by navigation logic for now) */}
      {isSubmitting && (
          <div className="text-center mt-4 text-blue-600 font-medium">Submitting batch...</div>
      )}

    </div>
  );
};

export default TranslateTask; 