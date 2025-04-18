import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MoreVertical, ShieldCheck, Trash2, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectMember {
  id: number;
  user_id: string;
  role: string;
  created_at: string;
  full_name: string;
  email: string;
}

interface MembersListProps {
  projectId: number;
  currentUserId: string;
  currentUserRole: string;
  onRefresh: () => void;
}

export const MembersList: React.FC<MembersListProps> = ({
  projectId,
  currentUserId,
  currentUserRole,
  onRefresh
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Join project_members with profiles to get user information
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id, 
          user_id,
          role,
          created_at,
          profiles:user_id (
            full_name
          )
        `)
        .eq('project_id', projectId)
        .order('role', { ascending: true });

      if (error) throw error;

      // Transform the nested data into a flat structure
      const formattedMembers = data.map(member => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        created_at: member.created_at,
        full_name: member.profiles?.full_name || 'Unknown User',
        email: member.user_id // Using ID as email display since we don't have direct access
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching project members:', error);
      toast.error('Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemovingMember(true);
    try {
      // Prevent removing the last owner
      if (memberToRemove.role === 'owner') {
        const ownersCount = members.filter(m => m.role === 'owner').length;
        if (ownersCount <= 1) {
          toast.error('Cannot remove the last owner of the project');
          return;
        }
      }

      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      toast.success(`${memberToRemove.full_name} has been removed from the project`);
      fetchMembers();
      onRefresh();
    } catch (error) {
      console.error('Error removing project member:', error);
      toast.error('Failed to remove project member');
    } finally {
      setIsRemovingMember(false);
      setMemberToRemove(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-afri-orange text-white"><ShieldCheck className="h-3 w-3 mr-1" /> Owner</Badge>;
      case 'admin':
        return <Badge className="bg-afri-blue text-white"><ShieldCheck className="h-3 w-3 mr-1" /> Admin</Badge>;
      case 'contributor':
        return <Badge className="bg-afri-green text-white"><Users className="h-3 w-3 mr-1" /> Contributor</Badge>;
      default:
        return <Badge variant="outline">Viewer</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-afri-blue" />
      </div>
    );
  }

  return (
    <div>
      {members.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          No members found for this project.
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{member.full_name}</div>
                  <div className="text-sm text-muted-foreground">{member.user_id}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getRoleBadge(member.role)}
                
                {/* Only show dropdown for managing other members if user has permission */}
                {canManageMembers && member.user_id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setMemberToRemove(member)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation dialog for removing a member */}
      <AlertDialog 
        open={memberToRemove !== null} 
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Project Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.full_name} from this project?
              They will no longer have access to any project resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemovingMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemovingMember && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 