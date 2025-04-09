
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ValidateTask: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Validation Dashboard</h1>
            <p className="text-gray-500">Review and validate contributions for quality assurance</p>
          </div>
        </div>

        <Tabs defaultValue="asr" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="asr">ASR Validation</TabsTrigger>
            <TabsTrigger value="tts">TTS Validation</TabsTrigger>
            <TabsTrigger value="transcriptions">Transcriptions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="asr" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>ASR Recordings Validation</CardTitle>
                <CardDescription>
                  Listen and verify speech recordings for accuracy and quality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-12">ASR validation functionality will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="tts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>TTS Recordings Validation</CardTitle>
                <CardDescription>
                  Listen and verify text-to-speech recordings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-12">TTS validation functionality will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transcriptions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Transcription Validation</CardTitle>
                <CardDescription>
                  Review and verify transcribed content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-12">Transcription validation functionality will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ValidateTask;
