import React from 'react';
import { Check } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface LanguageSelectorProps {
  selectedLanguages: string[];
  onSelectLanguage: (language: string) => void;
  roleType?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguages,
  onSelectLanguage,
  roleType
}) => {
  const [open, setOpen] = React.useState(false);

  const languagesByRegion = {
    "West African": [
      { value: "akan", label: "Akan" },
      { value: "ewe", label: "Ewe" },
      { value: "yoruba", label: "Yoruba" },
      { value: "ga", label: "Ga" },
      { value: "hausa", label: "Hausa" },
      { value: "dagbani", label: "Dagbani" },
      { value: "sissale", label: "Sissale" },
      { value: "dagaare", label: "Dagaare" },
      { value: "dioula", label: "Dioula" },
      { value: "baule", label: "Baule" },
      { value: "krio", label: "Krio" },
      { value: "mende", label: "Mende" },
      { value: "temne", label: "Temne" },
      { value: "fongbe", label: "Fongbe" },
      { value: "igbo", label: "Igbo" },
    ],
    "East African": [
      { value: "swahili", label: "Swahili" },
      { value: "kiswahili_pidgin", label: "Kiswahili Pidgin" },
      { value: "kikuyu", label: "Kikuyu" },
      { value: "kalenjin", label: "Kalenjin" },
    ]
  };

  const allLanguages = Object.values(languagesByRegion).flat();

  const selectedLanguagesDisplay = selectedLanguages.length > 0
    ? selectedLanguages.length === 1
      ? allLanguages.find(lang => lang.value === selectedLanguages[0])?.label
      : `${selectedLanguages.length} languages selected`
    : "Select languages...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLanguagesDisplay}
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
      <PopoverContent className="p-0" style={{ width: "350px" }}>
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            {Object.entries(languagesByRegion).map(([region, languages]) => (
              <CommandGroup key={region} heading={region}>
                {languages.map((language) => (
                  <CommandItem
                    key={language.value}
                    onSelect={() => {
                      onSelectLanguage(language.value);
                      // Keep open for multiple selection
                    }}
                    className="flex items-center"
                  >
                    <div className="flex items-center flex-1 space-x-2">
                      <Checkbox 
                        checked={selectedLanguages.includes(language.value)}
                        onCheckedChange={() => onSelectLanguage(language.value)}
                        className="mr-2"
                      />
                      <span>{language.label}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <div className="flex justify-end p-2 border-t">
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
