import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  Trophy,
  Headphones,
  FileText,
  Languages,
  CheckCircle, 
  FileCheck,
  Settings,
  PlusCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Standard navigation items for all users
const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    name: 'ASR Task',
    href: '/asr',
    icon: CheckCircle
  },
  {
    name: 'TTS Task',
    href: '/tts',
    icon: Headphones
  },
  {
    name: 'Transcribe Task',
    href: '/transcribe',
    icon: FileText
  },
  {
    name: 'Translate Task',
    href: '/translate',
    icon: Languages
  },
  {
    name: 'Leaderboard',
    href: '/leaderboard',
    icon: Trophy
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User
  }
];

// Admin-only navigation items
const adminNavigationItems = [
  {
    name: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: Settings
  },
  {
    name: 'Create Task',
    href: '/admin/create-task',
    icon: PlusCircle
  }
];

export const SideNavigation: React.FC = () => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error("Error fetching profile for admin check:", error);
            setIsAdmin(false);
          } else if (profileData) {
            setIsAdmin(profileData.is_admin === true);
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
  }, []);
  
  return (
    <aside className="bg-background w-64 min-h-screen border-r pt-14 hidden md:block">
      <div className="px-3 py-4">
        <nav className="space-y-1">
          {/* Standard Navigation Items */}
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md group",
                  isActive 
                    ? "bg-afri-orange/10 text-afri-orange" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon 
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-afri-orange" : "text-muted-foreground group-hover:text-foreground"
                  )} 
                  aria-hidden="true" 
                />
                {item.name}
              </Link>
            );
          })}
          
          {/* Admin Navigation Items - Only shown if user is admin */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <div className="flex items-center px-3">
                  <h3 className="text-sm font-medium text-gray-500">Admin</h3>
                </div>
              </div>
              {adminNavigationItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md group",
                      isActive 
                        ? "bg-afri-orange/10 text-afri-orange" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon 
                      className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        isActive ? "text-afri-orange" : "text-muted-foreground group-hover:text-foreground"
                      )} 
                      aria-hidden="true" 
                    />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </div>
    </aside>
  );
}; 