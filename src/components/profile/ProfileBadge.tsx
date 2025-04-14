import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Calendar, Star, Award, MessageSquare, CheckCircle 
} from 'lucide-react';

interface ProfileBadgeProps {
  type: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Updated badge definitions with 5 core types
const badgeConfig: Record<string, { icon: React.ReactNode, color: string, description: string, label: string }> = {
  "consistency-contributor": { 
    icon: <Calendar />, 
    label: "Consistent Contributor",
    color: "bg-blue-100 text-blue-800", 
    description: "Contributed regularly over an extended period."
  },
  "quality-champion": { 
    icon: <Star />, 
    label: "Quality Champion",
    color: "bg-green-100 text-green-800",
    description: "Maintained high quality ratings across tasks."
  },
  "prolific-contributor": { 
    icon: <Award />, 
    label: "Prolific Contributor",
    color: "bg-orange-100 text-orange-800",
    description: "Completed a significant volume of tasks."
  },
  "language-specialist": { 
    icon: <MessageSquare />, 
    label: "Language Specialist",
    color: "bg-purple-100 text-purple-800", 
    description: "Demonstrated expertise in a specific language."
  },
  "validator-virtuoso": { 
    icon: <CheckCircle />, 
    label: "Validator Virtuoso",
    color: "bg-indigo-100 text-indigo-800",
    description: "Excelled in validating contributions accurately."
  }
};

export const ProfileBadge: React.FC<ProfileBadgeProps> = ({ 
  type, 
  size = 'md', 
  showLabel = false 
}) => {
  // If badge type is not in our config, return null
  if (!badgeConfig[type]) return null;
  
  const { icon, color, description, label } = badgeConfig[type];
  // const label = type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  
  // Determine icon size based on badge size
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const iconWithSize = React.cloneElement(icon as React.ReactElement, {
    className: iconSizes[size]
  });
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${color} flex items-center gap-1 ${showLabel ? 'px-2 py-0.5' : 'px-1.5 py-0.5'}`}>
            {iconWithSize}
            {showLabel && <span className="text-xs font-medium">{label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 