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

type DeploymentStatus = "queued" | "planning" | "running" | "success" | "failed";

interface DeploymentRow {
  id: string;
  name: string;
  engine: DeployEngine;
  category: string;
  provider: string;
  moduleOrKind: string;
  environment: string;
  status: DeploymentStatus;
  createdBy: string;
  createdAt: string;
  details: string;
}

const statusConfig: Record<DeploymentStatus, { label: string; color: string; icon: React.ElementType }> = {
  queued: { label: "Queued", color: "bg-muted text-muted-foreground", icon: Clock },
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

const mockDeployments: DeploymentRow[] = [
  {
    id: "dep-010",
    name: "bastion-host",
    engine: "terraform",
    category: "compute",
    provider: "aws",
    moduleOrKind: "ec2-instance",
    environment: "production",
    status: "success",
    createdBy: "admin@grid.io",
    createdAt: "6h ago",
    details: "Bastion host, t3.medium",
  },
  {
    id: "dep-002",
    name: "gke-platform",
    engine: "terraform",
    category: "kubernetes-cluster",
    provider: "gcp",
    moduleOrKind: "kubernetes-engine",
    environment: "production",
    status: "running",
    createdBy: "alice@grid.io",
    createdAt: "15m ago",
    details: "GKE · 1.30 · 3 node pools · us-central1",
  },
  {
    id: "dep-030",
    name: "eks-prod",
    engine: "terraform",
    category: "kubernetes-cluster",
    provider: "aws",
    moduleOrKind: "eks",
    environment: "production",
    status: "success",
    createdBy: "admin@grid.io",
    createdAt: "1d ago",
    details: "EKS · 1.30 · private · us-east-1",
  },
  {
    id: "dep-031",
    name: "aks-staging",
    engine: "terraform",
    category: "kubernetes-cluster",
    provider: "azure",
    moduleOrKind: "aks",
    environment: "staging",
    status: "success",
    createdBy: "bob@grid.io",
    createdAt: "2d ago",
    details: "AKS · 1.29 · eastus",
  },
  {
    id: "dep-032",
    name: "oke-apps",
    engine: "terraform",
    category: "kubernetes-cluster",
    provider: "oracle",
    moduleOrKind: "oke",
    environment: "production",
    status: "queued",
    createdBy: "alice@grid.io",
    createdAt: "8m ago",
    details: "OKE · us-ashburn-1",
  },
  {
    id: "dep-033",
    name: "rosa-shared",
    engine: "terraform",
    category: "kubernetes-cluster",
    provider: "openshift",
    moduleOrKind: "rosa-cluster",
    environment: "production",
    status: "planning",
    createdBy: "admin@grid.io",
    createdAt: "3m ago",
    details: "ROSA · us-east-1",
  },
  {
    id: "dep-003",
    name: "prod-vpc",
    engine: "terraform",
    category: "network",
    provider: "aws",
    moduleOrKind: "vpc",
    environment: "production",
    status: "success",
    createdBy: "admin@grid.io",
    createdAt: "2d ago",
    details: "VPC with 6 subnets, NAT, security groups",
  },
  {
    id: "dep-004",
    name: "postgres-primary",
    engine: "terraform",
    category: "database",
    provider: "aws",
    moduleOrKind: "rds",
    environment: "production",
    status: "success",
    createdBy: "admin@grid.io",
    createdAt: "3d ago",
    details: "RDS PostgreSQL 15, Multi-AZ",
  },
  {
    id: "dep-020",
    name: "payments-api",
    engine: "kubernetes",
    category: "workload",
    provider: "gke-platform",
    moduleOrKind: "workload",
    environment: "production",
    status: "success",
    createdBy: "jamie@grid.io",
    createdAt: "1h ago",
    details: "App on cluster gke-platform",
  },
  {
    id: "dep-021",
    name: "ingress-nginx",
    engine: "kubernetes",
    category: "helm-release",
    provider: "gke-platform",
    moduleOrKind: "helm-release",
    environment: "production",
    status: "running",
    createdBy: "alice@grid.io",
    createdAt: "20m ago",
    details: "Helm chart on gke-platform",
  },
  {
    id: "dep-022",
    name: "nightly-etl",
    engine: "kubernetes",
    category: "cronjob",
    provider: "eks-staging",
    moduleOrKind: "cronjob",
    environment: "staging",
    status: "queued",
    createdBy: "bob@grid.io",
    createdAt: "5m ago",
    details: "CronJob 0 2 * * *",
  },
];

const k8sTemplates: Record<KubernetesWorkloadKind, string> = {
  workload: JSON.stringify(
    {
      name: "payments-api",
      engine: "kubernetes",
      resourceType: "workload",
      environment: "production",
      config: {
        cluster: "gke-platform",
        namespace: "payments",
        image: "ghcr.io/acme/payments-api:1.4.0",
        replicas: 3,
        service: { port: 80, targetPort: 8080 },
        ingress: { host: "payments.example.com" },
      },
    } satisfies GridDeployRequest,
    null,
    2,
  ),
  "helm-release": JSON.stringify(
    {
      name: "ingress-nginx",
      engine: "kubernetes",
      resourceType: "helm-release",
      environment: "production",
      config: {
        cluster: "gke-platform",
        namespace: "ingress-nginx",
        chart: "ingress-nginx",
        repo: "https://kubernetes.github.io/ingress-nginx",
        version: "4.11.0",
        values: {},
      },
    } satisfies GridDeployRequest,
    null,
    2,
  ),
  kustomize: JSON.stringify(
    {
      name: "payments-overlay",
      engine: "kubernetes",
      resourceType: "kustomize",
      environment: "staging",
      config: {
        cluster: "eks-staging",
        path: "overlays/staging",
      },
    } satisfies GridDeployRequest,
    null,
    2,
  ),
  cronjob: JSON.stringify(
    {
      name: "nightly-etl",
      engine: "kubernetes",
      resourceType: "cronjob",
      environment: "staging",
      config: {
        cluster: "eks-staging",
        namespace: "batch",
        schedule: "0 2 * * *",
        image: "ghcr.io/acme/etl:2.0.0",
      },
    } satisfies GridDeployRequest,
    null,
    2,
  ),
  job: JSON.stringify(
    {
      name: "migrate-db",
      engine: "kubernetes",
      resourceType: "job",
      environment: "staging",
      config: {
        cluster: "eks-staging",
        namespace: "payments",
        image: "ghcr.io/acme/migrate:1.0.0",
      },
    } satisfies GridDeployRequest,
    null,
    2,
  ),
  config: JSON.stringify(
    {
      name: "payments-config",
      engine: "kubernetes",
      resourceType: "config",
      environment: "production",
      config: {
        cluster: "gke-platform",
        namespace: "payments",
        kind: "ConfigMap",
        data: { LOG_LEVEL: "info" },
      },
    } satisfies GridDeployRequest,
    null,
    2,
  ),
};

const targetKey = (target: TerraformTarget) => `${target.provider}.${target.resourceType}`;

const DeploymentsPage = () => {
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

  // Only provider x resource type pairs that are switched on can be picked.
  const categoryTargets = useMemo(() => enabledTargetsForCategory(tfCategory), [tfCategory]);
  const clusterTargets = useMemo(() => enabledClusterTargets(), []);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const activeTarget =
    categoryTargets.find((t) => targetKey(t) === selectedTarget) ?? categoryTargets[0] ?? null;

  const filtered = mockDeployments.filter((d) => {
    if (d.engine === "terraform" && !isDeployEnabled(d.provider, d.moduleOrKind)) return false;
    if (d.engine !== engine) return false;
    if (engine === "terraform") return d.category === tfCategory;
    return d.category === k8sKind;
  });

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

  const handleDeploy = () => {
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
      // CLI / API injection point — replace with useCreateDeployment when backend is live.
      setSubmitNote(
        `Queued for Grid CLI (${parsed.engine}): ${parsed.name} · ${parsed.resourceType}. Wire POST /api/v1/deployments next.`,
      );
      setShowCreateModal(false);
    } catch {
      setSubmitNote("Invalid JSON — fix the configuration before deploying.");
    }
  };

  return (
    <AppShell activeTab="deployments">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Deployments</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Deploy infrastructure across clouds from one place.
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
            <span className="text-xs text-muted-foreground">{filtered.length} deployments</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No deployments in this category yet. Create one to send JSON to the Grid CLI backend.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((dep) => {
                const sc = statusConfig[dep.status];
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={dep.id}
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
                  ? "Grid CLI will generate and apply Terraform from the module bank."
                  : "Applies into a cluster that already exists."}
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
                onClick={handleDeploy}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                Deploy
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
};

export default DeploymentsPage;
