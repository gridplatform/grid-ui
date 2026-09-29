import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import {
  Server,
  Cpu,
  HardDrive,
  Activity,
  ChevronRight,
  Search,
  Database,
  Cloud,
  Network,
  Monitor,
  Box,
  AlertTriangle,
  Ship,
} from "lucide-react";
import {
  useDestroyInfrastructure,
  useInfrastructures,
  useRestoreInfrastructureConfig,
} from "@/hooks/useGridApi";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { InfrastructureListItem } from "@/types/api";
import {
  TERRAFORM_CATEGORIES,
  KUBERNETES_KINDS,
  type DeployEngine,
  type TerraformCategory,
  type KubernetesWorkloadKind,
} from "@/lib/deployContract";
import {
  categoryForResourceType,
  categoryLabel,
} from "@/lib/resourceCategory";

export type ResourceStatus = "running" | "stopped" | "error" | "degraded" | "stale" | "pending";

export interface Resource {
  id: string;
  name: string;
  /**
   * Catalog subtype (alb, vpc, …). Kept as `type` for detail-page compatibility.
   */
  type: string;
  /** Grouping category — Network, Compute, … (table “Type” column). */
  category: TerraformCategory | KubernetesWorkloadKind | "workload";
  status: ResourceStatus;
  region: string;
  ip: string;
  cpu: string;
  memory: string;
  environment: string;
  provider: string;
  project?: string;
  connections: string[];
  config: Record<string, unknown>;
  cluster?: string;
  /** terraform = cloud modules; kubernetes = cluster workloads (future). */
  engine: DeployEngine;
}

