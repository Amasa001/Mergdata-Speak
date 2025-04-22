/**
 * Utilities for task validation and status management
 */
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { validateStatusTransition, validateTaskSubmission } from './validationUtils';
import { mutate } from 'swr';

export type TaskType = 'asr' | 'tts' | 'transcription' | 'translation' | 'validation';

export interface TaskMetadata {
  language?: string;
  dialect?: string;
  speaker?: {
    age?: number;
    gender?: string;
    accent?: string;
  };
  recording?: {
    environment?: string;
    device?: string;
    quality?: string;
  };
  text?: {
    domain?: string;
    sentiment?: string;
    complexity?: string;
    formality?: string;
  };
}

export interface Task {
  id: string;
  project_id: string;
  type: TaskType;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  assigned_to?: string;
  priority: number;
  metadata?: TaskMetadata;
  source_url?: string;
  target_url?: string;
  source_text?: string;
  target_text?: string;
}

export type TaskStatus = 
  | 'draft'      // Task is created but not yet ready for contributions
  | 'open'       // Task is available for contributions
  | 'in_progress' // Task is being worked on
  | 'completed'  // Task has been completed
  | 'verified'   // Task has been verified/validated
  | 'rejected'   // Task has been rejected
  | 'archived';  // Task is archived and no longer active

