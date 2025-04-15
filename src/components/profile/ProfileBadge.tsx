import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Trophy, 
  Mic, 
  Languages, 
  FileText, 
  CheckCheck,
  LucideIcon
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type BadgeType = 'asr' | 'tts' | 'translate' | 'transcribe' | 'validate';

export interface BadgeProps {
  type: BadgeType;
  level?: 1 | 2 | 3 | 4 | 5; // Level 1-5 (bronze, silver, gold, platinum, diamond)
  count?: number; // Number of contributions for this badge type
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeConfig: Record<BadgeType, {
  icon: LucideIcon, 
  label: string,
  description: string,
  colorClass: string,
}> = {
  asr: {
    icon: Mic,
    label: 'ASR Contributor',
    description: 'Contributed to Automatic Speech Recognition tasks',
    colorClass: 'text-blue-500',
  },
  tts: {
    icon: Mic,
    label: 'TTS Contributor',
    description: 'Contributed to Text-to-Speech generation tasks',
    colorClass: 'text-purple-500',
  },
  translate: {
    icon: Languages,
    label: 'Translation Contributor',
    description: 'Contributed to translation tasks',
    colorClass: 'text-green-500',
  },
  transcribe: {
    icon: FileText,
    label: 'Transcription Contributor',
    description: 'Contributed to transcription tasks',
    colorClass: 'text-amber-500',
  },
  validate: {
    icon: CheckCheck,
    label: 'Validation Contributor',
    description: 'Contributed to validation tasks',
    colorClass: 'text-red-500',
  }
};

// Badge level configuration (based on number of contributions)
const levelConfig = {
  1: { // Bronze
    label: 'Bronze',
    colorClass: 'bg-amber-700',
    requireCount: 5,
  },
  2: { // Silver
    label: 'Silver',
    colorClass: 'bg-gray-400',
    requireCount: 20,
  },
  3: { // Gold
    label: 'Gold',
    colorClass: 'bg-yellow-400',
    requireCount: 50,
  },
  4: { // Platinum
    label: 'Platinum',
    colorClass: 'bg-cyan-400',
    requireCount: 100,
  },
  5: { // Diamond
    label: 'Diamond',
    colorClass: 'bg-purple-400',
    requireCount: 200,
  },
};

// Get the badge level based on contribution count
const getBadgeLevel = (count: number = 0): 1 | 2 | 3 | 4 | 5 => {
  if (count >= levelConfig[5].requireCount) return 5; // Diamond
  if (count >= levelConfig[4].requireCount) return 4; // Platinum
  if (count >= levelConfig[3].requireCount) return 3; // Gold
  if (count >= levelConfig[2].requireCount) return 2; // Silver
  return 1; // Bronze
};

export const ProfileBadge: React.FC<BadgeProps> = ({ 
  type, 
  level: explicitLevel, 
  count = 0,
  size = 'md',
  className 
}) => {
  // Use provided level or calculate based on count
  const level = explicitLevel || getBadgeLevel(count);
  const badgeInfo = badgeConfig[type];
  const levelInfo = levelConfig[level];
  const Icon = badgeInfo.icon;
  
  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'relative rounded-full flex items-center justify-center p-2',
            'border-2 bg-background shadow-md',
            badgeInfo.colorClass,
            sizeClasses[size],
            className
          )}>
            <Icon className="w-5/8 h-5/8" />
            
            {/* Level indicator */}
            <div 
              className={cn(
                'absolute -bottom-1 -right-1 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-white font-bold',
                levelInfo.colorClass
              )}
            >
              {level}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm font-medium">{badgeInfo.label}</div>
          <div className="text-xs text-muted-foreground">{badgeInfo.description}</div>
          <div className="text-xs mt-1">
            <span className="font-semibold">{levelInfo.label} Level</span>
            {count > 0 && <span> · {count} contributions</span>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 