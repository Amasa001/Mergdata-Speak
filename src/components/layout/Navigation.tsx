
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Headphones, 
  FileText, 
  Languages,
  CheckCircle,
  Settings,
  FileCheck
} from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'ASR Tasks',
      href: '/asr',
      icon: CheckCircle
    },
    {
      name: 'TTS Tasks',
      href: '/tts',
      icon: Headphones
    },
    {
      name: 'Transcription',
      href: '/transcribe',
      icon: FileText
    },
    {
      name: 'Translation',
      href: '/translate',
      icon: Languages
    },
    {
      name: 'Validation',
      href: '/validate',
      icon: FileCheck
    }
  ];

  return (
    <nav className="hidden md:flex space-x-4 items-center">
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
            location.pathname === item.href
              ? "bg-afri-orange/10 text-afri-orange"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <item.icon className="w-4 h-4 mr-2" />
          {item.name}
        </Link>
      ))}
    </nav>
  );
};

export default Navigation;
