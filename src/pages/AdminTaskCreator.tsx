import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';
import { BulkTaskCreator } from '@/components/admin/BulkTaskCreator';
import type { Database } from '@/integrations/supabase/types';

// Define structure for the 'content' JSONB field based on task type
interface TaskContentASR {
  task_title: string;
  task_description: string;
  image_url?: string;
}

interface TaskContentTTS {
  task_title: string;
  task_description?: string;
  text_prompt: string;
  text_to_speak?: string; // Optional for backward compatibility
}

interface TaskContentTranslation {
  task_title: string;
  task_description?: string;
  source_text: string;
  source_language: string;
  domain?: string;
}

// Input form state types (can be simpler than the DB structure initially)
interface ASRFormData {
  title: string;
  description: string;
  language: string;
  priority: 'low' | 'medium' | 'high';
  imageUrl?: string;
}

interface TTSFormData {
  title: string;
  description?: string;
  language: string;
  priority: 'low' | 'medium' | 'high';
  textPrompt: string;
}

interface TranslationFormData {
  title: string;
  description?: string;
  targetLanguage: string;
  priority: 'low' | 'medium' | 'high';
  sourceText: string;
  sourceLanguage: string;
  domain?: string;
}

type TaskType = Database['public']['Tables']['tasks']['Row']['type'];
type TaskPriority = Database['public']['Tables']['tasks']['Row']['priority'];

