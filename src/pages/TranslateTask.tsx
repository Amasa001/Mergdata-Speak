import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardDescription, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, SkipForward, Check, Languages, Loader2, Save, Info } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { LanguageFilter } from '@/components/tasks/LanguageFilter';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Define the expected structure of the content field for Translation tasks
interface TranslationTaskContent {
  // Standard fields
  task_title?: string;
  task_description?: string;
  source_text?: string;
  source_language?: string;
  domain?: string;
  
  // Alternative field names
  title?: string;
  sourceText?: string;
  sourceLanguage?: string;
  target_language?: string;
  batch_name?: string;
}

// Define a proper task interface that doesn't extend the Database type directly
interface TranslationTaskWithContributions {
  id: number;
  language: string;
  content: any; // Using any for now since we cast it later
  type: string;
  status: string;
  created_at: string;
  created_by: string;
  priority: string;
  batch_id?: string;
  assigned_to?: string;
  contributions?: Array<{
    id: number;
    status: string;
    submitted_data: any;
    validations?: Array<{
      id: number;
      is_approved: boolean;
      comment: string;
      validator_id: string;
      created_at: string;
    }>;
  }>;
  previousTranslation?: string;
  revision_count?: number;
}

// Define the structure for tasks fetched from the DB
type Task = Database['public']['Tables']['tasks']['Row'];

// Define the structure the component uses internally
interface MappedTranslationTask {
  id: number;
  title: string;
  description?: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string; // This comes from the main task.language field
  previousTranslation?: string;
  revisionCount?: number;
  domain?: string;
}

// --- Special Characters Map ---
const specialCharsMap: Record<string, string[]> = {
  'akan': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ŋ', 'Ŋ'],
  'ewe': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ɖ', 'Ɖ', 'ƒ', 'Ƒ', 'ɣ', 'Ɣ', 'ŋ', 'Ŋ', 'ʋ', 'Ʋ'],
  'ga': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ŋ', 'Ŋ'],
  'fante': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ'], // Example, refine as needed
  'dagbani': ['ɛ', 'Ɛ', 'ɔ', 'Ɔ', 'ɣ', 'Ɣ', 'ŋ', 'Ŋ', 'ʒ', 'Ʒ'] 
};

