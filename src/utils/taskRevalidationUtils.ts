/**
 * Task revalidation utilities to improve workflow reliability
 */
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import { TaskType, TaskStatus } from './taskUtils';

// Keys for SWR cache invalidation
export const TASK_CACHE_KEYS = {
  ALL_TASKS: 'all-tasks',
  USER_TASKS: (userId: string) => `user-tasks-${userId}`,
  PROJECT_TASKS: (projectId: string) => `project-tasks-${projectId}`,
  TASK_DETAIL: (taskId: string) => `task-${taskId}`
};

// Task state transition validations for workflow management
// Note: This is a custom implementation that extends the base TaskStatus
// with additional workflow states for finer-grained control
type WorkflowTaskStatus = TaskStatus | 'new' | 'review' | 'approved' | 'revision' | 'cancelled';

const VALID_TRANSITIONS: Record<WorkflowTaskStatus, WorkflowTaskStatus[]> = {
  // Base TaskStatus transitions
  'draft': ['open', 'archived'],
  'open': ['in_progress', 'archived'],
  'in_progress': ['completed', 'open', 'archived'],
  'completed': ['verified', 'rejected', 'archived'],
  'verified': ['archived'],
  'rejected': ['open', 'in_progress', 'archived'],
  'archived': ['open'],
  
  // Extended workflow transitions
  'new': ['in_progress', 'rejected', 'cancelled'],
  'review': ['approved', 'revision', 'rejected'],
  'approved': ['completed', 'archived'],
  'revision': ['in_progress', 'rejected', 'cancelled'],
  'cancelled': ['archived']
};

/**
 * Validate a task status transition
 * @param currentStatus - The current task status
 * @param newStatus - The proposed new status
 * @returns Whether the transition is valid
 */
