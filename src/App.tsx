import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { FeatureGate } from "@/components/FeatureGate";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireAccess } from "@/components/RequireAccess";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DeploymentsPage from "./pages/DeploymentsPage";
import ReleasesPage from "./pages/ReleasesPage";
import InfrastructurePage from "./pages/InfrastructurePage";
import InfrastructureDetailPage from "./pages/InfrastructureDetailPage";
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

function Gate({
  feature,
  admin,
  children,
}: {
  feature?: Parameters<typeof RequireAccess>[0]["feature"];
  admin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Auth>
      <FeatureGate feature={feature || "admin"}>
        <RequireAccess feature={feature} admin={admin}>
          {children}
        </RequireAccess>
      </FeatureGate>
    </Auth>
  );
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
                <Gate feature="deployments">
                  <DeploymentsPage />
                </Gate>
              }
            />
            <Route
              path="/releases"
              element={
                <Gate feature="releases">
                  <ReleasesPage />
                </Gate>
              }
            />
            <Route
              path="/infrastructure"
              element={
                <Gate feature="infrastructure">
                  <InfrastructurePage />
                </Gate>
              }
            />
            <Route
              path="/infrastructure/:resourceId"
              element={
                <Gate feature="infrastructure">
                  <InfrastructureDetailPage />
                </Gate>
              }
            />
            <Route
              path="/gitops"
              element={
                <Gate admin>
                  <Navigate to="/admin?tab=sources" replace />
                </Gate>
              }
            />
            <Route
              path="/monitoring"
              element={
                <Gate feature="monitoring">
                  <MonitoringPage />
                </Gate>
              }
            />
            <Route
              path="/monitoring/:resourceId"
              element={
                <Gate feature="monitoring">
                  <MonitoringDetailPage />
                </Gate>
              }
            />
            <Route
              path="/alerts"
              element={
                <Gate feature="alerts">
                  <AlertsPage />
                </Gate>
              }
            />
            <Route
              path="/apm"
              element={
                <Gate feature="apm">
                  <APMPage />
                </Gate>
              }
            />
            <Route
              path="/logging"
              element={
                <Gate feature="logging">
                  <LoggingPage />
                </Gate>
              }
            />
            <Route
              path="/topology"
              element={
                <Gate feature="topology">
                  <TopologyPage />
                </Gate>
              }
            />
            <Route
              path="/admin"
              element={
                <Gate admin>
                  <AdminPage />
                </Gate>
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
