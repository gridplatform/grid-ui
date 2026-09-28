import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { FeatureGate } from "@/components/FeatureGate";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrandingProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/deployments"
              element={
                <FeatureGate feature="deployments">
                  <DeploymentsPage />
                </FeatureGate>
              }
            />
            <Route
              path="/releases"
              element={
                <FeatureGate feature="releases">
                  <ReleasesPage />
                </FeatureGate>
              }
            />
            <Route
              path="/infrastructure"
              element={
                <FeatureGate feature="infrastructure">
                  <InfrastructurePage />
                </FeatureGate>
              }
            />
            <Route
              path="/infrastructure/:resourceId"
              element={
                <FeatureGate feature="infrastructure">
                  <InfrastructureDetailPage />
                </FeatureGate>
              }
            />
            <Route
              path="/monitoring"
              element={
                <FeatureGate feature="monitoring">
                  <MonitoringPage />
                </FeatureGate>
              }
            />
            <Route
              path="/monitoring/:resourceId"
              element={
                <FeatureGate feature="monitoring">
                  <MonitoringDetailPage />
                </FeatureGate>
              }
            />
            <Route
              path="/alerts"
              element={
                <FeatureGate feature="alerts">
                  <AlertsPage />
                </FeatureGate>
              }
            />
            <Route
              path="/apm"
              element={
                <FeatureGate feature="apm">
                  <APMPage />
                </FeatureGate>
              }
            />
            <Route
              path="/logging"
              element={
                <FeatureGate feature="logging">
                  <LoggingPage />
                </FeatureGate>
              }
            />
            <Route
              path="/topology"
              element={
                <FeatureGate feature="topology">
                  <TopologyPage />
                </FeatureGate>
              }
            />
            <Route
              path="/admin"
              element={
                <FeatureGate feature="admin">
                  <AdminPage />
                </FeatureGate>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BrandingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
