import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import {
  Activity, Cpu, HardDrive, Server, Cloud, Database, Network, BarChart3,
  Monitor, Globe, Box, Timer, Layers, Shield, Container, ChevronRight,
  AlertTriangle, Brain, X, Loader2,
} from "lucide-react";
import { mockResources, type Resource, type ResourceType } from "./InfrastructurePage";
import TimeRangePicker, { timeRanges, type TimeRange } from "@/components/TimeRangePicker";

// ─── Mock metrics ────────────────────────────────────────────────────────────

export const generateMetrics = (resource: Resource) => {
  const seed = resource.id.charCodeAt(resource.id.length - 1);
  const cpuBase = resource.status === "error" ? 92 : resource.status === "degraded" ? 78 : 30 + (seed % 40);
  const memBase = resource.status === "error" ? 88 : resource.status === "degraded" ? 75 : 25 + (seed % 45);
  const storBase = 20 + (seed % 50);

  return {
    cpu: Array.from({ length: 12 }, (_, i) => ({ time: `${23 - i}:00`, value: Math.min(100, Math.max(5, cpuBase + Math.sin(i) * 15)) })).reverse(),
    memory: Array.from({ length: 12 }, (_, i) => ({ time: `${23 - i}:00`, value: Math.min(100, Math.max(5, memBase + Math.cos(i) * 10)) })).reverse(),
    storage: storBase,
    cpuCurrent: cpuBase,
    memCurrent: memBase,
  };
};

export const typeIcons: Record<ResourceType, React.ElementType> = {
  "single-vm": Monitor, "vm-cluster": Server, kubernetes: Cloud, network: Network, "managed-service": Database,
  "k8s-ingress": Globe, "k8s-deployment": Box, "k8s-service": Layers, "k8s-cronjob": Timer,
  "k8s-statefulset": Container, "k8s-daemonset": Shield, "k8s-storage": HardDrive,
  "gpu-node": Cpu, "gpu-pool": Cpu,
};

// ─── AI Mock ─────────────────────────────────────────────────────────────────

const mockAiDiagnose = (resource: Resource): string => {
  if (resource.status === "error") {
    return `**Root cause analysis for ${resource.name}:**\n\n` +
      `• High CPU utilization (${generateMetrics(resource).cpuCurrent}%) indicates resource exhaustion.\n` +
      `• Memory pressure at ${generateMetrics(resource).memCurrent}% — possible memory leak in application process.\n` +
      `• Recommendation: Scale horizontally or increase resource limits. Check application logs for OOM events.\n` +
      `• Suggested: Review recent deployments for regression. Consider rolling back to last stable version.`;
  }
  if (resource.status === "degraded") {
    return `**Performance analysis for ${resource.name}:**\n\n` +
      `• CPU trending above normal thresholds (${generateMetrics(resource).cpuCurrent}%).\n` +
      `• Memory utilization elevated at ${generateMetrics(resource).memCurrent}% — approaching warning threshold.\n` +
      `• Pattern suggests gradual resource consumption increase over the past 6 hours.\n` +
      `• Recommendation: Monitor for the next hour; if trend continues, preemptively scale resources.`;
  }
  return `**${resource.name} is healthy.** All metrics within normal operating range.`;
};

// ─── Mini bar chart ──────────────────────────────────────────────────────────

export const MiniChart = ({ data, color }: { data: { time: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((d, i) => (
        <div
          key={i}
          className={`w-2 rounded-t-sm ${color}`}
          style={{ height: `${(d.value / max) * 100}%`, opacity: 0.4 + (d.value / max) * 0.6 }}
          title={`${d.time}: ${d.value.toFixed(0)}%`}
        />
      ))}
    </div>
  );
};

// ─── Gauge ───────────────────────────────────────────────────────────────────

