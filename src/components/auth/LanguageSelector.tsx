
import React from 'react';
import { Check } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelectLanguage: (language: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage
}) => {
  const [open, setOpen] = React.useState(false);

  const languages = [
    // West African Languages
    { value: "yoruba", label: "Yoruba" },
    { value: "igbo", label: "Igbo" },
    { value: "hausa", label: "Hausa" },
    { value: "twi", label: "Twi" },
    { value: "wolof", label: "Wolof" },
    { value: "fulani", label: "Fulani" },
    
    // East African Languages
    { value: "swahili", label: "Swahili" },
    { value: "amharic", label: "Amharic" },
    { value: "somali", label: "Somali" },
    { value: "oromo", label: "Oromo" },
    { value: "luganda", label: "Luganda" },
    { value: "kinyarwanda", label: "Kinyarwanda" },
    
    // Southern African Languages
    { value: "zulu", label: "Zulu" },
    { value: "xhosa", label: "Xhosa" },
    { value: "shona", label: "Shona" },
    { value: "ndebele", label: "Ndebele" },
    { value: "sesotho", label: "Sesotho" },
    { value: "setswana", label: "Setswana" },
  ];

  const selectedLanguageLabel = languages.find(
    lang => lang.value === selectedLanguage
  )?.label || "Select language...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLanguageLabel}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
          >
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {languages.map((language) => (
              <CommandItem
                key={language.value}
                onSelect={() => {
                  onSelectLanguage(language.value);
                  setOpen(false);
                }}
                value={language.value}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedLanguage === language.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {language.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
