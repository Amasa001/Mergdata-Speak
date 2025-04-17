
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, FileText, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Task {
  id: number;
  type: 'asr' | 'tts' | 'transcription' | 'validation';
  title: string;
  description: string;
  language: string;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface TasksListProps {
  tasks: Task[];
}

export const TasksList: React.FC<TasksListProps> = ({ tasks }) => {
  const getTaskIcon = (type: string) => {
    switch(type) {
      case 'asr':
      case 'tts':
        return <Mic className="h-5 w-5 text-afri-orange" />;
      case 'transcription':
        return <FileText className="h-5 w-5 text-afri-green" />;
      case 'validation':
        return <CheckCircle className="h-5 w-5 text-afri-blue" />;
      default:
        return null;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch(difficulty) {
      case 'easy':
        return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Easy</span>;
      case 'medium':
        return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Medium</span>;
      case 'hard':
        return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Hard</span>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Available Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length > 0 ? (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 border rounded-md hover:border-afri-orange/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      {getTaskIcon(task.type)}
                    </div>
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-500">{task.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">
                          {task.language}
                        </span>
                        <span className="text-xs text-gray-500">~{task.estimatedTime}</span>
                        {getDifficultyBadge(task.difficulty)}
                      </div>
                    </div>
                  </div>
                  <Link to={`/tasks/${task.id}`}>
                    <Button variant="outline" size="sm">
                      Start
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No tasks available right now.</p>
            <p className="text-sm text-gray-400 mt-2">Check back soon!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
