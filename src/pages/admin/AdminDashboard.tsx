
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Database, Files, Users, Plus, Settings, BarChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingValidation: 0,
    totalContributions: 0,
    totalUsers: 0
  });

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profileData?.is_admin) {
          toast.error('You do not have admin access');
          navigate('/dashboard');
          return;
        }

        setIsAdmin(true);
        await fetchStats();
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('An error occurred while checking admin status');
      } finally {
        setLoading(false);
      }
    };

    const fetchStats = async () => {
      try {
        // Get total tasks
        const { count: totalTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true });

        // Get completed tasks
        const { count: completedTasks, error: completedError } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');

        // Get contributions pending validation
        const { count: pendingValidation, error: pendingError } = await supabase
          .from('contributions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_validation');

        // Get total contributions
        const { count: totalContributions, error: contributionsError } = await supabase
          .from('contributions')
          .select('*', { count: 'exact', head: true });

        // Get total users
        const { count: totalUsers, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (tasksError || completedError || pendingError || contributionsError || usersError) {
          throw new Error('Error fetching stats');
        }

        setStats({
          totalTasks: totalTasks || 0,
          completedTasks: completedTasks || 0,
          pendingValidation: pendingValidation || 0,
          totalContributions: totalContributions || 0,
          totalUsers: totalUsers || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Failed to load admin statistics');
      }
    };

    checkAdminStatus();
  }, [navigate]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Navigate already handled in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">Manage tasks, users, and system settings</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={() => navigate('/admin/task-manager')} className="bg-afri-orange hover:bg-afri-orange/90">
            <Plus className="mr-2 h-4 w-4" /> Create New Task
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Database className="h-5 w-5 mr-2 text-afri-orange" />
              <p className="text-2xl font-bold">{stats.totalTasks}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Files className="h-5 w-5 mr-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.completedTasks}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart className="h-5 w-5 mr-2 text-amber-500" />
              <p className="text-2xl font-bold">{stats.pendingValidation}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Files className="h-5 w-5 mr-2 text-afri-blue" />
              <p className="text-2xl font-bold">{stats.totalContributions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-afri-purple" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Functions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Management</CardTitle>
            <CardDescription>Create and manage tasks for contributors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => navigate('/admin/task-manager')}
            >
              <Database className="h-4 w-4 mr-2" />
              Manage Tasks
            </Button>
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={() => navigate('/admin/batch-upload')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Batch Upload Tasks
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full"
              onClick={() => navigate('/admin/users')}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate('/admin/roles')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Roles
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data & Analytics</CardTitle>
            <CardDescription>View platform statistics and reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full"
              onClick={() => navigate('/admin/analytics')}
            >
              <BarChart className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate('/admin/export')}
            >
              <Files className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
