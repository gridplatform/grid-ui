import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { FeatureGate } from "@/components/FeatureGate";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DeploymentsPage from "./pages/DeploymentsPage";
import ReleasesPage from "./pages/ReleasesPage";
import InfrastructurePage from "./pages/InfrastructurePage";
import InfrastructureDetailPage from "./pages/InfrastructureDetailPage";
import GitOpsPage from "./pages/GitOpsPage";
import MonitoringPage from "./pages/MonitoringPage";
import MonitoringDetailPage from "./pages/MonitoringDetailPage";
import AlertsPage from "./pages/AlertsPage";
import APMPage from "./pages/APMPage";
import LoggingPage from "./pages/LoggingPage";
import TopologyPage from "./pages/TopologyPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Auth({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrandingProvider>
        <AuthProvider>
        <WorkspaceProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/dashboard" element={<Auth><DashboardPage /></Auth>} />
            <Route
              path="/deployments"
              element={
                <Auth>
                  <FeatureGate feature="deployments">
                    <DeploymentsPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route
              path="/releases"
              element={
                <Auth>
                  <FeatureGate feature="releases">
                    <ReleasesPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route
              path="/infrastructure"
              element={
                <Auth>
                  <FeatureGate feature="infrastructure">
                    <InfrastructurePage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route
              path="/infrastructure/:resourceId"
              element={
                <Auth>
                  <FeatureGate feature="infrastructure">
                    <InfrastructureDetailPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route path="/gitops" element={<Auth><GitOpsPage /></Auth>} />
            <Route
              path="/monitoring"
              element={
                <Auth>
                  <FeatureGate feature="monitoring">
                    <MonitoringPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route
              path="/monitoring/:resourceId"
              element={
                <Auth>
                  <FeatureGate feature="monitoring">
                    <MonitoringDetailPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route
              path="/alerts"
              element={
                <Auth>
                  <FeatureGate feature="alerts">
                    <AlertsPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route
              path="/apm"
              element={
                <Auth>
                  <FeatureGate feature="apm">
                    <APMPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route
              path="/logging"
              element={
                <Auth>
                  <FeatureGate feature="logging">
                    <LoggingPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route
              path="/topology"
              element={
                <Auth>
                  <FeatureGate feature="topology">
                    <TopologyPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route
              path="/admin"
              element={
                <Auth>
                  <FeatureGate feature="admin">
                    <AdminPage />
                  </FeatureGate>
                </Auth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </WorkspaceProvider>
        </AuthProvider>
      </BrandingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
