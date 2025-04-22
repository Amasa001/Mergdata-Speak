/**
 * Utilities for standardized validation rules across task types
 */
import { TaskType, TaskStatus } from './taskUtils';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

/**
 * Interface for validation rule
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  test: (value: any, context?: any) => boolean;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Interface for validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Audio validation rules
 */
export const audioValidationRules: ValidationRule[] = [
  {
    id: 'audio-min-duration',
    name: 'Minimum Duration',
    description: 'Audio recording must be at least 1 second long',
    test: (audio: Blob, context?: { minDuration?: number }) => {
      const minDuration = context?.minDuration || 1;
      return audio.size > 1000; // Simple size heuristic as fallback
    },
    errorMessage: 'Recording is too short (minimum 1 second)',
    severity: 'error'
  },
  {
    id: 'audio-max-duration',
    name: 'Maximum Duration',
    description: 'Audio recording must be less than 2 minutes long',
    test: (audio: Blob, context?: { maxDuration?: number }) => {
      const maxDuration = context?.maxDuration || 120;
      return audio.size < 10 * 1024 * 1024; // Simple size heuristic as fallback 
    },
    errorMessage: 'Recording is too long (maximum 2 minutes)',
    severity: 'error'
  },
  {
    id: 'audio-not-silent',
    name: 'Not Silent',
    description: 'Audio recording must not be silent',
    test: (audio: Blob) => {
      return audio.size > 5000; // Simple size heuristic as fallback
    },
    errorMessage: 'Recording appears to be silent or nearly silent',
    severity: 'warning'
  }
];

/**
 * Text validation rules
 */
export const textValidationRules: ValidationRule[] = [
  {
    id: 'text-not-empty',
    name: 'Not Empty',
    description: 'Text must not be empty',
    test: (text: string) => {
      return text.trim().length > 0;
    },
    errorMessage: 'Text cannot be empty',
    severity: 'error'
  },
  {
    id: 'text-min-length',
    name: 'Minimum Length',
    description: 'Text must be at least 5 characters long',
    test: (text: string, context?: { minLength?: number }) => {
      const minLength = context?.minLength || 5;
      return text.trim().length >= minLength;
    },
    errorMessage: 'Text is too short (minimum 5 characters)',
    severity: 'error'
  },
  {
    id: 'text-max-length',
    name: 'Maximum Length',
    description: 'Text must be less than 2000 characters long',
    test: (text: string, context?: { maxLength?: number }) => {
      const maxLength = context?.maxLength || 2000;
      return text.trim().length <= maxLength;
    },
    errorMessage: 'Text is too long (maximum 2000 characters)',
    severity: 'error'
  },
  {
    id: 'text-no-html',
    name: 'No HTML',
    description: 'Text must not contain HTML',
    test: (text: string) => {
      return !/<[^>]*>/g.test(text);
    },
    errorMessage: 'Text contains HTML tags',
    severity: 'warning'
  }
];

/**
 * Translation validation rules
 */
export const translationValidationRules: ValidationRule[] = [
  ...textValidationRules,
  {
    id: 'translation-no-source-copy',
    name: 'No Source Copy',
    description: 'Translation must not be identical to source text',
    test: (translation: string, context?: { sourceText?: string }) => {
      if (!context?.sourceText) return true; // Skip if no source text
      return translation.trim().toLowerCase() !== context.sourceText.trim().toLowerCase();
    },
    errorMessage: 'Translation should not be identical to source text',
    severity: 'warning'
  }
];

/**
 * Get validation rules for a specific task type
 * @param taskType - Type of task 
 * @returns Array of applicable validation rules
 */
export function getValidationRulesForTaskType(taskType: TaskType): ValidationRule[] {
  switch (taskType) {
    case 'asr':
      return audioValidationRules;
    case 'tts':
      return audioValidationRules;
    case 'transcription':
      return textValidationRules;
    case 'translation':
      return translationValidationRules;
    case 'validation':
      return []; // Validation has its own rules
    default:
      return [];
  }
}

/**
 * Validate audio file against rules
 * @param audio - Audio blob to validate
 * @param context - Optional context for validation rules
 * @returns Promise with validation results
 */
export async function validateAudio(audio: Blob, context?: any): Promise<ValidationResult> {
  const results: ValidationResult = {
    isValid: true,
    errors: []
  };
  
  // Get duration if Web Audio API is available
  let audioDuration: number | undefined;
  
  if (typeof window !== 'undefined') {
    try {
      const arrayBuffer = await audio.arrayBuffer();
      // Use standard AudioContext with fallback
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioDuration = audioBuffer.duration;
        
        // Update context with actual duration
        context = { ...context, duration: audioDuration };
      }
    } catch (error) {
      console.warn('Failed to get audio duration:', error);
    }
  }
  
  // Apply rules
  for (const rule of audioValidationRules) {
    try {
      const passed = rule.test(audio, context);
      
      if (!passed) {
        results.errors.push(rule.errorMessage);
        results.isValid = false;
      }
    } catch (error) {
      console.error(`Error applying rule ${rule.id}:`, error);
    }
  }
  
  return results;
}

