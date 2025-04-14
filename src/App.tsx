import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
// import { useAuth } from './hooks/useAuth'; // Commented out for now

// Import layouts & protected route component
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

// Import pages
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import HowItWorks from "./pages/HowItWorks";
import FAQ from "./pages/FAQ";
import Leaderboard from "./pages/Leaderboard";

// Import task pages
import ASRTask from "./pages/ASRTask";
import TTSTask from "./pages/TTSTask";
import TranscribeTask from "./pages/TranscribeTask";
import TranslateTask from "./pages/TranslateTask";
import ValidateTask from "./pages/ValidateTask";

// Create a client for React Query
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
          {/* Public routes with MainLayout */}
          <Route element={<MainLayout><Outlet /></MainLayout>}>
            <Route index element={<Index />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="register" element={<Register />} />
            <Route path="login" element={<Login />} />
          </Route>

          {/* Protected routes - ProtectedRoute already applies AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            
            {/* Task routes */}
            <Route path="/asr" element={<ASRTask />} />
            <Route path="/tts" element={<TTSTask />} />
            <Route path="/transcribe" element={<TranscribeTask />} />
            <Route path="/translate" element={<TranslateTask />} />
            <Route path="/validate" element={<ValidateTask />} />
          </Route>

          {/* Catch-all route - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>

      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