export const Gauge = ({ value, label }: { value: number; label: string }) => {
  const level = value > 80 ? "text-destructive" : value > 60 ? "text-warning" : "text-success";
  return (
    <div className="text-center">
      <p className={`text-xl font-semibold ${level}`}>{value.toFixed(0)}%</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
};

// ─── Aggregate resource entry ────────────────────────────────────────────────

interface AggregateResource {
  id: string;
  name: string;
  type: "single-vm" | "vm-cluster" | "k8s-cluster" | "network" | "managed-service";
  status: string;
  environment: string;
  provider: string;
  region: string;
  cpu: number;
  mem: number;
  storage: number;
  hasIssue: boolean;
  childCount?: number;
  originalResources: Resource[];
}

// ─── Component ───────────────────────────────────────────────────────────────

const MonitoringPage = () => {
  const navigate = useNavigate();
  const [envFilter, setEnvFilter] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>(timeRanges.find(t => t.value === "12h")!);
  const [aiPanelId, setAiPanelId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const aggregateResources = useMemo(() => {
    const result: AggregateResource[] = [];
    const clusterMap = new Map<string, Resource[]>();
    mockResources.forEach((r) => {
      if (r.cluster) {
        const arr = clusterMap.get(r.cluster) || [];
        arr.push(r);
        clusterMap.set(r.cluster, arr);
      }
    });
    clusterMap.forEach((children, clusterName) => {
      const worstStatus = children.some(c => c.status === "error") ? "error"
        : children.some(c => c.status === "degraded") ? "degraded" : "running";
      const avgCpu = children.reduce((s, c) => s + generateMetrics(c).cpuCurrent, 0) / children.length;
      const avgMem = children.reduce((s, c) => s + generateMetrics(c).memCurrent, 0) / children.length;
      const avgStor = children.reduce((s, c) => s + generateMetrics(c).storage, 0) / children.length;
      result.push({
        id: `cluster-${clusterName}`, name: clusterName, type: "k8s-cluster", status: worstStatus,
        environment: children[0].environment, provider: children[0].provider, region: children[0].region,
        cpu: avgCpu, mem: avgMem, storage: avgStor,
        hasIssue: worstStatus === "error" || worstStatus === "degraded",
        childCount: children.length, originalResources: children,
      });
    });
    mockResources.filter(r => r.type === "vm-cluster").forEach((r) => {
      const m = generateMetrics(r);
      result.push({
        id: r.id, name: r.name, type: "vm-cluster", status: r.status,
        environment: r.environment, provider: r.provider, region: r.region,
        cpu: m.cpuCurrent, mem: m.memCurrent, storage: m.storage,
        hasIssue: r.status === "error" || r.status === "degraded",
        childCount: r.config?.node_count || 3, originalResources: [r],
      });
    });
    mockResources.filter(r => !r.cluster && r.type !== "vm-cluster" && r.type !== "network").forEach((r) => {
      const m = generateMetrics(r);
      result.push({
        id: r.id, name: r.name,
        type: r.type === "managed-service" ? "managed-service" : "single-vm",
        status: r.status, environment: r.environment, provider: r.provider, region: r.region,
        cpu: m.cpuCurrent, mem: m.memCurrent, storage: m.storage,
        hasIssue: r.status === "error" || r.status === "degraded", originalResources: [r],
      });
    });
    mockResources.filter(r => r.type === "network").forEach((r) => {
      result.push({
        id: r.id, name: r.name, type: "network", status: r.status,
        environment: r.environment, provider: r.provider, region: r.region,
        cpu: 0, mem: 0, storage: 0,
        hasIssue: r.status === "error" || r.status === "degraded", originalResources: [r],
      });
    });
    return result;
  }, []);

  const filtered = aggregateResources.filter((r) => !envFilter || r.environment === envFilter);
  const monitoredCount = filtered.filter(r => r.type !== "network").length;
  const alertCount = filtered.filter(r => r.hasIssue).length;
  const avgCpu = filtered.filter(r => r.type !== "network").reduce((s, r) => s + r.cpu, 0) / (monitoredCount || 1);
  const avgMem = filtered.filter(r => r.type !== "network").reduce((s, r) => s + r.mem, 0) / (monitoredCount || 1);

  const isCluster = (r: AggregateResource) => r.type === "k8s-cluster" || r.type === "vm-cluster";

  const handleAiDiagnose = (resource: AggregateResource) => {
    if (aiPanelId === resource.id) { setAiPanelId(null); setAiResult(null); return; }
    setAiPanelId(resource.id);
    setAiLoading(true);
    setAiResult(null);
    setTimeout(() => {
      const mainResource = resource.originalResources.find(r => r.status === "error" || r.status === "degraded") || resource.originalResources[0];
      setAiResult(mockAiDiagnose(mainResource));
      setAiLoading(false);
    }, 1200);
  };

  const typeIconMap: Record<string, React.ElementType> = {
    "single-vm": Monitor, "vm-cluster": Server, "k8s-cluster": Cloud, "network": Network, "managed-service": Database,
  };
  const typeLabel: Record<string, string> = {
    "single-vm": "Single VM", "vm-cluster": "VM Cluster", "k8s-cluster": "K8s Cluster", "network": "Network", "managed-service": "Managed Service",
  };
  const statusStyles: Record<string, string> = {
    running: "bg-success/10 text-success", stopped: "bg-muted text-muted-foreground",
    error: "bg-destructive/10 text-destructive", degraded: "bg-warning/10 text-warning",
  };

  return (
    <AppShell activeTab="monitoring">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Monitoring</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Infrastructure metrics — CPU, memory, disk, network. Stack: Prometheus · Grafana Alloy.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TimeRangePicker selected={timeRange} onChange={setTimeRange} />
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All environments</option>
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
            </select>
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-success" />
            </div>
            <div><p className="text-2xl font-semibold text-foreground">{monitoredCount}</p><p className="text-sm text-muted-foreground">Monitored</p></div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <div><p className="text-2xl font-semibold text-foreground">{avgCpu.toFixed(0)}%</p><p className="text-sm text-muted-foreground">Avg CPU</p></div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-info" />
            </div>
            <div><p className="text-2xl font-semibold text-foreground">{avgMem.toFixed(0)}%</p><p className="text-sm text-muted-foreground">Avg Memory</p></div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div><p className="text-2xl font-semibold text-foreground">{alertCount}</p><p className="text-sm text-muted-foreground">Issues</p></div>
          </div>
        </div>

        {/* Resource table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Resource Performance</h2>
          </div>
          <div className="grid grid-cols-[minmax(200px,2fr)_120px_90px_100px_80px_80px_80px_140px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
            <span>Resource</span><span>Type</span><span>Status</span><span>Environment</span>
            <span>CPU</span><span>Memory</span><span>Storage</span><span></span>
          </div>

          {filtered.map((resource) => {
            const TypeIcon = typeIconMap[resource.type] || Server;
            return (
              <div key={resource.id}>
                <div className={`grid grid-cols-[minmax(200px,2fr)_120px_90px_100px_80px_80px_80px_140px] gap-3 px-4 py-3 items-center border-b border-border transition-colors hover:bg-muted/30 ${resource.hasIssue ? "bg-destructive/5" : ""}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <TypeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{resource.name}</span>
                    {resource.childCount && (
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                        {resource.childCount} {resource.type === "k8s-cluster" ? "components" : "nodes"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{typeLabel[resource.type]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${statusStyles[resource.status]}`}>{resource.status}</span>
                  <span className="text-xs text-muted-foreground">{resource.environment}</span>
                  {resource.type !== "network" ? (
                    <>
                      <span className={`text-sm font-medium ${resource.cpu > 80 ? "text-destructive" : resource.cpu > 60 ? "text-warning" : "text-foreground"}`}>{resource.cpu.toFixed(0)}%</span>
                      <span className={`text-sm font-medium ${resource.mem > 80 ? "text-destructive" : resource.mem > 60 ? "text-warning" : "text-foreground"}`}>{resource.mem.toFixed(0)}%</span>
                      <span className="text-sm text-foreground">{resource.storage.toFixed(0)}%</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">—</span>
                      <span className="text-xs text-muted-foreground">—</span>
                      <span className="text-xs text-muted-foreground">—</span>
                    </>
                  )}
                  <div className="flex items-center gap-1">
                    {resource.hasIssue && (
                      <button onClick={() => handleAiDiagnose(resource)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${aiPanelId === resource.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
                        <Brain className="w-3 h-3" /> AI
                      </button>
                    )}
                    {isCluster(resource) && (
                      <button onClick={() => navigate(`/monitoring/${resource.id}`)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-secondary text-foreground hover:bg-accent transition-colors">
                        Drill down <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {aiPanelId === resource.id && (
                  <div className="px-4 py-3 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">AI Diagnosis</span>
                      </div>
                      <button onClick={() => { setAiPanelId(null); setAiResult(null); }} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {aiLoading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing resource metrics, logs, and events…
                      </div>
                    ) : (
                      <div className="text-xs text-foreground leading-relaxed whitespace-pre-line bg-card rounded-md p-3 border border-border">{aiResult}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default MonitoringPage;