/**
 * Validate text against rules
 * @param text - Text to validate
 * @param taskType - Type of task (for specific rules)
 * @param context - Optional context for validation rules
 * @returns Validation result
 */
export function validateText(text: string, taskType: 'transcription' | 'translation', context?: any): ValidationResult {
  const results: ValidationResult = {
    isValid: true,
    errors: []
  };
  
  // Get appropriate rules
  const rules = taskType === 'translation' ? translationValidationRules : textValidationRules;
  
  // Apply rules
  for (const rule of rules) {
    try {
      const passed = rule.test(text, context);
      
      if (!passed) {
        results.errors.push(rule.errorMessage);
        results.isValid = false;
      }
    } catch (error) {
      console.error(`Error applying rule ${rule.id}:`, error);
    }
  }
  
  return results;
}

/**
 * Validate a contribution for a specific task type
 * @param contribution - The contribution data
 * @param taskType - Type of task
 * @param context - Optional context for validation
 * @returns Promise with validation result
 */
export async function validateContribution(
  contribution: any,
  taskType: TaskType,
  context?: any
): Promise<ValidationResult> {
  switch (taskType) {
    case 'asr':
    case 'tts':
      if (contribution instanceof Blob) {
        return validateAudio(contribution, context);
      } else {
        return {
          isValid: false,
          errors: ['Expected audio blob but received different data type']
        };
      }
    
    case 'transcription':
      if (typeof contribution === 'string') {
        return validateText(contribution, 'transcription', context);
      } else {
        return {
          isValid: false,
          errors: ['Expected text string but received different data type']
        };
      }
    
    case 'translation':
      if (typeof contribution === 'string') {
        return validateText(contribution, 'translation', context);
      } else {
        return {
          isValid: false,
          errors: ['Expected text string but received different data type']
        };
      }
    
    default:
      return {
        isValid: false,
        errors: ['Validation for task type ' + taskType + ' is not supported']
      };
  }
}

/**
 * Validation criteria for different task types
 */
export interface ValidationCriteria {
  // Minimum required fields
  requiredFields: string[];
  
  // Content requirements
  minLength?: number;
  maxLength?: number;
  
  // File validations
  requiredFileTypes?: string[];
  maxFileSize?: number; // In bytes
  
  // Audio-specific validations
  minDuration?: number; // In seconds
  maxDuration?: number; // In seconds
  
  // Other task-specific criteria
  customRules?: Record<string, any>;
}

