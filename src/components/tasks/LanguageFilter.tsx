
import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageFilterProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  availableLanguages: string[];
}

export const LanguageFilter: React.FC<LanguageFilterProps> = ({
  selectedLanguage,
  onLanguageChange,
  availableLanguages,
}) => {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium">Filter by language:</span>
      </div>
      
      <Select value={selectedLanguage} onValueChange={onLanguageChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All languages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All languages</SelectItem>
          {availableLanguages.map((lang) => (
            <SelectItem key={lang} value={lang.toLowerCase()}>
              {lang}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
