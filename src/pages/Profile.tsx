import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, Trophy } from 'lucide-react';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { LanguageSelector } from '@/components/auth/LanguageSelector';
import { ProfileBadge } from '@/components/profile/ProfileBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: '',
    languages: [] as string[],
    avatarUrl: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Use the 5 core badges for mock data
  const userBadges = [
    "quality-champion",
    "prolific-contributor",
    "consistency-contributor"
  ];
  
  // Mock user stats - in a real app, these would come from the database
  const userStats = {
    contributions: 256,
    tasksCompleted: 32,
    languages: 3,
    joinDate: '2024-01-15'
  };

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
            languages: profileData.languages || [],
            avatarUrl: user.user_metadata?.avatar_url || ''
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

  const handleRoleChange = (role: string) => {
    setProfile(prev => ({ ...prev, role }));
  };

  const handleLanguageToggle = (language: string) => {
    setProfile(prev => {
      const languages = prev.languages || [];
      const updatedLanguages = languages.includes(language)
        ? languages.filter(lang => lang !== language)
        : [...languages, language];
      
      return { ...prev, languages: updatedLanguages };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setSaveSuccess(false);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: profile.fullName,
          role: profile.role,
          languages: profile.languages
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setSaveSuccess(true);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-afri-orange" />
          <p className="ml-2">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Overview Card */}
          <div className="md:col-span-1">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
                    <AvatarFallback className="text-xl">{getInitials(profile.fullName)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="text-center mt-4">
                  <CardTitle className="text-xl">{profile.fullName}</CardTitle>
                  <CardDescription>{profile.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</CardDescription>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Your Stats</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <p className="text-sm text-gray-500">Contributions</p>
                        <p className="font-medium">{userStats.contributions}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <p className="text-sm text-gray-500">Tasks</p>
                        <p className="font-medium">{userStats.tasksCompleted}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <p className="text-sm text-gray-500">Languages</p>
                        <p className="font-medium">{userStats.languages}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <p className="text-sm text-gray-500">Joined</p>
                        <p className="font-medium">{new Date(userStats.joinDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-500">Your Badges</p>
                      <Button variant="ghost" size="sm" asChild>
                        <a href="/leaderboard">
                          <Trophy className="h-4 w-4 mr-1" /> Leaderboard
                        </a>
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {userBadges.map(badge => (
                        <ProfileBadge key={badge} type={badge} showLabel={true} />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Profile Edit Form */}
          <div className="md:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Your Profile</CardTitle>
                <CardDescription>
                  Update your personal information and contribution preferences
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
                    <Label>Contribution Role</Label>
                    <RoleSelector 
                      selectedRole={profile.role} 
                      onSelectRole={handleRoleChange} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Languages</Label>
                    <div className="mt-2">
                      <LanguageSelector
                        selectedLanguages={profile.languages}
                        onSelectLanguage={handleLanguageToggle}
                        roleType={profile.role}
                      />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex items-center justify-between border-t pt-6">
                  {saveSuccess && (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Changes saved</span>
                    </div>
                  )}
                  <div className="ml-auto">
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
                  </div>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
