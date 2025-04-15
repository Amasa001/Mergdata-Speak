import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Link, Navigate } from 'react-router-dom';
import { Edit, Trash2, Plus, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Task {
  id: string;
  created_at: string;
  task_type: string;
  source_language: string;
  target_language: string | null;
  content: Record<string, any>;
  status: string;
  priority: string;
}

// Add interface for translation stats
interface TranslationStats {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  byLanguage: Record<string, number>;
  byDomain: Record<string, number>;
  byStatus: Record<string, number>;
}

const AdminDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [languages, setLanguages] = useState<string[]>([]);
  const [translationStats, setTranslationStats] = useState<TranslationStats>({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    byLanguage: {},
    byDomain: {},
    byStatus: {},
  });

  useEffect(() => {
    async function checkAdminAndFetchTasks() {
      try {
        // Check if the user is an admin
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        
        // Check if user is an admin
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching user profile:', error);
          toast.error('Failed to check permissions');
          setIsAdmin(false);
        } else {
          setIsAdmin(profileData?.is_admin || false);
          
          if (profileData?.is_admin) {
            // Fetch tasks if user is admin
            fetchTasks();
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('Something went wrong');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    
    checkAdminAndFetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Build query based on filters
      let query = supabase.from('tasks').select('*');
      
      if (filterType !== 'all') {
        query = query.eq('task_type', filterType);
      }
      
      if (filterLanguage !== 'all') {
        // This handles source language filtering
        query = query.eq('source_language', filterLanguage);
      }
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Filter by search query if present (client-side)
      let filteredData = data;
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filteredData = data.filter((task: Task) => 
          (task.content?.task_title?.toLowerCase().includes(lowerQuery) ||
           task.content?.task_description?.toLowerCase().includes(lowerQuery) ||
           task.id.toLowerCase().includes(lowerQuery))
        );
      }
      
      setTasks(filteredData || []);
      
      // Extract unique languages for the filter
      const uniqueLanguages = Array.from(new Set(
        data?.map((task: Task) => task.source_language)
          .filter(Boolean) || []
      ));
      setLanguages(uniqueLanguages as string[]);
      
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchTranslationStats = async () => {
    try {
      // Fetch all translation tasks
      const { data: translationTasks, error } = await supabase
        .from('tasks')
        .select('*, contributions(*)')
        .eq('type', 'translation');
      
      if (error) throw error;
      
      if (translationTasks) {
        const stats: TranslationStats = {
          totalTasks: translationTasks.length,
          pendingTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          byLanguage: {},
          byDomain: {},
          byStatus: {},
        };
        
        // Process each task
        translationTasks.forEach((task: any) => {
          // Count by status
          const status = task.status as string;
          stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
          
          if (status === 'pending') {
            stats.pendingTasks++;
          } else if (status === 'completed') {
            stats.completedTasks++;
          } else if (status === 'assigned') {
            stats.inProgressTasks++;
          }
          
          // Count by language
          const lang = task.language;
          if (lang) {
            stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
          }
          
          // Count by domain - safely access content as object
          let domain = 'general';
          if (task.content && typeof task.content === 'object') {
            domain = (task.content as any).domain || 'general';
          }
          stats.byDomain[domain] = (stats.byDomain[domain] || 0) + 1;
        });
        
        setTranslationStats(stats);
      }
    } catch (error) {
      console.error("Error fetching translation stats:", error);
      toast.error("Failed to load translation statistics");
    }
  };

  // Update useEffect to fetch translation stats
  useEffect(() => {
    fetchTasks();
    fetchTranslationStats();
  }, [filterType, filterLanguage, filterStatus, searchQuery]);

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
        
      if (error) {
        throw error;
      }
      
      toast.success('Task deleted successfully');
      // Refresh the task list
      fetchTasks();
      
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'asr':
        return <Badge variant="outline" className="bg-green-100 text-green-800">ASR</Badge>;
      case 'tts':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">TTS</Badge>;
      case 'transcribe':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Transcribe</Badge>;
      case 'translate':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Translate</Badge>;
      case 'validate':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Validate</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleApplyFilters = () => {
    fetchTasks();
  };

  const resetFilters = () => {
    setFilterType('all');
    setSearchQuery('');
    setFilterLanguage('all');
    setFilterStatus('all');
    // Trigger refetch with reset filters
    setTimeout(fetchTasks, 0);
  };

  // If not admin, redirect to dashboard
  if (isAdmin === false) {
    return <Navigate to="/dashboard" />;
  }

  if (loading && isAdmin === null) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-afri-orange" />
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  // Add this section to render translation stats
  const renderTranslationStats = () => {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Translation Statistics</CardTitle>
          <CardDescription>Overview of translation task metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium">Total Translation Tasks</h3>
              <p className="text-2xl font-bold">{translationStats.totalTasks}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-md">
              <h3 className="font-medium">Completed Translations</h3>
              <p className="text-2xl font-bold">{translationStats.completedTasks}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <h3 className="font-medium">In Progress</h3>
              <p className="text-2xl font-bold">{translationStats.inProgressTasks}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">By Target Language</h3>
              <div className="space-y-2">
                {Object.entries(translationStats.byLanguage).map(([lang, count]) => (
                  <div key={lang} className="flex justify-between items-center">
                    <span>{lang}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">By Domain/Category</h3>
              <div className="space-y-2">
                {Object.entries(translationStats.byDomain).map(([domain, count]) => (
                  <div key={domain} className="flex justify-between items-center">
                    <span>{domain.charAt(0).toUpperCase() + domain.slice(1)}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {renderTranslationStats()}
        
        {/* Other dashboard cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter(task => task.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{languages.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters Section */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" /> Filter Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="asr">ASR</SelectItem>
                  <SelectItem value="tts">TTS</SelectItem>
                  <SelectItem value="transcribe">Transcribe</SelectItem>
                  <SelectItem value="translate">Translate</SelectItem>
                  <SelectItem value="validate">Validate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {languages.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Search tasks..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-afri-orange" />
            </div>
          ) : tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Source Lang</TableHead>
                  <TableHead>Target Lang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono text-xs">{task.id.substring(0, 8)}...</TableCell>
                    <TableCell>{getTaskTypeLabel(task.task_type)}</TableCell>
                    <TableCell className="font-medium">{task.content?.task_title || 'Untitled'}</TableCell>
                    <TableCell>{task.source_language || '-'}</TableCell>
                    <TableCell>{task.target_language || '-'}</TableCell>
                    <TableCell>{getStatusLabel(task.status)}</TableCell>
                    <TableCell>{new Date(task.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/edit-task/${task.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No tasks found.</p>
              <p className="text-sm text-gray-400 mt-2">Try adjusting your filters or create a new task.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard; 