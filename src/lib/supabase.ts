
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://bctqeqfeteqlaldzrtgt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjdHFlcWZldGVxbGFsZHpydGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMTMxNjYsImV4cCI6MjA1OTc4OTE2Nn0.x6DjsNTIjd2xVWbAHmWtYgdDCBtipPahOKnxzxW__r4";

// Create a single supabase client for interacting with your database and storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

// Function to check if a storage bucket exists and attempt to create it if needed
export const ensureStorageBucket = async (bucketName: string): Promise<boolean> => {
  try {
    // First check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error checking buckets:`, listError);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`Bucket ${bucketName} exists`);
      return true;
    }
    
    // If bucket doesn't exist, try to create it
    console.log(`Bucket ${bucketName} not found, attempting to create it...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    });
    
    if (error) {
      console.error(`Failed to create bucket ${bucketName}:`, error);
      return false;
    }
    
    console.log(`Successfully created bucket ${bucketName}`);
    return true;
  } catch (err) {
    console.error(`Unexpected error ensuring bucket ${bucketName}:`, err);
    return false;
  }
};