export const taskStatusMap: Record<TaskStatus, { label: string, color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-300' },
  open: { label: 'Open', color: 'bg-blue-300' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-300' },
  completed: { label: 'Completed', color: 'bg-green-300' },
  verified: { label: 'Verified', color: 'bg-green-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500' },
  archived: { label: 'Archived', color: 'bg-gray-500' }
};

/**
 * Validate if a user can contribute to a task
 * @param taskId - The ID of the task
 * @param userId - The ID of the user
 * @returns Promise resolving to boolean indicating if user can contribute
 */
export async function canUserContributeToTask(taskId: string, userId: string): Promise<boolean> {
  // Check if task exists and is open
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('status, type, project_id, assigned_to')
    .eq('id', taskId)
    .single();
  
  if (taskError || !task) {
    console.error('Error fetching task:', taskError);
    return false;
  }
  
  // Check task status
  if (task.status !== 'open' && task.status !== 'in_progress') {
    return false;
  }
  
  // If task is assigned, check if assigned to this user
  if (task.assigned_to && task.assigned_to !== userId) {
    return false;
  }
  
  // Check if user has permission for this project
  const { data: projectUser, error: projectUserError } = await supabase
    .from('project_users')
    .select('role')
    .eq('project_id', task.project_id)
    .eq('user_id', userId)
    .single();
  
  if (projectUserError || !projectUser) {
    console.error('Error fetching project user:', projectUserError);
    return false;
  }
  
  return true;
}

/**
 * Update task status with proper error handling and optimistic updates
 * @param taskId - The ID of the task
 * @param status - The new status
 * @param userId - Optional user ID making the change
 * @param metadata - Optional metadata updates
 * @returns Promise resolving to success state
 */
export async function updateTaskStatus(
  taskId: string, 
  status: TaskStatus, 
  userId?: string,
  metadata?: Partial<TaskMetadata>
): Promise<boolean> {
  try {
    // Get current task data if we need to track status change
    let currentStatus: TaskStatus | null = null;
    
    if (userId) {
      // Get current task data for validation
      const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (fetchError || !task) {
        toast.error('Error finding task details');
        return false;
      }
      
      currentStatus = task.status as TaskStatus;
      
      // Validate the status transition
      const validationResult = await validateStatusTransition(
        taskId,
        currentStatus,
        status,
        userId
      );
      
      if (!validationResult.isValid) {
        toast.error(validationResult.errors[0] || 'Invalid status transition');
        return false;
      }
    }
    
    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // Add userId if provided
    if (userId) {
      updateData.updated_by = userId;
      // Auto-assign in-progress tasks to the user who starts them
      if (status === 'in_progress' && currentStatus === 'open') {
        updateData.assigned_to = userId;
      }
    }
    
    if (metadata) {
      // Fetch current metadata first if not already fetched
      if (!currentStatus) {
        const { data: currentTask, error: fetchError } = await supabase
          .from('tasks')
          .select('metadata')
          .eq('id', taskId)
          .single();
        
        if (fetchError) throw fetchError;
        
        // Merge with existing metadata
        updateData.metadata = {
          ...(currentTask?.metadata || {}),
          ...metadata
        };
      } else {
        // We already have the task data from earlier
        const { data: currentTask, error: fetchError } = await supabase
          .from('tasks')
          .select('metadata')
          .eq('id', taskId)
          .single();
        
        if (!fetchError && currentTask) {
          updateData.metadata = {
            ...(currentTask?.metadata || {}),
            ...metadata
          };
        } else {
          updateData.metadata = metadata;
        }
      }
    }
    
    // Perform the update
    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);
    
    if (updateError) {
      toast.error('Error updating task status: ' + updateError.message);
      return false;
    }
    
    // Create status history entry if we have a userId and current status
    if (userId && currentStatus) {
      const { error: historyError } = await supabase
        .from('task_status_history')
        .insert({
          task_id: taskId,
          from_status: currentStatus,
          to_status: status,
          changed_by: userId,
          notes: `Status changed from ${currentStatus} to ${status}`
        });
      
      if (historyError) {
        console.error('Error recording status history:', historyError);
        // Continue despite history error
      }
      
      // Trigger task data revalidation
      mutate(`/api/tasks/${taskId}`);
      mutate('/api/tasks'); // Refresh task lists
      
      toast.success(`Task status updated to ${taskStatusMap[status]?.label || status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating task status:', error);
    toast.error('Failed to update task status. Please try again.');
    return false;
  }
}

/**
 * Log task activity for auditing and analytics
 * @param taskId - The ID of the task
 * @param userId - The ID of the user
 * @param action - The action performed
 * @param details - Additional details about the action
 */
export async function logTaskActivity(
  taskId: string,
  userId: string,
  action: 'view' | 'start' | 'submit' | 'complete' | 'reject' | 'verify',
  details?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('task_activities').insert({
      task_id: taskId,
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging task activity:', error);
    // Non-blocking error - don't show to user
  }
}

/**
 * Get tasks for a project with proper filtering and sorting
 * @param projectId - The ID of the project
 * @param filters - Optional filters to apply
 * @returns Promise resolving to array of tasks
 */
export async function getProjectTasks(
  projectId: string,
  filters?: {
    status?: TaskStatus | TaskStatus[];
    type?: TaskType | TaskType[];
    assignedTo?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<Task[]> {
  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId);
    
    // Apply filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    
    if (filters?.type) {
      if (Array.isArray(filters.type)) {
        query = query.in('type', filters.type);
      } else {
        query = query.eq('type', filters.type);
      }
    }
    
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    
    // Apply sorting
    if (filters?.sortBy) {
      query = query.order(
        filters.sortBy, 
        { ascending: filters.sortOrder !== 'desc' }
      );
    } else {
      // Default sort by priority and creation date
      query = query.order('priority', { ascending: false })
                   .order('created_at', { ascending: false });
    }
    
    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data as Task[];
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    toast.error('Failed to load tasks. Please try again.');
    return [];
  }
}

/**
 * Update task progress and revalidate related tasks
 * @param taskId - The ID of the task
 * @param projectId - The ID of the project
 * @param progress - Progress value between 0 and 100
 */
export async function updateTaskProgress(
  taskId: string,
  projectId: string,
  progress: number
): Promise<void> {
  try {
    // Update the task progress
    await supabase
      .from('tasks')
      .update({
        progress: Math.min(Math.max(progress, 0), 100), // Ensure between 0-100
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
    
    // If task is complete (progress = 100), revalidate related tasks
    if (progress >= 100) {
      // Get task details
      const { data: task } = await supabase
        .from('tasks')
        .select('type, source_url, target_url')
        .eq('id', taskId)
        .single();
      
      if (task) {
        // Find related tasks that depend on this one
        const { data: relatedTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('project_id', projectId)
          .or(`source_url.eq.${task.target_url},target_url.eq.${task.source_url}`);
        
        // Update status of related tasks to open if they were waiting
        if (relatedTasks && relatedTasks.length > 0) {
          const relatedTaskIds = relatedTasks.map(t => t.id);
          await supabase
            .from('tasks')
            .update({
              status: 'open',
              updated_at: new Date().toISOString()
            })
            .in('id', relatedTaskIds)
            .eq('status', 'draft');
        }
      }
    }
  } catch (error) {
    console.error('Error updating task progress:', error);
  }
}

/**
 * Task utilities for managing task status, transitions, and batch operations
 */

/**
 * Batch update multiple tasks' statuses
 * @param taskIds - Array of task IDs to update
 * @param newStatus - The new status to set for all tasks
 * @param userId - The ID of the user making the changes
 * @returns Promise resolving to success status and results
 */
export async function batchUpdateTaskStatus(
  taskIds: string[],
  newStatus: TaskStatus,
  userId: string
): Promise<{ success: boolean, results: Record<string, boolean> }> {
  const results: Record<string, boolean> = {};
  let allSuccessful = true;
  
  try {
    // Process tasks in parallel with individual validation
    const updatePromises = taskIds.map(async (taskId) => {
      const success = await updateTaskStatus(taskId, newStatus, userId);
      results[taskId] = success;
      if (!success) allSuccessful = false;
      return { taskId, success };
    });
    
    await Promise.all(updatePromises);
    
    // Final notification
    if (allSuccessful) {
      toast.success(`Updated all ${taskIds.length} tasks successfully`);
    } else {
      const successCount = Object.values(results).filter(Boolean).length;
      toast.error(`Updated ${successCount} of ${taskIds.length} tasks. Some updates failed.`);
    }
    
    // Trigger task list revalidation
    mutate('/api/tasks');
    
    return { success: allSuccessful, results };
  } catch (error) {
    console.error('Error in batchUpdateTaskStatus:', error);
    toast.error('Error processing batch update');
    return { success: false, results };
  }
}

/**
 * Create a new task with validation
 * @param taskData - The task data to create
 * @param userId - The ID of the user creating the task
 * @returns Promise resolving to the created task ID or null
 */
export async function createTask(
  taskData: Partial<Record<string, any>>,
  userId: string
): Promise<string | null> {
  try {
    // Set defaults and metadata
    const newTask = {
      ...taskData,
      status: 'draft' as TaskStatus,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: userId
    };
    
    // Create the task
    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();
    
    if (error) {
      toast.error('Error creating task: ' + error.message);
      return null;
    }
    
    // Create initial status history entry
    await supabase
      .from('task_status_history')
      .insert({
        task_id: data.id,
        from_status: null,
        to_status: 'draft',
        changed_by: userId,
        notes: 'Task created'
      });
    
    // Trigger task list revalidation
    mutate('/api/tasks');
    
    toast.success('Task created successfully');
    return data.id;
  } catch (error) {
    console.error('Error in createTask:', error);
    toast.error('Failed to create task');
    return null;
  }
}

/**
 * Update a task's content with validation
 * @param taskId - The ID of the task to update
 * @param taskData - The task data to update
 * @param userId - The ID of the user making the update
 * @returns Promise resolving to success status
 */
export async function updateTaskContent(
  taskId: string,
  taskData: Partial<Record<string, any>>,
  userId: string
): Promise<boolean> {
  try {
    // Get current task for validation
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (fetchError || !task) {
      toast.error('Error finding task details');
      return false;
    }
    
    // Check if user has permission to modify
    if (task.created_by !== userId && task.assigned_to !== userId) {
      const { data: permissions } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', task.project_id)
        .eq('user_id', userId)
        .single();
      
      if (!permissions || !['admin', 'manager'].includes(permissions.role)) {
        toast.error('You do not have permission to modify this task');
        return false;
      }
    }
    
    // Validate content if completing task
    const updatingToCompleted = 
      taskData.status === 'completed' && task.status !== 'completed';
    
    if (updatingToCompleted) {
      const mergedData = { ...task, ...taskData };
      const validationResult = await validateTaskSubmission(taskId, mergedData);
      
      if (!validationResult.isValid) {
        toast.error(validationResult.errors[0] || 'Task validation failed');
        return false;
      }
    }
    
    // Update task content
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        ...taskData,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', taskId);
    
    if (updateError) {
      toast.error('Error updating task: ' + updateError.message);
      return false;
    }
    
    // Create history entry if status changed
    if (taskData.status && taskData.status !== task.status) {
      await supabase
        .from('task_status_history')
        .insert({
          task_id: taskId,
          from_status: task.status,
          to_status: taskData.status,
          changed_by: userId,
          notes: `Status changed from ${task.status} to ${taskData.status}`
        });
    }
    
    // Trigger task data revalidation
    mutate(`/api/tasks/${taskId}`);
    mutate('/api/tasks'); // Refresh task lists
    
    return true;
  } catch (error) {
    console.error('Error in updateTaskContent:', error);
    toast.error('Failed to update task');
    return false;
  }
}

/**
 * Get task with related data for detailed view
 * @param taskId - The ID of the task to retrieve
 * @returns Promise resolving to task data with related objects
 */
export async function getTaskWithRelations(
  taskId: string
): Promise<Record<string, any> | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        projects(id, name, source_language, target_language),
        created_by_user:created_by(id, name, email, avatar_url),
        assigned_to_user:assigned_to(id, name, email, avatar_url),
        task_status_history(*, changed_by_user:changed_by(id, name, email))
      `)
      .eq('id', taskId)
      .single();
    
    if (error) {
      console.error('Error fetching task with relations:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getTaskWithRelations:', error);
    return null;
  }
}

/**
 * Check if a user has permission to perform an action on a task
 * @param taskId - The ID of the task
 * @param userId - The ID of the user
 * @param action - The action being performed (view, edit, delete, etc.)
 * @returns Promise resolving to permission status
 */
export async function checkTaskPermission(
  taskId: string,
  userId: string,
  action: 'view' | 'edit' | 'delete' | 'transition'
): Promise<boolean> {
  try {
    // Get task data
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (error || !task) return false;
    
    // Check direct task relationships
    if (task.created_by === userId || task.assigned_to === userId) {
      // Task creator and assignee have view and edit permissions
      if (action === 'view' || action === 'edit') return true;
      
      // Only task creator can delete their own draft tasks
      if (action === 'delete' && task.created_by === userId && task.status === 'draft') {
        return true;
      }
    }
    
    // Check project-level permissions
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', task.project_id)
      .eq('user_id', userId)
      .single();
    
    if (!projectMember) return false;
    
    // Apply role-based permissions
    switch (projectMember.role) {
      case 'admin':
        // Admins can do anything
        return true;
      
      case 'manager':
        // Managers can do everything except delete verified tasks
        if (action === 'delete' && task.status === 'verified') return false;
        return true;
      
      case 'reviewer':
        // Reviewers can view all tasks, edit in_progress/completed tasks, 
        // and transition tasks to verified/rejected
        if (action === 'view') return true;
        if (action === 'transition' && ['completed'].includes(task.status)) return true;
        if (action === 'edit' && ['in_progress', 'completed'].includes(task.status)) return true;
        return false;
      
      case 'contributor':
        // Contributors can view open tasks and edit tasks assigned to them
        if (action === 'view' && ['open', 'in_progress'].includes(task.status)) return true;
        if (action === 'edit' && task.assigned_to === userId) return true;
        if (action === 'transition' && task.assigned_to === userId) return true;
        return false;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking task permission:', error);
  }
}

/**
 * Check if a user has permission to contribute to a specific task
 * @param userId - The ID of the user
 * @param taskId - The ID of the task
 * @param taskType - The type of task
 * @returns Promise resolving to permission result with reason
 */
export async function validateUserTaskPermission(
  userId: string,
  taskId: number | string,
  taskType?: TaskType
): Promise<{ hasPermission: boolean; error?: string }> {
  try {
    // First check if the task exists
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('project_id, status, assigned_to, type')
      .eq('id', taskId)
      .single();
    
    if (taskError || !task) {
      return {
        hasPermission: false,
        error: `Task not found: ${taskError?.message || 'Unknown error'}`
      };
    }
    
    // Verify task type if provided
    if (taskType && task.type !== taskType) {
      return {
        hasPermission: false,
        error: `Task is not of type ${taskType}`
      };
    }
    
    // Tasks that are not open cannot be contributed to
    if (task.status !== 'open' && task.status !== 'in_progress') {
      return {
        hasPermission: false,
        error: `Task is not available for contributions (status: ${task.status})`
      };
    }
    
    // If task is assigned to a specific user, check that
    if (task.assigned_to && task.assigned_to !== userId) {
      return {
        hasPermission: false,
        error: 'Task is assigned to another user'
      };
    }
    
    // Check project membership
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', task.project_id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (membershipError) {
      return {
        hasPermission: false,
        error: `Error checking project membership: ${membershipError.message}`
      };
    }
    
    if (!membership) {
      return {
        hasPermission: false,
        error: 'You are not a member of this project'
      };
    }
    
    return { hasPermission: true };
  } catch (error) {
    console.error('Error validating user task permission:', error);
    return {
      hasPermission: false,
      error: error instanceof Error ? error.message : 'Unknown error checking permission'
    };
  }
}

/**
 * Check if a task is valid for contribution
 * @param taskId - The ID of the task to check
 * @returns Promise resolving to validation result
 */
export async function validateTaskForContribution(
  taskId: number | string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if task exists and is in a valid state
    const { data: task, error } = await supabase
      .from('tasks')
      .select('status, type, max_contributions, metadata')
      .eq('id', taskId)
      .single();
    
    if (error || !task) {
      return {
        valid: false,
        error: `Task not found or error: ${error?.message || 'Unknown error'}`
      };
    }
    
    // Only open or in_progress tasks can be contributed to
    if (task.status !== 'open' && task.status !== 'in_progress') {
      return {
        valid: false,
        error: `Task is not available for contributions (status: ${task.status})`
      };
    }
    
    // Check if the task has reached maximum contributions
    if (task.max_contributions) {
      const { count, error: countError } = await supabase
        .from('contributions')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId);
      
      if (countError) {
        return {
          valid: false,
          error: `Error counting contributions: ${countError.message}`
        };
      }
      
      if (count && count >= task.max_contributions) {
        return {
          valid: false,
          error: 'Maximum number of contributions reached for this task'
        };
      }
    }
    
    // Check if this task is already completed by checking for accepted contributions
    const { count: completedCount, error: completedError } = await supabase
      .from('contributions')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', taskId)
      .eq('status', 'accepted');
    
    if (!completedError && completedCount && completedCount > 0) {
      return {
        valid: false,
        error: 'This task has already been completed'
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating task for contribution:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error validating task'
    };
  }
}

/**
 * Mark a task as completed when a contribution is accepted
 * @param taskId - The ID of the task
 * @param contributionId - The ID of the accepted contribution
 * @param userId - The user marking the task complete
 * @returns Promise resolving to a success indicator
 */
export async function markTaskComplete(
  taskId: number | string,
  contributionId: number | string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current task status
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('status, type')
      .eq('id', taskId)
      .single();
    
    if (taskError) {
      return {
        success: false,
        error: `Failed to find task: ${taskError.message}`
      };
    }
    
    // Check if task is already completed
    if (task.status === 'completed' || task.status === 'verified') {
      return {
        success: false,
        error: 'Task is already completed or verified'
      };
    }
    
    // Begin transaction with RLS and data integrity in mind
    const updates = [];
    
    // 1. Update the task status to completed
    updates.push(
      supabase
        .from('tasks')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          completed_by: userId,
          completed_contribution_id: contributionId
        })
        .eq('id', taskId)
        .neq('status', 'completed')
        .neq('status', 'verified')
    );
    
    // 2. Update the contribution status to accepted
    updates.push(
      supabase
        .from('contributions')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
          accepted_by: userId
        })
        .eq('id', contributionId)
    );
    
    // 3. Create a record in the task history
    updates.push(
      supabase
        .from('task_status_history')
        .insert({
          task_id: taskId,
          from_status: task.status,
          to_status: 'completed',
          changed_by: userId,
          contribution_id: contributionId,
          notes: `Task completed with contribution #${contributionId}`
        })
    );
    
    // Execute all updates
    const results = await Promise.all(updates);
    const errors = results
      .map((result, index) => result.error ? `Update ${index + 1} failed: ${result.error.message}` : null)
      .filter(Boolean);
    
    if (errors.length > 0) {
      return {
        success: false,
        error: `Failed to complete task: ${errors.join('; ')}`
      };
    }
    
    // Success! Trigger revalidation
    if (typeof window !== 'undefined') {
      mutate(`/api/tasks/${taskId}`);
      mutate('/api/tasks');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking task complete:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error completing task'
    };
  }
}

