
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headphones, FileText, Clock, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TTSDashboard: React.FC = () => {
  // Mock data
  const ttsStats = {
    passages: 32,
    hours: 2.5,
    languages: 2,
    completionRate: 94
  };
  
  const ttsTasks = [
    {
      id: 1,
      title: "Traditional Folk Stories",
      description: "Record narration of traditional stories for voice preservation",
      duration: "3-5 min",
      language: "Amharic",
      difficulty: "medium",
      passages: 3
    },
    {
      id: 2,
      title: "Everyday Conversations",
      description: "Record common dialogue phrases with natural intonation",
      duration: "1-2 min",
      language: "Swahili",
      difficulty: "easy", 
      passages: 10
    }
  ];

  return (
    <div className="space-y-6">
      {/* TTS-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Passages</CardTitle>
              <FileText className="h-5 w-5 text-afri-orange" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ttsStats.passages}</div>
            <p className="text-xs text-gray-500">Text passages recorded</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Hours</CardTitle>
              <Clock className="h-5 w-5 text-afri-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ttsStats.hours}</div>
            <p className="text-xs text-gray-500">Total voice recording time</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Languages</CardTitle>
              <Headphones className="h-5 w-5 text-afri-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ttsStats.languages}</div>
            <p className="text-xs text-gray-500">Languages contributed to</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Completion</CardTitle>
              <BarChart className="h-5 w-5 text-afri-brown" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ttsStats.completionRate}%</div>
            <p className="text-xs text-gray-500">Task completion rate</p>
          </CardContent>
        </Card>
      </div>
      
      {/* TTS-specific tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Text Recording Tasks</CardTitle>
          <CardDescription>
            Record these text passages with clear pronunciation and natural intonation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ttsTasks.map(task => (
              <div key={task.id} className="p-4 border rounded-md hover:border-afri-orange/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <FileText className="h-5 w-5 text-afri-blue" />
                    </div>
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-500">{task.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                          {task.language}
                        </span>
                        <span className="text-xs text-gray-500">{task.duration} each</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{task.passages} passages</span>
                      </div>
                    </div>
                  </div>
                  <Link to="/tts">
                    <Button variant="outline" size="sm">
                      Start Recording
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Voice quality metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Quality Metrics</CardTitle>
          <CardDescription>Your recording metrics and improvement areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Clarity</span>
                <span className="text-sm text-green-600">Excellent</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pacing</span>
                <span className="text-sm text-green-600">Good</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pronunciation</span>
                <span className="text-sm text-yellow-600">Fair</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-yellow-500 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
