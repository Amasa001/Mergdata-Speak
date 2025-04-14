import React from 'react';
import { AppHeader } from './AppHeader';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for authenticated sections of the application (e.g., dashboard, tasks).
 * Includes the AppHeader and does not include the main site Footer.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}; 