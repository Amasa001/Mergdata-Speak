
import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Import role-specific dashboards
import { ASRDashboard } from '@/components/dashboard/roles/ASRDashboard';
import { TTSDashboard } from '@/components/dashboard/roles/TTSDashboard';
import { TranscriberDashboard } from '@/components/dashboard/roles/TranscriberDashboard';
import { ValidatorDashboard } from '@/components/dashboard/roles/ValidatorDashboard';

const Dashboard: React.FC = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Fetch user profile from profiles table
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error('Error fetching user profile:', error);
          } else if (profileData) {
            setUserName(profileData.full_name);
            setUserRole(profileData.role);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
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
      default:
        return <div className="text-center py-12">No role assigned. Please contact an administrator.</div>;
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
          <Link to="/tts">
            <Button>Record Voice</Button>
          </Link>
        );
      case 'transcriber':
        return (
          <Link to="/transcribe">
            <Button>Transcribe</Button>
          </Link>
        );
      case 'validator':
        return (
          <Link to="/validate">
            <Button>Validate</Button>
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
      default:
        return 'Dashboard';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading your dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{getRoleTitle()}</h1>
            <p className="text-gray-500">Welcome back{userName ? `, ${userName}` : ''} to AfriSpeakNexus</p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            {getActionButtons()}
          </div>
        </div>

        <div className="space-y-8">
          {renderDashboardByRole()}
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
