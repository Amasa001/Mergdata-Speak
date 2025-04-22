import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { TaskBatchResult } from '@/types/project';

/**
 * A utility to execute a function within a transaction context
 * 
 * This provides a way to run multiple database operations that should succeed or fail together
 * 
 * @param fn Function that takes a transaction context and returns a promise
 * @returns Promise resolving to the result of the transaction function
 */
export async function executeTransaction<T>(
  fn: (txContext: typeof supabase) => Promise<T>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // Start transaction
    const { error: startError } = await supabase.rpc('begin_transaction');
    if (startError) throw new Error(`Failed to start transaction: ${startError.message}`);
    
    // Execute function with transaction context
    const result = await fn(supabase);
    
    // Commit transaction
    const { error: commitError } = await supabase.rpc('commit_transaction');
    if (commitError) {
      // Try to rollback if commit fails
      try {
        await supabase.rpc('rollback_transaction');
      } catch (e) {
        console.error('Failed to rollback after commit error:', e);
      }
      throw new Error(`Failed to commit transaction: ${commitError.message}`);
    }
    
    return { data: result, error: null };
  } catch (error) {
    // Rollback on error
    try {
      await supabase.rpc('rollback_transaction');
    } catch (e) {
      console.error('Failed to rollback transaction:', e);
    }
    
    console.error('Transaction failed:', error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Safely insert tasks in batches with transaction safety
 * 
 * @param tasks Array of task objects to insert
 * @param batchSize Number of tasks to insert in a single batch
 * @returns Promise resolving to batch operation results
 */
export async function batchInsertTasks(
  tasks: Array<Record<string, any>>,
  batchSize = 50
): Promise<TaskBatchResult> {
  const result: TaskBatchResult = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  // Process in batches
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchStartIndex = i;
    
    try {
      // Execute batch insert in a transaction
      const { data, error } = await executeTransaction(async (tx) => {
        const { error } = await tx
          .from('tasks')
          .insert(batch);
        
        if (error) throw error;
        return batch.length;
      });
      
      if (error) {
        // Log batch failure
        console.error(`Failed to insert batch ${Math.floor(i/batchSize) + 1}:`, error);
        
        // Record individual failures
        batch.forEach((_, idx) => {
          result.errors.push({
            index: batchStartIndex + idx,
            error: `Batch insert failed: ${error.message}`
          });
        });
        
        result.failed += batch.length;
      } else {
        result.success += batch.length;
      }
    } catch (error) {
      console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, error);
      
      // Record batch error
      batch.forEach((_, idx) => {
        result.errors.push({
          index: batchStartIndex + idx,
          error: `Batch processing error: ${error instanceof Error ? error.message : String(error)}`
        });
      });
      
      result.failed += batch.length;
    }
  }
  
  // Show toast based on results
  if (result.failed === 0) {
    toast({
      title: 'Success',
      description: `Successfully inserted ${result.success} tasks.`
    });
  } else if (result.success === 0) {
    toast({
      title: 'Failed',
      description: `Failed to insert all ${result.failed} tasks.`,
      variant: 'destructive'
    });
  } else {
    toast({
      title: 'Partial Success',
      description: `Inserted ${result.success} tasks, but ${result.failed} failed.`,
      variant: 'destructive'
    });
  }
  
  return result;
}

/**
 * Create a task with proper validation and transaction safety
 * Also creates the initial status history entry
 * 
 * @param taskData The task data to create
 * @param userId The ID of the user creating the task
 * @returns Promise resolving to the created task ID or null
 */
export async function createTaskWithHistory(
  taskData: Record<string, any>,
  userId: string
): Promise<number | null> {
  // Execute in transaction
  const { data, error } = await executeTransaction(async (tx) => {
    // Create the task
    const { data, error } = await tx
      .from('tasks')
      .insert({
        ...taskData,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    // Create status history
    const { error: historyError } = await tx
      .from('task_status_history')
      .insert({
        task_id: data.id,
        from_status: null,
        to_status: taskData.status || 'pending',
        changed_at: new Date().toISOString(),
        changed_by: userId,
        notes: 'Task created'
      });
    
    if (historyError) throw historyError;
    
    return data.id;
  });
  
  if (error) {
    console.error('Error in createTaskWithHistory:', error);
    toast({
      title: 'Failed to create task',
      description: error.message,
      variant: 'destructive'
    });
    return null;
  }
  
  return data;
} 