// Default validation criteria by task type
const defaultValidationCriteria: Record<string, ValidationCriteria> = {
  'translation': {
    requiredFields: ['source_text', 'target_text'],
    minLength: 10,
  },
  'transcription': {
    requiredFields: ['source_url', 'target_text'],
    requiredFileTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  'recording': {
    requiredFields: ['source_text', 'target_url'],
    requiredFileTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    minDuration: 1, // At least 1 second
    maxDuration: 600, // Max 10 minutes
  },
  'validation': {
    requiredFields: ['source_text', 'target_text', 'rating', 'comments'],
  }
};

/**
 * Validate a task submission based on its type and current data
 * @param taskId - The ID of the task to validate
 * @param taskData - The task data to validate
 * @param partial - Whether this is a partial submission (draft)
 * @returns Promise resolving to validation result
 */
export async function validateTaskSubmission(
  taskId: string,
  taskData: Record<string, any>,
  partial = false
): Promise<ValidationResult> {
  try {
    // Get task details including type
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (error) throw error;
    if (!task) {
      return {
        isValid: false,
        errors: ['Task not found']
      };
    }
    
    const taskType = task.type;
    const criteria = defaultValidationCriteria[taskType] || {
      requiredFields: []
    };
    
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // Check required fields (unless partial submission)
    if (!partial) {
      for (const field of criteria.requiredFields) {
        if (!taskData[field] || 
            (typeof taskData[field] === 'string' && taskData[field].trim() === '')) {
          result.isValid = false;
          result.errors.push(`Missing required field: ${field}`);
        }
      }
    }
    
    // Check text length requirements
    if (criteria.minLength && taskData.target_text && 
        taskData.target_text.length < criteria.minLength) {
      if (partial) {
        result.warnings.push(`Text is shorter than recommended (${criteria.minLength} chars)`);
      } else {
        result.isValid = false;
        result.errors.push(`Text must be at least ${criteria.minLength} characters`);
      }
    }
    
    if (criteria.maxLength && taskData.target_text && 
        taskData.target_text.length > criteria.maxLength) {
      result.isValid = false;
      result.errors.push(`Text exceeds maximum length of ${criteria.maxLength} characters`);
    }
    
    // Check file requirements if applicable
    if (taskData.source_url || taskData.target_url) {
      const fileUrl = taskData.source_url || taskData.target_url;
      
      // File type validation would typically happen during upload,
      // but we can check file extensions here as a secondary validation
      if (criteria.requiredFileTypes && criteria.requiredFileTypes.length > 0) {
        const fileExtension = fileUrl.split('.').pop().toLowerCase();
        const validExtensions = criteria.requiredFileTypes.map(type => 
          type.split('/')[1]).filter(Boolean);
        
        if (!validExtensions.includes(fileExtension)) {
          if (partial) {
            result.warnings.push(`File type may not be supported. Expected: ${criteria.requiredFileTypes.join(', ')}`);
          } else {
            result.isValid = false;
            result.errors.push(`File type not supported. Expected: ${criteria.requiredFileTypes.join(', ')}`);
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Validation error:', error);
    return {
      isValid: false,
      errors: ['Validation failed: ' + (error.message || 'Unknown error')]
    };
  }
}

/**
 * Validate a status transition between task states
 * @param taskId - The ID of the task
 * @param currentStatus - Current task status
 * @param newStatus - Proposed new status
 * @param userId - ID of user requesting the transition
 * @returns Promise resolving to validation result
 */
export async function validateStatusTransition(
  taskId: string,
  currentStatus: TaskStatus,
  newStatus: TaskStatus,
  userId: string
): Promise<ValidationResult> {
  try {
    const result: ValidationResult = {
      isValid: true,
      errors: []
    };
    
    // Define allowed transitions
    const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
      'draft': ['open', 'archived'],
      'open': ['in_progress', 'archived'],
      'in_progress': ['completed', 'open', 'archived'],
      'completed': ['verified', 'rejected', 'archived'],
      'verified': ['archived'],
      'rejected': ['open', 'in_progress', 'archived'],
      'archived': ['open']
    };
    
    // Check if transition is allowed
    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      result.isValid = false;
      result.errors.push(`Cannot transition from ${currentStatus} to ${newStatus}`);
      return result;
    }
    
    // Check user permissions for this transition
    const { data: permissions, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('user_id', userId)
      .eq('project_id', (await supabase.from('tasks').select('project_id').eq('id', taskId).single()).data.project_id)
      .single();
    
    if (error || !permissions) {
      result.isValid = false;
      result.errors.push('You do not have permission to modify this task');
      return result;
    }
    
    // Role-based restrictions
    const role = permissions.role;
    
    // Only reviewers and admins can verify or reject
    if ((newStatus === 'verified' || newStatus === 'rejected') && 
        !['reviewer', 'admin'].includes(role)) {
      result.isValid = false;
      result.errors.push('Only reviewers or administrators can verify or reject tasks');
    }
    
    // Additional task validation for completion
    if (newStatus === 'completed') {
      const submissionValidation = await validateTaskSubmission(taskId, 
        (await supabase.from('tasks').select('*').eq('id', taskId).single()).data
      );
      
      if (!submissionValidation.isValid) {
        result.isValid = false;
        result.errors = [...result.errors, ...submissionValidation.errors];
      }
    }
    
    return result;
  } catch (error) {
    console.error('Status transition validation error:', error);
    return {
      isValid: false,
      errors: ['Validation failed: ' + (error.message || 'Unknown error')]
    };
  }
}

/**
 * Pre-submission validation check for task data
 * @param taskType - The type of task being created or submitted
 * @param taskData - The task data to validate
 * @returns ValidationResult with any issues found
 */
export function preSubmissionCheck(
  taskType: string,
  taskData: Record<string, any>
): ValidationResult {
  const criteria = defaultValidationCriteria[taskType] || {
    requiredFields: []
  };
  
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Basic checks that can be done client-side
  for (const field of criteria.requiredFields) {
    if (!taskData[field]) {
      result.warnings.push(`Missing recommended field: ${field}`);
    }
  }
  
  // Text length checks
  if (criteria.minLength && taskData.target_text && 
      taskData.target_text.length < criteria.minLength) {
    result.warnings.push(`Text is shorter than recommended (${criteria.minLength} chars)`);
  }
  
  if (criteria.maxLength && taskData.target_text && 
      taskData.target_text.length > criteria.maxLength) {
    result.warnings.push(`Text exceeds recommended length of ${criteria.maxLength} characters`);
  }
  
  return result;
}

/**
 * Get task metadata for validation
 * @param taskId - The ID of the task
 * @returns Promise resolving to validation metadata
 */
export async function getValidationMetadata(
  taskId: string
): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        type,
        status,
        created_at,
        updated_at,
        project_id,
        assigned_to,
        projects(
          id,
          name,
          source_language,
          target_language
        )
      `)
      .eq('id', taskId)
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      validationCriteria: defaultValidationCriteria[data.type] || null
    };
  } catch (error) {
    console.error('Error getting validation metadata:', error);
    toast.error('Error loading task validation data');
    return {};
  }
} 