/**
 * Mark a task as validated
 * @param taskId - The ID of the task
 * @param validationId - The ID of the validation record
 * @param userId - The user validating the task
 * @returns Promise resolving to a success indicator
 */
export async function markTaskValidated(
  taskId: number | string,
  validationId: number | string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current task status
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('status, type, completed_contribution_id')
      .eq('id', taskId)
      .single();
    
    if (taskError) {
      return {
        success: false,
        error: `Failed to find task: ${taskError.message}`
      };
    }
    
    // Check if task is in a valid state for validation
    if (task.status !== 'completed') {
      return {
        success: false,
        error: `Cannot validate a task that is not completed (current status: ${task.status})`
      };
    }
    
    // Check if a validation already exists
    if (!task.completed_contribution_id) {
      return {
        success: false,
        error: 'Cannot validate a task without a completed contribution'
      };
    }
    
    // Check if this validation is for the task's completed contribution
    const { data: validation, error: validationError } = await supabase
      .from('validations')
      .select('contribution_id')
      .eq('id', validationId)
      .single();
    
    if (validationError) {
      return {
        success: false,
        error: `Failed to find validation: ${validationError.message}`
      };
    }
    
    if (validation.contribution_id != task.completed_contribution_id) {
      return {
        success: false,
        error: 'Validation is not for the accepted contribution of this task'
      };
    }
    
    // Begin transaction
    const updates = [];
    
    // 1. Update the task status to verified
    updates.push(
      supabase
        .from('tasks')
        .update({
          status: 'verified',
          updated_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          verified_by: userId,
          validation_id: validationId
        })
        .eq('id', taskId)
        .eq('status', 'completed')
    );
    
    // 2. Update the validation status
    updates.push(
      supabase
        .from('validations')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', validationId)
    );
    
    // 3. Create a record in the task history
    updates.push(
      supabase
        .from('task_status_history')
        .insert({
          task_id: taskId,
          from_status: 'completed',
          to_status: 'verified',
          changed_by: userId,
          validation_id: validationId,
          notes: `Task verified with validation #${validationId}`
        })
    );
    
    // Execute all updates
    const results = await Promise.all(updates);
    const errors = results
      .map((result, index) => result.error ? `Update ${index + 1} failed: ${result.error.message}` : null)
      .filter(Boolean);
    
    if (errors.length > 0) {
      return {
        success: false,
        error: `Failed to validate task: ${errors.join('; ')}`
      };
    }
    
    // Success! Trigger revalidation
    if (typeof window !== 'undefined') {
      mutate(`/api/tasks/${taskId}`);
      mutate('/api/tasks');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking task validated:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error validating task'
    };
  }
}

