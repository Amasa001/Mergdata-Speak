
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Plus, Check, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TaskManager: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [taskType, setTaskType] = useState<'asr' | 'tts' | 'transcription' | 'translation'>('asr');
  const [language, setLanguage] = useState<string>("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [sourceText, setSourceText] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const [audioUploading, setAudioUploading] = useState<boolean>(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profileData?.is_admin) {
          toast.error('You do not have admin access');
          navigate('/dashboard');
          return;
        }

        setIsAdmin(true);
        await fetchLanguages();
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('An error occurred while checking admin status');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    const fetchLanguages = async () => {
      try {
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('languages')
          .not('languages', 'is', null);
        
        if (error) throw error;
        
        // Extract and flatten all languages from all profiles
        const allLanguages = profilesData
          .reduce((acc: string[], profile) => {
            if (profile.languages && Array.isArray(profile.languages)) {
              return [...acc, ...profile.languages];
            }
            return acc;
          }, []);
        
        // Get unique languages
        const uniqueLanguages = Array.from(new Set(allLanguages));
        setAvailableLanguages(uniqueLanguages);
        
        if (uniqueLanguages.length > 0) {
          setLanguage(uniqueLanguages[0]);
          setSourceLanguage(uniqueLanguages[0]);
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
        toast.error('Failed to load languages');
      }
    };

    checkAdminStatus();
  }, [navigate]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    setImageFile(file);
    
    try {
      setImageUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `task_images/${fileName}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('audio')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(filePath);
      
      setImageUrl(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    setAudioFile(file);
    
    try {
      setAudioUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `task_audio/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(filePath);
      
      setAudioUrl(publicUrl);
      toast.success('Audio uploaded successfully');
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Failed to upload audio');
    } finally {
      setAudioUploading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to create tasks');
        navigate('/login');
        return;
      }

      // Prepare task content based on task type
      let content = {};
      
      switch (taskType) {
        case 'asr':
          content = {
            imageUrl,
            description
          };
          break;
        case 'tts':
          content = {
            text
          };
          break;
        case 'transcription':
          content = {
            audioUrl
          };
          break;
        case 'translation':
          content = {
            sourceText,
            sourceLanguage
          };
          break;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          type: taskType,
          language,
          content,
          priority,
          created_by: user.id,
          batch_id: `batch-${Date.now()}`
        })
        .select();

      if (error) throw error;

      toast.success('Task created successfully');
      resetForm();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    switch (taskType) {
      case 'asr':
        if (!imageUrl) {
          toast.error('Please upload an image');
          return false;
        }
        if (!description) {
          toast.error('Please enter a description');
          return false;
        }
        break;
      case 'tts':
        if (!text) {
          toast.error('Please enter text');
          return false;
        }
        break;
      case 'transcription':
        if (!audioUrl) {
          toast.error('Please upload audio');
          return false;
        }
        break;
      case 'translation':
        if (!sourceText) {
          toast.error('Please enter source text');
          return false;
        }
        if (!sourceLanguage) {
          toast.error('Please select source language');
          return false;
        }
        break;
    }

    if (!language) {
      toast.error('Please select a language');
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setImageUrl('');
    setDescription('');
    setText('');
    setAudioUrl('');
    setSourceText('');
    setImageFile(null);
    setAudioFile(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Navigate already handled in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Button>
        <h1 className="text-xl font-bold">Task Manager</h1>
      </div>

      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
            <CardDescription>
              Create tasks for contributors to complete
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {/* Task Type Selection */}
              <div>
                <Label htmlFor="task-type">Task Type</Label>
                <Tabs 
                  value={taskType} 
                  onValueChange={(value) => setTaskType(value as any)}
                  className="w-full mt-2"
                >
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="asr">ASR</TabsTrigger>
                    <TabsTrigger value="tts">TTS</TabsTrigger>
                    <TabsTrigger value="transcription">Transcription</TabsTrigger>
                    <TabsTrigger value="translation">Translation</TabsTrigger>
                  </TabsList>

                  {/* ASR Task Content */}
                  <TabsContent value="asr" className="pt-4 space-y-4">
                    <div>
                      <Label htmlFor="image-upload">Upload Image</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <Input 
                          id="image-upload" 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={imageUploading}
                        />
                        {imageUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {imageUrl && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                      {imageUrl && (
                        <div className="mt-2 p-2 border rounded">
                          <img 
                            src={imageUrl} 
                            alt="Uploaded preview" 
                            className="max-h-40 object-contain mx-auto"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description">Description/Instructions</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what the contributor should say about this image"
                        className="mt-1"
                      />
                    </div>
                  </TabsContent>

                  {/* TTS Task Content */}
                  <TabsContent value="tts" className="pt-4 space-y-4">
                    <div>
                      <Label htmlFor="tts-text">Text to Read</Label>
                      <Textarea
                        id="tts-text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter the text that should be read aloud"
                        className="mt-1"
                      />
                    </div>
                  </TabsContent>

                  {/* Transcription Task Content */}
                  <TabsContent value="transcription" className="pt-4 space-y-4">
                    <div>
                      <Label htmlFor="audio-upload">Upload Audio</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <Input 
                          id="audio-upload" 
                          type="file" 
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          disabled={audioUploading}
                        />
                        {audioUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {audioUrl && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                      {audioUrl && (
                        <div className="mt-2 p-2 border rounded">
                          <audio src={audioUrl} controls className="w-full" />
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Translation Task Content */}
                  <TabsContent value="translation" className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="source-language">Source Language</Label>
                        <Select 
                          value={sourceLanguage} 
                          onValueChange={setSourceLanguage}
                        >
                          <SelectTrigger id="source-language" className="mt-1">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            {availableLanguages.map((lang) => (
                              <SelectItem key={`source-${lang}`} value={lang}>
                                {lang}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="source-text">Source Text</Label>
                      <Textarea
                        id="source-text"
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="Enter the text to be translated"
                        className="mt-1"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Common Task Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <Label htmlFor="language">Target Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language" className="mt-1">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high')}>
                    <SelectTrigger id="priority" className="mt-1">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleCreateTask}
                disabled={isSubmitting}
                className="w-full bg-afri-orange hover:bg-afri-orange/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Task...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskManager;
