import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import {
  Activity, Server, AlertTriangle, Zap, GitBranch, ChevronRight,
  Shield, Loader2,
} from "lucide-react";
import {
  useAlerts,
  useAPMServices,
  useDeployments,
  useEnvironments,
  useGitOpsStatus,
  useInfrastructures,
} from "@/hooks/useGridApi";
import { productFlags } from "@/config/features";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: infrastructures = [], isLoading: infraLoading } = useInfrastructures();
  const { data: alerts = [] } = useAlerts();
  const { data: services = [] } = useAPMServices();
  const { data: deployments = [] } = useDeployments();
  const { data: environments = [] } = useEnvironments();
  const { data: gitops } = useGitOpsStatus();

  const infraSummary = useMemo(() => {
    const total = infrastructures.length;
    const running = infrastructures.filter((r) => r.status === "running").length;
    const errors = infrastructures.filter((r) => r.status === "error").length;
    const degraded = infrastructures.filter((r) => r.status === "degraded").length;
    return { total, running, errors, degraded };
  }, [infrastructures]);

  const firingAlerts = alerts.filter((a) => a.status === "firing");
  const recentDeployments = [...deployments].slice(-5).reverse();
  const avgErrorRate =
    services.length > 0
      ? (services.reduce((s, svc) => s + svc.errorRate, 0) / services.length).toFixed(1)
      : "—";
  const avgP99 =
    services.length > 0
      ? `${Math.round(services.reduce((s, svc) => s + svc.p99, 0) / services.length)}ms`
      : "—";

  const stats = [
    {
      label: "Infrastructure",
      value: infraLoading ? "…" : `${infraSummary.total}`,
      sub: `${infraSummary.running} running`,
      icon: Server,
      color: "text-primary",
    },
    {
      label: "Active Alerts",
      value: `${firingAlerts.length}`,
      sub: `${infraSummary.errors} infra errors`,
      icon: AlertTriangle,
      color: firingAlerts.length > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      label: "Avg P99 Latency",
      value: avgP99,
      sub: services.length ? `${services.length} services` : "No APM data",
      icon: Zap,
      color: "text-muted-foreground",
    },
    {
      label: "Error Rate",
      value: services.length ? `${avgErrorRate}%` : "—",
      sub: "across APM services",
      icon: Activity,
      color: "text-muted-foreground",
    },
    {
      label: "Environments",
      value: `${environments.length}`,
      sub: `${environments.filter((e) => e.kind === "ephemeral").length} ephemeral`,
      icon: Shield,
      color: "text-primary",
    },
    {
      label: "Git Sync",
      value: gitops?.syncStatus || "—",
      sub: gitops?.lastSyncAt
        ? new Date(gitops.lastSyncAt).toLocaleString()
        : "No sync yet",
      icon: GitBranch,
      color: "text-primary",
    },
  ];

  return (
    <AppShell activeTab="overview">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="p-3.5 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <p className="text-xl font-semibold text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Recent deployments</h2>
              {productFlags.deployments && (
                <button
                  onClick={() => navigate("/deployments")}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            {recentDeployments.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No deployments yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentDeployments.map((d) => (
                  <button
                    key={d.id}
                    onClick={() =>
                      d.infrastructureId && navigate(`/infrastructure/${d.infrastructureId}`)
                    }
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {d.name || d.infrastructureId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.environment || "—"} · {d.mode || d.status}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {(d.status === "running" || d.status === "planning") && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      {d.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Active alerts</h2>
              {productFlags.alerts && (
                <button
                  onClick={() => navigate("/alerts")}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            {firingAlerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No firing alerts.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {firingAlerts.slice(0, 5).map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <p className="text-sm text-foreground">{a.ruleName}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
};

export default DashboardPage;
