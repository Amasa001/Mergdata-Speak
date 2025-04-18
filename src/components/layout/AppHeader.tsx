import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LayoutDashboard, User, LogOut, Trophy, Settings, FolderKanban } from 'lucide-react';

/**
 * Header component for authenticated sections of the app.
 * Provides navigation to Dashboard, Profile, and Logout functionality.
 */
export const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('is_admin') // Select the is_admin field based on schema
              .eq('id', user.id)
              .single();
            
            if (error) {
                console.error("Error fetching profile for admin check:", error);
                setIsAdmin(false);
            } else if (profileData) {
                setIsAdmin(profileData.is_admin === true); // Check if is_admin is true
            }
         } else {
             setIsAdmin(false);
         }
      } catch (error) {
           console.error("Exception during admin check:", error);
           setIsAdmin(false);
      }
    };
    fetchUserRole();
    
    // Optional: Listen for auth changes to potentially update admin status if needed
    // const { data: authListener } = supabase.auth.onAuthStateChange(...);
    // return () => authListener?.subscription.unsubscribe();

  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully');
      navigate('/login'); // Redirect to login page after logout
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message || 'Failed to log out');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Optional: Add App Name/Logo here */}
        {/* <Link to="/dashboard" className="mr-6 flex items-center space-x-2">
          <span className="font-bold sm:inline-block">AfriSpeakNexus</span>
        </Link> */}
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/projects">
                <FolderKanban className="h-4 w-4 mr-1" /> Projects
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/leaderboard">
                <Trophy className="h-4 w-4 mr-1" /> Leaderboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profile">
                <User className="h-4 w-4 mr-1" /> Profile
              </Link>
            </Button>

            {/* Conditional Admin Button based on is_admin field */}
            {isAdmin && (
               <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/create-task">
                     <Settings className="h-4 w-4 mr-1" /> Admin Tasks
                  </Link>
               </Button>
            )}

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}; 