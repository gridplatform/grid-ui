import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import {
  Activity, Server, Shield, Clock, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Zap, GitBranch, ChevronRight, CheckCircle2, XCircle,
  Cpu, Database, Cloud, Network, Monitor, Loader2,
} from "lucide-react";
import { mockResources } from "./InfrastructurePage";
import { generateMetrics, MiniChart } from "./MonitoringPage";
import { productFlags } from "@/config/features";

// ─── Derived executive data ──────────────────────────────────────────────────

const recentChanges = [
  { id: "ch-1", type: "release" as const, title: "api-gateway v2.4.1 → Production", status: "success" as const, time: "12m ago", by: "alice@grid.io" },
  { id: "ch-2", type: "infrastructure" as const, title: "Scaled worker-node-01 to 8 vCPU", status: "success" as const, time: "28m ago", by: "bob@grid.io" },
  { id: "ch-3", type: "alert" as const, title: "High CPU threshold changed 90% → 85%", status: "pending" as const, time: "35m ago", by: "alice@grid.io" },
  { id: "ch-4", type: "release" as const, title: "auth-service v3.0.0 → Staging", status: "running" as const, time: "1h ago", by: "david@grid.io" },
  { id: "ch-5", type: "release" as const, title: "eks-staging cluster provisioning", status: "failed" as const, time: "4h ago", by: "alice@grid.io" },
];

const changeTypeIcons: Record<string, React.ElementType> = {
  release: GitBranch, infrastructure: Server, alert: AlertTriangle,
};

const changeStatusConfig: Record<string, { label: string; style: string; icon: React.ElementType }> = {
  success: { label: "Done", style: "bg-success/10 text-success", icon: CheckCircle2 },
  running: { label: "Running", style: "bg-info/10 text-info", icon: Loader2 },
  pending: { label: "Pending", style: "bg-warning/10 text-warning", icon: Clock },
  failed: { label: "Failed", style: "bg-destructive/10 text-destructive", icon: XCircle },
};

const apmServices = [
  { name: "api-gateway", requests: "12.4k", errorRate: 0.2, p99: 320, trend: "stable" as const },
  { name: "auth-service", requests: "3.2k", errorRate: 4.1, p99: 1800, trend: "up" as const },
  { name: "worker-processor", requests: "890", errorRate: 2.8, p99: 9200, trend: "up" as const },
  { name: "websocket-service", requests: "5.6k", errorRate: 0.1, p99: 45, trend: "down" as const },
];

const topologySnapshot = {
  totalNodes: 42,
  healthyNodes: 38,
  degradedNodes: 3,
  errorNodes: 1,
  connections: 67,
};

