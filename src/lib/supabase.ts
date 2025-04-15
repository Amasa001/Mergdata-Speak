
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
