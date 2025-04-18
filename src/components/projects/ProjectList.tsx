import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Mic, VolumeX, Plus, PlusCircle, Clock, CheckCircle, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { SkeletonCard } from '@/components/ui/skeleton';

type Project = Database['public']['Tables']['projects']['Row'] & {
  member_count?: number;
};

const ProjectTypeIcon = ({ type }: { type: Project['type'] }) => {
  switch (type) {
    case 'translation':
      return <FileText className="h-5 w-5" />;
    case 'transcription':
      return <Mic className="h-5 w-5" />;
    case 'tts':
      return <VolumeX className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
};

const ProjectStatusBadge = ({ status }: { status: Project['status'] }) => {
  switch (status) {
    case 'active':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
    case 'archived':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Archived</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
    case 'draft':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Draft</Badge>;
    default:
      return null;
  }
};

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Project['type']>('all');
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // First check for projects where user is a direct member
        let memberQuery = supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', userId);
        
        const { data: memberData, error: memberError } = await memberQuery;
        
        if (memberError) throw memberError;
        
        const projectIds = memberData?.map(m => m.project_id) || [];
        
        // Then fetch projects where user is either a member or the creator
        let query = supabase
          .from('projects')
          .select('*')
          .or(`id.in.(${projectIds.join(',')}),created_by.eq.${userId}`);
        
        // Apply type filter if not "all"
        if (filter !== 'all') {
          query = query.eq('type', filter);
        }
        
        // Order by most recent first
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Fetch member counts for each project
        const projectsWithMemberCounts = await Promise.all((data || []).map(async (project) => {
          const { count, error: countError } = await supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);
          
          return {
            ...project,
            member_count: countError ? 0 : count || 0
          };
        }));
        
        setProjects(projectsWithMemberCounts);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Failed to load projects',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [userId, filter, toast]);

  const filteredProjects = projects;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button asChild>
          <Link to="/projects/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Project
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="all" className="mb-8">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setFilter('all')}>All Projects</TabsTrigger>
          <TabsTrigger value="translation" onClick={() => setFilter('translation')}>Translation</TabsTrigger>
          <TabsTrigger value="transcription" onClick={() => setFilter('transcription')}>Transcription</TabsTrigger>
          <TabsTrigger value="tts" onClick={() => setFilter('tts')}>TTS</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first project</p>
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link 
              to={`/projects/${project.id}`} 
              key={project.id}
              className="group transition-all"
            >
              <Card className="h-full hover:shadow-md transition-shadow border border-gray-200 group-hover:border-afri-blue">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2 text-afri-blue">
                      <ProjectTypeIcon type={project.type} />
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                    </div>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <CardDescription className="line-clamp-2 h-10">
                    {project.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4 text-sm text-gray-500">
                    {project.source_language && (
                      <div>
                        <span className="block font-medium">Source</span>
                        <span>{project.source_language}</span>
                      </div>
                    )}
                    {project.target_languages && project.target_languages.length > 0 && (
                      <div>
                        <span className="block font-medium">Target</span>
                        <span>{project.target_languages.length > 1 
                          ? `${project.target_languages[0]} +${project.target_languages.length - 1}` 
                          : project.target_languages[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="block font-medium">Members</span>
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {project.member_count || 1}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex justify-between text-sm text-gray-500 border-t mt-3 p-4">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-afri-blue" asChild>
                    <span>View Project</span>
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}; 