
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';

const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
