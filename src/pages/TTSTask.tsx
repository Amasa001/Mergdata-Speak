
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TTSTask: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Text-to-Speech Contribution</h1>
            <p className="text-gray-500">Record and submit high-quality voice recordings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>TTS Recording Tasks</CardTitle>
              <CardDescription>
                Record your voice reading text passages to improve text-to-speech systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12">TTS functionality will be implemented here</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recording Tips</CardTitle>
              <CardDescription>
                Follow these guidelines for optimal recording quality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• Use a quiet environment with minimal background noise</p>
              <p>• Maintain consistent distance from the microphone</p>
              <p>• Speak clearly and at a moderate pace</p>
              <p>• Use natural intonation and pronunciation</p>
              <p>• Complete the entire script in one recording session</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default TTSTask;
