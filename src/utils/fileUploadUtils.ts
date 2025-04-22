/**
 * File upload utilities with transaction-like behavior and error handling
 */
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { ensureTaskIntegrity } from './taskRevalidationUtils';
import axios from 'axios';

// File types we accept
export const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
export const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface FileUploadOptions {
  bucketName: string;
  folder?: string;
  allowedFileTypes?: string[];
  maxSizeBytes?: number;
  metadata?: Record<string, string>;
  sessionId?: string;
  file: File;
  path: string;
  onProgress?: (progress: number) => void;
}

export interface FileUploadResult {
  success: boolean;
  fileUrl?: string;
  filePath?: string;
  error?: string;
  fileMetadata?: Record<string, any>;
  fileId?: string;
}

export interface FileUploadSession {
  id: string;
  startTime: number;
  files: {
    id: string;
    path: string;
    status: 'pending' | 'uploaded' | 'committed' | 'failed';
  }[];
  metadata: Record<string, any>;
}

// In-memory store of upload sessions for recovery
const uploadSessions: Record<string, FileUploadSession> = {};

/**
 * Create a new upload session
 * @param initialMetadata - Metadata for the session
 * @returns Session ID
 */
export function createUploadSession(initialMetadata: Record<string, any> = {}): string {
  const sessionId = uuidv4();
  uploadSessions[sessionId] = {
    id: sessionId,
    startTime: Date.now(),
    files: [],
    metadata: initialMetadata
  };
  return sessionId;
}

/**
 * Interface for file upload options
 */
interface FileOptions {
  file: File;
  bucketName: string;
  sessionId: string;
  path?: string;
  onProgress?: (progress: number) => void;
  metadata?: Record<string, any>;
}

/**
 * Uploads a file to Firebase Storage
 * @param options - File upload options
 * @returns Promise with download URL
 */
