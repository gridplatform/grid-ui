import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Server,
  Cloud,
  Network,
  Database,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Monitor,
  HardDrive,
  Boxes,
  Ship,
  KeyRound,
  Shield,
  MessageSquare,
  Zap,
  Container,
  Globe,
  BarChart3,
  GitBranch,
  Activity,
  Eye,
} from "lucide-react";
import {
  TERRAFORM_CATEGORIES,
  KUBERNETES_KINDS,
  type DeployEngine,
  type TerraformCategory,
  type TerraformTarget,
  type KubernetesWorkloadKind,
} from "@/lib/deployContract";
import {
  enabledTargetsForCategory,
  enabledTerraformCategories,
} from "@/config/features";
import { useDeployments, useInfrastructures } from "@/hooks/useGridApi";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Deployment as ApiDeployment } from "@/types/api";
import { useNavigate } from "react-router-dom";
import { DeploymentLiveLogs } from "@/components/DeploymentLiveLogs";

type DeploymentStatus = "queued" | "pending" | "planning" | "running" | "success" | "failed";

interface DeploymentRow {
  id: string;
  infrastructureId?: string;
  name: string;
  engine: DeployEngine;
  provider: string;
  moduleOrKind: string;
  environment: string;
  status: DeploymentStatus;
  mode?: string;
  createdAt: string;
  details: string;
}

