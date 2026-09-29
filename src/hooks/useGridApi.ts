/**
 * Grid Console → backend API hooks.
 *
 * Deployments submit GridDeployRequest (see src/lib/deployContract.ts).
 * Point VITE_GRID_API_URL at grid-core / CLI bridge.
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
    queryFn: () => gridFetch<TopologyProvider[]>("/topology/providers"),
    staleTime: 30_000,
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
    enabled: !!providerId,
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
    enabled: !!vpcId,
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
    queryFn: () => gridFetch<InfrastructureListItem[]>("/infrastructures"),
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
    enabled: !!id,
  });
}

/**
 * Deploy infrastructure (legacy alias → apply)
 * POST /api/v1/infrastructures/:id/deploy
 */
export function useDeployInfrastructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      gridFetch<Deployment>(`/infrastructures/${id}/apply`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infrastructures"] });
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}

/**
 * PATCH /api/v1/infrastructures/:id — update desired-state JSON
 */
export function useUpdateInfrastructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      environment?: string;
      configJson?: Record<string, unknown>;
    }) =>
      gridFetch<Infrastructure>(`/infrastructures/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["infrastructures"] });
      queryClient.invalidateQueries({ queryKey: ["infrastructures", vars.id] });
    },
  });
}

/**
 * POST /api/v1/infrastructures/:id/plan
 */
export function usePlanInfrastructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      gridFetch<Deployment>(`/infrastructures/${id}/plan`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}

/**
 * POST /api/v1/infrastructures/:id/apply
 */
export function useApplyInfrastructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      gridFetch<Deployment>(`/infrastructures/${id}/apply`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infrastructures"] });
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}

/**
 * POST /api/v1/infrastructures/:id/destroy — real terraform destroy
 */
export function useDestroyInfrastructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      gridFetch<Deployment>(`/infrastructures/${id}/destroy`, { method: "POST" }),
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
      gridFetch<{
        infrastructureId: string;
        kind: string;
        hasDrift: boolean;
        gitChangedSinceApply: boolean;
        summary: string;
        changes: string[];
        planExcerpt?: string;
        actions: { applyGitDesired: string; updateGitToMatchLive: string };
        checkedAt: string;
      }>(`/infrastructures/${id}/drift-check`, { method: "POST" }),
  });
}

export type GitOpsSettings = {
  repoUrl: string;
  branch: string;
  pathPrefix: string;
  syncIntervalSec: number;
  enabled: boolean;
  updatedAt?: string;
};

export function useGitOpsStatus() {
  return useQuery({
    queryKey: ["gitops", "status"],
    queryFn: () =>
      gridFetch<{
        settings: GitOpsSettings | null;
        syncStatus: string;
        lastSyncAt?: string;
        lastSyncError?: string;
        lastCommit?: string;
        lastCommitMessage?: string;
        trackedCount: number;
        infrastructures: Array<{
          id: string;
          name: string;
          gitPath?: string;
          gitCommit?: string;
          gitContentHash?: string;
          lastAppliedHash?: string;
          status: string;
          desiredAhead: boolean;
        }>;
      }>("/gitops/status"),
    refetchInterval: 15_000,
  });
}

export function useSaveGitOpsSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<GitOpsSettings, "updatedAt">) =>
      gridFetch<GitOpsSettings>("/gitops/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gitops"] });
    },
  });
}

export function useSyncGitOps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      gridFetch<{
        synced: number;
        created: string[];
        updated: string[];
        unchanged: string[];
        commit?: string;
        commitMessage?: string;
      }>("/gitops/sync", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gitops"] });
      queryClient.invalidateQueries({ queryKey: ["infrastructures"] });
    },
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
    refetchInterval: (query) => {
      const rows = query.state.data;
      if (!rows?.length) return false;
      const active = rows.some(
        (d) => d.status === "pending" || d.status === "planning" || d.status === "running"
      );
      return active ? 2000 : false;
    },
  });
}

/**
 * Create a deployment (GridDeployRequest body)
 * POST /api/v1/deployments
 */
export function useCreateDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: GridDeployRequest) =>
      gridFetch<Deployment>("/deployments", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["infrastructures"] });
    },
  });
}

/**
 * Fetch deployment logs
 * GET /api/v1/deployments/:id/logs
 */
export function useDeploymentLogs(id: string) {
  return useQuery({
    queryKey: ["deployments", id, "logs"],
    queryFn: () =>
      gridFetch<{
        deploymentId: string;
        logs: string[];
        planSummary?: string;
        status?: string;
        progress?: number;
      }>(`/deployments/${id}/logs`),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "success" || status === "failed" || status === "cancelled") return false;
      return 1500;
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
    queryFn: () => gridFetch<Alert[]>("/monitoring/alerts"),
    refetchInterval: 30_000,
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
    enabled: !!infraId,
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
    queryFn: () => gridFetch<APMService[]>("/apm/services"),
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
    enabled: !!serviceId,
  });
}

/**
 * Fetch traces for an operation
 * GET /api/v1/apm/services/:serviceId/operations/:opId/traces
 */
export function useOperationTraces(serviceId: string, operationId: string) {
  return useQuery({
    queryKey: ["apm", "services", serviceId, "operations", operationId, "traces"],
    queryFn: () =>
      gridFetch<APMTrace[]>(`/apm/services/${serviceId}/operations/${operationId}/traces`),
    enabled: !!serviceId && !!operationId,
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
  });
}