function formatSubtypeLabel(subtype: string): string {
  return subtype.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Workload kinds use the same Type/Subtype model once cluster units land. */
function workloadKindForSubtype(subtype: string): KubernetesWorkloadKind {
  const t = subtype.toLowerCase();
  if (/helm/.test(t)) return "helm-release";
  if (/kustomize/.test(t)) return "kustomize";
  if (/cronjob|k8s-cronjob/.test(t)) return "cronjob";
  if (/^job$|batch-job|k8s-job/.test(t)) return "job";
  if (/^(config|configmap|secret)$|k8s-config/.test(t)) return "config";
  return "workload";
}

/** True only for in-cluster workloads — never for cluster or node-pool infra. */
function isKubernetesWorkloadSubtype(subtype: string): boolean {
  const t = subtype.toLowerCase();
  if (
    /node-pool|node-group|karpenter|machine-pool|machine-set/.test(t) ||
    /^(eks|gke|aks|oke|ack|tke|cce|roks|rosa|openshift)(-|$)/.test(t)
  ) {
    return false;
  }
  return (
    /^(workload|helm-release|kustomize|cronjob|job|config)$/.test(t) ||
    /^k8s-(deployment|service|ingress|cronjob|statefulset|daemonset|storage)/.test(t)
  );
}

function mapListItem(item: InfrastructureListItem): Resource {
  const subtype = (item.type || "unknown").toLowerCase();
  const status: ResourceStatus =
    item.status === "running" ||
    item.status === "error" ||
    item.status === "degraded" ||
    item.status === "stale" ||
    item.status === "pending"
      ? item.status
      : "stopped";

  const asWorkload = isKubernetesWorkloadSubtype(subtype);
  const category = asWorkload
    ? workloadKindForSubtype(subtype)
    : categoryForResourceType(subtype);

  return {
    id: item.id,
    name: item.name,
    type: subtype,
    category,
    status,
    region: item.region,
    ip: item.ip || "—",
    cpu: item.cpu || "—",
    memory: item.memory || "—",
    environment: item.environment,
    provider: item.provider,
    project: item.project,
    connections: item.connections || [],
    config: item.config || {},
    cluster: item.cluster,
    engine: asWorkload ? "kubernetes" : "terraform",
  };
}

function categoryIcon(category: string): React.ElementType {
  switch (category) {
    case "compute":
      return Monitor;
    case "network":
      return Network;
    case "kubernetes-cluster":
    case "workload":
    case "helm-release":
    case "kustomize":
      return Cloud;
    case "database":
      return Database;
    case "storage":
      return HardDrive;
    case "ai-ml":
      return Cpu;
    default:
      return Box;
  }
}

function typeColumnLabel(resource: Resource): string {
  if (resource.engine === "kubernetes") {
    return KUBERNETES_KINDS.find((k) => k.id === resource.category)?.label ?? String(resource.category);
  }
  return categoryLabel(resource.category as TerraformCategory);
}

const statusColors: Record<ResourceStatus, string> = {
  running: "bg-success/10 text-success",
  stopped: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
  degraded: "bg-warning/10 text-warning",
  stale: "bg-warning/15 text-warning border border-warning/30",
  pending: "bg-muted text-muted-foreground",
};

function providerBadge(provider: string): { label: string; className: string } {
  const key = (provider || "").trim().toLowerCase();
  if (key === "aws" || key === "amazon") {
    return { label: "AWS", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  }
  if (key === "gcp" || key === "google" || key === "gcloud") {
    return { label: "GCP", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" };
  }
  if (key === "azure" || key === "microsoft") {
    return { label: "Azure", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" };
  }
  if (key === "on-prem" || key === "onprem" || key === "on-premises") {
    return { label: "On-Prem", className: "bg-muted text-muted-foreground" };
  }
  if (key === "oracle" || key === "oci") {
    return { label: "Oracle", className: "bg-red-500/15 text-red-600 dark:text-red-400" };
  }
  if (key === "alibaba" || key === "aliyun") {
    return { label: "Alibaba", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400" };
  }
  const label = provider?.trim()
    ? provider.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";
  return { label, className: "bg-muted text-muted-foreground" };
}

const TABLE_COLS =
  "grid-cols-[minmax(140px,1.6fr)_80px_100px_minmax(100px,1fr)_110px_90px_90px_100px_60px_60px_28px]";

const InfrastructurePage = () => {
  const navigate = useNavigate();
  const { envSlug, selectedProject, selectedEnv, projectSlug } = useWorkspace();
  const [engine, setEngine] = useState<DeployEngine>("terraform");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [subtypeFilter, setSubtypeFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | "">("");
  const [actionNote, setActionNote] = useState<string | null>(null);

  const workspaceReady = !!projectSlug && !!envSlug;
  const { data: liveItems, isLoading, error, refetch } = useInfrastructures({
    project: projectSlug,
    environment: envSlug,
    enabled: workspaceReady,
  });
  const listLoading = !workspaceReady || isLoading;
  const restoreConfig = useRestoreInfrastructureConfig();
  const destroyInfra = useDestroyInfrastructure();

  const resources = useMemo(() => {
    return (liveItems || []).map(mapListItem);
  }, [liveItems]);

  // Reset subtype when type or engine changes.
  useEffect(() => {
    setSubtypeFilter("");
  }, [typeFilter, engine]);

  const scopedByEngine = useMemo(
    () => resources.filter((r) => r.engine === engine),
    [resources, engine]
  );

  const staleResources = useMemo(
    () => scopedByEngine.filter((r) => r.status === "stale"),
    [scopedByEngine]
  );

  const typeOptions = useMemo(() => {
    if (engine === "kubernetes") {
      return KUBERNETES_KINDS.map((k) => ({ id: k.id, label: k.label }));
    }
    const present = new Set(scopedByEngine.map((r) => r.category));
    return TERRAFORM_CATEGORIES.filter((c) => present.has(c.id)).map((c) => ({
      id: c.id,
      label: c.label,
    }));
  }, [engine, scopedByEngine]);

  const subtypeOptions = useMemo(() => {
    const pool = typeFilter
      ? scopedByEngine.filter((r) => r.category === typeFilter)
      : scopedByEngine;
    return [...new Set(pool.map((r) => r.type))].sort((a, b) => a.localeCompare(b));
  }, [scopedByEngine, typeFilter]);

  const providerOptions = useMemo(() => {
    const labels = new Map<string, string>();
    for (const r of scopedByEngine) {
      const { label } = providerBadge(r.provider);
      labels.set(label, label);
    }
    return [...labels.keys()].sort((a, b) => a.localeCompare(b));
  }, [scopedByEngine]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedByEngine.filter((r) => {
      const badge = providerBadge(r.provider);
      const typeLabel = typeColumnLabel(r).toLowerCase();
      const subtypeLabel = formatSubtypeLabel(r.type).toLowerCase();
      const statusLabel = r.status === "stale" ? "removed from config" : r.status;

      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        typeLabel.includes(q) ||
        r.category.toLowerCase().includes(q) ||
        subtypeLabel.includes(q) ||
        r.type.includes(q) ||
        badge.label.toLowerCase().includes(q) ||
        (r.provider || "").toLowerCase().includes(q) ||
        statusLabel.includes(q) ||
        r.region.toLowerCase().includes(q) ||
        r.environment.toLowerCase().includes(q) ||
        (r.cluster && r.cluster.toLowerCase().includes(q));

      const matchType = !typeFilter || r.category === typeFilter;
      const matchSubtype = !subtypeFilter || r.type === subtypeFilter;
      const matchProvider = !providerFilter || badge.label === providerFilter;
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchSearch && matchType && matchSubtype && matchProvider && matchStatus;
    });
  }, [
    scopedByEngine,
    searchQuery,
    typeFilter,
    subtypeFilter,
    providerFilter,
    statusFilter,
  ]);

  const runningCount = scopedByEngine.filter((r) => r.status === "running").length;
  const stoppedCount = scopedByEngine.filter(
    (r) => r.status === "stopped" || r.status === "pending"
  ).length;
  const errorCount = scopedByEngine.filter(
    (r) => r.status === "error" || r.status === "degraded"
  ).length;
  const staleCount = staleResources.length;

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await restoreConfig.mutateAsync(id);
      setActionNote("Config restored. Unit is back in the desired-state tree.");
      await refetch();
    } catch (err) {
      setActionNote(err instanceof Error ? err.message : "Restore failed");
    }
  };

  const handleDestroy = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Destroy cloud resources for this unit that was removed from config? This cannot be undone."
      )
    ) {
      return;
    }
    try {
      const d = await destroyInfra.mutateAsync(id);
      setActionNote(`Destroy started: ${d.id}`);
      await refetch();
    } catch (err) {
      setActionNote(err instanceof Error ? err.message : "Destroy failed");
    }
  };

  const tableTitle =
    engine === "terraform"
      ? typeFilter
        ? categoryLabel(typeFilter as TerraformCategory)
        : "Infrastructure"
      : typeFilter
        ? KUBERNETES_KINDS.find((k) => k.id === typeFilter)?.label || "Workloads"
        : "Workloads";

  return (
    <AppShell activeTab="infrastructure">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{runningCount}</p>
              <p className="text-sm text-muted-foreground">Running</p>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Cpu className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stoppedCount}</p>
              <p className="text-sm text-muted-foreground">Stopped / Pending</p>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{errorCount}</p>
              <p className="text-sm text-muted-foreground">Errors / Degraded</p>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{staleCount}</p>
              <p className="text-sm text-muted-foreground">Removed from config</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load infrastructures"}
          </div>
        )}

        {actionNote && (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            {actionNote}
          </div>
        )}

        {staleResources.length > 0 && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Removed from config, still in state
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These units were deleted from the desired-state JSON but may still exist in the cloud.
                  Destroy them, or put the config back.
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {staleResources.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/infrastructure/${r.id}`)}
                    className="text-sm font-medium text-foreground hover:underline text-left"
                  >
                    {r.name}
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      {typeColumnLabel(r)} · {formatSubtypeLabel(r.type)} · {r.provider}
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => void handleRestore(r.id, e)}
                      disabled={restoreConfig.isPending}
                      className="px-2.5 py-1 text-xs border border-border rounded-md hover:bg-secondary disabled:opacity-50"
                    >
                      Restore to config
                    </button>
                    <button
                      type="button"
                      onClick={(e) => void handleDestroy(r.id, e)}
                      disabled={destroyInfra.isPending}
                      className="px-2.5 py-1 text-xs border border-destructive/40 text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Destroy
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Engine: cloud infra vs cluster workloads (same Type / Subtype model). */}
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg w-fit flex-wrap">
          <button
            type="button"
            onClick={() => {
              setEngine("terraform");
              setTypeFilter("");
              setSubtypeFilter("");
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              engine === "terraform"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Server className="w-4 h-4" />
            Infrastructure
          </button>
          <button
            type="button"
            onClick={() => {
              setEngine("kubernetes");
              setTypeFilter("");
              setSubtypeFilter("");
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              engine === "kubernetes"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Ship className="w-4 h-4" />
            Workloads
          </button>
        </div>
        <p className="text-xs text-muted-foreground -mt-3">
          {engine === "terraform"
            ? "Cloud units including Kubernetes clusters and node pools (separate YAML each). Filter Type → Kubernetes clusters for EKS/GKE/… and their node pools."
            : "In-cluster workloads (Deployments, Helm, CronJobs, …). Cluster and node-pool infra stay under Infrastructure."}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search type, subtype, provider, status, name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All types</option>
            {typeOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={subtypeFilter}
            onChange={(e) => setSubtypeFilter(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring max-w-[200px]"
          >
            <option value="">All subtypes</option>
            {subtypeOptions.map((t) => (
              <option key={t} value={t}>
                {formatSubtypeLabel(t)}
              </option>
            ))}
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All providers</option>
            {providerOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ResourceStatus | "")}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All statuses</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="stopped">Stopped</option>
            <option value="stale">Removed from config</option>
            <option value="error">Error</option>
            <option value="degraded">Degraded</option>
          </select>

          <div className="px-3 py-2 text-xs text-muted-foreground border border-border rounded-md bg-secondary/40 whitespace-nowrap">
            {selectedProject?.name || "Project"}
            {" · "}
            {selectedEnv?.name || envSlug || "Environment"}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">{tableTitle}</h2>
            <span className="text-xs text-muted-foreground">
              {listLoading ? "loading…" : `${filtered.length} items`}
            </span>
          </div>
          <div
            className={`grid ${TABLE_COLS} gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border`}
          >
            <span>Name</span>
            <span>Provider</span>
            <span>Type</span>
            <span>Subtype</span>
            <span>Status</span>
            <span>Region</span>
            <span>Environment</span>
            <span>Cluster</span>
            <span>CPU</span>
            <span>RAM</span>
            <span></span>
          </div>
          {!listLoading && filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {engine === "kubernetes"
                ? "No Kubernetes workloads yet. When you add workload units they appear here — clusters and node pools stay under Infrastructure → Type: Kubernetes clusters."
                : "No infrastructures match these filters. Adjust type, subtype, provider, or status — or add desired-state JSON."}
            </div>
          ) : (
            filtered.map((resource) => {
              const Icon = categoryIcon(String(resource.category));
              const provider = providerBadge(resource.provider);
              return (
                <div
                  key={resource.id}
                  onClick={() => navigate(`/infrastructure/${resource.id}`)}
                  className={`grid ${TABLE_COLS} gap-3 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground font-medium truncate">{resource.name}</span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${provider.className}`}
                  >
                    {provider.label}
                  </span>
                  <span className="text-xs text-muted-foreground truncate" title={String(resource.category)}>
                    {typeColumnLabel(resource)}
                  </span>
                  <span className="text-xs text-muted-foreground truncate" title={resource.type}>
                    {formatSubtypeLabel(resource.type)}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${statusColors[resource.status]}`}
                  >
                    {resource.status === "stale" ? "removed from config" : resource.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{resource.region}</span>
                  <span className="text-xs text-muted-foreground">{resource.environment}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {resource.cluster || "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">{resource.cpu}</span>
                  <span className="text-xs text-muted-foreground">{resource.memory}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default InfrastructurePage;
