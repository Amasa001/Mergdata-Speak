
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, FileText, Headphones, CheckCircle } from 'lucide-react';

export const ContributionTypes: React.FC = () => {
  const contributionTypes = [
    {
      title: "ASR Contributor",
      description: "Describe images verbally within a 15-second timeframe to help train speech recognition models.",
      icon: <Mic className="h-10 w-10 text-afri-orange" />,
      color: "bg-afri-yellow/20"
    },
    {
      title: "TTS Contributor",
      description: "Read and record provided text passages to help build natural-sounding text-to-speech systems.",
      icon: <Headphones className="h-10 w-10 text-afri-blue" />,
      color: "bg-afri-beige/30"
    },
    {
      title: "Transcriber",
      description: "Convert audio recordings into text, ensuring accurate transcriptions for training data.",
      icon: <FileText className="h-10 w-10 text-afri-green" />,
      color: "bg-afri-green/10"
    },
    {
      title: "Validator",
      description: "Review and verify the accuracy of transcriptions and audio recordings to ensure high quality data.",
      icon: <CheckCircle className="h-10 w-10 text-afri-brown" />,
      color: "bg-afri-yellow/30"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How You Can Contribute</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select a role that matches your skills and interests to help build speech technologies for African languages.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contributionTypes.map((type, index) => (
            <Card key={index} className="card-hover border-none shadow">
              <CardHeader>
                <div className={`${type.color} w-16 h-16 rounded-full flex items-center justify-center mb-4`}>
                  {type.icon}
                </div>
                <CardTitle className="text-xl">{type.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  {type.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
