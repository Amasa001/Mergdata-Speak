import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LayoutDashboard, User, LogOut, Trophy } from 'lucide-react';

/**
 * Header component for authenticated sections of the app.
 * Provides navigation to Dashboard, Profile, and Logout functionality.
 */
export const AppHeader: React.FC = () => {
  const navigate = useNavigate();

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
              <Link to="/leaderboard">
                <Trophy className="h-4 w-4 mr-1" /> Leaderboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profile">
                <User className="h-4 w-4 mr-1" /> Profile
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}; 