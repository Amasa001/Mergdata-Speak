
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, FileText, CheckCircle, Clock } from 'lucide-react';

interface UserStatsProps {
  stats: {
    recordingCount: number;
    recordingHours: number;
    transcriptionCount: number;
    validationCount: number;
  };
}

export const UserStats: React.FC<UserStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: "Recordings",
      value: stats.recordingCount,
      icon: <Mic className="h-5 w-5 text-afri-orange" />,
      description: "Audio recordings"
    },
    {
      title: "Hours",
      value: stats.recordingHours,
      icon: <Clock className="h-5 w-5 text-afri-blue" />,
      description: "Total recording time"
    },
    {
      title: "Transcriptions",
      value: stats.transcriptionCount,
      icon: <FileText className="h-5 w-5 text-afri-green" />,
      description: "Texts transcribed"
    },
    {
      title: "Validations",
      value: stats.validationCount,
      icon: <CheckCircle className="h-5 w-5 text-afri-brown" />,
      description: "Items validated"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
              {stat.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-gray-500">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
