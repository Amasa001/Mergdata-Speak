
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LanguageFilter } from '@/components/tasks/LanguageFilter';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

interface Task {
  task_id: number;
  task_title: string;
  source_language: string;
  target_language: string;
  current_task_status: string;
  domain: string;
  needs_correction?: boolean;
}

export const AvailableTranslationTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('all');

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        // Use the stored function to get available translation tasks
        const { data, error } = await supabase
          .rpc('get_available_translation_tasks');
        
        if (error) {
          throw error;
        }
        
        // Extract unique languages for filtering
        const languages = [...new Set(data?.map(task => task.target_language) || [])];
        setAvailableLanguages(languages);
        setTasks(data || []);
      } catch (error) {
        console.error('Error fetching translation tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Filter tasks based on selected language
  const filteredTasks = selectedLanguage === 'all'
    ? tasks
    : tasks.filter(task => 
        task.target_language.toLowerCase() === selectedLanguage.toLowerCase()
      );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Translation Tasks</CardTitle>
        <CardDescription>Tasks ready for translation across different languages</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-afri-purple mr-2" />
            <span>Loading tasks...</span>
          </div>
        ) : (
          <>
            <LanguageFilter
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              availableLanguages={availableLanguages}
            />
            
            {filteredTasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.task_id}>
                      <TableCell className="font-medium">{task.task_title}</TableCell>
                      <TableCell>{task.source_language} → {task.target_language}</TableCell>
                      <TableCell>{task.domain || 'General'}</TableCell>
                      <TableCell>
                        {task.needs_correction ? (
                          <span className="flex items-center text-xs text-red-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Needs Correction
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">
                            {task.current_task_status === 'assigned' ? 'Assigned' : 'Available'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link to={`/translate?taskId=${task.task_id}`}>
                            Translate
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No translation tasks available for {selectedLanguage === 'all' ? 'any language' : selectedLanguage}</p>
                <p className="text-sm text-gray-400 mt-2">Check back soon or select a different language</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