/**
 * Fetch tasks available for a user to work on
 * @param userId - The ID of the user
 * @param projectId - Optional project ID to filter by
 * @param taskType - Optional task type to filter by
 * @param limit - Maximum number of tasks to return (default: 20)
 * @returns Promise resolving to array of available tasks
 */
export async function getAvailableTasksForUser(
  userId: string,
  projectId?: number | string,
  taskType?: TaskType,
  limit: number = 20
): Promise<Task[]> {
  try {
    // Build query for available tasks
    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:project_id(id, name, source_language, target_languages),
        contributions:contributions!tasks_id_fkey(id, status, user_id)
      `)
      .in('status', ['open', 'in_progress'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);
    
    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    if (taskType) {
      query = query.eq('type', taskType);
    }
    
    const { data: tasks, error } = await query;
    
    if (error) {
      console.error('Error fetching available tasks:', error);
      return [];
    }
    
    if (!tasks || tasks.length === 0) {
      return [];
    }
    
    // Filter tasks that the user can't work on
    const availableTasks = tasks.filter(task => {
      // Skip tasks that are assigned to another user
      if (task.assigned_to && task.assigned_to !== userId) {
        return false;
      }
      
      // Skip tasks the user has already contributed to
      const userContributions = task.contributions.filter(
        (contrib: any) => contrib.user_id === userId
      );
      
      if (userContributions.length > 0) {
        return false;
      }
      
      // Skip tasks with accepted contributions (task effectively completed)
      const acceptedContributions = task.contributions.filter(
        (contrib: any) => ['accepted', 'validated'].includes(contrib.status)
      );
      
      if (acceptedContributions.length > 0) {
        return false;
      }
      
      return true;
    });
    
    return availableTasks;
  } catch (error) {
    console.error('Error in getAvailableTasksForUser:', error);
    return [];
  }
}

/**
 * Fetch validation tasks available for a user
 * @param userId - The ID of the user
 * @param taskType - Optional task type to filter by
 * @param limit - Maximum number of tasks to return (default: 20)
 * @returns Promise resolving to array of available validation tasks
 */
export async function getAvailableValidationTasksForUser(
  userId: string,
  taskType?: TaskType,
  limit: number = 20
): Promise<{
  task: Task;
  contribution: Record<string, any>;
}[]> {
  try {
    // Get projects the user is a validator for
    const { data: userProjects, error: projectError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .in('role', ['validator', 'admin', 'owner']);
    
    if (projectError || !userProjects || userProjects.length === 0) {
      return [];
    }
    
    const projectIds = userProjects.map(p => p.project_id);
    
    // Get completed tasks with contributions ready for validation
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        completed_contribution:completed_contribution_id(
          id, user_id, status, storage_url, submitted_data
        ),
        validations:validations!validations_task_id_fkey(
          id, user_id, status
        )
      `)
      .eq('status', 'completed')
      .in('project_id', projectIds)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (taskError || !tasks) {
      console.error('Error fetching validation tasks:', taskError);
      return [];
    }
    
    // Filter tasks by type if specified
    let filteredTasks = tasks;
    if (taskType) {
      filteredTasks = tasks.filter(task => task.type === taskType);
    }
    
    // Filter tasks to only those that:
    // 1. Have a completed contribution
    // 2. Haven't been validated by this user
    // 3. Don't already have an accepted validation
    const availableValidationTasks = filteredTasks
      .filter(task => {
        // Must have a completed contribution
        if (!task.completed_contribution) return false;
        
        // Skip if user is the original contributor (can't validate own work)
        if (task.completed_contribution.user_id === userId) return false;
        
        // Check if this user has already validated this task
        const userValidations = task.validations.filter(
          (v: any) => v.user_id === userId
        );
        if (userValidations.length > 0) return false;
        
        // Check if task already has an accepted validation
        const acceptedValidations = task.validations.filter(
          (v: any) => v.status === 'accepted'
        );
        if (acceptedValidations.length > 0) return false;
        
        return true;
      })
      .map(task => ({
        task,
        contribution: task.completed_contribution
      }));
    
    return availableValidationTasks;
  } catch (error) {
    console.error('Error in getAvailableValidationTasksForUser:', error);
    return [];
  }
}

