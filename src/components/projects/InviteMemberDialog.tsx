import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Loader2, Mail, Search, ShieldCheck, User, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface InviteMemberDialogProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  projectId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('contributor');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm || searchTerm.length < 3) {
      toast.error('Please enter at least 3 characters to search');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedUserId(null);

    try {
      // First check if the user exists by email (exact match)
      let { data: emailMatch, error: emailError } = await supabase
        .from('profiles')
        .select('id, full_name, email:id, role')
        .eq('id', searchTerm)
        .maybeSingle();

      if (emailError) throw emailError;

      // If not found by email, search by name (partial match)
      const { data: nameMatches, error: nameError } = await supabase
        .from('profiles')
        .select('id, full_name, email:id, role')
        .ilike('full_name', `%${searchTerm}%`)
        .limit(5);

      if (nameError) throw nameError;

      // Combine results, with email match first if it exists
      let results = [];
      if (emailMatch) results.push(emailMatch);
      if (nameMatches) results = [...results, ...nameMatches.filter(m => m.id !== emailMatch?.id)];

      // Check if users are already project members
      if (results.length > 0) {
        const userIds = results.map(user => user.id);
        const { data: existingMembers, error: membersError } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', projectId)
          .in('user_id', userIds);

        if (membersError) throw membersError;

        // Filter out users who are already members
        const existingMemberIds = existingMembers?.map(m => m.user_id) || [];
        results = results.filter(user => !existingMemberIds.includes(user.id));
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search for users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user to invite');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if the user is already a member
      const { data: existingMember, error: checkError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', selectedUserId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingMember) {
        toast.error('This user is already a member of the project');
        return;
      }

      // Add the user as a project member
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: selectedUserId,
          role: selectedRole,
        });

      if (insertError) throw insertError;

      toast.success('Member added successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding project member:', error);
      toast.error('Failed to add member to project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Project Member</DialogTitle>
          <DialogDescription>
            Search for users by email or name to add them to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search input */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="search">Search by email or name</Label>
              <Input
                id="search"
                placeholder="Enter email or name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isSearching}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              variant="secondary" 
              disabled={isSearching || searchTerm.length < 3}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 ? (
            <div className="border rounded-md">
              <RadioGroup 
                value={selectedUserId || ''} 
                onValueChange={setSelectedUserId}
              >
                {searchResults.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center space-x-2 p-3 border-b last:border-b-0"
                  >
                    <RadioGroupItem value={user.id} id={user.id} className="peer sr-only" />
                    <label 
                      htmlFor={user.id} 
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <div className="bg-muted rounded-full p-2">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user.id}</div>
                      </div>
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ) : searchTerm && !isSearching ? (
            <div className="text-center py-4 text-muted-foreground">
              No users found matching your search.
            </div>
          ) : null}

          {/* Role selection */}
          {selectedUserId && (
            <div className="mt-4">
              <Label htmlFor="role">Member Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="contributor">Contributor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2 text-sm text-muted-foreground">
                {selectedRole === 'admin' && (
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> 
                    Administrators can manage project settings and members
                  </div>
                )}
                {selectedRole === 'contributor' && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> 
                    Contributors can work on tasks in the project
                  </div>
                )}
                {selectedRole === 'viewer' && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> 
                    Viewers can only view project data but not edit anything
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddMember} 
            disabled={!selectedUserId || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Add to Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 