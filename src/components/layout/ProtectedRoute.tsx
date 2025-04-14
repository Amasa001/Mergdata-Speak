import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from './AppLayout';
import { Session } from '@supabase/supabase-js';

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
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error fetching session:", error);
          setSession(null);
        } else {
          setSession(data.session);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    // Also listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // If user logs out while on protected route, this will trigger redirect
      if (!session && !loading) {
         setLoading(false); // Ensure loading is false if session becomes null
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [loading]); // Re-check if loading state changes unexpectedly

  if (loading) {
    // Optional: Render a loading spinner/indicator
    return <div>Loading...</div>; 
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