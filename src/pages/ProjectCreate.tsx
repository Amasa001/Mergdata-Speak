import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileText, Mic, VolumeX, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define form validation schema
const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  type: z.enum(['translation', 'transcription', 'tts']),
  sourceLanguage: z.string().min(1, 'Source language is required'),
  targetLanguages: z.array(z.string()).min(1, 'At least one target language is required'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export const ProjectCreate: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<{label: string, value: string}[]>([]);
  
  // Setup form with zod validation
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'translation',
      sourceLanguage: '',
      targetLanguages: [],
    },
  });

  // Fetch user ID on component mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to create a project',
          variant: 'destructive',
        });
        navigate('/login');
      }
    };
    fetchUser();
    
    // Populate language options (simplified for now)
    const languageOptions = [
      { label: 'English', value: 'english' },
      { label: 'French', value: 'french' },
      { label: 'Akan', value: 'akan' },
      { label: 'Ewe', value: 'ewe' },
      { label: 'Ga', value: 'ga' },
      { label: 'Dagbani', value: 'dagbani' },
      { label: 'Hausa', value: 'hausa' },
      { label: 'Twi', value: 'twi' },
      { label: 'Fante', value: 'fante' },
    ];
    setAvailableLanguages(languageOptions);
  }, [navigate, toast]);

  const onSubmit = async (data: ProjectFormValues) => {
    if (!userId) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to create a project',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert the new project
      const { data: projectData, error } = await supabase
        .from('projects')
        .insert({
          name: data.name,
          description: data.description || null,
          type: data.type,
          status: 'active',
          created_by: userId,
          source_language: data.sourceLanguage,
          target_languages: data.targetLanguages,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Add the creator as an owner
      if (projectData?.id) {
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({
            project_id: projectData.id,
            user_id: userId,
            role: 'owner',
          });

        if (memberError) throw memberError;

        toast({
          title: 'Project created',
          description: 'Your project has been created successfully!',
        });

        // Navigate to the new project
        navigate(`/projects/${projectData.id}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Failed to create project',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/projects')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Projects
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Project</CardTitle>
          <CardDescription>
            Set up a new project for translation, transcription, or text-to-speech tasks.
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter project description" 
                        className="resize-none h-24"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <FormControl>
                      <Tabs 
                        value={field.value} 
                        onValueChange={field.onChange} 
                        className="w-full"
                      >
                        <TabsList className="grid grid-cols-3 w-full">
                          <TabsTrigger value="translation" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Translation
                          </TabsTrigger>
                          <TabsTrigger value="transcription" className="flex items-center gap-2">
                            <Mic className="h-4 w-4" />
                            Transcription
                          </TabsTrigger>
                          <TabsTrigger value="tts" className="flex items-center gap-2">
                            <VolumeX className="h-4 w-4" />
                            Text-to-Speech
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormDescription>
                      {field.value === 'translation' && 'Convert text from one language to another.'}
                      {field.value === 'transcription' && 'Convert audio to text in the same or different language.'}
                      {field.value === 'tts' && 'Convert text to spoken audio.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sourceLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Language</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableLanguages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetLanguages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Language(s)</FormLabel>
                      <FormControl>
                        <div className="border rounded-md p-4 space-y-2 max-h-52 overflow-y-auto">
                          {availableLanguages.map((language) => (
                            <div key={language.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`language-${language.value}`}
                                checked={field.value?.includes(language.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, language.value]);
                                  } else {
                                    field.onChange(current.filter(val => val !== language.value));
                                  }
                                }}
                              />
                              <Label htmlFor={`language-${language.value}`} className="cursor-pointer">
                                {language.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between border-t pt-6">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => navigate('/projects')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}; 