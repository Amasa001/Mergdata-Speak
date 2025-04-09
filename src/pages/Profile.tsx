
import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: '',
    languages: [] as string[]
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }
        
        setUser(user);
        
        // Fetch user profile
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load your profile');
        } else if (profileData) {
          setProfile({
            fullName: profileData.full_name || '',
            email: user.email || '',
            role: profileData.role || '',
            languages: profileData.languages || []
          });
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: profile.fullName,
          // role and languages would typically be updated here as well
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const getRoleName = (roleId: string) => {
    const roles: Record<string, string> = {
      'asr_contributor': 'ASR Contributor',
      'tts_contributor': 'TTS Contributor',
      'transcriber': 'Transcriber',
      'validator': 'Validator'
    };
    
    return roles[roleId] || roleId;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-afri-orange" />
            <p className="ml-2">Loading your profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Your Profile</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={profile.fullName}
                    onChange={handleInputChange}
                    placeholder="Your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    value={profile.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Email address cannot be changed</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Contribution Role</Label>
                  <Input
                    id="role"
                    value={getRoleName(profile.role)}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Contact support to change your contribution role
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Languages</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50">
                    {profile.languages && profile.languages.length > 0 ? (
                      profile.languages.map((language, index) => (
                        <span 
                          key={index} 
                          className="bg-afri-orange/20 text-afri-orange px-2 py-1 rounded text-sm"
                        >
                          {language}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No languages selected</p>
                    )}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-end border-t pt-6">
                <Button type="submit" disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
