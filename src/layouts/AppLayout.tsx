
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import Navigation from '@/components/layout/Navigation';
import { SideNavigation } from '@/components/layout/SideNavigation';

const AppLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <SideNavigation />
      <div className="flex-1 flex flex-col">
        <AppHeader />
        <main className="flex-1 p-6">
          <Navigation />
          <div className="mt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
