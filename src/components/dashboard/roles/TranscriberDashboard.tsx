
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TranscriberDashboard: React.FC = () => {
  // Mock data
  const transcriptionStats = {
    completed: 37,
    accuracyRate: 95,
    minutesProcessed: 124,
    pendingCount: 8
  };
  
  const transcriptionTasks = [
    {
      id: 1,
      title: "News Broadcast Transcription",
      description: "Transcribe local news segments with high accuracy",
      duration: "4:32",
      language: "Hausa",
      difficulty: "medium",
      urgency: "high"
    },
    {
      id: 2,
      title: "Interview Series",
      description: "Transcribe cultural expert interviews on traditional practices",
      duration: "8:15",
      language: "Igbo",
      difficulty: "hard",
      urgency: "medium"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Transcriber-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Transcribed</CardTitle>
              <FileText className="h-5 w-5 text-afri-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transcriptionStats.completed}</div>
            <p className="text-xs text-gray-500">Audio files processed</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Accuracy</CardTitle>
              <CheckCircle className="h-5 w-5 text-afri-orange" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transcriptionStats.accuracyRate}%</div>
            <p className="text-xs text-gray-500">Validation success rate</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Minutes</CardTitle>
              <Clock className="h-5 w-5 text-afri-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transcriptionStats.minutesProcessed}</div>
            <p className="text-xs text-gray-500">Total audio transcribed</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
              <BarChart2 className="h-5 w-5 text-afri-brown" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transcriptionStats.pendingCount}</div>
            <p className="text-xs text-gray-500">Tasks awaiting completion</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Transcription-specific tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Transcription Tasks</CardTitle>
          <CardDescription>
            Convert these audio recordings into accurate text transcriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transcriptionTasks.map(task => (
              <div key={task.id} className="p-4 border rounded-md hover:border-afri-green/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <FileText className="h-5 w-5 text-afri-green" />
                    </div>
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-500">{task.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                          {task.language}
                        </span>
                        <span className="text-xs text-gray-500">{task.duration} min</span>
                        {task.urgency === "high" ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Urgent</span>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Standard</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link to="/transcribe">
                    <Button variant="outline" size="sm">
                      Transcribe
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Transcription tools */}
      <Card>
        <CardHeader>
          <CardTitle>Transcription Tools</CardTitle>
          <CardDescription>Specialized tools to improve your transcription workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-md bg-gray-50">
              <h4 className="font-medium mb-2">Audio Player Controls</h4>
              <p className="text-sm text-gray-600 mb-3">Speed control, short rewind, and timestamps for precise transcription</p>
              <Button variant="outline" size="sm" className="w-full">Access Playback Tools</Button>
            </div>
            
            <div className="p-4 border rounded-md bg-gray-50">
              <h4 className="font-medium mb-2">Language Glossary</h4>
              <p className="text-sm text-gray-600 mb-3">Access to specialized dictionaries for local terms and expressions</p>
              <Button variant="outline" size="sm" className="w-full">Open Glossary</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
