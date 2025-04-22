import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from './AppLayout';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

/**
 * A component to protect routes that require authentication.
 * Checks for an active Supabase session.
 * If authenticated, renders the child route within AppLayout.
 * If not authenticated, redirects to the /login page.
 */
export const ProtectedRoute: React.FC = () => {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error fetching session:", error);
          if (mounted) setSession(null);
        } else {
          if (mounted) setSession(data.session);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSession();

    // Also listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
      }
    });

    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  if (loading) {
    // Render a loading spinner/indicator
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // User not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is logged in, render the requested route within the AppLayout
  return (
    <AppLayout>
      <Outlet /> {/* Renders the nested child route component */}
    </AppLayout>
  );
}; 