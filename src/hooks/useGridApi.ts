/**
 * Grid Console → backend API hooks.
 *
 * Deployments submit GridDeployRequest (see src/lib/deployContract.ts).
 * Set VITE_USE_MOCK_DATA=false and VITE_GRID_API_URL to hit grid-core / CLI bridge.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GridDeployRequest } from "@/lib/deployContract";
import type {
  TopologyProvider,
  TopologyVpc,
  TopologyResource,
  Infrastructure,
  InfrastructureListItem,
  Deployment,
  Release,
  Approval,
  Cluster,
  Alert,
  AlertRule,
  APMService,
  APMOperation,
  APMTrace,
  LogEntry,
  LogQuery,
  Environment,
  User,
  Recommendation,
  TimeSeriesData,
} from "@/types/api";

// ─── Configuration ──────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_GRID_API_URL || "/api/v1";

/**
 * When true, uses mock data generators instead of real API calls.
 * Set VITE_USE_MOCK_DATA=false to use real backend.
 */
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== "false";

// ─── API Client ─────────────────────────────────────────────────────────────

async function gridFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ─── Topology Hooks ─────────────────────────────────────────────────────────

/**
 * Fetch all topology providers with VPCs and resources
 * GET /api/v1/topology/providers
 */
export function useTopologyProviders() {
  return useQuery({
    queryKey: ["topology", "providers"],
    queryFn: async (): Promise<TopologyProvider[]> => {
      if (USE_MOCK_DATA) {
        const { buildStressTopologyData } = await import("@/data/stressTestData");
        return buildStressTopologyData();
      }
      return gridFetch<TopologyProvider[]>("/topology/providers");
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch VPCs for a specific provider
 * GET /api/v1/topology/providers/:id/vpcs
 */
export function useProviderVpcs(providerId: string) {
  return useQuery({
    queryKey: ["topology", "providers", providerId, "vpcs"],
    queryFn: () => gridFetch<TopologyVpc[]>(`/topology/providers/${providerId}/vpcs`),
    enabled: !USE_MOCK_DATA && !!providerId,
  });
}

/**
 * Fetch resources for a specific VPC
 * GET /api/v1/topology/vpcs/:id/resources
 */
export function useVpcResources(vpcId: string) {
  return useQuery({
    queryKey: ["topology", "vpcs", vpcId, "resources"],
    queryFn: () => gridFetch<TopologyResource[]>(`/topology/vpcs/${vpcId}/resources`),
    enabled: !USE_MOCK_DATA && !!vpcId,
  });
}

// ─── Infrastructure Hooks ───────────────────────────────────────────────────

/**
 * Fetch all infrastructure resources
 * GET /api/v1/infrastructures
 */
export function useInfrastructures() {
  return useQuery({
    queryKey: ["infrastructures"],
    queryFn: async (): Promise<InfrastructureListItem[]> => {
      if (USE_MOCK_DATA) {
        const { generateStressResources } = await import("@/data/stressTestData");
        return generateStressResources() as unknown as InfrastructureListItem[];
      }
      return gridFetch<InfrastructureListItem[]>("/infrastructures");
    },
    staleTime: 10_000,
  });
}

/**
 * Fetch a single infrastructure resource
 * GET /api/v1/infrastructures/:id
 */
export function useInfrastructure(id: string) {
  return useQuery({
    queryKey: ["infrastructures", id],
    queryFn: () => gridFetch<Infrastructure>(`/infrastructures/${id}`),
    enabled: !USE_MOCK_DATA && !!id,
  });
}

/**
 * Deploy infrastructure
 * POST /api/v1/infrastructures/:id/deploy
 */
export function useDeployInfrastructure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      gridFetch<Deployment>(`/infrastructures/${id}/deploy`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infrastructures"] });
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}

/**
 * Check infrastructure drift
 * POST /api/v1/infrastructures/:id/drift-check
 */
export function useDriftCheck() {
  return useMutation({
    mutationFn: (id: string) =>
      gridFetch<{ hasDrift: boolean; changes: string[] }>(`/infrastructures/${id}/drift-check`, { method: "POST" }),
  });
}

/**
 * Clone infrastructure
 * POST /api/v1/infrastructures/:id/clone
 */
export function useCloneInfrastructure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, targetEnvironment }: { id: string; targetEnvironment: string }) =>
      gridFetch<Infrastructure>(`/infrastructures/${id}/clone`, {
        method: "POST",
        body: JSON.stringify({ targetEnvironment }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infrastructures"] });
    },
  });
}

// ─── Deployment Hooks ───────────────────────────────────────────────────────

/**
 * Fetch all deployments
 * GET /api/v1/deployments
 */
export function useDeployments() {
  return useQuery({
    queryKey: ["deployments"],
    queryFn: () => gridFetch<Deployment[]>("/deployments"),
    enabled: !USE_MOCK_DATA,
  });
}

/**
 * Create a deployment (GridDeployRequest body)
 * POST /api/v1/deployments
 */
export function useCreateDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: GridDeployRequest) => {
      if (USE_MOCK_DATA) {
        throw new Error("useCreateDeployment requires VITE_USE_MOCK_DATA=false");
      }
      return gridFetch<Deployment>("/deployments", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}

/**
 * Cancel a deployment
 * POST /api/v1/deployments/:id/cancel
 */
export function useCancelDeployment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      gridFetch<void>(`/deployments/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}

// ─── Release Hooks ──────────────────────────────────────────────────────────

/**
 * Fetch all releases
 * GET /api/v1/releases
 */
export function useReleases() {
  return useQuery({
    queryKey: ["releases"],
    queryFn: () => gridFetch<Release[]>("/releases"),
    enabled: !USE_MOCK_DATA,
  });
}

/**
 * Fetch pending approvals
 * GET /api/v1/approvals
 */
export function usePendingApprovals() {
  return useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: () => gridFetch<Approval[]>("/approvals"),
    enabled: !USE_MOCK_DATA,
  });
}

/**
 * Approve a release
 * POST /api/v1/approvals/:id/approve
 */
export function useApproveRelease() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      gridFetch<Approval>(`/approvals/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
  });
}

