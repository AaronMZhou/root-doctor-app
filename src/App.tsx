import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getSettings } from "@/lib/scan-store";
import { AuthProvider } from "@/hooks/useAuth";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Results from "./pages/Results";
import History from "./pages/History";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import Community from "./pages/Community";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  if (!settings.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<RequireOnboarding><Home /></RequireOnboarding>} />
            <Route path="/results" element={<RequireOnboarding><Results /></RequireOnboarding>} />
            <Route path="/history" element={<RequireOnboarding><History /></RequireOnboarding>} />
            <Route path="/insights" element={<RequireOnboarding><Insights /></RequireOnboarding>} />
            <Route path="/settings" element={<RequireOnboarding><Settings /></RequireOnboarding>} />
            <Route path="/community" element={<RequireOnboarding><Community /></RequireOnboarding>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
