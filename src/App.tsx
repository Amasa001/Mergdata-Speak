
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import "./App.css";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import AppLayout from "@/layouts/AppLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

import Dashboard from "@/pages/Dashboard";
import ASRTask from "@/pages/ASRTask";
import TTSTask from "@/pages/TTSTask";
import ValidateTask from "@/pages/ValidateTask";
import TranscribeTask from "@/pages/TranscribeTask";
import TranslateTask from "@/pages/TranslateTask";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import TaskManager from "@/pages/admin/TaskManager";

function App() {
  return (
    <Router>
      <main className="min-h-screen flex flex-col">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/asr" element={<ASRTask />} />
              <Route path="/tts" element={<TTSTask />} />
              <Route path="/validate" element={<ValidateTask />} />
              <Route path="/transcribe" element={<TranscribeTask />} />
              <Route path="/translate" element={<TranslateTask />} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/task-manager" element={<TaskManager />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </main>
    </Router>
  );
}

export default App;
