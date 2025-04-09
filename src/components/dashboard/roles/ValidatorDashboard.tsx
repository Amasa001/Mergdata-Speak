
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileCheck, Headphones, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const ValidatorDashboard: React.FC = () => {
  // Mock data
  const validationStats = {
    totalValidated: 86,
    asrValidations: 35,
    ttsValidations: 28,
    transcriptionValidations: 23
  };
  
  const validationTasks = [
    {
      id: 1,
      type: 'asr',
      title: "ASR Accuracy Review",
      description: "Validate the accuracy of spoken descriptions against images",
      count: 15,
      language: "Swahili",
      priority: "high"
    },
    {
      id: 2,
      type: 'tts',
      title: "Voice Quality Assessment",
      description: "Review TTS recordings for pronunciation and clarity",
      count: 8,
      language: "Amharic",
      priority: "medium"
    },
    {
      id: 3,
      type: 'transcription',
      title: "Transcription Verification",
      description: "Check transcriptions against original audio for accuracy",
      count: 12,
      language: "Yoruba",
      priority: "high"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Validator-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Total</CardTitle>
              <Shield className="h-5 w-5 text-afri-brown" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationStats.totalValidated}</div>
            <p className="text-xs text-gray-500">Items validated</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">ASR</CardTitle>
              <CheckCircle className="h-5 w-5 text-afri-orange" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationStats.asrValidations}</div>
            <p className="text-xs text-gray-500">Speech recordings validated</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">TTS</CardTitle>
              <Headphones className="h-5 w-5 text-afri-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationStats.ttsValidations}</div>
            <p className="text-xs text-gray-500">Voice recordings checked</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Transcriptions</CardTitle>
              <FileCheck className="h-5 w-5 text-afri-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationStats.transcriptionValidations}</div>
            <p className="text-xs text-gray-500">Text transcripts verified</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Validation tasks with tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Queue</CardTitle>
          <CardDescription>
            Review and verify the quality of submitted contributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="asr">ASR</TabsTrigger>
              <TabsTrigger value="tts">TTS</TabsTrigger>
              <TabsTrigger value="transcription">Transcriptions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="space-y-4">
                {validationTasks.map(task => (
                  <div key={task.id} className="p-4 border rounded-md hover:border-afri-brown/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {task.type === 'asr' && <CheckCircle className="h-5 w-5 text-afri-orange" />}
                          {task.type === 'tts' && <Headphones className="h-5 w-5 text-afri-blue" />}
                          {task.type === 'transcription' && <FileCheck className="h-5 w-5 text-afri-green" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {task.language}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.count} items</span>
                            {task.priority === "high" ? (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">High Priority</span>
                            ) : (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Medium Priority</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link to="/validate">
                        <Button variant="outline" size="sm">
                          Start Validation
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="asr" className="mt-4">
              <div className="space-y-4">
                {validationTasks.filter(t => t.type === 'asr').map(task => (
                  <div key={task.id} className="p-4 border rounded-md hover:border-afri-brown/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <CheckCircle className="h-5 w-5 text-afri-orange" />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {task.language}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.count} items</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/validate">
                        <Button variant="outline" size="sm">
                          Review ASR
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            {/* Similar TabsContent sections for TTS and transcription (following the same pattern) */}
            <TabsContent value="tts" className="mt-4">
              <div className="space-y-4">
                {validationTasks.filter(t => t.type === 'tts').map(task => (
                  <div key={task.id} className="p-4 border rounded-md hover:border-afri-brown/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <Headphones className="h-5 w-5 text-afri-blue" />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {task.language}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.count} items</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/validate">
                        <Button variant="outline" size="sm">
                          Review TTS
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="transcription" className="mt-4">
              <div className="space-y-4">
                {validationTasks.filter(t => t.type === 'transcription').map(task => (
                  <div key={task.id} className="p-4 border rounded-md hover:border-afri-brown/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <FileCheck className="h-5 w-5 text-afri-green" />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {task.language}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.count} items</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/validate">
                        <Button variant="outline" size="sm">
                          Review Transcriptions
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Validation guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Guidelines</CardTitle>
          <CardDescription>Standards for quality assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">ASR Validation</h4>
              <p className="text-sm text-gray-600">• Check that speech clearly describes the image content</p>
              <p className="text-sm text-gray-600">• Verify pronunciation and speech clarity</p>
              <p className="text-sm text-gray-600">• Ensure no background noise impacts quality</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-1">TTS Validation</h4>
              <p className="text-sm text-gray-600">• Verify text is read accurately and completely</p>
              <p className="text-sm text-gray-600">• Check for natural intonation and appropriate pacing</p>
              <p className="text-sm text-gray-600">• Ensure consistent audio quality throughout the recording</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-1">Transcription Validation</h4>
              <p className="text-sm text-gray-600">• Verify word-for-word accuracy with the original audio</p>
              <p className="text-sm text-gray-600">• Check proper punctuation and formatting</p>
              <p className="text-sm text-gray-600">• Ensure consistent style following project guidelines</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
