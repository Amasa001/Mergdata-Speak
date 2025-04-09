
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { UserStats } from '@/components/dashboard/UserStats';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { TasksList } from '@/components/dashboard/TasksList';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  // Mock data for demonstration
  const userStats = {
    recordingCount: 42,
    recordingHours: 3.5,
    transcriptionCount: 28,
    validationCount: 15
  };

  const recentActivities = [
    {
      id: 1,
      type: 'recording' as const,
      language: 'Swahili',
      time: '2 hours ago',
      status: 'completed' as const,
      details: 'Recorded a 15-second description of market scene'
    },
    {
      id: 2,
      type: 'transcription' as const,
      language: 'Yoruba',
      time: '1 day ago',
      status: 'pending' as const,
      details: 'Transcribed audio for traditional story'
    },
    {
      id: 3, 
      type: 'validation' as const,
      language: 'Amharic',
      time: '3 days ago',
      status: 'completed' as const,
      details: 'Validated 5 transcriptions for ASR training'
    }
  ];

  const availableTasks = [
    {
      id: 1,
      type: 'asr' as const,
      title: 'Describe Images (ASR)',
      description: 'Record yourself describing 10 images in Swahili',
      language: 'Swahili',
      estimatedTime: '15 minutes',
      difficulty: 'easy' as const
    },
    {
      id: 2,
      type: 'transcription' as const,
      title: 'Transcribe Folk Stories',
      description: 'Transcribe 3 audio recordings of Yoruba folk stories',
      language: 'Yoruba',
      estimatedTime: '30 minutes',
      difficulty: 'medium' as const
    },
    {
      id: 3,
      type: 'validation' as const,
      title: 'Validate Transcriptions',
      description: 'Review and validate 15 audio-transcript pairs in Amharic',
      language: 'Amharic',
      estimatedTime: '45 minutes',
      difficulty: 'hard' as const
    }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500">Welcome back to AfriSpeakNexus</p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Link to="/asr">
              <Button variant="outline">Record Audio</Button>
            </Link>
            <Link to="/transcribe">
              <Button>Transcribe</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          <UserStats stats={userStats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TasksList tasks={availableTasks} />
            </div>
            <div>
              <ActivityFeed activities={recentActivities} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
