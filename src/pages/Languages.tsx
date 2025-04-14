import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface LanguageStats {
  name: string;
  recordings: number;
  transcriptions: number;
  contributors: number;
  target: number;
  progress: number;
}

const Languages: React.FC = () => {
  const regions = [
    {
      name: "West Africa",
      languages: [
        { name: "Yoruba", recordings: 2450, transcriptions: 1830, contributors: 42, target: 5000, progress: 49 },
        { name: "Igbo", recordings: 1850, transcriptions: 1240, contributors: 31, target: 5000, progress: 37 },
        { name: "Hausa", recordings: 3200, transcriptions: 2600, contributors: 58, target: 5000, progress: 64 },
        { name: "Twi", recordings: 1200, transcriptions: 980, contributors: 22, target: 5000, progress: 24 },
        { name: "Wolof", recordings: 950, transcriptions: 720, contributors: 18, target: 5000, progress: 19 },
        { name: "Fulani", recordings: 780, transcriptions: 540, contributors: 12, target: 5000, progress: 16 },
      ]
    },
    {
      name: "East Africa",
      languages: [
        { name: "Swahili", recordings: 3850, transcriptions: 3120, contributors: 67, target: 5000, progress: 77 },
        { name: "Amharic", recordings: 2100, transcriptions: 1650, contributors: 36, target: 5000, progress: 42 },
        { name: "Somali", recordings: 1450, transcriptions: 1100, contributors: 25, target: 5000, progress: 29 },
        { name: "Oromo", recordings: 980, transcriptions: 730, contributors: 16, target: 5000, progress: 20 },
        { name: "Luganda", recordings: 1250, transcriptions: 950, contributors: 21, target: 5000, progress: 25 },
        { name: "Kinyarwanda", recordings: 1580, transcriptions: 1280, contributors: 26, target: 5000, progress: 32 },
      ]
    },
    {
      name: "Southern Africa",
      languages: [
        { name: "Zulu", recordings: 2680, transcriptions: 2150, contributors: 45, target: 5000, progress: 54 },
        { name: "Xhosa", recordings: 2200, transcriptions: 1780, contributors: 38, target: 5000, progress: 44 },
        { name: "Shona", recordings: 1420, transcriptions: 1080, contributors: 24, target: 5000, progress: 28 },
        { name: "Ndebele", recordings: 950, transcriptions: 720, contributors: 15, target: 5000, progress: 19 },
        { name: "Sesotho", recordings: 1300, transcriptions: 980, contributors: 22, target: 5000, progress: 26 },
        { name: "Setswana", recordings: 1150, transcriptions: 850, contributors: 20, target: 5000, progress: 23 },
      ]
    }
  ];

  const LanguageCard = ({ language }: { language: LanguageStats }) => {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{language.name}</CardTitle>
            <Badge variant="outline">{language.progress}% Complete</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={language.progress} className="mb-4" />
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-gray-500">Recordings</p>
              <p className="font-medium">{language.recordings.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Transcriptions</p>
              <p className="font-medium">{language.transcriptions.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Contributors</p>
              <p className="font-medium">{language.contributors}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-3 text-center">African Languages</h1>
        <p className="text-gray-600 text-center mb-8 max-w-3xl mx-auto">
          Track our progress in developing speech datasets for African languages. Each language needs recordings, transcriptions, and validations to reach our target goal.
        </p>

        <Tabs defaultValue="West Africa">
          <TabsList className="grid grid-cols-3 mb-8">
            {regions.map((region) => (
              <TabsTrigger key={region.name} value={region.name}>{region.name}</TabsTrigger>
            ))}
          </TabsList>

          {regions.map((region) => (
            <TabsContent key={region.name} value={region.name}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {region.languages.map((language) => (
                  <LanguageCard key={language.name} language={language} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-12 border-t pt-8">
          <h2 className="text-2xl font-semibold mb-4">Language Contribution Guide</h2>
          <p className="text-gray-700 mb-6">
            We welcome contributions in all African languages. Here's how you can help:
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-afri-orange/10">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-2">Record Speech</h3>
                <p className="text-gray-700">
                  Sign up as an ASR or TTS contributor and record your voice to help build our dataset.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-afri-blue/10">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-2">Transcribe Audio</h3>
                <p className="text-gray-700">
                  Help transcribe audio recordings to create accurate text pairs for our speech models.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-afri-green/10">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-2">Validate Data</h3>
                <p className="text-gray-700">
                  Review recordings and transcriptions for quality and accuracy to ensure high quality data.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Languages;
