
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Mic, FileText, Headphones, CheckCircle } from 'lucide-react';

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  color: string;
}

interface RoleSelectorProps {
  selectedRoles: string[];
  onSelectRole: (roleId: string) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ 
  selectedRoles, 
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roleOptions.map((role) => (
        <Card 
          key={role.id}
          className={`cursor-pointer transition-all ${
            selectedRoles.includes(role.id) 
              ? 'ring-2 ring-afri-orange shadow-md' 
              : 'hover:shadow'
          }`}
          onClick={() => onSelectRole(role.id)}
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
              <Checkbox 
                checked={selectedRoles.includes(role.id)}
                // Remove the onCheckedChange prop to prevent the infinite loop
                // The click handler on the Card will handle the selection instead
                className="mt-1"
                onClick={(e) => {
                  // Stop propagation to prevent double-firing with the Card's onClick
                  e.stopPropagation();
                }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
