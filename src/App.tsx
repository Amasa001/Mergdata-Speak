import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
// import { useAuth } from './hooks/useAuth'; // Commented out for now

// Import layouts & protected route component
import { MainLayout } from "@/components/layout/MainLayout";
import { AppLayout } from "@/components/layout/AppLayout"; // Keep for potential explicit use if needed
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"; // Import ProtectedRoute

// Import pages
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ASRTask from "./pages/ASRTask";
import TTSTask from "./pages/TTSTask";
import TranscribeTask from "./pages/TranscribeTask";
import TranslateTask from "./pages/TranslateTask";
import ValidateTask from "./pages/ValidateTask";
import AdminTaskCreator from "./pages/AdminTaskCreator";
import Profile from "./pages/Profile";
import HowItWorks from "./pages/HowItWorks";
import FAQ from "./pages/FAQ";
import Leaderboard from "./pages/Leaderboard";
import AdminDashboard from "./pages/AdminDashboard";
import TranscriptionTask from "./pages/TranscriptionTask";
import TranscriptValidationTask from "./pages/TranscriptValidationTask";

// Import project-related pages
import ProjectListPage from "./pages/ProjectListPage";
import { ProjectCreate } from "./pages/ProjectCreate";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectTaskUpload from "./pages/ProjectTaskUpload";
import ProjectSettings from "./pages/ProjectSettings";
// Import fallback if needed
import { ProjectList as ProjectListComponent } from "@/components/projects/ProjectList";

// Import dashboard components
import { TTSDashboard } from "@/components/dashboard/roles/TTSDashboard";

// Initialize QueryClient for React Query
const queryClient = new QueryClient();

// TODO: Add authentication check to properly route users
// For now, we assume certain routes are protected and use AppLayout

// PrivateRoute component for protecting routes (Commented out for now)
/*
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};
*/

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Router>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<MainLayout><Outlet /></MainLayout>}>
            <Route index element={<Index />} />
            <Route path="register" element={<Register />} />
            <Route path="login" element={<Login />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="faq" element={<FAQ />} />
          </Route>

          {/* Protected Pages - wrapped with AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/asr" element={<ASRTask />} />
            <Route path="/tts" element={<TTSTask />} />
            <Route path="/tts-dashboard" element={<TTSDashboard />} />
            <Route path="/transcribe" element={<TranscribeTask />} />
            <Route path="/translate" element={<TranslateTask />} />
            <Route path="/validate" element={<ValidateTask />} />
            <Route path="/validate/:contributionId" element={<ValidateTask />} />
            <Route path="/validate-asr/:contributionId" element={<ValidateTask />} />
            <Route path="/validate-tts/:contributionId" element={<ValidateTask />} />
            <Route path="/validate-translation/:contributionId" element={<ValidateTask />} />
            <Route path="/transcription" element={<TranscriptionTask />} />
            <Route path="/transcript-validation" element={<TranscriptValidationTask />} />
            <Route path="/validate-transcript/:contributionId" element={<TranscriptValidationTask />} />
            <Route path="/admin/create-task" element={<AdminTaskCreator />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            {/* Project Routes */}
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/new" element={<ProjectCreate />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/upload" element={<ProjectTaskUpload />} />
            <Route path="/projects/:projectId/settings" element={<ProjectSettings />} />
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>

      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