export function validateStatusTransition(
  currentStatus: WorkflowTaskStatus,
  newStatus: WorkflowTaskStatus
): boolean {
  // Allow same status (no change)
  if (currentStatus === newStatus) return true;
  
  // Check if the transition is valid
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

/**
 * Get required fields for a given task type and status
 * @param taskType - The task type
 * @param status - The task status (optional)
 * @returns Array of required field names
 */
export function getRequiredFields(
  taskType: TaskType,
  status?: WorkflowTaskStatus
): string[] {
  // Base required fields for all tasks
  const baseFields = ['title', 'description', 'assigned_to'];
  
  // Type-specific fields
  const typeFields: Record<string, string[]> = {
    'translation': ['source_language', 'target_language', 'word_count'],
    'transcription': ['source_language', 'audio_duration'],
    'asr': ['source_language', 'audio_duration'],
    'tts': ['source_text', 'target_language'],
    'validation': ['source_text', 'rating'],
    // Additional task types
    'annotation': ['annotation_type', 'content_type'],
    'review': ['review_type', 'original_task_id'],
    'other': []
  };
  
  // Status-specific fields
  const statusFields: Partial<Record<string, string[]>> = {
    'review': ['reviewer_id'],
    'complete': ['completion_note'],
    'completed': ['completion_note'],
    'revision': ['revision_note']
  };
  
  // Combine all required fields
  let requiredFields = [...baseFields, ...(typeFields[taskType] || [])];
  
  // Add status-specific fields if status is provided
  if (status && statusFields[status]) {
    requiredFields = [...requiredFields, ...(statusFields[status] || [])];
  }
  
  return requiredFields;
}

/**
 * Validate task data completeness for a status transition
 * @param taskData - The task data to validate
 * @param targetStatus - The target status to validate against
 * @returns Validation result with missing fields if any
 */
export function validateTaskCompleteness(
  taskData: any,
  targetStatus?: WorkflowTaskStatus
): { 
  isValid: boolean;
  missingFields: string[];
} {
  if (!taskData.type) {
    return {
      isValid: false,
      missingFields: ['type']
    };
  }
  
  const status = targetStatus || taskData.status;
  const requiredFields = getRequiredFields(taskData.type, status);
  
  const missingFields = requiredFields.filter(field => {
    // Handle nested fields with dot notation
    if (field.includes('.')) {
      const parts = field.split('.');
      let value = taskData;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined || value === null || value === '') {
          return true;
        }
      }
      return false;
    }
    
    return taskData[field] === undefined || 
           taskData[field] === null || 
           taskData[field] === '';
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Hook for task cache revalidation
 * @returns Revalidation functions
 */
export function useTaskRevalidation() {
  const { mutate } = useSWRConfig();
  
  /**
   * Revalidate all task-related caches
   */
  const revalidateAllTasks = () => {
    mutate(key => typeof key === 'string' && key.startsWith('task'));
    mutate(TASK_CACHE_KEYS.ALL_TASKS);
  };
  
  /**
   * Revalidate a specific task
   * @param taskId - The task ID to revalidate
   */
  const revalidateTask = (taskId: string) => {
    mutate(TASK_CACHE_KEYS.TASK_DETAIL(taskId));
  };
  
  /**
   * Revalidate tasks for a specific project
   * @param projectId - The project ID to revalidate
   */
  const revalidateProjectTasks = (projectId: string) => {
    mutate(TASK_CACHE_KEYS.PROJECT_TASKS(projectId));
  };
  
  /**
   * Revalidate tasks for a specific user
   * @param userId - The user ID to revalidate
   */
  const revalidateUserTasks = (userId: string) => {
    mutate(TASK_CACHE_KEYS.USER_TASKS(userId));
  };
  
  return {
    revalidateAllTasks,
    revalidateTask,
    revalidateProjectTasks,
    revalidateUserTasks
  };
}

/**
 * Check task database integrity and repair if needed
 * @param taskId - The task ID to check
 * @returns Promise resolving to repair result
 */
export async function ensureTaskIntegrity(
  taskId: string
): Promise<{ 
  success: boolean; 
  repaired: boolean; 
  message?: string 
}> {
  try {
    // Get task data
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:assigned_to(id, name, email),
        project:project_id(id, name),
        task_files(id, file_id),
        file_metadata:task_files(id, file_path, public_url)
      `)
      .eq('id', taskId)
      .single();
    
    if (error) {
      return {
        success: false,
        repaired: false,
        message: `Error retrieving task: ${error.message}`
      };
    }
    
    if (!task) {
      return {
        success: false,
        repaired: false,
        message: 'Task not found'
      };
    }
    
    let repaired = false;
    
    // Check task status consistency
    const { data: history } = await supabase
      .from('task_history')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const latestHistory = history?.[0];
    
    if (latestHistory && latestHistory.new_status !== task.status) {
      // Repair inconsistent status
      await supabase
        .from('tasks')
        .update({ status: latestHistory.new_status })
        .eq('id', taskId);
      
      repaired = true;
    }
    
    // Check file references integrity
    const fileIds = task.task_files?.map(tf => tf.file_id) || [];
    
    if (fileIds.length > 0) {
      const { data: files } = await supabase
        .from('file_metadata')
        .select('id')
        .in('id', fileIds);
      
      const foundFileIds = files?.map(f => f.id) || [];
      const missingFileIds = fileIds.filter(id => !foundFileIds.includes(id));
      
      if (missingFileIds.length > 0) {
        // Clean up orphaned file references
        await supabase
          .from('task_files')
          .delete()
          .eq('task_id', taskId)
          .in('file_id', missingFileIds);
        
        repaired = true;
      }
    }
    
    // Validate completeness based on status
    const completenessCheck = validateTaskCompleteness(task);
    
    if (!completenessCheck.isValid) {
      // Log the issue but don't automatically repair as it needs manual intervention
      console.warn(`Task ${taskId} has missing fields for status ${task.status}:`, 
        completenessCheck.missingFields);
    }
    
    return {
      success: true,
      repaired,
      message: repaired 
        ? 'Task data inconsistencies detected and repaired' 
        : 'Task data integrity verified'
    };
  } catch (error) {
    console.error('Error checking task integrity:', error);
    return {
      success: false,
      repaired: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batch revalidate all tasks for a project
 * @param projectId - The project ID to revalidate
 * @returns Promise resolving to revalidation result
 */
export async function batchRevalidateProjectTasks(
  projectId: string
): Promise<{
  success: boolean;
  repairedCount: number;
  totalChecked: number;
  message?: string;
}> {
  try {
    // Get all tasks for the project
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId);
    
    if (error) {
      return {
        success: false,
        repairedCount: 0,
        totalChecked: 0,
        message: `Error retrieving tasks: ${error.message}`
      };
    }
    
    let repairedCount = 0;
    const totalChecked = tasks?.length || 0;
    
    // Check integrity for each task
    for (const task of tasks || []) {
      const result = await ensureTaskIntegrity(task.id);
      if (result.repaired) {
        repairedCount++;
      }
    }
    
    return {
      success: true,
      repairedCount,
      totalChecked,
      message: `Checked ${totalChecked} tasks, repaired ${repairedCount}`
    };
  } catch (error) {
    console.error('Error in batch task revalidation:', error);
    return {
      success: false,
      repairedCount: 0,
      totalChecked: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 