
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mic, FileText, Headphones, CheckCircle } from 'lucide-react';

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  color: string;
}

interface RoleSelectorProps {
  selectedRole: string;
  onSelectRole: (roleId: string) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ 
  selectedRole, 
  onSelectRole 
}) => {
  const roleOptions: RoleOption[] = [
    {
      id: "asr_contributor",
      title: "ASR Contributor",
      description: "Describe images verbally to help train speech recognition models.",
      icon: <Mic className="h-6 w-6" />,
      color: "text-afri-orange bg-afri-yellow/20"
    },
    {
      id: "tts_contributor",
      title: "TTS Contributor",
      description: "Read and record text passages for text-to-speech systems.",
      icon: <Headphones className="h-6 w-6" />,
      color: "text-afri-blue bg-afri-beige/30"
    },
    {
      id: "transcriber",
      title: "Transcriber",
      description: "Convert audio recordings into accurate text transcriptions.",
      icon: <FileText className="h-6 w-6" />,
      color: "text-afri-green bg-afri-green/10"
    },
    {
      id: "validator",
      title: "Validator",
      description: "Review and verify the quality of audio and transcriptions.",
      icon: <CheckCircle className="h-6 w-6" />,
      color: "text-afri-brown bg-afri-yellow/30"
    }
  ];

  return (
    <RadioGroup value={selectedRole} onValueChange={onSelectRole} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roleOptions.map((role) => (
        <div key={role.id} className="relative">
          <RadioGroupItem 
            value={role.id} 
            id={role.id} 
            className="peer sr-only"
          />
          <label htmlFor={role.id}>
            <Card 
              className={`cursor-pointer transition-all ${
                selectedRole === role.id 
                  ? 'ring-2 ring-afri-orange shadow-md' 
                  : 'hover:shadow'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-full ${role.color}`}>
                    {role.icon}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-medium">{role.title}</h3>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </label>
        </div>
      ))}
    </RadioGroup>
  );
};
