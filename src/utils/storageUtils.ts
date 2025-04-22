/**
 * Utilities for handling storage operations with transaction-like behavior
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface for file upload result
 */
export interface FileUploadResult {
  success: boolean;
  fileUrl: string | null;
  filePath: string | null;
  error: string | null;
  stage: 'pre-upload' | 'upload' | 'url-generation' | 'complete';
}

/**
 * Interface for contribution record
 */
export interface ContributionRecord {
  task_id: number;
  user_id: string;
  submitted_data: Record<string, any>;
  storage_url?: string;
  status: string;
  content?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

/**
 * Function to upload a file to storage and return its URL
 * @param bucket - Storage bucket name
 * @param filePath - Path to store the file
 * @param fileBlob - File blob to upload
 * @param contentType - Content type of the file
 * @returns Promise with upload result
 */
export async function uploadFileWithRetry(
  bucket: string,
  filePath: string,
  fileBlob: Blob,
  contentType?: string
): Promise<FileUploadResult> {
  let result: FileUploadResult = {
    success: false,
    fileUrl: null,
    filePath: null,
    error: null,
    stage: 'pre-upload'
  };

  const maxRetries = 2;
  let retries = 0;

  while (retries <= maxRetries) {
    try {
      // Attempt to upload the file
      result.stage = 'upload';
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBlob, { contentType: contentType || 'application/octet-stream', upsert: retries > 0 });

      if (uploadError) {
        result.error = `Upload failed: ${uploadError.message}`;
        retries++;
        
        // Wait before retry
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          continue;
        } else {
          return result;
        }
      }

      // Get URL for the uploaded file
      result.stage = 'url-generation';
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        result.error = 'Failed to generate public URL';
        
        // Attempt to clean up the uploaded file
        await supabase.storage.from(bucket).remove([filePath]);
        
        retries++;
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          continue;
        } else {
          return result;
        }
      }

      // Success
      result.stage = 'complete';
      result.success = true;
      result.fileUrl = urlData.publicUrl;
      result.filePath = filePath;
      result.error = null;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during file upload';
      result.error = errorMessage;
      retries++;
      
      // Attempt to clean up if we got as far as uploading
      if (filePath) {
        try {
          await supabase.storage.from(bucket).remove([filePath]);
        } catch (cleanupError) {
          // Log but continue
          console.error('Error during cleanup:', cleanupError);
        }
      }
      
      if (retries <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      } else {
        return result;
      }
    }
  }

  return result;
}

/**
 * Upload file and create contribution record in a transaction-like manner
 * @param bucket - Storage bucket
 * @param filePath - Path to store the file
 * @param fileBlob - File blob to upload
 * @param contribution - Contribution record to insert
 * @param contentType - Content type of the file
 * @returns Object containing success status and result details
 */
