/**
 * Utilities for safe and reliable file handling with transaction-like behavior
 */
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { updateTaskStatus } from './taskUtils';

// File upload statuses for tracking
export type FileUploadStatus = 
  | 'pending'    // Initial state
  | 'uploading'  // Currently uploading
  | 'processing' // Uploaded but being processed
  | 'complete'   // Successfully uploaded and processed
  | 'failed';    // Failed to upload or process

export interface FileUploadState {
  id: string;
  status: FileUploadStatus;
  progress: number;
  fileUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// Session storage key for tracking uploads
const UPLOAD_SESSION_KEY = 'afri_speak_ongoing_uploads';

/**
 * Save the current upload state to session storage for recovery
 */
function saveUploadState(uploadState: Record<string, FileUploadState>): void {
  try {
    sessionStorage.setItem(UPLOAD_SESSION_KEY, JSON.stringify(uploadState));
  } catch (error) {
    console.error('Failed to save upload state:', error);
  }
}

/**
 * Get saved upload state from session storage
 */
export function getUploadState(): Record<string, FileUploadState> {
  try {
    const saved = sessionStorage.getItem(UPLOAD_SESSION_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to retrieve upload state:', error);
    return {};
  }
}

/**
 * Clear a specific upload from the session storage
 */
export function clearUploadState(uploadId: string): void {
  try {
    const currentState = getUploadState();
    delete currentState[uploadId];
    saveUploadState(currentState);
  } catch (error) {
    console.error('Failed to clear upload state:', error);
  }
}

/**
 * Upload a file with transaction-like behavior and session recovery
 * @param file - The file to upload
 * @param path - The storage path (e.g., 'projects/123/audio')
 * @param metadata - Optional metadata to store with the file
 * @param onProgress - Optional callback for upload progress
 * @param taskId - Optional task ID to update when complete
 * @returns Promise resolving to the file URL if successful
 */
export async function uploadFileWithRecovery(
  file: File,
  path: string,
  metadata?: Record<string, any>,
  onProgress?: (progress: number) => void,
  taskId?: string
): Promise<string> {
  // Generate unique ID for this upload
  const uploadId = uuidv4();
  const fileName = `${uploadId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const fullPath = `${path}/${fileName}`;
  
  // Initialize upload state
  const uploadState = getUploadState();
  uploadState[uploadId] = {
    id: uploadId,
    status: 'pending',
    progress: 0,
    metadata
  };
  saveUploadState(uploadState);
  
  try {
    // Update to uploading status
    uploadState[uploadId].status = 'uploading';
    saveUploadState(uploadState);
    
    // Set up upload options
    const options = {
      cacheControl: '3600',
      upsert: false
    };
    
    // Track upload progress manually since onUploadProgress is not available
    let uploadPromise = supabase.storage
      .from('media')
      .upload(fullPath, file, options);
    
    // If progress callback is provided, use a separate approach to track progress
    if (onProgress) {
      // For browsers that support upload progress tracking
      if (typeof XMLHttpRequest !== 'undefined') {
        // Poll for the upload status periodically
        const progressInterval = setInterval(() => {
          // Just simulate progress since we can't directly track it
          const currentProgress = uploadState[uploadId].progress;
          if (currentProgress < 90) {
            const nextProgress = Math.min(currentProgress + 5, 90);
            uploadState[uploadId].progress = nextProgress;
            saveUploadState(uploadState);
            onProgress(nextProgress);
          }
        }, 500);
        
        // Ensure interval is cleared when upload completes
        uploadPromise.then(() => {
          clearInterval(progressInterval);
          uploadState[uploadId].progress = 100;
          saveUploadState(uploadState);
          onProgress(100);
        })
        .catch(() => {
          clearInterval(progressInterval);
        });
      }
    }
    
    // Wait for upload to complete
    const { data, error } = await uploadPromise;
    
    if (error) throw error;
    
    // Upload successful, update state to processing
    uploadState[uploadId].status = 'processing';
    saveUploadState(uploadState);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(fullPath);
    
    // Store metadata in database if provided
    if (metadata) {
      const { error: metadataError } = await supabase
        .from('file_metadata')
        .insert({
          file_path: fullPath,
          metadata,
          created_at: new Date().toISOString()
        });
      
      if (metadataError) {
        console.error('Error storing file metadata:', metadataError);
      }
    }
    
    // Update task if provided
    if (taskId) {
      const urlField = path.includes('source') ? 'source_url' : 'target_url';
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          [urlField]: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (taskError) {
        console.error('Error updating task with file URL:', taskError);
      }
    }
    
    // Mark as complete
    uploadState[uploadId].status = 'complete';
    uploadState[uploadId].fileUrl = publicUrl;
    saveUploadState(uploadState);
    
    return publicUrl;
  } catch (error) {
    console.error('File upload failed:', error);
    
    // Update state with error
    uploadState[uploadId].status = 'failed';
    uploadState[uploadId].error = error.message || 'Upload failed';
    saveUploadState(uploadState);
    
    toast.error('File upload failed. Please try again.');
    throw error;
  }
}

/**
 * Retry a failed upload from session storage
 * @param uploadId - The ID of the failed upload
 * @param file - The file to upload again
 * @returns Promise resolving to the file URL if successful
 */
export async function retryUpload(
  uploadId: string,
  file: File
): Promise<string | null> {
  const uploadState = getUploadState();
  const failedUpload = uploadState[uploadId];
  
  if (!failedUpload || failedUpload.status !== 'failed') {
    toast.error('Cannot retry: Upload not found or not in failed state');
    return null;
  }
  
  try {
    // Extract path from previous attempt
    const path = failedUpload.metadata?.path || 'uploads';
    const taskId = failedUpload.metadata?.taskId;
    
    // Retry the upload
    const url = await uploadFileWithRecovery(
      file,
      path,
      failedUpload.metadata,
      (progress) => {
        uploadState[uploadId].progress = progress;
        saveUploadState(uploadState);
      },
      taskId
    );
    
    return url;
  } catch (error) {
    console.error('Retry upload failed:', error);
    return null;
  }
}

/**
 * Delete a file with proper error handling
 * @param path - The storage path of the file to delete
 * @returns Promise resolving to success state
 */
export async function deleteFile(path: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from('media')
      .remove([path]);
    
    if (error) throw error;
    
    // Also delete the metadata
    await supabase
      .from('file_metadata')
      .delete()
      .eq('file_path', path);
    
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    toast.error('Failed to delete file. Please try again.');
    return false;
  }
}

/**
 * Check if an upload is complete and ready to be committed
 * @param uploadId - The ID of the upload
 * @returns boolean indicating if upload is complete
 */
export function isUploadComplete(uploadId: string): boolean {
  const uploadState = getUploadState();
  return uploadState[uploadId]?.status === 'complete';
}

/**
 * Recover any interrupted uploads from the previous session
 * @returns Array of uploads that can be recovered
 */
export function getRecoverableUploads(): FileUploadState[] {
  const uploadState = getUploadState();
  return Object.values(uploadState).filter(
    upload => upload.status !== 'complete' && upload.status !== 'pending'
  );
}

/**
 * Get a signed URL with extended expiry for a file
 * @param path - The storage path of the file
 * @param expiresIn - Seconds until expiry (default: 3600)
 * @returns Promise resolving to the signed URL
 */
export async function getSignedUrl(
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUrl(path, expiresIn);
    
    if (error) throw error;
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
} 