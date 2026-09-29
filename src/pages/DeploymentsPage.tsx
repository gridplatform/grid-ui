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
import { categoryForResourceType } from "@/lib/resourceCategory";
import { useDeployments, useInfrastructures } from "@/hooks/useGridApi";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Deployment as ApiDeployment, InfrastructureListItem } from "@/types/api";
import { useNavigate } from "react-router-dom";
import { DeploymentLiveLogs } from "@/components/DeploymentLiveLogs";

type DeploymentStatus = "queued" | "pending" | "planning" | "running" | "success" | "failed";

interface DeploymentRow {
  id: string;
  infrastructureId?: string;
  name: string;
  engine: DeployEngine;
  provider: string;
  /** Catalog subtype: vpc, ec2-instance, … (never plan/apply). */
  moduleOrKind: string;
  environment: string;
  status: DeploymentStatus;
  mode?: string;
  createdAt: string;
  details: string;
}

/** Live unit shown on Deployments (running / degraded in cloud). */
interface LiveUnitRow {
  id: string;
  name: string;
  subtype: string;
  category: TerraformCategory;
  provider: string;
  status: string;
  region: string;
  environment: string;
}

const statusConfig: Record<
  DeploymentStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  queued: { label: "Queued", color: "bg-muted text-muted-foreground", icon: Clock },
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  planning: { label: "Planning", color: "bg-info/10 text-info", icon: Loader2 },
  running: { label: "Running", color: "bg-blue-500/10 text-blue-400", icon: Loader2 },
  success: { label: "Success", color: "bg-success/10 text-success", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const liveStatusColor: Record<string, string> = {
  running: "bg-success/10 text-success",
  degraded: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  pending: "bg-muted text-muted-foreground",
  stopped: "bg-muted text-muted-foreground",
  stale: "bg-warning/10 text-warning",
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

/** Subtype from unit type or git path (`…/vpc/name.json` → vpc). */
function subtypeFromInfra(item: InfrastructureListItem): string {
  const typed = (item.type || "").trim().toLowerCase();
  if (typed && typed !== "unknown" && typed !== "plan" && typed !== "apply") return typed;
  const parts = (item.gitPath || "").split("/").filter(Boolean);
  if (parts.length >= 2) {
    const folder = parts[parts.length - 2].toLowerCase();
    if (folder && folder !== "projects") return folder;
  }
  const name = (item.name || "").toLowerCase();
  if (/vpc/.test(name)) return "vpc";
  if (/ec2|vm/.test(name)) return "ec2-instance";
  return name || "unknown";
}

function mapApiDeployment(
  d: ApiDeployment,
  infraById: Map<string, InfrastructureListItem>
): DeploymentRow {
  const status = (d.status === "cancelled" ? "failed" : d.status) as DeploymentStatus;
  const mode = d.mode || undefined;
  const infra = d.infrastructureId ? infraById.get(d.infrastructureId) : undefined;
  // Core often stores resourceType as "plan"/"apply" — prefer linked unit subtype.
  const rawType = (d.resourceType || "").toLowerCase();
  const subtype =
    rawType && rawType !== "plan" && rawType !== "apply" && rawType !== "custom"
      ? rawType
      : infra
        ? subtypeFromInfra(infra)
        : "—";

  return {
    id: d.id,
    infrastructureId: d.infrastructureId,
    name: d.name || d.infrastructureId?.slice(0, 8) || "deployment",
    engine: (d.engine as DeployEngine) || "terraform",
    provider: d.provider || infra?.provider || "—",
    moduleOrKind: subtype,
    environment: d.environment || infra?.environment || "—",
    status: status in statusConfig ? status : "pending",
    mode,
    createdAt: d.startedAt ? new Date(d.startedAt).toLocaleString() : "",
    details: [
      mode ? `mode=${mode}` : null,
      d.progress != null ? `${d.progress}%` : null,
      subtype !== "—" ? subtype : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
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
  /** Only set when the user clicks a catalog card — never auto-select. */
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [watchingId, setWatchingId] = useState<string | null>(null);

  const { data: liveDeployments, isLoading: liveLoading, error: liveError } = useDeployments();
  const { data: infrastructures = [], isLoading: infraLoading } = useInfrastructures({
    project: selectedProject?.slug,
    environment: envSlug,
    enabled: !!selectedProject?.slug,
  });

  const categoryTargets = useMemo(() => enabledTargetsForCategory(tfCategory), [tfCategory]);
  const activeTarget = useMemo(
    () =>
      selectedTarget
        ? categoryTargets.find((t) => targetKey(t) === selectedTarget) ?? null
        : null,
    [selectedTarget, categoryTargets]
  );

  const infraById = useMemo(() => {
    const m = new Map(infrastructures.map((i) => [i.id, i]));
    return m;
  }, [infrastructures]);

  /** Live cloud units for this workspace (Deployments focus). */
  const liveUnits = useMemo((): LiveUnitRow[] => {
    return infrastructures
      .filter((i) => i.status === "running" || i.status === "degraded")
      .map((i) => {
        const subtype = subtypeFromInfra(i);
        return {
          id: i.id,
          name: i.name,
          subtype,
          category: categoryForResourceType(subtype),
          provider: i.provider || "—",
          status: i.status,
          region: i.region || "—",
          environment: i.environment || envSlug || "—",
        };
      });
  }, [infrastructures, envSlug]);

  const liveInCategory = useMemo(() => {
    return liveUnits.filter((u) => {
      if (u.category !== tfCategory) return false;
      if (activeTarget && u.subtype !== activeTarget.resourceType) {
        // Allow close aliases (ec2 ↔ ec2-instance, vm ↔ ec2-instance)
        const a = u.subtype;
        const b = activeTarget.resourceType;
        if (a === b) return true;
        if (a.includes(b) || b.includes(a)) return true;
        return false;
      }
      return true;
    });
  }, [liveUnits, tfCategory, activeTarget]);

  const scopedDeployments = useMemo(() => {
    const projectSlug = selectedProject?.slug;
    return (liveDeployments || [])
      .map((d) => mapApiDeployment(d, infraById))
      .filter((d) => {
        if (envSlug && d.environment !== envSlug && d.environment !== "—") {
          const infra = d.infrastructureId ? infraById.get(d.infrastructureId) : undefined;
          if (!infra || infra.environment !== envSlug) return false;
        }
        if (projectSlug && d.infrastructureId) {
          const infra = infraById.get(d.infrastructureId);
          if (infra?.project && infra.project !== projectSlug) return false;
        }
        return true;
      })
      .reverse();
  }, [liveDeployments, envSlug, selectedProject?.slug, infraById]);

  const recentRuns = useMemo(() => {
    return scopedDeployments.filter((d) => {
      if (d.engine !== engine) return false;
      if (engine !== "terraform") return true;
      const cat = categoryForResourceType(d.moduleOrKind);
      if (cat !== tfCategory && tfCategory !== "other") return false;
      if (activeTarget) {
        const a = d.moduleOrKind;
        const b = activeTarget.resourceType;
        if (a !== b && !a.includes(b) && !b.includes(a)) return false;
      }
      return true;
    });
  }, [scopedDeployments, engine, tfCategory, activeTarget]);

  /** Catalog card counts = live units of that subtype (not broken plan/apply labels). */
  const catalogCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of liveUnits.filter((x) => x.category === tfCategory)) {
      counts.set(u.subtype, (counts.get(u.subtype) || 0) + 1);
      // Also bump catalog keys that alias this subtype
      for (const t of categoryTargets) {
        if (u.subtype === t.resourceType || u.subtype.includes(t.resourceType) || t.resourceType.includes(u.subtype)) {
          if (u.subtype !== t.resourceType) {
            counts.set(t.resourceType, (counts.get(t.resourceType) || 0) + 1);
          }
        }
      }
    }
    return counts;
  }, [liveUnits, tfCategory, categoryTargets]);

  const loading = liveLoading || infraLoading;

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
              Live units currently deployed for{" "}
              <strong className="text-foreground">{selectedProject?.name || "project"}</strong>
              {" / "}
              <strong className="text-foreground">{selectedEnv?.name || envSlug || "env"}</strong>
              . Full inventory (including stopped / pending) is on{" "}
              <button
                type="button"
                onClick={() => navigate("/infrastructure")}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Infrastructure
              </button>
              .
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
                const n = liveUnits.filter((u) => u.category === cat.id).length;
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
                    {n > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">{n}</span>
                    )}
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
                    {count} live in this env
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Live units */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">
              Live ·{" "}
              {engine === "terraform"
                ? TERRAFORM_CATEGORIES.find((c) => c.id === tfCategory)?.label
                : KUBERNETES_KINDS.find((k) => k.id === k8sKind)?.label}
            </h2>
            <span className="text-xs text-muted-foreground">
              {loading ? "loading…" : `${liveInCategory.length} unit${liveInCategory.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {engine === "kubernetes" ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Workload deployments will appear here when cluster units are applied.
            </div>
          ) : liveInCategory.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No live {TERRAFORM_CATEGORIES.find((c) => c.id === tfCategory)?.label.toLowerCase()}{" "}
                units in this environment.
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Apply a{" "}
                <button
                  type="button"
                  onClick={() => navigate("/releases")}
                  className="text-foreground underline underline-offset-2 hover:text-primary"
                >
                  Release
                </button>{" "}
                to create cloud resources. Pending / stopped units stay on Infrastructure.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {liveInCategory.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => navigate(`/infrastructure/${unit.id}`)}
                  className="w-full flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 hover:bg-secondary/50 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-foreground font-medium">{unit.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{unit.subtype}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {unit.provider} · {unit.region} · {unit.environment}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 pl-0 sm:pl-0">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        liveStatusColor[unit.status] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {unit.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent plan/apply runs for this category */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">Recent runs</h2>
            <span className="text-xs text-muted-foreground">
              {loading ? "loading…" : `${recentRuns.length} run${recentRuns.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {recentRuns.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No plan/apply runs for this category yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentRuns.map((dep) => {
                const sc = statusConfig[dep.status] ?? statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={dep.id}
                    onClick={() => setWatchingId(dep.id)}
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
                          {dep.mode && (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              {dep.mode}
                            </span>
                          )}
                          {dep.moduleOrKind !== "—" && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {dep.moduleOrKind}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{dep.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {dep.createdAt}
                      </span>
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