export async function uploadFileAndCreateContribution(
  bucket: string,
  filePath: string,
  fileBlob: Blob,
  contribution: ContributionRecord,
  contentType?: string
): Promise<{
  success: boolean;
  fileUrl: string | null;
  contributionId: number | null;
  error: string | null;
}> {
  // Step 1: First verify that the task still exists and is in valid state
  // This is important to avoid race conditions where a task might be
  // completed by another user while this upload is in progress
  try {
    const { data: taskCheck, error: taskError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', contribution.task_id)
      .single();
      
    if (taskError || !taskCheck) {
      return {
        success: false,
        fileUrl: null,
        contributionId: null,
        error: taskError ? `Task check failed: ${taskError.message}` : 'Task no longer exists'
      };
    }
    
    if (taskCheck.status !== 'open' && taskCheck.status !== 'in_progress') {
      return {
        success: false,
        fileUrl: null,
        contributionId: null,
        error: `Task is no longer accepting contributions (status: ${taskCheck.status})`
      };
    }
    
    // Check if the task already has a completed/accepted contribution
    const { count: acceptedCount, error: countError } = await supabase
      .from('contributions')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', contribution.task_id)
      .in('status', ['accepted', 'validated']);
      
    if (!countError && acceptedCount && acceptedCount > 0) {
      return {
        success: false,
        fileUrl: null,
        contributionId: null,
        error: 'This task has already been completed by another user'
      };
    }
    
    // Check for duplicate contributions from this user
    const { count: userCount, error: userCountError } = await supabase
      .from('contributions')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', contribution.task_id)
      .eq('user_id', contribution.user_id);
      
    if (!userCountError && userCount && userCount > 0) {
      return {
        success: false,
        fileUrl: null,
        contributionId: null,
        error: 'You have already submitted a contribution for this task'
      };
    }
  } catch (error) {
    return {
      success: false,
      fileUrl: null,
      contributionId: null,
      error: `Pre-upload validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
  
  // Step 2: Upload the file
  const uploadResult = await uploadFileWithRetry(bucket, filePath, fileBlob, contentType);
  
  if (!uploadResult.success) {
    return {
      success: false,
      fileUrl: null,
      contributionId: null,
      error: uploadResult.error
    };
  }
  
  // Step 3: Create a pending contribution record with the file URL
  try {
    // Update to a transaction approach
    // Create the contribution with the file URL
    const contributionData = {
      ...contribution,
      storage_url: uploadResult.fileUrl,
      submission_metadata: {
        ...contribution.submitted_data,
        file_path: uploadResult.filePath,
        upload_timestamp: new Date().toISOString()
      }
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('contributions')
      .insert(contributionData)
      .select('id')
      .single();
      
    if (insertError) {
      // Clean up the uploaded file
      await supabase.storage.from(bucket).remove([filePath]);
      
      return {
        success: false,
        fileUrl: null,
        contributionId: null,
        error: `Database insertion failed: ${insertError.message}`
      };
    }
    
    // Update task status to in_progress if currently open
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
        updated_by: contribution.user_id,
        current_contribution_id: insertData.id
      })
      .eq('id', contribution.task_id)
      .eq('status', 'open');
      
    if (taskUpdateError) {
      console.error('Error updating task status:', taskUpdateError);
      // Non-critical error, don't fail the whole process
    }
    
    return {
      success: true,
      fileUrl: uploadResult.fileUrl,
      contributionId: insertData.id,
      error: null
    };
  } catch (error) {
    // Clean up the uploaded file
    await supabase.storage.from(bucket).remove([filePath]);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during contribution creation';
    return {
      success: false,
      fileUrl: null,
      contributionId: null,
      error: errorMessage
    };
  }
}

/**
 * Clean up orphaned files in storage that don't have matching contribution records
 * This would typically be run by an admin or as a scheduled job
 */
export async function cleanupOrphanedFiles(bucket: string, prefix: string): Promise<{
  success: boolean;
  removedCount: number;
  error: string | null;
}> {
  try {
    // List files in the storage bucket with the given prefix
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(prefix);
      
    if (listError) {
      return {
        success: false,
        removedCount: 0,
        error: `Failed to list files: ${listError.message}`
      };
    }
    
    const filePaths = files?.map(file => `${prefix}/${file.name}`) || [];
    const orphanedFiles: string[] = [];
    
    // For each file, check if there's a corresponding contribution
    for (const path of filePaths) {
      const { count, error: countError } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .filter('storage_url', 'ilike', `%${path}%`);
        
      if (countError) {
        console.error(`Error checking contribution for file ${path}:`, countError);
        continue;
      }
      
      if (count === 0) {
        orphanedFiles.push(path);
      }
    }
    
    // Remove orphaned files
    if (orphanedFiles.length > 0) {
      const { data: removeData, error: removeError } = await supabase.storage
        .from(bucket)
        .remove(orphanedFiles);
        
      if (removeError) {
        return {
          success: false,
          removedCount: 0,
          error: `Failed to remove orphaned files: ${removeError.message}`
        };
      }
      
      return {
        success: true,
        removedCount: orphanedFiles.length,
        error: null
      };
    }
    
    return {
      success: true,
      removedCount: 0,
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during cleanup';
    return {
      success: false,
      removedCount: 0,
      error: errorMessage
    };
  }
} 