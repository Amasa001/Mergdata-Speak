
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import pages
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ASRTask from "./pages/ASRTask";
import TranscribeTask from "./pages/TranscribeTask";
import TTSTask from "./pages/TTSTask";
import ValidateTask from "./pages/ValidateTask";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Languages from "./pages/Languages";
import HowItWorks from "./pages/HowItWorks";
import FAQ from "./pages/FAQ";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/asr" element={<ASRTask />} />
          <Route path="/transcribe" element={<TranscribeTask />} />
          <Route path="/tts" element={<TTSTask />} />
          <Route path="/validate" element={<ValidateTask />} />
          <Route path="/about" element={<About />} />
          <Route path="/languages" element={<Languages />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