export const uploadFile = async (options: FileOptions): Promise<string> => {
  const { file, bucketName, sessionId, path = '', onProgress, metadata = {} } = options;
  
  try {
    // Generate a unique filename
    const fileId = uuidv4();
    const extension = file.name.split('.').pop();
    const filename = `${path}/${fileId}.${extension}`;
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucketName', bucketName);
    formData.append('filename', filename);
    formData.append('sessionId', sessionId);
    
    // Add metadata to form data
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    // Upload to Firebase via our API route
    const response = await axios.post('/api/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    
    return response.data.downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    toast.error('File upload failed. Please try again.');
    throw error;
  }
};

/**
 * Commit a file upload session, ensuring all files are properly recorded
 * @param sessionId - The upload session ID to commit
 * @param taskId - Optional task ID to associate with files
 * @returns Promise resolving to commit result
 */
export async function commitUploadSession(
  sessionId: string,
  taskId?: string
): Promise<{ success: boolean; message: string }> {
  if (!uploadSessions[sessionId]) {
    return { success: false, message: 'Upload session not found' };
  }
  
  const session = uploadSessions[sessionId];
  
  try {
    // Check all files are uploaded
    const pendingFiles = session.files.filter(f => f.status === 'pending');
    const failedFiles = session.files.filter(f => f.status === 'failed');
    
    if (pendingFiles.length > 0) {
      return {
        success: false,
        message: `Cannot commit - ${pendingFiles.length} files still uploading`
      };
    }
    
    if (failedFiles.length > 0) {
      return {
        success: false,
        message: `Cannot commit - ${failedFiles.length} files failed to upload`
      };
    }
    
    // Verify and fix any missing metadata entries
    const uploadedFiles = session.files.filter(f => f.status === 'uploaded');
    
    for (const file of uploadedFiles) {
      // Check if metadata exists
      const { data: existingMetadata } = await supabase
        .from('file_metadata')
        .select('id')
        .eq('id', file.id)
        .single();
      
      if (!existingMetadata) {
        // Get file info from storage
        const { data: fileInfo } = await supabase.storage
          .from(session.metadata.bucketName || 'task-files')
          .getPublicUrl(file.path);
        
        // Create missing metadata entry
        await supabase
          .from('file_metadata')
          .insert({
            id: file.id,
            file_path: file.path,
            bucket_name: session.metadata.bucketName || 'task-files',
            public_url: fileInfo.publicUrl,
            uploaded_at: new Date().toISOString(),
            ...session.metadata
          });
      }
      
      // Associate file with task if taskId is provided
      if (taskId) {
        const { error: linkError } = await supabase
          .from('task_files')
          .upsert({
            task_id: taskId,
            file_id: file.id,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'task_id,file_id'
          });
        
        if (linkError) {
          console.error('Error linking file to task:', linkError);
        }
      }
      
      // Update file status to committed
      file.status = 'committed';
    }
    
    // Persist session data in local storage in case of browser refresh
    localStorage.setItem(`upload_session_${sessionId}`, JSON.stringify(session));
    
    // If there's a task ID, ensure task integrity after file upload
    if (taskId) {
      const integrityResult = await ensureTaskIntegrity(taskId);
      if (!integrityResult.success) {
        console.warn('Task integrity check after file upload failed:', integrityResult.message);
      }
      if (integrityResult.repaired) {
        console.info('Task integrity repaired after file upload');
      }
    }
    
    return {
      success: true,
      message: `Successfully committed ${uploadedFiles.length} files`
    };
  } catch (error) {
    console.error('Error in commit session:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during commit'
    };
  }
}

/**
 * Roll back a file upload session, deleting any uploaded files
 * @param sessionId - The upload session ID to roll back
 * @returns Promise resolving to rollback result
 */
export async function rollbackUploadSession(
  sessionId: string
): Promise<{ success: boolean; message: string }> {
  if (!uploadSessions[sessionId]) {
    return { success: false, message: 'Upload session not found' };
  }
  
  const session = uploadSessions[sessionId];
  
  try {
    // Delete uploaded files
    const uploadedFiles = session.files.filter(
      f => f.status === 'uploaded' || f.status === 'committed'
    );
    
    for (const file of uploadedFiles) {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(session.metadata.bucketName || 'task-files')
        .remove([file.path]);
      
      if (storageError) {
        console.error(`Error deleting file ${file.id}:`, storageError);
      }
      
      // Delete metadata
      await supabase
        .from('file_metadata')
        .delete()
        .eq('id', file.id);
      
      // Delete task association if any
      if (session.metadata.taskId) {
        await supabase
          .from('task_files')
          .delete()
          .eq('file_id', file.id)
          .eq('task_id', session.metadata.taskId);
      }
    }
    
    // Clean up session
    delete uploadSessions[sessionId];
    
    return {
      success: true,
      message: `Successfully rolled back ${uploadedFiles.length} files`
    };
  } catch (error) {
    console.error('Error rolling back upload session:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error rolling back uploads'
    };
  }
}

/**
 * Recover upload session information
 * @param sessionId - The session ID to recover
 * @returns Session information if found
 */
export function getUploadSession(sessionId: string): FileUploadSession | null {
  return uploadSessions[sessionId] || null;
}

/**
 * Clean up stale upload sessions
 * @param maxAgeHours - Maximum age of sessions to keep in hours
 */
export function cleanupStaleUploadSessions(maxAgeHours: number = 24): void {
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  
  Object.keys(uploadSessions).forEach(sessionId => {
    const session = uploadSessions[sessionId];
    if (now - session.startTime > maxAgeMs) {
      // Only clean up sessions with no pending uploads
      if (!session.files.some(f => f.status === 'pending')) {
        delete uploadSessions[sessionId];
      }
    }
  });
}

/**
 * Initialize cleanup routine for upload sessions
 */
export function initFileUploadCleanup(): void {
  // Clean up stale sessions every hour
  setInterval(() => {
    cleanupStaleUploadSessions();
  }, 60 * 60 * 1000);
} 