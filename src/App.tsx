import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TelephonyProvider } from "@/hooks/useTelephony";
import { useCurrentProfile } from "@/hooks/useProfiles";
import { useCurrentCompany } from "@/hooks/useCompany";
import { toast } from "sonner";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();
  const { data: company, isLoading: companyLoading } = useCurrentCompany();

  useEffect(() => {
    if (!loading && user && !profileLoading && profile) {
      if (profile.allow_login === false) {
        toast.error("Your account has been suspended.");
        signOut();
      } else if (!companyLoading && company && company.allow_login === false) {
        toast.error("Your company account has been suspended.");
        signOut();
      }
    }
  }, [user, loading, profile, profileLoading, company, companyLoading, signOut]);

  if (loading || (user && (profileLoading || companyLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

const AppContent = () => {
  const { user } = useAuth();

  return (
    <ThemeProvider>
    <TelephonyProvider key={user?.id || 'no-user'}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TelephonyProvider>
    </ThemeProvider>
  );
};

export default App;
