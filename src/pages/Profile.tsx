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
  const [userStats, setUserStats] = useState({
    contributions: 0,
    tasksCompleted: 0,
    languages: 0,
    joinDate: ''
  });
  
  // Use valid badge types from the BadgeType definition
  const userBadges: ('asr' | 'tts' | 'translate' | 'transcribe' | 'validate')[] = [
    "asr",
    "tts",
    "translate"
  ];

  useEffect(() => {
    async function fetchProfile() {
      console.log("Starting profile fetch...");
      try {
        // Check authentication
        const { data, error: sessionError } = await supabase.auth.getSession();
        console.log("Session check:", data);
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          toast.error("Authentication error");
          navigate('/login');
          return;
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log("User data:", user);
        
        if (userError) {
          console.error("User fetch error:", userError);
          toast.error("Couldn't get user data");
          navigate('/login');
          return;
        }
        
        if (!user) {
          console.log("No user found, redirecting to login");
          navigate('/login');
          return;
        }
        
        setUser(user);
        
        // Fetch user profile
        console.log("Fetching profile for user ID:", user.id);
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        console.log("Profile data:", profileData);
        console.log("Profile error:", error);
          
        if (error) {
          console.error('Error fetching profile:', error);
          
          // Check if error is because profile doesn't exist
          if (error.code === 'PGRST116') {
            console.log("Profile doesn't exist, creating one now");
            
            // Try to create a profile
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                full_name: user.user_metadata?.full_name || '',
                role: '',
                languages: [],
                is_admin: false
              })
              .select()
              .single();
              
            if (insertError) {
              console.error("Failed to create profile:", insertError);
              toast.error("Couldn't create your profile");
            } else {
              console.log("Created new profile:", newProfile);
              toast.success("Profile created successfully!");
              
              // Set profile with newly created data
              setProfile({
                fullName: newProfile.full_name || '',
                email: user.email || '',
                role: newProfile.role || '',
                languages: newProfile.languages || [],
                avatarUrl: user.user_metadata?.avatar_url || ''
              });
            }
          } else {
            toast.error('Failed to load your profile');
          }
        } else if (profileData) {
          setProfile({
            fullName: profileData.full_name || '',
            email: user.email || '',
            role: profileData.role || '',
            languages: profileData.languages || [],
            avatarUrl: user.user_metadata?.avatar_url || ''
          });
          console.log("Profile state set:", {
            fullName: profileData.full_name || '',
            email: user.email || '',
            role: profileData.role || '',
            languages: profileData.languages || [],
            avatarUrl: user.user_metadata?.avatar_url || ''
          });
        } else {
          console.error('No profile data found for user');
          toast.error('Profile not found');
        }
        
        // Fetch real user statistics
        await fetchUserStats(user.id);
        
      } catch (error) {
        console.error('Exception during profile fetch:', error);
        toast.error('Something went wrong');
      } finally {
        setLoading(false);
        console.log("Profile loading complete");
      }
    }
    
    fetchProfile();
  }, [navigate]);
  
  // Fetch actual user statistics from database
  const fetchUserStats = async (userId: string) => {
    try {
      // Get contribution count
      const { count: contributionsCount, error: contributionsError } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (contributionsError) {
        console.error('Error fetching contribution count:', contributionsError);
      }
      
      // Get tasks completed - use a different approach that avoids the problematic .in() query
      // Instead of filtering with .in(), we'll get all contributions and check the status in code
      let tasksCount = 0;
      try {
        const { data: contributions, error: fetchError } = await supabase
          .from('contributions')
          .select('status')
          .eq('user_id', userId);
          
        if (!fetchError && contributions) {
          // Count contributions with valid statuses manually
          const completedStatuses = ['validated', 'completed', 'finalized', 'pending_validation'];
          tasksCount = contributions.filter(c => 
            completedStatuses.includes(c.status as string)
          ).length;
        }
      } catch (taskErr) {
        console.error('Error in task count calculation:', taskErr);
      }
      
      // Get user's creation date from auth.users if possible
      // For Supabase we can use the created_at from the user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error('Error fetching user join date:', userError);
      }
      
      // Set the real statistics
      setUserStats({
        contributions: contributionsCount || 0,
        tasksCompleted: tasksCount || 0,
        languages: profile.languages.length || 0,
        joinDate: userData?.created_at || new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching user statistics:', error);
    }
  };

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
    console.log("Updating profile with:", {
      full_name: profile.fullName,
      role: profile.role,
      languages: profile.languages
    });
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: profile.fullName,
          role: profile.role,
          languages: profile.languages
        })
        .eq('id', user.id);
        
      if (error) {
        console.error("Profile update error:", error);
        throw error;
      }
      
      console.log("Profile updated successfully");
      
      // Update stats to reflect new language count
      setUserStats(prev => ({
        ...prev,
        languages: profile.languages.length
      }));
      
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
                  <CardDescription>{profile.role ? profile.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'No role set'}</CardDescription>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Your Stats</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <p className="text-sm text-gray-500">Contributions</p>
                        <p className="font-medium">{userStats.contributions || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <p className="text-sm text-gray-500">Tasks</p>
                        <p className="font-medium">{userStats.tasksCompleted || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <p className="text-sm text-gray-500">Languages</p>
                        <p className="font-medium">{userStats.languages || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <p className="text-sm text-gray-500">Joined</p>
                        <p className="font-medium">{userStats.joinDate ? new Date(userStats.joinDate).toLocaleDateString() : 'New User'}</p>
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
                        <ProfileBadge key={badge} type={badge} count={20} />
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
