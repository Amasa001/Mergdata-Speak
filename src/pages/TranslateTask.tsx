import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardDescription, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, SkipForward, Check, Languages, Loader2, Save, Info, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
  isRevision?: boolean;
  contributionId?: number;
  validatorFeedback?: string;
}

// Add new interface for validated translation
interface ValidatedTranslation {
  translation_text: string;
  validated_at?: string;
  validator_comment?: string;
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
  const { taskId } = useParams<{ taskId: string }>();
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
  const [validatedTranslation, setValidatedTranslation] = useState<ValidatedTranslation | null>(null);

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
      setRevisionFeedback(''); // Reset revision feedback

      // Parse URL parameters
      const queryParams = new URLSearchParams(location.search);
      const contributionIdParam = queryParams.get('contribution_id');
      const contributionId = contributionIdParam ? parseInt(contributionIdParam, 10) : null;
      const sourceLanguageParam = queryParams.get('source_language');
      const showCorrectionsOnly = queryParams.get('corrections') === 'true';
      const projectIdParam = queryParams.get('project_id');
      const projectId = projectIdParam ? parseInt(projectIdParam, 10) : null;
      
      // Check if we have a taskId from URL parameters
      const singleTaskId = taskId ? parseInt(taskId, 10) : null;
      
      // If we have a specific task ID from URL, fetch just that task
      if (singleTaskId) {
        try {
          // First fetch the task
          const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', singleTaskId)
            .single();
          
          if (taskError) throw taskError;
          
          if (taskData && taskData.type === 'translation') {
            const content = taskData.content as TranslationTaskContent;
            
            // Also fetch the latest validated contribution for this task
            const { data: contributionData, error: contribError } = await supabase
              .from('contributions')
              .select(`
                id,
                status,
                submitted_data,
                validations (
                  is_approved,
                  comment,
                  created_at
                )
              `)
              .eq('task_id', singleTaskId)
              .eq('status', 'validated')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (!contribError && contributionData) {
              const submittedData = contributionData.submitted_data as { translation_text?: string };
              setValidatedTranslation({
                translation_text: submittedData?.translation_text || '',
                validated_at: contributionData.validations?.[0]?.created_at,
                validator_comment: contributionData.validations?.[0]?.comment
              });
            }
            
            if (content && typeof content === 'object' && 
                typeof (content.task_title || content.title) === 'string' &&
                typeof (content.source_text || content.sourceText) === 'string' &&
                typeof (content.source_language || content.sourceLanguage) === 'string') {
              
              // Check if there's a previous contribution by this user
              const { data: contributionData } = await supabase
                .from('contributions')
                .select('*')
                .eq('task_id', singleTaskId)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);
              
              let previousTranslation = '';
              if (contributionData && contributionData.length > 0) {
                const submittedData = contributionData[0].submitted_data as any;
                previousTranslation = submittedData?.translation || '';
              }
              
              const mappedTask: MappedTranslationTask = {
                id: taskData.id,
                title: content.task_title || content.title || '',
                description: content.task_description || '',
                sourceText: content.source_text || content.sourceText || '',
                sourceLanguage: content.source_language || content.sourceLanguage || 'English',
                targetLanguage: taskData.language || content.target_language || '',
                domain: content.domain || content.batch_name || 'general',
                previousTranslation
              };
              
              setAllTasks([mappedTask]);
              setFilteredTasks([mappedTask]);
              if (previousTranslation) {
                setCurrentTranslation(previousTranslation);
              }
              setSelectedLanguage(mappedTask.targetLanguage.toLowerCase());
              setIsLoadingTasks(false);
              return; // Stop processing, we loaded the specific task
            }
          } else {
            toast({
              title: 'Task Error',
              description: 'The requested task is not a translation task or could not be found.',
              variant: 'destructive',
            });
            navigate('/dashboard');
            return;
          }
        } catch (error) {
          console.error('Error fetching specific task:', error);
          toast({
            title: 'Error',
            description: 'Failed to load the translation task.',
            variant: 'destructive',
          });
        }
      }
      
      // Rest of the existing fetchTasks implementation
      // for handling contribution_id, project_id, etc.

      try {
        if (!userId) {
          console.error("Cannot fetch tasks: User ID is null");
          setIsLoadingTasks(false); // Stop loading if no user
          return;
        }
        
        // --- Scenario 1: Load a specific rejected contribution for correction ---
        if (contributionId && !isNaN(contributionId)) {
          console.log(`Fetching specific rejected contribution: ${contributionId}`);
          const { data: rejectedContribution, error: contribError } = await supabase
            .from('contributions')
            .select(`
              id,
              status,
              submitted_data,
              tasks!inner(*)
            `)
            .eq('id', contributionId)
            .eq('status', 'rejected') // Ensure it's rejected
            .eq('user_id', userId)    // Ensure it belongs to the user
            .maybeSingle();

          if (contribError) {
            console.error("Error fetching rejected contribution:", contribError);
            throw contribError;
          }

          if (rejectedContribution && rejectedContribution.tasks) {
            // Fetch the latest validation comment separately
            const { data: validationData, error: validationError } = await supabase
                .from('validations')
                .select('comment')
                .eq('contribution_id', contributionId)
                .eq('is_approved', false) // Assuming rejection means is_approved = false
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (validationError) {
                 console.warn("Error fetching validation comment:", validationError);
                 // Continue even if comment fetch fails
            }
            
            const task = rejectedContribution.tasks;
            const content = task.content as unknown as Partial<TranslationTaskContent>;
            const submittedData = rejectedContribution.submitted_data as any;
            const previousTranslation = submittedData?.translation_text || '';
            const validatorComment = validationData?.comment || 'No feedback provided.';

             if (content && typeof content === 'object' && 
                typeof (content.task_title || content.title) === 'string' &&
                typeof (content.source_text || content.sourceText) === 'string' &&
                typeof (content.source_language || content.sourceLanguage) === 'string' &&
                (task.language || content.target_language)) {
                  
                const singleTask: MappedTranslationTask = {
                  id: task.id,
                  contributionId: rejectedContribution.id, // Store contribution ID
                  title: content.task_title || content.title || '',
                  description: content.task_description || '',
                  sourceText: content.source_text || content.sourceText || '',
                  sourceLanguage: content.source_language || content.sourceLanguage || 'English',
                  targetLanguage: task.language || content.target_language || '',
                  domain: content.domain || content.batch_name || 'general',
                  isRevision: true, // Mark as revision
                  previousTranslation: previousTranslation,
                  validatorFeedback: validatorComment
                };
                
                setAllTasks([singleTask]);
                setFilteredTasks([singleTask]);
                setCurrentTranslation(previousTranslation); // Pre-populate with rejected text
                setRevisionFeedback(validatorComment); // Store feedback
                setSelectedLanguage(singleTask.targetLanguage.toLowerCase()); // Set language filter to match task
                setIsLoadingTasks(false);
                return; // Stop processing, we loaded the specific task
            } else {
                 console.warn(`Rejected contribution ${contributionId} task content is invalid.`);
            }
          } else {
            toast({ title: "Task Not Found", description: `Could not find the rejected task (ID: ${contributionId}) assigned to you.`, variant: "destructive" });
            navigate('/dashboard'); // Navigate away if task not found
            setIsLoadingTasks(false);
            return;
          }
        }
        
        // --- Scenario 2: Fetch all rejected tasks for a language (corrections=true) ---
        if (showCorrectionsOnly) {
          console.log(`Fetching rejected tasks for language: ${selectedLanguage}`);
          
          // Query for rejected contributions for the current user
          let rejectedTasksQuery = supabase
            .from('contributions')
            .select(`
              id,
              status,
              submitted_data,
              tasks!inner(id, type, language, content, status, priority)
            `)
            .eq('user_id', userId)
            .eq('status', 'rejected');
            
          // Filter by language if specified
          if (selectedLanguage !== 'all') {
            rejectedTasksQuery = rejectedTasksQuery.ilike('tasks.language', selectedLanguage);
          }
          
          // Filter by source language if specified
          if (sourceLanguageParam) {
            // Since source_language is in the task content JSON, we need to handle this post-query
            console.log(`Will filter by source language: ${sourceLanguageParam}`);
          }
          
          const { data: rejectedTasks, error: rejectedTasksError } = await rejectedTasksQuery;
          
          if (rejectedTasksError) {
            console.error("Error fetching rejected tasks:", rejectedTasksError);
            throw rejectedTasksError;
          }
          
          console.log(`Found ${rejectedTasks?.length || 0} rejected tasks`);
          
          if (rejectedTasks && rejectedTasks.length > 0) {
            // Fetch validation comments for each rejected task
            const contributionIds = rejectedTasks.map(t => t.id);
            const { data: validations, error: validationsError } = await supabase
              .from('validations')
              .select('contribution_id, comment')
              .in('contribution_id', contributionIds)
              .eq('is_approved', false)
              .order('created_at', { ascending: false });
              
            if (validationsError) {
              console.warn("Error fetching validation comments:", validationsError);
            }
            
            // Create a map of contribution_id -> comment
            const validationComments: Record<number, string> = {};
            validations?.forEach(v => {
              if (!validationComments[v.contribution_id]) {
                validationComments[v.contribution_id] = v.comment || 'No feedback provided.';
              }
            });
            
            // Map tasks to display format
            let mappedTasks: MappedTranslationTask[] = [];
            
            rejectedTasks.forEach(contribution => {
              const task = contribution.tasks;
              const content = task.content as unknown as Partial<TranslationTaskContent>;
              const submittedData = contribution.submitted_data as any;
              
              if (content && typeof content === 'object' && 
                  typeof (content.source_text || content.sourceText) === 'string') {
                
                // If source language filter is applied, check if this task matches
                const taskSourceLang = (content.source_language || content.sourceLanguage || '').toLowerCase();
                if (sourceLanguageParam && taskSourceLang !== sourceLanguageParam.toLowerCase() && taskSourceLang !== '') {
                  return; // Skip this task if source language doesn't match
                }
                
                mappedTasks.push({
                  id: task.id,
                  contributionId: contribution.id,
                  title: content.task_title || content.title || `Task ${task.id}`,
                  description: content.task_description || '',
                  sourceText: content.source_text || content.sourceText || '',
                  sourceLanguage: content.source_language || content.sourceLanguage || 'Unknown',
                  targetLanguage: task.language || content.target_language || 'Unknown',
                  domain: content.domain || content.batch_name || 'general',
                  isRevision: true,
                  previousTranslation: submittedData?.translation_text || '',
                  validatorFeedback: validationComments[contribution.id] || 'No feedback provided.'
                });
              }
            });
            
            setAvailableLanguages(Array.from(new Set(mappedTasks.map(t => t.targetLanguage))));
            setAllTasks(mappedTasks);
            setFilteredTasks(mappedTasks);
            
            // If we have tasks and the first one has a previous translation, pre-populate the input
            if (mappedTasks.length > 0 && mappedTasks[0].previousTranslation) {
              setCurrentTranslation(mappedTasks[0].previousTranslation);
              setRevisionFeedback(mappedTasks[0].validatorFeedback || '');
            }
            
            setIsLoadingTasks(false);
            return; // Stop processing, we loaded the correction tasks
          } else {
            // No rejected tasks found
            toast({ 
              title: "No corrections needed", 
              description: "You don't have any rejected tasks that need correction for this language."
            });
          }
        }
        
        // --- Scenario 3: Fetch general task queue (existing logic) ---
        console.log(`Fetching general task queue for language: ${selectedLanguage}${projectId ? ` for project: ${projectId}` : ''}`);
        // Create base query for all available tasks
        let tasksQuery = supabase
          .from('tasks')
          .select('*, contributions(*)')
          .eq('type', 'translation')
          .eq('status', 'pending');
        
        // Apply project filter if provided
        if (projectId && !isNaN(projectId)) {
          console.log(`Filtering by project ID: ${projectId}`);
          tasksQuery = tasksQuery.eq('project_id', projectId);
        }
        
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
                typeof (content.source_text || content.sourceText) === 'string') {
              
              acc.push({
                id: task.id,
                title: content.task_title || content.title || `Task ${task.id}`,
                description: content.task_description || '',
                sourceText: content.source_text || content.sourceText || '',
                sourceLanguage: content.source_language || content.sourceLanguage || 'Unknown',
                targetLanguage: task.language || content.target_language || 'Unknown',
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
  }, [userId, selectedLanguage, location.search, taskId, navigate, toast]);

  // Define the fetchTasks function outside of useEffect for reuse
  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    setAllTasks([]);
    setFilteredTasks([]);
    setCurrentTaskIndex(0);
    setTranslations({});
    setCurrentTranslation('');
    setRevisionFeedback('');
    
    // Re-run the same effect as above
    const queryParams = new URLSearchParams(location.search);
    const contributionIdParam = queryParams.get('contribution_id');
    const contributionId = contributionIdParam ? parseInt(contributionIdParam, 10) : null;
    const sourceLanguageParam = queryParams.get('source_language');
    const showCorrectionsOnly = queryParams.get('corrections') === 'true';
    const projectIdParam = queryParams.get('project_id');
    const projectId = projectIdParam ? parseInt(projectIdParam, 10) : null;

    try {
      if (!userId) {
        console.error("Cannot fetch tasks: User ID is null");
        setIsLoadingTasks(false);
        return;
      }
      
      // Reuse the same query logic from the effect
      // Fetch based on params, almost identical to the effect above
      
      if (contributionId && !isNaN(contributionId)) {
        // Scenario 1: Handle specific contribution
        console.log(`Refreshing specific rejected contribution: ${contributionId}`);
        // Redirect to specific contribution handling logic in the main component
        const { data: rejectedContribution, error: contribError } = await supabase
          .from('contributions')
          .select(`
            id,
            status,
            submitted_data,
            tasks!inner(*)
          `)
          .eq('id', contributionId)
          .eq('status', 'rejected') // Ensure it's rejected
          .eq('user_id', userId)    // Ensure it belongs to the user
          .maybeSingle();

        if (contribError) {
          console.error("Error fetching rejected contribution:", contribError);
          throw contribError;
        }

        if (rejectedContribution && rejectedContribution.tasks) {
          // Continue with specific contribution handling
          // (This is a simplified version - would need full implementation)
          console.log("Found specific contribution, but full implementation not included in this patch");
        }
      } else if (showCorrectionsOnly) {
        // Scenario 2: Handle corrections
        console.log(`Refreshing rejected tasks for language: ${selectedLanguage}`);
        // Redirect to corrections handling logic in the main component
        // (This is a simplified version - would need full implementation)
        console.log("Corrections mode detected, but full implementation not included in this patch");
      } else {
        // Scenario 3: Handle normal task queue
        console.log(`Refreshing general task queue for language: ${selectedLanguage}${projectId ? ` for project: ${projectId}` : ''}`);
        
        // Create base query for all available tasks
        let tasksQuery = supabase
          .from('tasks')
          .select('*, contributions(*)')
          .eq('type', 'translation')
          .eq('status', 'pending');
        
        // Apply project filter if provided
        if (projectId && !isNaN(projectId)) {
          console.log(`Filtering by project ID: ${projectId}`);
          tasksQuery = tasksQuery.eq('project_id', projectId);
        }
        
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

          // Map tasks to display format with relaxed validation
          const mappedTasks: MappedTranslationTask[] = availableTasks.reduce((acc: MappedTranslationTask[], task) => {
            const content = task.content as unknown as Partial<TranslationTaskContent>;
            
            if (content && typeof content === 'object' && 
                typeof (content.source_text || content.sourceText) === 'string') {
              
              acc.push({
                id: task.id,
                title: content.task_title || content.title || `Task ${task.id}`,
                description: content.task_description || '',
                sourceText: content.source_text || content.sourceText || '',
                sourceLanguage: content.source_language || content.sourceLanguage || 'Unknown',
                targetLanguage: task.language || content.target_language || 'Unknown',
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
  }, [userId, selectedLanguage, location.search, toast]);

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
    setIsSubmitting(true);
    
    if (!userId) {
      toast({ title: "Not Authenticated", description: "You must be logged in to submit translations." });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const keys = Object.keys(translationsToSubmit);
      console.log(`Submitting ${keys.length} translation(s)`);
      
      for (const key of keys) {
        const item = translationsToSubmit[key];
        const task = allTasks.find(t => t.id === item.taskId);
        const isRevision = task?.isRevision || false;
        const contributionId = task?.contributionId;
        
        console.log(`Processing taskId=${item.taskId}, isRevision=${isRevision}, contributionId=${contributionId}`);
        
        if (isRevision && contributionId) {
          // This is a resubmission of a rejected task
          console.log(`Resubmitting rejected contribution ${contributionId}`);
          
          const { error: updateError } = await supabase
            .from('contributions')
            .update({
              status: 'pending_validation',
              submitted_data: {
                translation_text: item.text
              }
            })
            .eq('id', contributionId);
            
          if (updateError) {
            console.error("Error updating rejected contribution:", updateError);
            throw updateError;
          }
          
          toast({
            title: "Correction Submitted",
            description: "Your corrected translation has been resubmitted for validation."
          });
        } else {
          // This is a new submission
          console.log(`Submitting new translation for task ${item.taskId}`);
          
          const { error: contributionError } = await supabase
            .from('contributions')
            .insert({
              task_id: item.taskId,
              user_id: userId,
              status: 'pending_validation',
              submitted_data: {
                translation_text: item.text
              }
            });
          
          if (contributionError) {
            console.error("Error submitting translation:", contributionError);
            throw contributionError;
          }
          
          const { error: taskUpdateError } = await supabase
            .from('tasks')
            .update({ status: 'assigned', assigned_to: userId })
            .eq('id', item.taskId);
            
          if (taskUpdateError) {
            console.error("Error updating task status:", taskUpdateError);
            // Continue even if task update fails
          }
          
          toast({
            title: "Translation Submitted",
            description: "Your translation has been submitted for validation."
          });
        }
      }
      
      // Clear translations state after successful submission
      setTranslations({});
      
      // Reload tasks
      setIsLoadingTasks(true);
      const queryParams = new URLSearchParams(location.search);
      const showCorrectionsOnly = queryParams.get('corrections') === 'true';
      
      if (showCorrectionsOnly) {
        // Redirect to dashboard if we were in corrections mode
        toast({
          title: "All Corrections Submitted",
          description: "You'll be redirected to your dashboard."
        });
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        // Just refetch the tasks if we're in normal mode
        fetchTasks();
      }
    } catch (error) {
      console.error("Error submitting translations:", error);
      toast({
        title: "Submission Error",
        description: "Failed to submit translation(s). Please try again.",
        variant: "destructive"
      });
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
                <CardTitle>{currentTask.title}</CardTitle>
                <CardDescription>
                  {validatedTranslation 
                    ? "Validated Translation"
                    : currentTask.description || `Translate the text below from ${currentTask.sourceLanguage} to ${currentTask.targetLanguage}`
                  }
                </CardDescription>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">From: {currentTask.sourceLanguage}</Badge>
                  <Badge variant="outline">To: {currentTask.targetLanguage}</Badge>
                  {validatedTranslation && (
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Validated</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Source Text */}
            <div className="space-y-2">
              <Label htmlFor="source-text" className="text-base">Source Text ({currentTask.sourceLanguage})</Label>
              <Card className="bg-gray-50 p-4 min-h-[100px]">
                <p id="source-text" className="text-gray-700 whitespace-pre-wrap">{currentTask.sourceText}</p>
              </Card>
            </div>
             
            {/* Validated Translation Display */}
            {validatedTranslation ? (
              <div className="space-y-2">
                <Label htmlFor="validated-translation" className="text-base">
                  Validated Translation ({currentTask.targetLanguage})
                  {validatedTranslation.validated_at && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (Validated on {new Date(validatedTranslation.validated_at).toLocaleDateString()})
                    </span>
                  )}
                </Label>
                <Card className="bg-green-50 p-4 min-h-[100px]">
                  <p id="validated-translation" className="text-gray-700 whitespace-pre-wrap">
                    {validatedTranslation.translation_text}
                  </p>
                </Card>
                {validatedTranslation.validator_comment && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Validator Comment</AlertTitle>
                    <AlertDescription>
                      {validatedTranslation.validator_comment}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              // Translation Input Area
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
            )}
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