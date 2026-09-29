import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import {
  Server, Cpu, HardDrive, Activity, ChevronRight, Search,
  Database, Cloud, Network,
  Monitor, Globe, Box, Timer, Layers, Shield, Container,
} from "lucide-react";
import { useEnvironments, useInfrastructures } from "@/hooks/useGridApi";
import type { InfrastructureListItem } from "@/types/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ResourceType =
  | "single-vm" | "vm-cluster" | "kubernetes" | "network" | "managed-service"
  | "k8s-ingress" | "k8s-deployment" | "k8s-service" | "k8s-cronjob"
  | "k8s-statefulset" | "k8s-daemonset" | "k8s-storage"
  | "gpu-node" | "gpu-pool";

export type ResourceStatus = "running" | "stopped" | "error" | "degraded";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  region: string;
  ip: string;
  cpu: string;
  memory: string;
  environment: string;
  provider: string;
  connections: string[];
  config: Record<string, unknown>;
  cluster?: string;
}

function mapListItem(item: InfrastructureListItem): Resource {
  const status: ResourceStatus =
    item.status === "running" || item.status === "error" || item.status === "degraded"
      ? item.status
      : "stopped";
  return {
    id: item.id,
    name: item.name,
    type: (item.type as ResourceType) || "single-vm",
    status,
    region: item.region,
    ip: item.ip || "—",
    cpu: item.cpu || "—",
    memory: item.memory || "—",
    environment: item.environment,
    provider: item.provider,
    connections: item.connections || [],
    config: item.config || {},
    cluster: item.cluster,
  };
}

const typeIcons: Record<ResourceType, React.ElementType> = {
  "single-vm": Monitor,
  "vm-cluster": Server,
  kubernetes: Cloud,
  network: Network,
  "managed-service": Database,
  "k8s-ingress": Globe,
  "k8s-deployment": Box,
  "k8s-service": Layers,
  "k8s-cronjob": Timer,
  "k8s-statefulset": Container,
  "k8s-daemonset": Shield,
  "k8s-storage": HardDrive,
  "gpu-node": Cpu,
  "gpu-pool": Cpu,
};

const typeLabels: Record<ResourceType, string> = {
  "single-vm": "Single VM",
  "vm-cluster": "VM Cluster",
  kubernetes: "K8s Cluster",
  network: "Network",
  "managed-service": "Managed",
  "k8s-ingress": "Ingress",
  "k8s-deployment": "Deployment",
  "k8s-service": "Service",
  "k8s-cronjob": "CronJob",
  "k8s-statefulset": "StatefulSet",
  "k8s-daemonset": "DaemonSet",
  "k8s-storage": "Storage / Node Pool",
  "gpu-node": "GPU Node",
  "gpu-pool": "GPU Pool",
};

const statusColors: Record<ResourceStatus, string> = {
  running: "bg-success/10 text-success",
  stopped: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
  degraded: "bg-warning/10 text-warning",
};

const typeFilterGroups = [
  { label: "VMs", types: ["single-vm", "vm-cluster"] as ResourceType[] },
  { label: "GPU / ML", types: ["gpu-node", "gpu-pool"] as ResourceType[] },
  { label: "Kubernetes", types: ["k8s-ingress", "k8s-deployment", "k8s-service", "k8s-cronjob", "k8s-statefulset", "k8s-daemonset", "k8s-storage"] as ResourceType[] },
  { label: "Other", types: ["network", "managed-service"] as ResourceType[] },
];

const InfrastructurePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "">("");
  const [envFilter, setEnvFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | "">("");

  const { data: liveItems, isLoading, error } = useInfrastructures();
  const { data: environments = [] } = useEnvironments();

  const resources = useMemo(
    () => (liveItems || []).map(mapListItem),
    [liveItems]
  );

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.type.includes(searchQuery.toLowerCase()) ||
        r.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.cluster && r.cluster.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchType = !typeFilter || r.type === typeFilter;
      const matchEnv = !envFilter || r.environment === envFilter;
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchSearch && matchType && matchEnv && matchStatus;
    });
  }, [resources, searchQuery, typeFilter, envFilter, statusFilter]);

  const runningCount = resources.filter((r) => r.status === "running").length;
  const stoppedCount = resources.filter((r) => r.status === "stopped").length;
  const errorCount = resources.filter((r) => r.status === "error" || r.status === "degraded").length;

  return (
    <AppShell activeTab="infrastructure">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <p className="text-sm text-muted-foreground">Stopped</p>
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
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load infrastructures"}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, type, region, cluster…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ResourceType | "")}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All types</option>
            {typeFilterGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.types.map((t) => (
                  <option key={t} value={t}>
                    {typeLabels[t]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All environments</option>
            {environments.map((env) => (
              <option key={env.id} value={env.slug}>
                {env.kind === "ephemeral"
                  ? `${env.name}${env.expired ? " (expired)" : env.ttl ? ` · TTL ${env.ttl}` : ""}`
                  : env.name}
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
            <option value="stopped">Stopped</option>
            <option value="error">Error</option>
            <option value="degraded">Degraded</option>
          </select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Infrastructures</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading ? "loading…" : `${filtered.length} items`}
            </span>
          </div>
          <div className="grid grid-cols-[minmax(200px,2fr)_120px_90px_100px_100px_120px_80px_80px_32px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
            <span>Name</span>
            <span>Type</span>
            <span>Status</span>
            <span>Region</span>
            <span>Environment</span>
            <span>Cluster</span>
            <span>CPU</span>
            <span>RAM</span>
            <span></span>
          </div>
          {!isLoading && filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No infrastructures yet. Create one from Deployments (Plan or Apply), or import via CLI.
            </div>
          ) : (
            filtered.map((resource) => {
              const TypeIcon = typeIcons[resource.type] || Monitor;
              return (
                <div
                  key={resource.id}
                  onClick={() => navigate(`/infrastructure/${resource.id}`)}
                  className="grid grid-cols-[minmax(200px,2fr)_120px_90px_100px_100px_120px_80px_80px_32px] gap-3 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <TypeIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground font-medium">{resource.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {typeLabels[resource.type] || resource.type}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${statusColors[resource.status]}`}
                  >
                    {resource.status}
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
