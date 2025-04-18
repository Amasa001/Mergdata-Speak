import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import role-specific dashboards
import { ASRDashboard } from '@/components/dashboard/roles/ASRDashboard';
import { TTSDashboard } from '@/components/dashboard/roles/TTSDashboard';
import { TranscriberDashboard } from '@/components/dashboard/roles/TranscriberDashboard';
import { ValidatorDashboard } from '@/components/dashboard/roles/ValidatorDashboard';
import { TranslatorDashboard } from '@/components/dashboard/roles/TranslatorDashboard';
import { Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        
        // Check if this is a user with pending profile creation
        const profilePending = user.user_metadata?.profile_pending === true;
        
        // If profile is pending creation, try to create it now
        if (profilePending) {
          console.log("Profile pending creation detected, attempting to create profile");
          try {
            const { error: profileCreateError } = await supabase
              .from('profiles')
              .insert({ 
                id: user.id,
                full_name: user.user_metadata.full_name || '',
                role: user.user_metadata.role || '',
                languages: user.user_metadata.languages || [],
                is_admin: false
              });
              
            if (profileCreateError) {
              console.warn('Could not create profile from metadata:', profileCreateError);
              // If creation failed, we'll fall back to metadata below
            } else {
              console.log("Successfully created profile for user");
              // Update user metadata to remove pending flag
              await supabase.auth.updateUser({
                data: { profile_pending: false }
              });
            }
          } catch (createErr) {
            console.warn('Exception creating profile from metadata:', createErr);
          }
        }
        
        // Fetch user profile from profiles table
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching user profile:', error);
          
          // Fall back to user metadata if available
          if (user.user_metadata) {
            setUserName(user.user_metadata.full_name || null);
            setUserRole(user.user_metadata.role || null);
            console.log('Using role from metadata:', user.user_metadata.role);
            
            // Display a message to the user
            toast.info('Using your profile information from account metadata.');
          } else {
            toast.error('Failed to load your profile');
          }
        } else if (profileData) {
          setUserName(profileData.full_name);
          setUserRole(profileData.role);
          console.log('User role:', profileData.role);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Something went wrong loading your dashboard');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserProfile();
  }, []);
  
  const renderDashboardByRole = () => {
    switch (userRole) {
      case 'asr_contributor':
        return <ASRDashboard />;
      case 'tts_contributor':
        return <TTSDashboard />;
      case 'transcriber':
        return <TranscriberDashboard />;
      case 'validator':
        return <ValidatorDashboard />;
      case 'translator':
        return <TranslatorDashboard />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-lg mb-6">No role assigned. Please contact an administrator or update your profile.</p>
            <Link to="/profile">
              <Button>Update Profile</Button>
            </Link>
          </div>
        );
    }
  };
  
  // Get appropriate action buttons based on user role
  const getActionButtons = () => {
    switch (userRole) {
      case 'asr_contributor':
        return (
          <Link to="/asr">
            <Button>Record Audio</Button>
          </Link>
        );
      case 'tts_contributor':
        return (
          <div className="flex space-x-2">
            <Link to="/tts">
              <Button>Record Voice</Button>
            </Link>
            <Link to="/tts-dashboard">
              <Button variant="outline">View TTS Tasks</Button>
            </Link>
          </div>
        );
      case 'transcriber':
        return null;
      case 'translator':
        return (
          <Link to="/translate">
            <Button>Translate</Button>
          </Link>
        );
      default:
        return null;
    }
  };

  // Get role-specific title
  const getRoleTitle = () => {
    switch (userRole) {
      case 'asr_contributor':
        return 'ASR Contributor Dashboard';
      case 'tts_contributor':
        return 'TTS Contributor Dashboard';
      case 'transcriber':
        return 'Transcription Dashboard';
      case 'validator':
        return 'Validation Dashboard';
      case 'translator':
        return 'Translation Dashboard';
      default:
        return 'Dashboard';
    }
  };

  if (isAuthenticated === false) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-afri-orange" />
          <p className="ml-2">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{getRoleTitle()}</h1>
          <p className="text-gray-500">Welcome back{userName ? `, ${userName}` : ''} to Mergdata Speak</p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          {getActionButtons()}
        </div>
      </div>

      <div className="space-y-8">
        {renderDashboardByRole()}
      </div>
    </div>
  );
};

export default Dashboard;