// ─── Component ───────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const navigate = useNavigate();

  const infraSummary = useMemo(() => {
    const total = mockResources.filter(r => !r.cluster).length; // top-level only
    const running = mockResources.filter(r => r.status === "running").length;
    const errors = mockResources.filter(r => r.status === "error").length;
    const degraded = mockResources.filter(r => r.status === "degraded").length;
    return { total, running, errors, degraded, healthy: total - errors - degraded };
  }, []);

  const monitoringAlerts = useMemo(() => {
    return mockResources
      .filter(r => r.status === "error" || r.status === "degraded")
      .slice(0, 4)
      .map(r => ({
        ...r,
        metrics: generateMetrics(r),
      }));
  }, []);

  const stats = [
    { label: "Infrastructure", value: `${infraSummary.total}`, sub: `${infraSummary.running} running`, icon: Server, color: "text-primary" },
    { label: "Active Alerts", value: `${infraSummary.errors + infraSummary.degraded}`, sub: `${infraSummary.errors} critical`, icon: AlertTriangle, color: infraSummary.errors > 0 ? "text-destructive" : "text-warning" },
    { label: "Avg P99 Latency", value: "320ms", sub: "api-gateway", icon: Zap, color: "text-warning" },
    { label: "Error Rate", value: "1.8%", sub: "across all services", icon: Activity, color: "text-success" },
    { label: "Uptime (30d)", value: "99.97%", sub: "+0.02% vs prior", icon: Shield, color: "text-success" },
    { label: "Git Sync", value: "Synced", sub: "2 min ago", icon: GitBranch, color: "text-primary" },
  ];

  return (
    <AppShell activeTab="overview">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">

        {/* ── KPI Strip ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="p-3.5 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <p className="text-xl font-semibold text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Recent Changes (left 3 cols) ─────────────────────────── */}
          <div className={`${productFlags.topology ? "lg:col-span-3" : "lg:col-span-5"} rounded-lg border border-border bg-card overflow-hidden`}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Recent Changes</h2>
              <span className="text-[10px] text-muted-foreground">Last synced changes from git</span>
            </div>
            <div className="divide-y divide-border">
              {recentChanges.map((ch) => {
                const TypeIcon = changeTypeIcons[ch.type];
                const sc = changeStatusConfig[ch.status];
                const StatusIcon = sc.icon;
                return (
                  <div key={ch.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                    <TypeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{ch.title}</p>
                      <p className="text-[10px] text-muted-foreground">{ch.by}</p>
                    </div>
                    <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${sc.style.split(" ")[1]} ${ch.status === "running" ? "animate-spin" : ""}`} />
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${sc.style}`}>{sc.label}</span>
                    <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">{ch.time}</span>
                  </div>
                );
              })}
            </div>
            {productFlags.releases && (
            <button
              onClick={() => navigate("/releases")}
              className="w-full px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground border-t border-border hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1"
            >
              View all releases <ChevronRight className="w-3 h-3" />
            </button>
            )}
          </div>

          {/* ── Topology Snapshot (right 2 cols) ─────────────────────── */}
          {productFlags.topology && (
          <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Topology</h2>
              <button onClick={() => navigate("/topology")} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                Open map <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Donut-style summary */}
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--success))" strokeWidth="3"
                      strokeDasharray={`${(topologySnapshot.healthyNodes / topologySnapshot.totalNodes) * 100} 100`} strokeLinecap="round" />
                    {topologySnapshot.degradedNodes > 0 && (
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--warning))" strokeWidth="3"
                        strokeDasharray={`${(topologySnapshot.degradedNodes / topologySnapshot.totalNodes) * 100} 100`}
                        strokeDashoffset={`-${(topologySnapshot.healthyNodes / topologySnapshot.totalNodes) * 100}`} strokeLinecap="round" />
                    )}
                    {topologySnapshot.errorNodes > 0 && (
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--destructive))" strokeWidth="3"
                        strokeDasharray={`${(topologySnapshot.errorNodes / topologySnapshot.totalNodes) * 100} 100`}
                        strokeDashoffset={`-${((topologySnapshot.healthyNodes + topologySnapshot.degradedNodes) / topologySnapshot.totalNodes) * 100}`} strokeLinecap="round" />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{topologySnapshot.totalNodes}</span>
                    <span className="text-[9px] text-muted-foreground">nodes</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success" /><span className="text-muted-foreground">{topologySnapshot.healthyNodes} Healthy</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-warning" /><span className="text-muted-foreground">{topologySnapshot.degradedNodes} Degraded</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-destructive" /><span className="text-muted-foreground">{topologySnapshot.errorNodes} Critical</span></div>
                  <div className="flex items-center gap-2"><span className="w-1.5 h-px bg-muted-foreground" /><span className="text-muted-foreground">{topologySnapshot.connections} connections</span></div>
                </div>
              </div>

              {/* Layer breakdown */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Compute", icon: Monitor, count: 8 },
                  { label: "K8s", icon: Cloud, count: 18 },
                  { label: "Data", icon: Database, count: 9 },
                  { label: "Network", icon: Network, count: 7 },
                ].map((l) => (
                  <div key={l.label} className="text-center p-2 rounded-md bg-secondary/50">
                    <l.icon className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-semibold text-foreground">{l.count}</p>
                    <p className="text-[9px] text-muted-foreground">{l.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        {(productFlags.monitoring || productFlags.apm) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Monitoring Alerts ─────────────────────────────────────── */}
          {productFlags.monitoring && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Monitoring Alerts
                {monitoringAlerts.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{monitoringAlerts.length}</span>
                )}
              </h2>
              <button onClick={() => navigate("/monitoring")} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {monitoringAlerts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">All systems operating normally.</div>
            ) : (
              <div className="divide-y divide-border">
                {monitoringAlerts.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/monitoring/${r.id}`)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${r.status === "error" ? "bg-destructive" : "bg-warning"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.region} · {r.provider}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${r.metrics.cpuCurrent > 80 ? "text-destructive" : "text-warning"}`}>{r.metrics.cpuCurrent}%</p>
                        <p className="text-[9px] text-muted-foreground">CPU</p>
                      </div>
                      <MiniChart data={r.metrics.cpu} color={r.status === "error" ? "bg-destructive" : "bg-warning"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* ── APM Service Health ────────────────────────────────────── */}
          {productFlags.apm && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Service Performance</h2>
              <button onClick={() => navigate("/apm")} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                Open APM <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="px-4 py-2 grid grid-cols-[1fr_60px_70px_70px_50px] gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
              <span>Service</span><span className="text-right">Reqs</span><span className="text-right">Error %</span><span className="text-right">P99</span><span className="text-right">Trend</span>
            </div>
            <div className="divide-y divide-border">
              {apmServices.map((svc) => {
                const errColor = svc.errorRate > 3 ? "text-destructive" : svc.errorRate > 1 ? "text-warning" : "text-success";
                const p99Color = svc.p99 > 1000 ? "text-destructive" : svc.p99 > 200 ? "text-warning" : "text-success";
                return (
                  <div key={svc.name} className="px-4 py-2.5 grid grid-cols-[1fr_60px_70px_70px_50px] gap-2 items-center hover:bg-secondary/30 transition-colors">
                    <span className="text-sm text-foreground font-medium truncate">{svc.name}</span>
                    <span className="text-xs text-muted-foreground text-right">{svc.requests}</span>
                    <span className={`text-xs font-medium text-right ${errColor}`}>{svc.errorRate}%</span>
                    <span className={`text-xs font-medium text-right ${p99Color}`}>{svc.p99 < 1000 ? `${svc.p99}ms` : `${(svc.p99 / 1000).toFixed(1)}s`}</span>
                    <span className="text-right">
                      {svc.trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5 text-destructive inline" /> :
                       svc.trend === "down" ? <ArrowDownRight className="w-3.5 h-3.5 text-success inline" /> :
                       <span className="text-[10px] text-muted-foreground">—</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
        )}

        {/* ── Infrastructure at a Glance ──────────────────────────────── */}
        {productFlags.infrastructure && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Infrastructure Overview</h2>
            <button onClick={() => navigate("/infrastructure")} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-border">
            {[
              { label: "VMs", icon: Monitor, count: mockResources.filter(r => r.type === "single-vm").length, status: "running" },
              { label: "VM Clusters", icon: Server, count: mockResources.filter(r => r.type === "vm-cluster").length, status: "running" },
              { label: "Kubernetes", icon: Cloud, count: mockResources.filter(r => r.type === "kubernetes" || r.type.startsWith("k8s")).length, status: mockResources.some(r => r.type.startsWith("k8s") && r.status === "error") ? "error" : "running" },
              { label: "Networks", icon: Network, count: mockResources.filter(r => r.type === "network").length, status: "running" },
              { label: "Managed Services", icon: Database, count: mockResources.filter(r => r.type === "managed-service").length, status: "running" },
            ].map((cat) => (
              <div key={cat.label} className="p-4 text-center hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => navigate("/infrastructure")}>
                <cat.icon className={`w-5 h-5 mx-auto mb-2 ${cat.status === "error" ? "text-destructive" : "text-muted-foreground"}`} />
                <p className="text-lg font-semibold text-foreground">{cat.count}</p>
                <p className="text-[10px] text-muted-foreground">{cat.label}</p>
                {cat.status === "error" && (
                  <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] text-destructive">
                    <AlertTriangle className="w-2.5 h-2.5" /> issue
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </AppShell>
  );
};

export default DashboardPage;
