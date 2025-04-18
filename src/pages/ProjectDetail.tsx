import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Mic, 
  VolumeX, 
  Users, 
  Settings, 
  Upload,
  ArrowLeft, 
  Loader2,
  Info,
  BarChart,
  UserPlus,
  Languages,
  Headphones,
  Globe,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { InviteMemberDialog } from '@/components/projects/InviteMemberDialog';
import { MembersList } from '@/components/projects/MembersList';

type Project = Database['public']['Tables']['projects']['Row'];

// Extend this type to include more task information as needed
type Task = {
  id: number;
  project_id: number;
  type: string; // Or use the enum type if available
  title: string;
  description: string | null;
  status: string; // Or use the enum type if available
  created_at: string;
  // Add other fields as needed
};

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId || !userId) return;
      
      setIsLoading(true);
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (projectError) throw projectError;
        
        setProject(projectData);
        
        // Check user role in the project
        const { data: memberData, error: memberError } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .maybeSingle();
          
        if (!memberError && memberData) {
          setUserRole(memberData.role);
        } else if (projectData.created_by === userId) {
          // If user is the creator but not in members table, consider them an owner
          setUserRole('owner');
        } else {
          setUserRole(null);
        }
        
        // Fetch tasks for this project
        const { data: taskData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
          
        if (tasksError) throw tasksError;
        
        setTasks(taskData || []);
      } catch (error) {
        console.error('Error fetching project data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjectData();
  }, [projectId, userId, toast]);

  const canManageProject = userRole === 'owner' || userRole === 'admin';
  
  const handleMembersRefresh = () => {
    // Refresh project details if needed
    if (projectId && userId) {
      const fetchProjectData = async () => {
        try {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
            
          if (projectError) throw projectError;
          setProject(projectData);
        } catch (error) {
          console.error('Error refreshing project data:', error);
        }
      };
      fetchProjectData();
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-afri-blue" />
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Project not found</h1>
        <p className="mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
        <Button asChild>
          <Link to="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <Badge 
            variant="outline" 
            className="capitalize text-sm font-normal"
          >
            {project.type}
          </Badge>
        </div>
        
        {canManageProject && (
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to={`/projects/${projectId}/upload`}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Tasks
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/projects/${projectId}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Project Settings
              </Link>
            </Button>
          </div>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Overview of the project and its current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-gray-600">{project.description || 'No description provided'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Total Tasks</div>
                  <div className="text-3xl font-semibold">{tasks.length}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Completed Tasks</div>
                  <div className="text-3xl font-semibold">{tasks.filter(t => t.status === 'completed').length}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Pending Tasks</div>
                  <div className="text-3xl font-semibold">{tasks.filter(t => t.status === 'pending').length}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created By</h3>
                  <p className="mt-1">{project.created_by.substring(0, 8)}...</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created On</h3>
                  <p className="mt-1">{new Date(project.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Your Role</h3>
                  <p className="mt-1 capitalize">{userRole || 'Viewer'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Tasks</CardTitle>
                  <CardDescription>
                    Manage and view all tasks within this project
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {tasks.filter(t => t.type.toLowerCase() === 'translation').length > 0 && (
                    <Button variant="outline" asChild>
                      <Link to={`/translate?project_id=${projectId}`}>
                        <Globe className="h-4 w-4 mr-2" />
                        Translate All ({tasks.filter(t => t.type.toLowerCase() === 'translation').length})
                      </Link>
                    </Button>
                  )}
                  {tasks.filter(t => t.type.toLowerCase() === 'tts').length > 0 && (
                    <Button variant="outline" asChild>
                      <Link to={`/tts?project_id=${projectId}`}>
                        <Headphones className="h-4 w-4 mr-2" />
                        Record All ({tasks.filter(t => t.type.toLowerCase() === 'tts').length})
                      </Link>
                    </Button>
                  )}
                  {tasks.filter(t => t.type.toLowerCase() === 'transcription').length > 0 && (
                    <Button variant="outline" asChild>
                      <Link to={`/transcription?project_id=${projectId}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        Transcribe All ({tasks.filter(t => 
                          t.type.toLowerCase() === 'transcription' && 
                          t.status !== 'completed'
                        ).length})
                      </Link>
                    </Button>
                  )}
                  {canManageProject && (
                    <Button asChild>
                      <Link to={`/projects/${projectId}/upload`}>
                        <Upload className="h-4 w-4 mr-2" />
                        Add Tasks
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No tasks have been created for this project yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks
                      .filter(task => 
                        task.status !== 'completed' && 
                        task.status !== 'pending_transcript_validation'
                      )
                      .map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {task.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                task.status === 'completed' 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : task.status === 'pending'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }
                            >
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(task.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link 
                                to={
                                  task.type.toLowerCase() === 'translation' 
                                    ? `/translate?project_id=${projectId}` 
                                    : task.type.toLowerCase() === 'tts'
                                      ? `/tts?project_id=${projectId}`
                                      : task.type.toLowerCase() === 'transcription'
                                        ? `/transcription?project_id=${projectId}`
                                        : `/${task.type.toLowerCase()}?task_id=${task.id}`
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Project Members</CardTitle>
                {canManageProject && (
                  <Button onClick={() => setIsInviteDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Members
                  </Button>
                )}
              </div>
              <CardDescription>
                Manage the team members who have access to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userId && userRole && Number(projectId) ? (
                <MembersList 
                  projectId={Number(projectId)}
                  currentUserId={userId}
                  currentUserRole={userRole}
                  onRefresh={handleMembersRefresh}
                />
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Loading member information...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Project Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-gray-500">
                Detailed analytics will be available soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Invite Member Dialog */}
      {Number(projectId) && (
        <InviteMemberDialog
          projectId={Number(projectId)}
          isOpen={isInviteDialogOpen}
          onClose={() => setIsInviteDialogOpen(false)}
          onSuccess={handleMembersRefresh}
        />
      )}
    </div>
  );
};

export default ProjectDetail; 