import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { safelyDeleteProject } from '@/utils/projectUtils';

type Project = Database['public']['Tables']['projects']['Row'];

// Define form validation schema
const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'completed', 'draft']),
  source_language: z.string().min(1, 'Source language is required'),
  target_languages: z.array(z.string()).min(1, 'At least one target language is required'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const ProjectSettings: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<{label: string, value: string}[]>([]);
  
  // Setup form with zod validation
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
      source_language: '',
      target_languages: [],
    },
  });

  // Fetch user ID and project data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to manage project settings',
          variant: 'destructive',
        });
        navigate('/login');
      }
    };
    fetchUser();
    
    // Populate language options
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

  // Fetch project data
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId || !userId) return;
      
      setIsLoading(true);
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (projectError) throw projectError;
        
        setProject(projectData);
        
        // Check user role in the project
        const { data: memberData, error: memberError } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .maybeSingle();
          
        if (!memberError && memberData) {
          setUserRole(memberData.role);
        } else if (projectData.created_by === userId) {
          // If user is the creator but not in members table, consider them an owner
          setUserRole('owner');
        } else {
          setUserRole(null);
          // Redirect if not authorized
          navigate(`/projects/${projectId}`);
          toast({
            title: 'Access denied',
            description: 'You do not have permission to edit this project',
            variant: 'destructive',
          });
          return;
        }
        
        // Set form default values
        form.reset({
          name: projectData.name,
          description: projectData.description || '',
          status: projectData.status,
          source_language: projectData.source_language || '',
          target_languages: projectData.target_languages || [],
        });
      } catch (error) {
        console.error('Error fetching project data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project details',
          variant: 'destructive',
        });
        navigate('/projects');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjectData();
  }, [projectId, userId, toast, navigate, form]);

  const onSubmit = async (data: ProjectFormValues) => {
    if (!projectId || !userId) return;
    
    // Check permissions
    const canManageProject = userRole === 'owner' || userRole === 'admin';
    if (!canManageProject) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to update this project',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the project
      const { error } = await supabase
        .from('projects')
        .update({
          name: data.name,
          description: data.description || null,
          status: data.status,
          source_language: data.source_language,
          target_languages: data.target_languages,
        })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Project updated',
        description: 'Project settings have been updated successfully',
      });
      
      // Refresh project data
      const { data: refreshedData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (refreshedData) {
        setProject(refreshedData);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update project settings',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId || !userId) return;
    
    // Check permissions
    if (userRole !== 'owner') {
      toast({
        title: 'Permission denied',
        description: 'Only the project owner can delete this project',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    setIsDeleteDialogOpen(false); // Close dialog immediately to prevent double-clicks
    
    toast({
      title: 'Deleting project...',
      description: 'This may take a moment. Please wait.',
    });
    
    try {
      // Use our new utility for safe project deletion
      const result = await safelyDeleteProject(Number(projectId), userId);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error during project deletion');
      }
      
      toast({
        title: 'Project deleted',
        description: `Project "${project?.name}" has been permanently deleted with all its associated data.`,
      });
      
      // Navigate back to projects list
      navigate('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      
      // Reopen the dialog so the user can try again
      setIsDeleteDialogOpen(true);
      
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete the project',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-2">Loading project settings...</p>
        </div>
      </div>
    );
  }

  const canManageProject = userRole === 'owner' || userRole === 'admin';
  const isOwner = userRole === 'owner';

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <h1 className="text-2xl font-bold">Project Settings</h1>
        <Badge variant="outline" className="capitalize">{project?.type}</Badge>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Project Details</CardTitle>
          <CardDescription>
            Update the settings for your project
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
                    <FormLabel>Description</FormLabel>
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Set the current status of this project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="source_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableLanguages.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The original language of the content
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="target_languages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Languages</FormLabel>
                    <FormControl>
                      <MultiSelect
                        selected={field.value}
                        options={availableLanguages}
                        onChange={(values) => field.onChange(values)}
                        placeholder="Select target languages"
                      />
                    </FormControl>
                    <FormDescription>
                      Languages this project will be translated to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            
            <CardFooter className="flex justify-between">
              {isOwner && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={isSubmitting || !canManageProject}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      {/* Delete Project Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{project?.name}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Project'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectSettings; 