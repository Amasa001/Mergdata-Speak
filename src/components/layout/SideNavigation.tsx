import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  Trophy,
  Headphones,
  FileText,
  Languages,
  CheckCircle, 
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    name: 'Validate Task',
    href: '/validate',
    icon: FileCheck
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

export const SideNavigation: React.FC = () => {
  const location = useLocation();
  
  return (
    <aside className="bg-background w-64 min-h-screen border-r pt-14 hidden md:block">
      <div className="px-3 py-4">
        <nav className="space-y-1">
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
        </nav>
      </div>
    </aside>
  );
}; 