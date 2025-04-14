import React from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface AdvancedFiltersProps {
  selectedLanguages: string[];
  onLanguageChange: (languages: string[]) => void;
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onPriorityChange: (priority: string) => void;
  onSearchChange: (query: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  selectedPriority: string;
  searchQuery: string;
}

// Define available languages as a constant
const AVAILABLE_LANGUAGES = [
  "Akan", "Ewe", "Ga", "Dagbani", "Fante", "Dagaare", "Gonja", "Kasem", "Kusaal", "Nzema"
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  selectedLanguages,
  onLanguageChange,
  onDateRangeChange,
  onPriorityChange,
  onSearchChange,
  dateRange,
  selectedPriority,
  searchQuery,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Languages</h4>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <label key={lang} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(lang)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onLanguageChange([...selectedLanguages, lang]);
                          } else {
                            onLanguageChange(selectedLanguages.filter(l => l !== lang));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Date Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full">
                        {dateRange.from ? format(dateRange.from, 'PPP') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full">
                        {dateRange.to ? format(dateRange.to, 'PPP') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Priority</h4>
                <Select value={selectedPriority} onValueChange={onPriorityChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLanguages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-afri-brown/10 text-afri-brown"
            >
              {lang}
              <button
                onClick={() => onLanguageChange(selectedLanguages.filter(l => l !== lang))}
                className="ml-1 hover:text-afri-orange"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}; 