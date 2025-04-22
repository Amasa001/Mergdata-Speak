/**
 * Utilities for project operations with transaction safety
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { Project, ProjectRole, ProjectStatus } from '@/types/project';
import { executeTransaction } from './transactionUtils';

/**
 * Interface for project deletion result
 */
export interface ProjectDeletionResult {
  success: boolean;
  error: string | null;
  deletedData: {
    validations: number;
    contributions: number;
    tasks: number;
    members: number;
    files: number;
  };
}

/**
 * Interface for project details
 */
export interface ProjectDetails extends Project {
  members?: Array<{
    id: number;
    user_id: string;
    role: ProjectRole;
    user_profile?: {
      full_name: string;
      email?: string;
    };
  }>;
}

/**
 * Interface for member management response
 */
export interface MemberManagementResult {
  success: boolean;
  error: string | null;
}

/**
 * Check if a user has permission to perform an action on a project
 * @param projectId - The ID of the project
 * @param userId - The ID of the user
 * @param action - The action being performed
 * @returns Promise resolving to permission status
 */
export async function checkProjectPermission(
  projectId: number,
  userId: string,
  action: 'view' | 'edit' | 'delete' | 'add_member' | 'remove_member' | 'add_task'
): Promise<boolean> {
  try {
    // Get project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('created_by, status')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) return false;
    
    // Project creator always has all permissions on active projects
    if (project.created_by === userId && project.status !== 'archived') {
      return true;
    }
    
    // Check project membership role
    const { data: membership, error: memberError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    
    if (memberError || !membership) return false;
    
    // Role-based permission checks
    switch (action) {
      case 'view':
        // All members can view
        return true;
      
      case 'edit':
        // Owner and admin can edit
        return ['owner', 'admin'].includes(membership.role);
      
      case 'delete':
        // Only owner can delete
        return membership.role === 'owner';
      
      case 'add_member':
      case 'remove_member':
        // Owner and admin can manage members
        return ['owner', 'admin'].includes(membership.role);
      
      case 'add_task':
        // Owner, admin, and contributor can add tasks
        return ['owner', 'admin', 'contributor'].includes(membership.role);
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking project permission:', error);
    return false;
  }
}

/**
 * Create a new project with owner membership in a transaction
 * @param projectData - Project data to create
 * @param userId - ID of the user creating the project
 * @returns Promise resolving to project ID or null
 */
export async function createProjectWithOwner(
  projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'> & { [key: string]: any },
  userId: string
): Promise<number | null> {
  const { data, error } = await executeTransaction(async (tx) => {
    // Create the project
    const { data: project, error: projectError } = await tx
      .from('projects')
      .insert({
        ...projectData,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (projectError) throw projectError;
    
    // Add creator as owner
    const { error: memberError } = await tx
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: userId,
        role: 'owner',
        created_at: new Date().toISOString()
      });
    
    if (memberError) throw memberError;
    
    return project.id;
  });
  
  if (error) {
    console.error('Error creating project:', error);
    return null;
  }
  
  return data;
}

/**
 * Update project settings and related data in a transaction
 * @param projectId - ID of the project to update
 * @param projectData - Updated project data
 * @param userId - ID of the user performing the update
 * @returns Promise resolving to success status
 */
export async function updateProjectSettings(
  projectId: number,
  projectData: Partial<Project> & { [key: string]: any },
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  // Check permission
  const hasPermission = await checkProjectPermission(projectId, userId, 'edit');
  if (!hasPermission) {
    return { 
      success: false, 
      error: 'You do not have permission to edit this project'
    };
  }
  
  // Execute transaction
  const { data, error } = await executeTransaction(async (tx) => {
    // Update the project
    const { error: updateError } = await tx
      .from('projects')
      .update({
        ...projectData,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);
    
    if (updateError) throw updateError;
    
    return true;
  });
  
  if (error) {
    console.error('Error updating project:', error);
    return { 
      success: false, 
      error: `Failed to update project: ${error.message}`
    };
  }
  
  return { success: true, error: null };
}

/**
 * Safely delete a project with all its associated data in a specific order to maintain referential integrity
 * @param projectId - The ID of the project to delete
 * @param userId - The ID of the user initiating the deletion
 * @returns Promise with deletion result
 */
export async function safelyDeleteProject(projectId: number, userId: string): Promise<ProjectDeletionResult> {
  const result: ProjectDeletionResult = {
    success: false,
    error: null,
    deletedData: {
      validations: 0,
      contributions: 0,
      tasks: 0,
      members: 0,
      files: 0
    }
  };
  
  // Variable to store original project status for rollback
  let originalProjectStatus: ProjectStatus = 'active';
  
  // Check if user has permission to delete this project
  try {
    // Get project details including current status
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('created_by, status')
      .eq('id', projectId)
      .single();
      
    if (projectError) {
      result.error = `Failed to fetch project data: ${projectError.message}`;
      return result;
    }
    
    // Store original status for rollback if needed
    originalProjectStatus = projectData.status as ProjectStatus;
    
    // Check if the project is already being archived/processed
    if (projectData.status === 'archived') {
      result.error = 'Project is already archived or being processed for deletion.';
      return result;
    }
    
    // Check if user is the owner
    if (projectData.created_by !== userId) {
      // If not owner, check if user is an admin
      const { data: userRole, error: roleError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();
        
      if (roleError || !userRole || userRole.role !== 'owner') {
        result.error = 'Permission denied: Only the project owner can delete this project';
        return result;
      }
    }
    
    // Mark project as archived to prevent access during deletion
    const { error: updateError } = await supabase
      .from('projects')
      .update({ status: 'archived' as ProjectStatus })
      .eq('id', projectId);
      
    if (updateError) {
      result.error = `Failed to mark project for deletion: ${updateError.message}`;
      return result;
    }
    
    // Step 1: Get all tasks associated with this project
    const { data: projectTasks, error: taskFetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId);
      
    if (taskFetchError) {
      // Restore the project status
      await supabase
        .from('projects')
        .update({ status: originalProjectStatus })
        .eq('id', projectId);
        
      result.error = `Failed to fetch tasks: ${taskFetchError.message}`;
      return result;
    }
    
    const taskIds = projectTasks?.map(task => task.id) || [];
    
    // If we have tasks, process their dependencies
    if (taskIds.length > 0) {
      // Step 2: Find all contributions associated with these tasks
      const { data: contributions, error: contribFetchError } = await supabase
        .from('contributions')
        .select('id, storage_url')
        .in('task_id', taskIds);
        
      if (contribFetchError) {
        // Restore the project status
        await supabase
          .from('projects')
          .update({ status: originalProjectStatus })
          .eq('id', projectId);
          
        result.error = `Failed to fetch contributions: ${contribFetchError.message}`;
        return result;
      }
      
      // Step 3: If we have contributions, delete their validations first
      if (contributions && contributions.length > 0) {
        const contributionIds = contributions.map(contribution => contribution.id);
        
        // Delete validations for these contributions
        const { data: deletedValidations, error: validationsError } = await supabase
          .from('validations')
          .delete()
          .in('contribution_id', contributionIds)
          .select('id');
        
        if (validationsError) {
          console.warn('Error deleting validations:', validationsError);
          // We continue despite validation deletion errors
        } else {
          result.deletedData.validations = deletedValidations?.length || 0;
        }
        
        // Step 4: Delete the contributions
        const { data: deletedContributions, error: contributionsError } = await supabase
          .from('contributions')
          .delete()
          .in('id', contributionIds)
          .select('id');
          
        if (contributionsError) {
          // Restore the project status
          await supabase
            .from('projects')
            .update({ status: originalProjectStatus })
            .eq('id', projectId);
            
          result.error = `Failed to delete contributions: ${contributionsError.message}`;
          return result;
        }
        
        result.deletedData.contributions = deletedContributions?.length || 0;
        
        // Step 5: Delete associated files from storage
        const storageUrls = contributions.map(c => c.storage_url).filter(Boolean) as string[];
        
        // Extract file paths from URLs
        const filesToDelete: string[] = [];
        const storageRegex = /\/storage\/v1\/object\/public\/(.*)/;
        
        for (const url of storageUrls) {
          if (!url) continue;
          
          const match = url.match(storageRegex);
          if (match && match[1]) {
            const [bucket, ...pathParts] = match[1].split('/');
            const path = pathParts.join('/');
            
            if (bucket && path) {
              try {
                await supabase.storage.from(bucket).remove([path]);
                result.deletedData.files++;
              } catch (fileError) {
                console.warn(`Failed to delete file: ${path}`, fileError);
                // Continue despite file deletion errors
              }
            }
          }
        }
      }
      
      // Step 6: Delete the tasks
      const { data: deletedTasks, error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds)
        .select('id');
      
      if (tasksError) {
        // Restore the project status
        await supabase
          .from('projects')
          .update({ status: originalProjectStatus })
          .eq('id', projectId);
          
        result.error = `Failed to delete tasks: ${tasksError.message}`;
        return result;
      }
      
      result.deletedData.tasks = deletedTasks?.length || 0;
    }
    
    // Step 7: Delete project members
    const { data: deletedMembers, error: membersError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .select('id');
    
    if (membersError) {
      // Restore the project status
      await supabase
        .from('projects')
        .update({ status: originalProjectStatus })
        .eq('id', projectId);
        
      result.error = `Failed to delete project members: ${membersError.message}`;
      return result;
    }
    
    result.deletedData.members = deletedMembers?.length || 0;
    
    // Step 8: Finally delete the project
    const { error: projectDeleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
      
    if (projectDeleteError) {
      // Try to restore the project status as a fallback
      try {
        await supabase
          .from('projects')
          .update({ status: originalProjectStatus })
          .eq('id', projectId);
      } catch (restoreError) {
        console.error('Failed to restore project status after deletion error:', restoreError);
      }
        
      result.error = `Failed to delete project: ${projectDeleteError.message}`;
      return result;
    }
    
    // Success!
    result.success = true;
    return result;
  } catch (error) {
    // Restore the project status on unexpected error
    try {
      await supabase
        .from('projects')
        .update({ status: originalProjectStatus })
        .eq('id', projectId);
    } catch (restoreError) {
      console.error('Failed to restore project status after error:', restoreError);
    }
      
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.error = `Project deletion failed: ${errorMessage}`;
    return result;
  }
}

/**
 * Get detailed project information with metrics
 * @param projectId - The ID of the project
 * @returns Promise with project details and metrics
 */
export async function getProjectWithMetrics(projectId: number): Promise<{
  project: ProjectDetails | null;
  metrics: {
    tasks: number;
    completedTasks: number;
    contributions: number;
    validContributions: number;
    members: number;
  };
  error: string | null;
}> {
  try {
    // Get basic project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (projectError) {
      return {
        project: null,
        metrics: { tasks: 0, completedTasks: 0, contributions: 0, validContributions: 0, members: 0 },
        error: `Failed to fetch project: ${projectError.message}`
      };
    }
    
    // Get task counts
    const { count: taskCount, error: taskError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
      
    // Get completed task count
    const { count: completedTaskCount, error: completedTaskError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'completed');
      
    // Get task IDs for contribution metrics
    const { data: taskIds, error: taskIdError } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId);
      
    let contributionCount = 0;
    let validContributionCount = 0;
    
    if (taskIds && taskIds.length > 0) {
      const ids = taskIds.map(t => t.id);
      
      // Get contribution counts
      const { count: contribCount, error: contribError } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .in('task_id', ids);
        
      if (!contribError) {
        contributionCount = contribCount || 0;
      }
      
      // Get valid contribution counts
      const { count: validContribCount, error: validContribError } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .in('task_id', ids)
        .in('status', ['validated', 'completed']);
        
      if (!validContribError) {
        validContributionCount = validContribCount || 0;
      }
    }
    
    // Get member count
    const { count: memberCount, error: memberError } = await supabase
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
      
    return {
      project: project as ProjectDetails,
      metrics: {
        tasks: taskCount || 0,
        completedTasks: completedTaskCount || 0,
        contributions: contributionCount,
        validContributions: validContributionCount,
        members: memberCount || 0
      },
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      project: null,
      metrics: { tasks: 0, completedTasks: 0, contributions: 0, validContributions: 0, members: 0 },
      error: `Failed to get project metrics: ${errorMessage}`
    };
  }
} 