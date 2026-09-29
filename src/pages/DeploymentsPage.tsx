import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Server,
  Cloud,
  Network,
  Database,
  Plus,
  X,
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
} from "lucide-react";
import {
  TERRAFORM_CATEGORIES,
  KUBERNETES_KINDS,
  clusterDeployTemplate,
  terraformDeployTemplate,
  type DeployEngine,
  type TerraformCategory,
  type TerraformTarget,
  type KubernetesWorkloadKind,
  type GridDeployRequest,
} from "@/lib/deployContract";
import {
  enabledClusterTargets,
  enabledTargetsForCategory,
  enabledTerraformCategories,
  isDeployEnabled,
} from "@/config/features";
import { useCreateDeployment, useDeployments } from "@/hooks/useGridApi";
import type { Deployment as ApiDeployment } from "@/types/api";
import { useNavigate } from "react-router-dom";
import { DeploymentLiveLogs } from "@/components/DeploymentLiveLogs";

type DeploymentStatus = "queued" | "pending" | "planning" | "running" | "success" | "failed";

interface DeploymentRow {
  id: string;
  infrastructureId?: string;
  name: string;
  engine: DeployEngine;
  category: string;
  provider: string;
  moduleOrKind: string;
  environment: string;
  status: DeploymentStatus;
  mode?: string;
  createdBy: string;
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
  const relative = d.startedAt
    ? new Date(d.startedAt).toLocaleString()
    : "";
  return {
    id: d.id,
    infrastructureId: d.infrastructureId,
    name: d.name || d.infrastructureId.slice(0, 8),
    engine: (d.engine as DeployEngine) || "terraform",
    category: "other",
    provider: d.provider || "—",
    moduleOrKind: d.resourceType || d.mode || "—",
    environment: d.environment || "—",
    status: status in statusConfig ? status : "pending",
    mode: d.mode,
    createdBy: d.triggeredBy,
    createdAt: relative,
    details: [
      d.mode ? `mode=${d.mode}` : null,
      d.progress != null ? `${d.progress}%` : null,
      d.infrastructureId ? `infra ${d.infrastructureId.slice(0, 8)}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

const DeploymentsPage = () => {
  const navigate = useNavigate();
  const visibleCategories = useMemo(() => {
    const enabled = new Set(enabledTerraformCategories());
    return TERRAFORM_CATEGORIES.filter((c) => enabled.has(c.id));
  }, []);
  const defaultCategory = visibleCategories[0]?.id ?? "compute";

  const [engine, setEngine] = useState<DeployEngine>("terraform");
  const [tfCategory, setTfCategory] = useState<TerraformCategory>(defaultCategory);
  const [k8sKind, setK8sKind] = useState<KubernetesWorkloadKind>("workload");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createJson, setCreateJson] = useState("");
  const [submitNote, setSubmitNote] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<"plan" | "apply">("apply");
  const [watchingId, setWatchingId] = useState<string | null>(null);

  const createDeployment = useCreateDeployment();
  const { data: liveDeployments, isLoading: liveLoading, error: liveError } = useDeployments();

  // Only provider x resource type pairs that are switched on can be picked.
  const categoryTargets = useMemo(() => enabledTargetsForCategory(tfCategory), [tfCategory]);
  const clusterTargets = useMemo(() => enabledClusterTargets(), []);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const activeTarget =
    categoryTargets.find((t) => targetKey(t) === selectedTarget) ?? categoryTargets[0] ?? null;

  const liveRows = useMemo(
    () => (liveDeployments || []).map(mapApiDeployment).reverse(),
    [liveDeployments]
  );

  const filtered = liveRows.filter((d) => d.engine === engine);

  const openCreate = (target?: TerraformTarget) => {
    setSubmitNote(null);
    if (engine === "kubernetes") {
      setCreateJson(k8sTemplates[k8sKind]);
      setShowCreateModal(true);
      return;
    }

    const picked = target ?? activeTarget;
    if (!picked) {
      setSubmitNote("No resource types are enabled for this category. Enable one in src/config/featureFlags.ts.");
      return;
    }
    setSelectedTarget(targetKey(picked));

    if (tfCategory === "kubernetes-cluster") {
      const cluster = clusterTargets.find((t) => t.resourceType === picked.resourceType);
      setCreateJson(
        cluster ? clusterDeployTemplate(cluster.id) : terraformDeployTemplate(tfCategory, picked),
      );
    } else {
      setCreateJson(terraformDeployTemplate(tfCategory, picked));
    }
    setShowCreateModal(true);
  };

  const handleDeploy = async (mode: "plan" | "apply") => {
    try {
      const parsed = JSON.parse(createJson) as GridDeployRequest;
      if (!parsed.engine || !parsed.name || !parsed.resourceType) {
        setSubmitNote("JSON must include name, engine, and resourceType.");
        return;
      }
      if (parsed.engine === "terraform" && !isDeployEnabled(parsed.provider, parsed.resourceType)) {
        setSubmitNote(
          `Deploys are off for ${parsed.provider ?? "aws"}.${parsed.resourceType}. Enable it in src/config/featureFlags.ts.`,
        );
        return;
      }
      if (parsed.engine === "kubernetes") {
        setSubmitNote("Kubernetes apply is not implemented yet (API returns 501). Use terraform for infrastructure.");
        return;
      }

      setSubmitMode(mode);
      const result = await createDeployment.mutateAsync({ ...parsed, mode });
      setWatchingId(result.id);
      setSubmitNote(
        `${mode === "plan" ? "Plan" : "Apply"} started: ${result.id} · infra ${result.infrastructureId.slice(0, 8)}…`,
      );
      setShowCreateModal(false);
    } catch (err) {
      setSubmitNote(err instanceof Error ? err.message : "Deploy request failed.");
    }
  };

  return (
    <AppShell activeTab="deployments">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Deployments</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Desired-state JSON → plan (preview) → apply (converge) → destroy.
            </p>
          </div>
          <button
            onClick={() => openCreate()}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Deployment
          </button>
        </div>

        {submitNote && (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            {submitNote}
          </div>
        )}

        {watchingId && (
          <DeploymentLiveLogs
            deploymentId={watchingId}
            title="Live CLI / Terraform output"
          />
        )}

        {liveError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {liveError instanceof Error ? liveError.message : "Failed to load deployments"}
          </div>
        )}

        {/* Engine */}
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

        {/* Category / kind tabs */}
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
            {categoryTargets.map((target) => (
              <button
                key={targetKey(target)}
                onClick={() => openCreate(target)}
                className={`text-left rounded-lg border px-3 py-3 transition-colors hover:bg-secondary/60 ${
                  activeTarget && targetKey(activeTarget) === targetKey(target)
                    ? "border-primary/40 bg-secondary/40"
                    : "border-border bg-card"
                }`}
              >
                <div className="text-sm font-medium text-foreground">{target.label}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1">
                  {target.provider}.{target.resourceType}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              {engine === "terraform"
                ? TERRAFORM_CATEGORIES.find((c) => c.id === tfCategory)?.label
                : KUBERNETES_KINDS.find((k) => k.id === k8sKind)?.label}
            </h2>
            <span className="text-xs text-muted-foreground">
              {liveLoading ? "loading…" : `${filtered.length} deployments`}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {"No deployments yet. Plan or apply to create infrastructure from JSON."}
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
                      if (dep.infrastructureId) {
                        navigate(`/infrastructure/${dep.infrastructureId}`);
                      }
                    }}
                    className="flex items-center px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors"
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
                          <span className="text-xs text-muted-foreground font-mono">{dep.moduleOrKind}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{dep.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">{dep.provider}</span>
                      <span className="text-xs text-muted-foreground">{dep.environment}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{dep.createdAt}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                New {engine === "terraform" ? "infrastructure" : "workload"} deployment
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Configuration (JSON)</label>
                <textarea
                  value={createJson}
                  onChange={(e) => setCreateJson(e.target.value)}
                  className="w-full h-[320px] bg-background border border-border rounded-md p-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  spellCheck={false}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {engine === "terraform"
                  ? "Plan previews create/change/destroy. Apply converges desired state to the cloud."
                  : "Kubernetes apply is not implemented yet."}
              </p>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeploy("plan")}
                disabled={createDeployment.isPending}
                className="px-3 py-1.5 text-sm border border-border text-foreground rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Plan
              </button>
              <button
                onClick={() => void handleDeploy("apply")}
                disabled={createDeployment.isPending}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createDeployment.isPending && submitMode === "apply" ? "Applying…" : "Apply"}
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
};

export default DeploymentsPage;
