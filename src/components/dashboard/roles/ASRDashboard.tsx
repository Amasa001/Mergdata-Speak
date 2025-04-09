
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, ImageIcon, Languages, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ASRDashboard: React.FC = () => {
  // Mock data
  const asrStats = {
    recordingsCompleted: 28,
    languagesCovered: 3,
    minutesRecorded: 75,
    pendingTasks: 12
  };
  
  const asrTasks = [
    {
      id: 1,
      title: "Daily Scene Descriptions",
      description: "Record descriptions of everyday scenes in Swahili",
      count: 10,
      estimatedTime: "15 min",
      language: "Swahili",
      difficulty: "easy"
    },
    {
      id: 2,
      title: "Action Verbs Collection",
      description: "Describe actions shown in images to build vocabulary",
      count: 15,
      estimatedTime: "20 min",
      language: "Yoruba",
      difficulty: "medium"
    }
  ];

  return (
    <div className="space-y-6">
      {/* ASR-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Recordings</CardTitle>
              <Mic className="h-5 w-5 text-afri-orange" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{asrStats.recordingsCompleted}</div>
            <p className="text-xs text-gray-500">Speech samples recorded</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Languages</CardTitle>
              <Languages className="h-5 w-5 text-afri-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{asrStats.languagesCovered}</div>
            <p className="text-xs text-gray-500">Language diversity</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Minutes</CardTitle>
              <Clock className="h-5 w-5 text-afri-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{asrStats.minutesRecorded}</div>
            <p className="text-xs text-gray-500">Total recording time</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
              <ImageIcon className="h-5 w-5 text-afri-brown" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{asrStats.pendingTasks}</div>
            <p className="text-xs text-gray-500">Images waiting for description</p>
          </CardContent>
        </Card>
      </div>
      
      {/* ASR-specific tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Image Description Tasks</CardTitle>
          <CardDescription>
            Record clear spoken descriptions of these images to improve ASR datasets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {asrTasks.map(task => (
              <div key={task.id} className="p-4 border rounded-md hover:border-afri-orange/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <ImageIcon className="h-5 w-5 text-afri-orange" />
                    </div>
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-500">{task.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                          {task.language}
                        </span>
                        <span className="text-xs text-gray-500">~{task.estimatedTime}</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{task.count} images</span>
                      </div>
                    </div>
                  </div>
                  <Link to="/asr">
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
      
      {/* ASR Guide */}
      <Card>
        <CardHeader>
          <CardTitle>ASR Recording Guide</CardTitle>
          <CardDescription>Tips for effective image descriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm">• Start with the central subject, then describe details</p>
            <p className="text-sm">• Use clear, natural speech at a moderate pace</p>
            <p className="text-sm">• Include important visual details like colors, actions, and environment</p>
            <p className="text-sm">• Maintain consistent recording volume</p>
            <p className="text-sm">• Use culturally appropriate terminology for local contexts</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