const statusConfig: Record<DeploymentStatus, { label: string; color: string; icon: React.ElementType }> = {
  queued: { label: "Queued", color: "bg-muted text-muted-foreground", icon: Clock },
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  planning: { label: "Planning", color: "bg-info/10 text-info", icon: Loader2 },
  running: { label: "Running", color: "bg-blue-500/10 text-blue-400", icon: Loader2 },
  success: { label: "Success", color: "bg-success/10 text-success", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const tfIcons: Record<TerraformCategory, React.ElementType> = {
  compute: Monitor,
  network: Network,
  "kubernetes-cluster": Cloud,
  database: Database,
  storage: HardDrive,
  "ai-ml": Server,
  identity: KeyRound,
  security: Shield,
  messaging: MessageSquare,
  serverless: Zap,
  containers: Container,
  edge: Globe,
  analytics: BarChart3,
  cicd: GitBranch,
  "observability-infra": Activity,
  other: Boxes,
};

const targetKey = (target: TerraformTarget) => `${target.provider}.${target.resourceType}`;

function mapApiDeployment(d: ApiDeployment): DeploymentRow {
  const status = (d.status === "cancelled" ? "failed" : d.status) as DeploymentStatus;
  const mode = d.mode || undefined;
  const moduleOrKind =
    d.resourceType && d.resourceType !== mode ? d.resourceType : undefined;
  return {
    id: d.id,
    infrastructureId: d.infrastructureId,
    name: d.name || d.infrastructureId.slice(0, 8),
    engine: (d.engine as DeployEngine) || "terraform",
    provider: d.provider || "—",
    moduleOrKind: moduleOrKind || "—",
    environment: d.environment || "—",
    status: status in statusConfig ? status : "pending",
    mode,
    createdAt: d.startedAt ? new Date(d.startedAt).toLocaleString() : "",
    details: [
      mode ? `mode=${mode}` : null,
      d.progress != null ? `${d.progress}%` : null,
      d.infrastructureId ? `infra ${d.infrastructureId.slice(0, 8)}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/** Infer catalog category from resource type / module name heuristics. */
function guessCategory(resourceType?: string): TerraformCategory | null {
  if (!resourceType) return null;
  const t = resourceType.toLowerCase();
  if (/ec2|instance|asg|autoscaling|compute-engine|gpu|vm/.test(t)) return "compute";
  if (/vpc|subnet|network|nat|gateway|route/.test(t)) return "network";
  if (/eks|gke|aks|kubernetes|cluster/.test(t)) return "kubernetes-cluster";
  if (/rds|sql|postgres|mysql|dynamo|spanner|firestore/.test(t)) return "database";
  if (/s3|gcs|bucket|ebs|disk|storage/.test(t)) return "storage";
  if (/sagemaker|vertex|notebook|ml/.test(t)) return "ai-ml";
  return "other";
}

const DeploymentsPage = () => {
  const navigate = useNavigate();
  const { envSlug, selectedProject, selectedEnv } = useWorkspace();

  const visibleCategories = useMemo(() => {
    const enabled = new Set(enabledTerraformCategories());
    return TERRAFORM_CATEGORIES.filter((c) => enabled.has(c.id));
  }, []);
  const defaultCategory = visibleCategories[0]?.id ?? "compute";

  const [engine, setEngine] = useState<DeployEngine>("terraform");
  const [tfCategory, setTfCategory] = useState<TerraformCategory>(defaultCategory);
  const [k8sKind, setK8sKind] = useState<KubernetesWorkloadKind>("workload");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [watchingId, setWatchingId] = useState<string | null>(null);

  const { data: liveDeployments, isLoading: liveLoading, error: liveError } = useDeployments();
  const { data: infrastructures = [] } = useInfrastructures({
    project: selectedProject?.slug,
    environment: envSlug,
    enabled: !!selectedProject?.slug,
  });

  const categoryTargets = useMemo(() => enabledTargetsForCategory(tfCategory), [tfCategory]);
  const activeTarget =
    categoryTargets.find((t) => targetKey(t) === selectedTarget) ?? categoryTargets[0] ?? null;

  const infraById = useMemo(() => {
    const m = new Map(infrastructures.map((i) => [i.id, i]));
    return m;
  }, [infrastructures]);

  const scopedDeployments = useMemo(() => {
    const projectSlug = selectedProject?.slug;
    return (liveDeployments || [])
      .map(mapApiDeployment)
      .filter((d) => {
        // Environment scope from header
        if (envSlug && d.environment !== envSlug && d.environment !== "—") {
          // Also accept via linked infra
          const infra = d.infrastructureId ? infraById.get(d.infrastructureId) : undefined;
          if (!infra || infra.environment !== envSlug) return false;
        }
        if (projectSlug && d.infrastructureId) {
          const infra = infraById.get(d.infrastructureId);
          const p = infra?.project || "demo-app";
          if (infra && p !== projectSlug) return false;
        }
        return true;
      })
      .reverse();
  }, [liveDeployments, envSlug, selectedProject?.slug, infraById]);

  const filtered = useMemo(() => {
    return scopedDeployments.filter((d) => {
      if (d.engine !== engine) return false;
      if (engine === "terraform") {
        const cat = guessCategory(d.moduleOrKind !== "—" ? d.moduleOrKind : d.mode);
        // If we can't guess, still show under current category when browsing "other" or show all in category loosely
        if (cat && cat !== tfCategory && tfCategory !== "other") {
          // Prefer showing when module matches selected target resource type
          if (activeTarget && d.moduleOrKind === activeTarget.resourceType) return true;
          return false;
        }
        if (selectedTarget && activeTarget) {
          // Soft filter: if a catalog card is selected, prefer matching resourceType
          if (d.moduleOrKind === activeTarget.resourceType) return true;
          // Keep broader category matches when no exact module
          if (d.moduleOrKind === "—" || d.moduleOrKind === d.mode) return cat === tfCategory || !cat;
          return false;
        }
      }
      return true;
    });
  }, [scopedDeployments, engine, tfCategory, selectedTarget, activeTarget]);

  // Catalog counts for the selected category (read-only)
  const catalogCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of scopedDeployments.filter((x) => x.engine === "terraform")) {
      const key = d.moduleOrKind !== "—" && d.moduleOrKind !== d.mode ? d.moduleOrKind : "";
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [scopedDeployments]);

  return (
    <AppShell activeTab="deployments">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Deployments
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                <Eye className="w-3 h-3" />
                View only
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Catalog of what is deployed for{" "}
              <strong className="text-foreground">{selectedProject?.name || "project"}</strong>
              {" / "}
              <strong className="text-foreground">{selectedEnv?.name || envSlug || "env"}</strong>.
              Change desired state in Git, then use Releases to plan/apply.
            </p>
          </div>
        </div>

        {liveError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {liveError instanceof Error ? liveError.message : "Failed to load deployments"}
          </div>
        )}

        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg w-fit">
          <button
            onClick={() => setEngine("terraform")}
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
            onClick={() => setEngine("kubernetes")}
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

        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg w-fit flex-wrap">
          {engine === "terraform"
            ? visibleCategories.map((cat) => {
                const Icon = tfIcons[cat.id];
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setTfCategory(cat.id);
                      setSelectedTarget(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      tfCategory === cat.id
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })
            : KUBERNETES_KINDS.map((kind) => (
                <button
                  key={kind.id}
                  onClick={() => setK8sKind(kind.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    k8sKind === kind.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {kind.label}
                </button>
              ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {engine === "terraform"
            ? TERRAFORM_CATEGORIES.find((c) => c.id === tfCategory)?.description
            : KUBERNETES_KINDS.find((k) => k.id === k8sKind)?.description}
        </p>

        {engine === "terraform" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {categoryTargets.map((target) => {
              const key = targetKey(target);
              const count = catalogCounts.get(target.resourceType) || 0;
              const selected = activeTarget && targetKey(activeTarget) === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTarget(selected ? null : key)}
                  className={`text-left rounded-lg border px-3 py-3 transition-colors ${
                    selected
                      ? "border-primary/40 bg-secondary/40"
                      : "border-border bg-card hover:bg-secondary/40"
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{target.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-1">
                    {target.provider}.{target.resourceType}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    {count} run{count === 1 ? "" : "s"} in this env
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">
              {engine === "terraform"
                ? TERRAFORM_CATEGORIES.find((c) => c.id === tfCategory)?.label
                : KUBERNETES_KINDS.find((k) => k.id === k8sKind)?.label}
            </h2>
            <span className="text-xs text-muted-foreground">
              {liveLoading ? "loading…" : `${filtered.length} runs`}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No deployment runs in this environment yet.
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Commit desired-state JSON to the config repo, Sync on Infrastructure, then create a{" "}
                <button
                  type="button"
                  onClick={() => navigate("/releases")}
                  className="text-foreground underline underline-offset-2 hover:text-primary"
                >
                  Release
                </button>{" "}
                (plan or apply). This page is read-only.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((dep) => {
                const sc = statusConfig[dep.status] ?? statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={dep.id}
                    onClick={() => {
                      setWatchingId(dep.id);
                      if (dep.infrastructureId) {
                        navigate(`/infrastructure/${dep.infrastructureId}`);
                      }
                    }}
                    className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 hover:bg-secondary/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon
                        className={`w-4 h-4 flex-shrink-0 ${
                          dep.status === "running" || dep.status === "planning" ? "animate-spin" : ""
                        } ${sc.color.split(" ")[1]}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-foreground font-medium">{dep.name}</span>
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {dep.engine}
                          </span>
                          {dep.mode && (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              {dep.mode}
                            </span>
                          )}
                          {dep.moduleOrKind && dep.moduleOrKind !== "—" && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {dep.moduleOrKind}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{dep.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 pl-7 sm:pl-0">
                      <span className="text-xs text-muted-foreground font-mono">{dep.provider}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {dep.createdAt}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {watchingId && (
          <DeploymentLiveLogs deploymentId={watchingId} title="Run output (read-only)" />
        )}
      </div>
    </AppShell>
  );
};

export default DeploymentsPage;
