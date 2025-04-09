
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, FileText, CheckCircle, Clock } from 'lucide-react';

interface Activity {
  id: number;
  type: 'recording' | 'transcription' | 'validation';
  language: string;
  time: string;
  status: 'completed' | 'pending' | 'rejected';
  details?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'recording':
        return <Mic className="h-4 w-4 text-afri-orange" />;
      case 'transcription':
        return <FileText className="h-4 w-4 text-afri-green" />;
      case 'validation':
        return <CheckCircle className="h-4 w-4 text-afri-blue" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Completed</span>;
      case 'pending':
        return <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Pending</span>;
      case 'rejected':
        return <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                <div className="p-2 bg-gray-100 rounded-full">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">
                      {activity.type === 'recording' && 'Audio Recording'}
                      {activity.type === 'transcription' && 'Text Transcription'}
                      {activity.type === 'validation' && 'Content Validation'}
                    </h4>
                    {getStatusBadge(activity.status)}
                  </div>
                  <p className="text-xs text-gray-500">{activity.details}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                      {activity.language}
                    </span>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No recent activity to display</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
