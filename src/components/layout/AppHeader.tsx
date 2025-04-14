import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LayoutDashboard, User, LogOut, Trophy, Settings } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

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

  // Add admin navigation items
  const adminNavigationItems = [
    { name: 'Admin Dashboard', href: '/admin' },
    { name: 'Task Manager', href: '/admin/task-manager' }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-1" /> Admin
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {adminNavigationItems.map(item => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href}>{item.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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