const AdminTaskCreator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState<'asr' | 'tts' | 'translation'>('asr');
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('single');

  // Fetch current user ID on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        toast.error("Authentication error: Cannot create tasks.");
        // Consider redirecting or disabling the form
      }
    };
    fetchUser();
  }, []);

  // State for ASR Task Form
  const [asrData, setAsrData] = useState<ASRFormData>({ title: '', description: '', language: '', priority: 'medium', imageUrl: '' });
  const [asrImageFile, setAsrImageFile] = useState<File | null>(null);

  // State for TTS Task Form
  const [ttsData, setTtsData] = useState<TTSFormData>({ title: '', description: '', language: '', priority: 'medium', textPrompt: '' });

  // State for Translation Task Form
  const [translationData, setTranslationData] = useState<TranslationFormData>({ 
    title: '', 
    description: '', 
    targetLanguage: '', 
    priority: 'medium', 
    sourceText: '', 
    sourceLanguage: 'English',
    domain: 'general'
  });
  
  const availableLanguages = ['Akan', 'Ewe', 'Ga', 'Dagbani', 'Fante', 'English'];
  const availableDomains = [
    { value: 'general', label: 'General' },
    { value: 'health', label: 'Healthcare/Medical' },
    { value: 'education', label: 'Education' },
    { value: 'tech', label: 'Technology' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'government', label: 'Government/Administration' },
    { value: 'finance', label: 'Finance/Banking' },
    { value: 'legal', label: 'Legal' },
    { value: 'culture', label: 'Cultural/Traditional' }
  ];

  // --- Generic Handlers ---
  const handleInputChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, field: keyof T) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
       setter(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelectChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, field: keyof T) => 
    (value: string) => {
       setter(prev => ({ ...prev, [field]: value as any })); // Cast to any for priority/language
  };

  // --- ASR Specific ---
  const handleAsrImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAsrImageFile(e.target.files[0]);
      setAsrData({ ...asrData, imageUrl: '' }); 
    } else {
      setAsrImageFile(null);
    }
  };

  // --- Submit Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
        toast.error("Cannot submit task: User ID not found.");
        return;
    }
    setLoading(true);

    let taskPayload: any;
    let uploadedImageUrl: string | undefined = undefined;

    try {
      // 1. Upload image if it's an ASR task and file exists
      if (taskType === 'asr' && asrImageFile) {
         const timestamp = Date.now();
         const filePath = `task-images/asr/${timestamp}-${asrImageFile.name}`; 
         const { error: uploadError } = await supabase.storage
           .from('contributions') // <-- Use 'contributions' bucket
           .upload(filePath, asrImageFile);

         if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
         
         const { data: urlData } = supabase.storage.from('contributions').getPublicUrl(filePath); // <-- Use 'contributions' bucket
         uploadedImageUrl = urlData?.publicUrl ?? undefined;
         console.log("Uploaded Image URL:", uploadedImageUrl);
      }

      // 2. Construct the task payload based on type
      switch (taskType) {
        case 'asr':
          const asrContent: TaskContentASR = {
            task_title: asrData.title,
            task_description: asrData.description,
            image_url: uploadedImageUrl ?? asrData.imageUrl // Prioritize uploaded, fallback to manual URL
          };
          taskPayload = {
            created_by: userId,
            type: 'asr',
            language: asrData.language,
            content: asrContent,
            priority: asrData.priority,
            status: 'pending' // Default status
          };
          break;
        case 'tts':
          const ttsContent: TaskContentTTS = {
              task_title: ttsData.title,
              task_description: ttsData.description,
              text_prompt: ttsData.textPrompt,
              text_to_speak: ttsData.textPrompt
          };
           taskPayload = {
            created_by: userId,
            type: 'tts',
            language: ttsData.language,
            content: ttsContent,
            priority: ttsData.priority,
            status: 'pending'
          };
          break;
        case 'translation':
          const translationContent: TaskContentTranslation = {
              task_title: translationData.title,
              task_description: translationData.description,
              source_text: translationData.sourceText,
              source_language: translationData.sourceLanguage,
              domain: translationData.domain
          };
          taskPayload = {
            created_by: userId,
            type: 'translation',
            language: translationData.targetLanguage, // Target language goes in the main language column
            content: translationContent,
            priority: translationData.priority,
            status: 'pending'
          };
          break;
        default:
          throw new Error("Invalid task type");
      }

      console.log("Submitting Task Payload:", taskPayload);

      // 3. Insert into the unified 'tasks' table
      const { error: insertError } = await supabase
        .from('tasks')
        .insert([taskPayload]);

      if (insertError) {
           console.error("Supabase Insert Error:", insertError);
           throw insertError;
      }

      toast.success(`${taskType.toUpperCase()} Task created successfully!`);
      // Reset the specific form based on taskType
      if (taskType === 'asr') {
          setAsrData({ title: '', description: '', language: '', priority: 'medium', imageUrl: '' });
          setAsrImageFile(null);
          // Reset file input visually if possible (difficult across browsers)
          const fileInput = document.getElementById('asr-image-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
      } else if (taskType === 'tts') {
          setTtsData({ title: '', description: '', language: '', priority: 'medium', textPrompt: '' });
      } else if (taskType === 'translation') {
           setTranslationData({ title: '', description: '', targetLanguage: '', priority: 'medium', sourceText: '', sourceLanguage: 'English', domain: 'general' });
      }

    } catch (error: any) {
      console.error(`Error creating ${taskType} task:`, error);
      toast.error(`Failed to create ${taskType.toUpperCase()} task: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Render Logic ---
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center md:text-left">Admin Task Creator</h1>

      {/* Main Tabs: Single vs Bulk */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Create Single Task</TabsTrigger>
          <TabsTrigger value="bulk">Create Bulk Tasks</TabsTrigger>
        </TabsList>

        {/* Single Task Creation Content */}
        <TabsContent value="single">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Create a New Task</CardTitle>
              <CardDescription>Select the type of task and fill in the details below.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Task Type Selection Tabs */}
              <Tabs value={taskType} onValueChange={(value) => setTaskType(value as 'asr' | 'tts' | 'translation')} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="asr">ASR (Image)</TabsTrigger>
                  <TabsTrigger value="tts">TTS (Speech)</TabsTrigger>
                  <TabsTrigger value="translation">Translation</TabsTrigger>
                </TabsList>

                {/* ASR Form Tab */}
                <TabsContent value="asr">
                  <Card className="border shadow-inner">
                    <CardHeader>
                      <CardTitle>ASR Task Details</CardTitle>
                      <CardDescription>Provide an image and prompt users to record audio describing it.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="asr-title">Task Title</Label>
                          <Input id="asr-title" placeholder="e.g., Describe the market scene" value={asrData.title} onChange={handleInputChange(setAsrData, 'title')} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="asr-description">Description/Instructions</Label>
                          <Textarea id="asr-description" placeholder="Detailed instructions for the contributor" value={asrData.description} onChange={handleInputChange(setAsrData, 'description')} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="asr-language">Language</Label>
                            <Select value={asrData.language} onValueChange={handleSelectChange(setAsrData, 'language')} required>
                              <SelectTrigger id="asr-language"><SelectValue placeholder="Select language" /></SelectTrigger>
                              <SelectContent>
                                {availableLanguages.filter(l => l !== 'English').map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="asr-priority">Priority</Label>
                            <Select value={asrData.priority} onValueChange={handleSelectChange(setAsrData, 'priority')} required>
                              <SelectTrigger id="asr-priority"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="asr-image-upload">Image Upload (Optional)</Label>
                            <Input id="asr-image-upload" type="file" accept="image/*" onChange={handleAsrImageChange} />
                            {asrImageFile && <p className="text-xs text-muted-foreground mt-1">Selected: {asrImageFile.name}</p>}
                            {!asrImageFile && (
                              <>
                                <p className="text-xs text-muted-foreground">Or provide image URL:</p>
                                <Input id="asr-imageUrl" placeholder="https://example.com/image.jpg" value={asrData.imageUrl} onChange={handleInputChange(setAsrData, 'imageUrl')} />
                              </>
                            )}
                          </div>
                      </CardContent>
                      <CardFooter>
                        <Button type="submit" disabled={loading} className="w-full md:w-auto ml-auto">
                          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create ASR Task'}
                        </Button>
                      </CardFooter>
                    </form>
                  </Card>
                </TabsContent>

                {/* TTS Form Tab */}
                <TabsContent value="tts">
                   <Card className="border shadow-inner">
                    <CardHeader>
                      <CardTitle>TTS Task Details</CardTitle>
                      <CardDescription>Provide text for users to read aloud and record.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="tts-title">Task Title</Label>
                          <Input id="tts-title" placeholder="e.g., Read the weather forecast" value={ttsData.title} onChange={handleInputChange(setTtsData, 'title')} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tts-description">Description/Instructions (Optional)</Label>
                          <Textarea id="tts-description" placeholder="Any specific tone or context?" value={ttsData.description} onChange={handleInputChange(setTtsData, 'description')} />
                        </div>
                         <div className="space-y-2">
                          <Label htmlFor="tts-textPrompt">Text Prompt</Label>
                          <Textarea id="tts-textPrompt" placeholder="The text the user should read..." value={ttsData.textPrompt} onChange={handleInputChange(setTtsData, 'textPrompt')} required rows={5} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                            <Label htmlFor="tts-language">Language</Label>
                            <Select value={ttsData.language} onValueChange={handleSelectChange(setTtsData, 'language')} required>
                              <SelectTrigger id="tts-language"><SelectValue placeholder="Select language" /></SelectTrigger>
                              <SelectContent>
                                {availableLanguages.filter(l => l !== 'English').map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tts-priority">Priority</Label>
                            <Select value={ttsData.priority} onValueChange={handleSelectChange(setTtsData, 'priority')} required>
                              <SelectTrigger id="tts-priority"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                         </div>
                      </CardContent>
                      <CardFooter>
                        <Button type="submit" disabled={loading} className="w-full md:w-auto ml-auto">
                          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create TTS Task'}
                        </Button>
                      </CardFooter>
                    </form>
                  </Card>
                </TabsContent>

                {/* Translation Form Tab */}
                <TabsContent value="translation">
                  <Card className="border shadow-inner">
                    <CardHeader>
                      <CardTitle>Translation Task Details</CardTitle>
                      <CardDescription>Provide source text (usually English) for users to translate.</CardDescription>
                    </CardHeader>
                     <form onSubmit={handleSubmit}>
                      <CardContent className="space-y-6">
                         <div className="space-y-2">
                          <Label htmlFor="trans-title">Task Title</Label>
                          <Input id="trans-title" placeholder="e.g., Translate news article" value={translationData.title} onChange={handleInputChange(setTranslationData, 'title')} required />
                        </div>
                         <div className="space-y-2">
                          <Label htmlFor="trans-description">Description/Context (Optional)</Label>
                          <Textarea id="trans-description" placeholder="Add context for the translation" value={translationData.description} onChange={handleInputChange(setTranslationData, 'description')} />
                        </div>
                         <div className="space-y-2">
                          <Label htmlFor="trans-sourceText">Source Text</Label>
                          <Textarea id="trans-sourceText" placeholder="The text to be translated..." value={translationData.sourceText} onChange={handleInputChange(setTranslationData, 'sourceText')} required rows={6} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="trans-sourceLanguage">Source Language</Label>
                            {/* Currently fixed to English, could be a Select if needed */}
                            <Input id="trans-sourceLanguage" value={translationData.sourceLanguage} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="trans-targetLanguage">Target Language</Label>
                             <Select value={translationData.targetLanguage} onValueChange={handleSelectChange(setTranslationData, 'targetLanguage')} required>
                              <SelectTrigger id="trans-targetLanguage"><SelectValue placeholder="Select target language" /></SelectTrigger>
                              <SelectContent>
                                {availableLanguages.filter(l => l !== 'English').map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                           <div className="space-y-2">
                            <Label htmlFor="trans-domain">Domain/Category</Label>
                            <Select value={translationData.domain || 'general'} onValueChange={handleSelectChange(setTranslationData, 'domain')}>
                              <SelectTrigger id="trans-domain"><SelectValue placeholder="Select domain" /></SelectTrigger>
                              <SelectContent>
                                {availableDomains.map(domain => (
                                  <SelectItem key={domain.value} value={domain.value}>{domain.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="trans-priority">Priority</Label>
                             <Select value={translationData.priority} onValueChange={handleSelectChange(setTranslationData, 'priority')} required>
                              <SelectTrigger id="trans-priority"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                         <Button type="submit" disabled={loading} className="w-full md:w-auto ml-auto">
                          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Translation Task'}
                        </Button>
                      </CardFooter>
                    </form>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Task Creation Tab Content */}
        <TabsContent value="bulk">
          <BulkTaskCreator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTaskCreator; 