const TranslateTask: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [translations, setTranslations] = useState<Record<number, { text: string, taskId: number }>>({});
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('all'); // Target language filter
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [allTasks, setAllTasks] = useState<MappedTranslationTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<MappedTranslationTask[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [wasTaskSkipped, setWasTaskSkipped] = useState(false);
  const translationInputRef = useRef<HTMLTextAreaElement>(null);
  const [userLanguages, setUserLanguages] = useState<string[]>([]);
  const [revisionFeedback, setRevisionFeedback] = useState<string>('');

  // Parse URL query parameters for language filter
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const languageParam = queryParams.get('language');
    
    if (languageParam) {
      console.log(`Setting language filter from URL: ${languageParam}`);
      setSelectedLanguage(languageParam.toLowerCase());
    }
  }, [location]);

  // Fetch User ID and Languages
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Also fetch user's profile to get preferred languages
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('languages')
          .eq('id', user.id)
          .single();
          
        if (!profileError && profileData && profileData.languages) {
          setUserLanguages(profileData.languages);
        }
      } else {
        setUserId(null);
      }
    };
    fetchUserProfile();
  }, []);

  // Fetch tasks from Supabase
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoadingTasks(true);
      setAllTasks([]);
      setFilteredTasks([]);
      setCurrentTaskIndex(0);
      setTranslations({});
      setCurrentTranslation('');

      try {
        if (!userId) {
          console.error("Cannot fetch tasks: User ID is null");
          return;
        }
        
        // Create base query for all available tasks
        let tasksQuery = supabase
          .from('tasks')
          .select('*, contributions(*)')
          .eq('type', 'translation')
          .eq('status', 'pending');
        
        // Apply language filter if needed, using case-insensitive comparison
        if (selectedLanguage !== 'all') {
          tasksQuery = tasksQuery.ilike('language', selectedLanguage);
        }
        
        // Execute the query
        const { data: availableTasks, error: tasksError } = await tasksQuery;

        if (tasksError) {
          console.error("Error fetching Translation tasks:", tasksError);
          throw tasksError;
        }
        
        console.log("Available tasks fetched:", availableTasks?.length || 0);
        console.log("Selected language:", selectedLanguage);
        
        if (availableTasks && availableTasks.length > 0) {
          // Extract unique TARGET languages, preserving original case
          const languages = Array.from(
            new Set(
              availableTasks
                .map(task => task.language)
                .filter((l): l is string => l !== null && l !== undefined && l.trim() !== '')
            )
          );
          setAvailableLanguages(languages);

          // Map tasks to display format
          const mappedTasks: MappedTranslationTask[] = availableTasks.reduce((acc: MappedTranslationTask[], task) => {
            const content = task.content as unknown as Partial<TranslationTaskContent>;
            
            if (content && typeof content === 'object' && 
                typeof (content.task_title || content.title) === 'string' &&
                typeof (content.source_text || content.sourceText) === 'string' &&
                typeof (content.source_language || content.sourceLanguage) === 'string' &&
                (task.language || content.target_language)) {
              
              acc.push({
                id: task.id,
                title: content.task_title || content.title || '',
                description: content.task_description || '',
                sourceText: content.source_text || content.sourceText || '',
                sourceLanguage: content.source_language || content.sourceLanguage || 'English',
                targetLanguage: task.language || content.target_language || '',
                domain: content.domain || content.batch_name || 'general'
              });
            }
            return acc;
          }, []);
          
          setAllTasks(mappedTasks);
          setFilteredTasks(mappedTasks);
        } else {
          setAvailableLanguages([]);
          setAllTasks([]);
          setFilteredTasks([]);
        }
      } catch (err) {
        console.error(err);
        toast({ 
          title: "Error", 
          description: "Failed to load Translation tasks. Please try again later.", 
          variant: "destructive" 
        });
      } finally {
        setIsLoadingTasks(false);
      }
    };
    
    if (userId) {
      fetchTasks();
    }
  }, [userId, selectedLanguage]);

  const handleLanguageChange = (language: string) => {
    // Convert to lowercase for internal state, but display will preserve original case
    setSelectedLanguage(language.toLowerCase());
  };

  // Update current translation text
  const handleTranslationChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrentTranslation(event.target.value);
  };

  // --- Function to Insert Special Character ---
  const insertSpecialChar = (char: string) => {
      // Simple append for now
      setCurrentTranslation(prev => prev + char);
      // Focus the textarea after insertion
      translationInputRef.current?.focus();
      
      // TODO: Implement cursor position insertion if needed later
      // const textarea = translationInputRef.current;
      // if (textarea) {
      //   const start = textarea.selectionStart;
      //   const end = textarea.selectionEnd;
      //   const text = textarea.value;
      //   const newText = text.substring(0, start) + char + text.substring(end);
      //   setCurrentTranslation(newText);
      //   // Set cursor position after insertion
      //   setTimeout(() => {
      //      textarea.selectionStart = textarea.selectionEnd = start + char.length;
      //   }, 0);
      // }
  };

  // "Save" the current input text to the translations state for submission later
  const handleSaveTranslation = () => {
      const currentTask = getCurrentTask();
      if (!currentTask || !currentTranslation.trim()) {
          toast({ title: "Input required", description: "Please enter a translation before saving.", variant: "destructive"});
          return;
      }
      setTranslations(prev => ({
          ...prev,
          [currentTask.id]: { text: currentTranslation, taskId: currentTask.id }
      }));
      toast({ title: "Translation Saved", description: `Translation for Task ${currentTask.id} ready for submission.` });
  };

  const handleSkipTask = () => {
    toast({ title: "Task Skipped" });
    setWasTaskSkipped(true);
    handleNextTask(true);
  };
  
  const handleNextTask = (skipped = false) => {
    if (filteredTasks.length === 0) return;

    const currentTask = getCurrentTask();
    // If there's text entered but not saved, save it before moving next
    if (currentTask && currentTranslation.trim() && !translations[currentTask.id]) {
       handleSaveTranslation(); 
    }

    setCurrentTranslation(''); // Clear input for the next task
    setWasTaskSkipped(skipped);

    if (currentTaskIndex < filteredTasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      // Last task
       const finalTranslations = { ...translations };
       // Final check if current input needs saving
       if (currentTask && currentTranslation.trim() && !finalTranslations[currentTask.id]) {
          finalTranslations[currentTask.id] = { text: currentTranslation, taskId: currentTask.id };
       }
       
      if (Object.keys(finalTranslations).length > 0) {
         handleSubmitBatch(finalTranslations);
      } else {
         toast({ title: "All tasks viewed", description: "No translations saved.", variant: "default" });
         // navigate('/dashboard');
      }
    }
  };
  
  const handleSubmitBatch = async (translationsToSubmit: Record<number, { text: string, taskId: number }>) => {
    if (Object.keys(translationsToSubmit).length === 0 || !userId) {
       toast({ title: "No translations", description: "Enter and save at least one translation to submit.", variant: "destructive"});
       return;
    }

    setIsSubmitting(true);
    toast({ title: "Submitting...", description: "Saving your translations." });

    const submissionPromises = Object.values(translationsToSubmit).map(async ({ text, taskId }) => {
      const task = allTasks.find(t => t.id === taskId);
      let existingContributionId: number | null = null;
      let isRevision = false;
      
      // Check if this is a revision of an existing contribution
      if (task?.revisionCount && task.revisionCount > 0) {
        // Get the existing contribution ID for this task and user, specifically the rejected one
        const { data: existingContribution, error: fetchError } = await supabase
          .from('contributions')
          .select('id')
          .eq('task_id', taskId)
          .eq('user_id', userId)
          .eq('status', 'rejected')
          .single();
        
        // Log if there was an error fetching the specific rejected contribution
        if (fetchError && fetchError.code !== 'PGRST116') { // Ignore 'PGRST116' (0 rows) 
             console.error(`Error fetching existing rejected contribution for task ${taskId}:`, fetchError);
        }

        if (existingContribution) {
          existingContributionId = existingContribution.id;
          isRevision = true;
        } else {
           // Log if no rejected contribution was found, will proceed to insert
           console.warn(`Task ${taskId} marked as revision, but no existing contribution with status 'rejected' found for user ${userId}. Inserting new.`);
        }
      }
      
      if (isRevision && existingContributionId) {
        // Update the existing contribution
        const { error: updateError } = await supabase
          .from('contributions')
          .update({
            submitted_data: { translation_text: text },
            status: 'pending_validation'
          })
          .eq('id', existingContributionId);
        
        if (updateError) throw new Error(`Failed to update contribution for task ${taskId}: ${updateError.message}`);
      } else {
        // Insert new contribution
        const { error: insertError } = await supabase
          .from('contributions') 
          .insert({
            task_id: taskId,
            user_id: userId,
            submitted_data: { translation_text: text }, // Store text in JSONB
            storage_url: null, // No file storage for translations
            status: 'pending_validation'
          });
        
        if (insertError) throw new Error(`Failed to save contribution record for task ${taskId}: ${insertError.message}`);
      }
      
      // Update task status to assigned
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({ 
          status: 'assigned', 
          assigned_to: userId 
        })
        .eq('id', taskId);
      
      if (taskUpdateError) console.error(`Failed to update task status: ${taskUpdateError.message}`);
      
      return { taskId, success: true };
    });

    try {
        const results = await Promise.allSettled(submissionPromises);
        const successfulSubmissions = results.filter(r => r.status === 'fulfilled').length;
        const failedSubmissions = results.filter(r => r.status === 'rejected');

        if (failedSubmissions.length > 0) {
            console.error("Failed submissions:", failedSubmissions);
            toast({ title: "Submission Issue", description: `${failedSubmissions.length} translation(s) failed to submit.`, variant: "destructive" });
        } else {
             toast({ title: "Batch Submitted!", description: `Successfully submitted ${successfulSubmissions} translation(s). Thank you!`, variant: "default" });
        }
        
        setTranslations({});
        setCurrentTranslation('');
        navigate('/dashboard'); 

    } catch (error: any) {
        console.error("Error during batch submission:", error);
        toast({ title: "Submission Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const getCurrentTask = (): MappedTranslationTask | null => {
    if (isLoadingTasks || filteredTasks.length === 0 || currentTaskIndex >= filteredTasks.length) {
      return null; 
    }
    return filteredTasks[currentTaskIndex];
  };
  
  const currentTask = getCurrentTask();
  const tasksInCurrentSet = filteredTasks.length;

  const noTasksAvailable = !isLoadingTasks && filteredTasks.length === 0;
  const isLastTask = currentTaskIndex === tasksInCurrentSet - 1;
  const isCurrentTaskSaved = currentTask ? !!translations[currentTask.id] : false;

  // Get special characters for the current target language
  const currentSpecialChars = currentTask ? specialCharsMap[currentTask.targetLanguage.toLowerCase()] || [] : [];

  // Load saved translation when task changes
  useEffect(() => {
      if (currentTask && translations[currentTask.id]) {
          setCurrentTranslation(translations[currentTask.id].text);
      } else if (currentTask) {
          setCurrentTranslation(''); // Clear for new task
      }
  }, [currentTask, translations]);

  // --- Render Logic ---
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold ml-2">Translation Task</h1>
        <div className="ml-auto">
           <LanguageFilter 
             availableLanguages={availableLanguages} 
             selectedLanguage={selectedLanguage} 
             onLanguageChange={handleLanguageChange} 
            />
        </div>
      </div>

      {isLoadingTasks ? (
         <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading Translation tasks...</p>
        </div>
      ) : noTasksAvailable ? (
          <Card className="text-center py-10">
              <CardHeader>
                  <CardTitle>No Tasks Available</CardTitle>
                  <CardDescription>There are currently no Translation tasks matching your selected language '{selectedLanguage}'.</CardDescription>
              </CardHeader>
          </Card>
      ) : currentTask ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{currentTask.title} ({currentTaskIndex + 1}/{tasksInCurrentSet})</CardTitle>
                    <CardDescription>{currentTask.description || `Translate the text below from ${currentTask.sourceLanguage} to ${currentTask.targetLanguage}`}</CardDescription>
                    <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">From: {currentTask.sourceLanguage}</Badge>
                        <Badge variant="outline">To: {currentTask.targetLanguage}</Badge>
                    </div>
                </div>
                 <Button variant="outline" size="sm" onClick={handleSkipTask} disabled={isSubmitting}>
                     Skip Task <SkipForward className="h-4 w-4 ml-1" />
                 </Button>
            </div>
             <Progress value={((currentTaskIndex + 1) / tasksInCurrentSet) * 100} className="mt-4 h-2" />
          </CardHeader>
          
          <CardContent className="grid md:grid-cols-2 gap-6">
             {/* Source Text */}
             <div className="space-y-2">
                <Label htmlFor="source-text" className="text-base">Source Text ({currentTask.sourceLanguage})</Label>
                <Card className="bg-gray-50 p-4 min-h-[200px]">
                    <p id="source-text" className="text-gray-700 whitespace-pre-wrap">{currentTask.sourceText}</p>
                </Card>
             </div>
             
             {/* Translation Input Area */} 
             <div className="space-y-2 flex flex-col">
                 <Label htmlFor="translation-input" className="text-base">Your Translation ({currentTask.targetLanguage})</Label>
                 <Textarea 
                    ref={translationInputRef}
                    id="translation-input"
                    placeholder={`Enter your translation in ${currentTask.targetLanguage}...`}
                    value={currentTranslation}
                    onChange={handleTranslationChange}
                    rows={8}
                    className="flex-grow resize-none"
                    disabled={isSubmitting || isCurrentTaskSaved}
                 />
                 
                 {/* Special Character Buttons */} 
                 {currentSpecialChars.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs text-gray-500 mr-2">Insert:</span>
                      {currentSpecialChars.map(char => (
                          <Button 
                             key={char} 
                             variant="outline"
                             size="sm"
                             className="font-mono mr-1 px-2 py-0.5 h-auto text-sm" 
                             onClick={() => insertSpecialChar(char)}
                             disabled={isSubmitting || isCurrentTaskSaved}
                           >
                              {char}
                          </Button>
                      ))}
                    </div>
                 )}
                 
                 {/* Save Button Area */}
                 <div className="flex justify-end mt-2">
                   {isCurrentTaskSaved ? (
                       <div className="text-sm text-green-600 flex items-center">
                           <Check className="h-4 w-4 mr-1"/> Saved for submission
                       </div>
                   ) : (
                       <Button variant="outline" size="sm" onClick={handleSaveTranslation} disabled={!currentTranslation.trim() || isSubmitting}>
                          <Save className="h-4 w-4 mr-1"/> Save Translation
                       </Button>
                   )}
                 </div>
             </div>
          </CardContent>
           <CardFooter className="flex justify-end border-t pt-4">
                 <Button 
                    size="lg"
                    onClick={() => handleNextTask()} 
                    disabled={isSubmitting || (!isCurrentTaskSaved && !currentTranslation.trim() && !wasTaskSkipped)} 
                 >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLastTask ? (Object.keys(translations).length > 0 || currentTranslation.trim() ? 'Submit Batch' : 'Finish') : 'Next Task'}
                 </Button>
            </CardFooter>
        </Card>
      ) : (
         <Card className="text-center py-10">
             <CardHeader>
                 <CardTitle>All Tasks Completed</CardTitle>
                 <CardDescription>You have viewed all available Translation tasks.</CardDescription>
             </CardHeader>
              {Object.keys(translations).length > 0 && (
                 <Button onClick={() => handleSubmitBatch(translations)} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                     Submit {Object.keys(translations).length} Translation(s)
                 </Button>
              )}
         </Card>
      )}
    </div>
  );
};

export default TranslateTask; 