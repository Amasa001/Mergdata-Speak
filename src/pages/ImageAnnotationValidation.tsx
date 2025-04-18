import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ArrowRight, ArrowLeft as ArrowLeftIcon, CheckCheck } from 'lucide-react';
import { ImageAnnotationValidation } from '@/components/tasks/ImageAnnotationValidation';
import { Progress } from '@/components/ui/progress';

interface ValidationTask {
  contributionId: number;
  taskId: number;
  imageUrl: string;
  annotationType: 'single_label' | 'multi_label';
  annotatorSelection: string | string[];
  availableLabels: { id: string; name: string }[];
  annotationNotes?: string;
  title: string;
  description?: string;
  annotatorId: string;
  submittedData?: any;
}

interface TaskData {
  id: number;
  content: {
    image_url: string;
    available_labels: { id: string; name: string }[];
    task_title: string;
    task_description?: string;
  };
  annotation_type: 'single_label' | 'multi_label';
  project_id: number;
}

interface ContributionData {
  id: number;
  task_id: number;
  user_id: string;
  submitted_data: {
    selected_labels: string | string[];
    annotation_notes?: string;
    rejection_reason?: string;
  };
  tasks: TaskData;
}

const ImageAnnotationValidationPage: React.FC = () => {
  const { contributionId } = useParams<{ contributionId: string }>();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project_id');
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingValidations, setPendingValidations] = useState<ValidationTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to access this page',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }
      setUserId(user.id);
    };
    
    fetchUser();
  }, [navigate, toast]);
  
  useEffect(() => {
    if (!userId) return;
    
    const fetchValidationTasks = async () => {
      setIsLoading(true);
      try {
        if (contributionId) {
          // Single contribution validation mode
          const { data, error } = await supabase
            .from('contributions')
            .select(`
              id,
              task_id,
              user_id,
              submitted_data,
              tasks:task_id (
                id,
                content,
                annotation_type,
                project_id
              )
            `)
            .eq('id', contributionId)
            .eq('status', 'pending_validation')
            .single();
            
          if (error) throw error;
          
          if (data) {
            // Check if this user is a validator for this project
            const { data: memberData, error: memberError } = await supabase
              .from('project_members')
              .select('role')
              .eq('project_id', data.tasks.project_id)
              .eq('user_id', userId)
              .eq('role', 'validator')
              .maybeSingle();
              
            if (memberError) throw memberError;
            
            // Ensure user is not validating their own work
            if (data.user_id === userId) {
              toast({
                title: 'Validation Restricted',
                description: 'You cannot validate your own annotations',
                variant: 'destructive',
              });
              navigate('/dashboard');
              return;
            }
            
            // Ensure user is a validator
            if (!memberData) {
              // Check if user is the project owner
              const { data: projectData } = await supabase
                .from('projects')
                .select('created_by')
                .eq('id', data.tasks.project_id)
                .single();
                
              if (projectData?.created_by !== userId) {
                toast({
                  title: 'Access Denied',
                  description: 'You must be a validator to review annotations',
                  variant: 'destructive',
                });
                navigate('/dashboard');
                return;
              }
            }
            
            // Map to validation task format
            const task: ValidationTask = {
              contributionId: data.id,
              taskId: data.task_id,
              imageUrl: data.tasks.content.image_url,
              annotationType: data.tasks.annotation_type,
              annotatorSelection: data.submitted_data.selected_labels,
              availableLabels: data.tasks.content.available_labels,
              annotationNotes: data.submitted_data.annotation_notes,
              title: data.tasks.content.task_title || `Task #${data.task_id}`,
              description: data.tasks.content.task_description,
              annotatorId: data.user_id,
              submittedData: data.submitted_data,
            };
            
            setPendingValidations([task]);
          }
        } else if (projectId) {
          // Project batch validation mode
          // First check if user is a validator for this project
          const { data: memberData, error: memberError } = await supabase
            .from('project_members')
            .select('role')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .eq('role', 'validator')
            .maybeSingle();
            
          if (memberError) throw memberError;
          
          if (!memberData) {
            // Check if user is the project owner
            const { data: projectData } = await supabase
              .from('projects')
              .select('created_by')
              .eq('id', projectId)
              .single();
              
            if (projectData?.created_by !== userId) {
              toast({
                title: 'Access Denied',
                description: 'You must be a validator to review annotations',
                variant: 'destructive',
              });
              navigate('/dashboard');
              return;
            }
          }
          
          // Fetch tasks that need validation in this project
          const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('id')
            .eq('project_id', projectId)
            .eq('type', 'image_annotation');
            
          if (tasksError) throw tasksError;
          
          if (tasks && tasks.length > 0) {
            const taskIds = tasks.map(t => t.id);
            
            // Get contributions pending validation for these tasks
            const { data: contributions, error: contribError } = await supabase
              .from('contributions')
              .select(`
                id,
                task_id,
                user_id,
                submitted_data,
                tasks:task_id (
                  id,
                  content,
                  annotation_type,
                  project_id
                )
              `)
              .in('task_id', taskIds)
              .eq('status', 'pending_validation')
              .neq('user_id', userId); // Don't validate your own work
              
            if (contribError) throw contribError;
            
            if (contributions && contributions.length > 0) {
              // Map to validation tasks
              const validationTasks: ValidationTask[] = contributions.map(data => ({
                contributionId: data.id,
                taskId: data.task_id,
                imageUrl: data.tasks.content.image_url,
                annotationType: data.tasks.annotation_type,
                annotatorSelection: data.submitted_data.selected_labels,
                availableLabels: data.tasks.content.available_labels,
                annotationNotes: data.submitted_data.annotation_notes,
                title: data.tasks.content.task_title || `Task #${data.task_id}`,
                description: data.tasks.content.task_description,
                annotatorId: data.user_id,
                submittedData: data.submitted_data,
              }));
              
              setPendingValidations(validationTasks);
            } else {
              toast({
                title: 'No Pending Validations',
                description: 'There are no annotations pending validation for this project',
              });
            }
          } else {
            toast({
              title: 'No Tasks',
              description: 'No image annotation tasks found for this project',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Missing Parameters',
            description: 'No contribution or project specified for validation',
            variant: 'destructive',
          });
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching validation tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to load validation tasks',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchValidationTasks();
  }, [userId, contributionId, projectId, navigate, toast]);
  
  const handleApprove = async () => {
    if (!userId || pendingValidations.length === 0) return;
    
    const current = pendingValidations[currentIndex];
    
    try {
      // Insert validation record
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          contribution_id: current.contributionId,
          validator_id: userId,
          is_valid: true,
          feedback: null,
        });
        
      if (validationError) throw validationError;
      
      // Update contribution status
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ status: 'validated' })
        .eq('id', current.contributionId);
        
      if (updateError) throw updateError;
      
      // Go to next validation if available
      if (currentIndex < pendingValidations.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast({
          title: 'All Validations Complete',
          description: 'You have completed all pending validations',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error approving annotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve annotation',
        variant: 'destructive',
      });
    }
  };
  
  const handleReject = async (reason: string) => {
    if (!userId || pendingValidations.length === 0) return;
    
    const current = pendingValidations[currentIndex];
    
    try {
      // Insert validation record
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          contribution_id: current.contributionId,
          validator_id: userId,
          is_valid: false,
          feedback: reason,
        });
        
      if (validationError) throw validationError;
      
      // Update contribution status and add rejection reason
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ 
          status: 'rejected',
          submitted_data: {
            ...current.submitted_data,
            rejection_reason: reason,
          }
        })
        .eq('id', current.contributionId);
        
      if (updateError) throw updateError;
      
      // Go to next validation if available
      if (currentIndex < pendingValidations.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast({
          title: 'All Validations Complete',
          description: 'You have completed all pending validations',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error rejecting annotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject annotation',
        variant: 'destructive',
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading validation tasks...</p>
      </div>
    );
  }
  
  if (pendingValidations.length === 0) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">No Pending Validations</h2>
        <p className="text-muted-foreground mb-6">There are no image annotations that need validation.</p>
        <Button onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }
  
  const currentTask = pendingValidations[currentIndex];
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Validate Annotation</h1>
        </div>
        
        {pendingValidations.length > 1 && (
          <div className="text-sm text-muted-foreground">
            Validating {currentIndex + 1} of {pendingValidations.length}
          </div>
        )}
      </div>
      
      {pendingValidations.length > 1 && (
        <div className="max-w-5xl mx-auto mb-4">
          <Progress 
            value={((currentIndex + 1) / pendingValidations.length) * 100} 
            className="h-2" 
          />
        </div>
      )}
      
      <div className="max-w-5xl mx-auto">
        <ImageAnnotationValidation
          contributionId={currentTask.contributionId}
          imageUrl={currentTask.imageUrl}
          annotationType={currentTask.annotationType}
          annotatorSelection={currentTask.annotatorSelection}
          availableLabels={currentTask.availableLabels}
          annotationNotes={currentTask.annotationNotes}
          title={currentTask.title}
          description={currentTask.description}
          onApprove={handleApprove}
          onReject={handleReject}
        />
        
        {pendingValidations.length > 1 && (
          <div className="mt-6 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setCurrentIndex(Math.min(pendingValidations.length - 1, currentIndex + 1))}
              disabled={currentIndex === pendingValidations.length - 1}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageAnnotationValidationPage; 