/**
 * Reject a release
 * POST /api/v1/approvals/:id/reject
 */
export function useRejectRelease() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      gridFetch<Approval>(`/approvals/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
  });
}

/**
 * Rollback a release
 * POST /api/v1/releases/:id/rollback
 */
export function useRollbackRelease() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      gridFetch<Release>(`/releases/${id}/rollback`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
  });
}

// ─── Cluster Hooks ──────────────────────────────────────────────────────────

/**
 * Fetch all clusters
 * GET /api/v1/clusters
 */
export function useClusters() {
  return useQuery({
    queryKey: ["clusters"],
    queryFn: () => gridFetch<Cluster[]>("/clusters"),
    enabled: !USE_MOCK_DATA,
  });
}

/**
 * Scale a cluster
 * POST /api/v1/clusters/:id/scale
 */
export function useScaleCluster() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, nodes }: { id: string; nodes: number }) =>
      gridFetch<Cluster>(`/clusters/${id}/scale`, {
        method: "POST",
        body: JSON.stringify({ nodes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clusters"] });
    },
  });
}

// ─── Monitoring Hooks ───────────────────────────────────────────────────────

/**
 * Fetch alerts
 * GET /api/v1/monitoring/alerts
 */
export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async (): Promise<Alert[]> => {
      if (USE_MOCK_DATA) {
        const { generateStressActiveAlerts } = await import("@/data/stressTestData");
        const alerts = generateStressActiveAlerts();
        return alerts.map(a => ({
          id: a.id,
          ruleName: a.rule_name,
          resource: a.resource,
          severity: a.severity,
          status: a.status,
          message: a.message,
          startedAt: a.started_at,
          acknowledgedBy: a.acknowledged_by,
          resolvedAt: a.resolved_at,
        }));
      }
      return gridFetch<Alert[]>("/monitoring/alerts");
    },
    refetchInterval: 30_000, // Poll every 30s
  });
}

/**
 * Fetch metrics for an infrastructure resource
 * GET /api/v1/monitoring/metrics/:infra
 */
export function useMetrics(infraId: string, range: "1h" | "6h" | "24h" | "7d" = "1h") {
  return useQuery({
    queryKey: ["monitoring", "metrics", infraId, range],
    queryFn: () => gridFetch<TimeSeriesData[]>(`/monitoring/metrics/${infraId}?range=${range}`),
    enabled: !USE_MOCK_DATA && !!infraId,
  });
}

// ─── APM Hooks ──────────────────────────────────────────────────────────────

/**
 * Fetch APM services
 * GET /api/v1/apm/services
 */
export function useAPMServices() {
  return useQuery({
    queryKey: ["apm", "services"],
    queryFn: async (): Promise<APMService[]> => {
      if (USE_MOCK_DATA) {
        const { mockServices } = await import("@/data/apmMockData");
        return mockServices as unknown as APMService[];
      }
      return gridFetch<APMService[]>("/apm/services");
    },
  });
}

/**
 * Fetch operations for a service
 * GET /api/v1/apm/services/:id/operations
 */
export function useServiceOperations(serviceId: string) {
  return useQuery({
    queryKey: ["apm", "services", serviceId, "operations"],
    queryFn: () => gridFetch<APMOperation[]>(`/apm/services/${serviceId}/operations`),
    enabled: !USE_MOCK_DATA && !!serviceId,
  });
}

/**
 * Fetch traces for an operation
 * GET /api/v1/apm/services/:serviceId/operations/:opId/traces
 */
export function useOperationTraces(serviceId: string, operationId: string) {
  return useQuery({
    queryKey: ["apm", "services", serviceId, "operations", operationId, "traces"],
    queryFn: () => gridFetch<APMTrace[]>(`/apm/services/${serviceId}/operations/${operationId}/traces`),
    enabled: !USE_MOCK_DATA && !!serviceId && !!operationId,
  });
}

// ─── Logging Hooks ──────────────────────────────────────────────────────────

/**
 * Fetch logs
 * GET /api/v1/logs
 */
export function useLogs(query: LogQuery) {
  return useQuery({
    queryKey: ["logs", query],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query.query) params.set("query", query.query);
      if (query.limit) params.set("limit", String(query.limit));
      if (query.start) params.set("start", query.start);
      if (query.end) params.set("end", query.end);
      return gridFetch<LogEntry[]>(`/logs?${params.toString()}`);
    },
    enabled: !USE_MOCK_DATA,
  });
}

// ─── Environment Hooks ──────────────────────────────────────────────────────

/**
 * Fetch environments
 * GET /api/v1/environments
 */
export function useEnvironments() {
  return useQuery({
    queryKey: ["environments"],
    queryFn: () => gridFetch<Environment[]>("/environments"),
    enabled: !USE_MOCK_DATA,
  });
}

// ─── AI/ML Hooks (V2) ───────────────────────────────────────────────────────

/**
 * Fetch AI recommendations
 * GET /api/v1/ml/recommendations
 */
export function useRecommendations() {
  return useQuery({
    queryKey: ["ml", "recommendations"],
    queryFn: () => gridFetch<Recommendation[]>("/ml/recommendations"),
    enabled: !USE_MOCK_DATA,
  });
}

// ─── Auth Hooks ─────────────────────────────────────────────────────────────

/**
 * Get current user
 * GET /api/v1/auth/me
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => gridFetch<User>("/auth/me"),
    enabled: !USE_MOCK_DATA,
  });
}
