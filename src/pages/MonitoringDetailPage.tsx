import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import {
  ArrowLeft, Brain, X, Loader2, ChevronRight,
  Server, Cloud, Monitor, Database, Network, Globe, Box, Layers, Timer, Shield, Container, HardDrive, Cpu,
} from "lucide-react";
import { mockResources, type Resource, type ResourceType } from "./InfrastructurePage";
import { generateMetrics, MiniChart, Gauge } from "./MonitoringPage";
import TimeRangePicker, { timeRanges, type TimeRange } from "@/components/TimeRangePicker";

// ─── AI Mock ─────────────────────────────────────────────────────────────────

const mockAiDiagnose = (resource: Resource): string => {
  if (resource.status === "error") {
    return `**Root cause analysis for ${resource.name}:**\n\n` +
      `• High CPU utilization (${generateMetrics(resource).cpuCurrent}%) indicates resource exhaustion.\n` +
      `• Memory pressure at ${generateMetrics(resource).memCurrent}% — possible memory leak.\n` +
      `• Check pod logs for OOM kills or CrashLoopBackOff events.\n` +
      `• Recommendation: Increase resource limits or scale replicas. Review last deployment for regression.`;
  }
  if (resource.status === "degraded") {
    return `**Performance analysis for ${resource.name}:**\n\n` +
      `• CPU trending above thresholds at ${generateMetrics(resource).cpuCurrent}%.\n` +
      `• Memory elevated at ${generateMetrics(resource).memCurrent}%.\n` +
      `• Pattern: gradual increase over past 6 hours suggests slow resource leak.\n` +
      `• Recommendation: Monitor closely; preemptively scale if trend continues.`;
  }
  return `**${resource.name} is healthy.** All metrics within normal range.`;
};

const componentTypeIcons: Record<ResourceType, React.ElementType> = {
  "single-vm": Monitor, "vm-cluster": Server, kubernetes: Cloud, network: Network, "managed-service": Database,
  "k8s-ingress": Globe, "k8s-deployment": Box, "k8s-service": Layers, "k8s-cronjob": Timer,
  "k8s-statefulset": Container, "k8s-daemonset": Shield, "k8s-storage": HardDrive,
  "gpu-node": Cpu, "gpu-pool": Cpu,
};

const typeLabels: Record<ResourceType, string> = {
  "single-vm": "VM", "vm-cluster": "VM Cluster", kubernetes: "K8s", network: "Network", "managed-service": "Managed",
  "k8s-ingress": "Ingress", "k8s-deployment": "Deployment", "k8s-service": "Service", "k8s-cronjob": "CronJob",
  "k8s-statefulset": "StatefulSet", "k8s-daemonset": "DaemonSet", "k8s-storage": "Node Pool",
  "gpu-node": "GPU Node", "gpu-pool": "GPU Pool",
};

// ─── Mock VM cluster nodes ───────────────────────────────────────────────────

const generateVmClusterNodes = (parent: Resource): Resource[] => {
  const nodeCount = parent.config?.node_count || 3;
  return Array.from({ length: nodeCount }, (_, i) => ({
    id: `${parent.id}-node-${i}`,
    name: `${parent.name}-node-${i + 1}`,
    type: "single-vm" as ResourceType,
    status: i === 0 && parent.status !== "running" ? parent.status : "running",
    region: parent.region,
    ip: `10.0.${10 + i}.${i + 1}`,
    cpu: parent.cpu,
    memory: parent.memory,
    environment: parent.environment,
    provider: parent.provider,
    connections: [],
    config: { ...parent.config, node_index: i },
  }));
};

// ─── Component ───────────────────────────────────────────────────────────────

const MonitoringDetailPage = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>(timeRanges.find(t => t.value === "12h")!);
  const [aiPanelId, setAiPanelId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Determine cluster type and children
  const isK8sCluster = resourceId?.startsWith("cluster-");
  const clusterName = isK8sCluster ? resourceId?.replace("cluster-", "") : null;

  const { title, children } = useMemo(() => {
    if (isK8sCluster && clusterName) {
      const kids = mockResources.filter(r => r.cluster === clusterName);
      return { title: clusterName, children: kids };
    }
    // VM cluster
    const vmCluster = mockResources.find(r => r.id === resourceId);
    if (vmCluster && vmCluster.type === "vm-cluster") {
      return { title: vmCluster.name, children: generateVmClusterNodes(vmCluster) };
    }
    return { title: "Unknown", children: [] };
  }, [resourceId, isK8sCluster, clusterName]);

  const handleAiDiagnose = (resource: Resource) => {
    if (aiPanelId === resource.id) {
      setAiPanelId(null);
      setAiResult(null);
      return;
    }
    setAiPanelId(resource.id);
    setAiLoading(true);
    setAiResult(null);
    setTimeout(() => {
      setAiResult(mockAiDiagnose(resource));
      setAiLoading(false);
    }, 1200);
  };

  const statusStyles: Record<string, string> = {
    running: "bg-success/10 text-success",
    stopped: "bg-muted text-muted-foreground",
    error: "bg-destructive/10 text-destructive",
    degraded: "bg-warning/10 text-warning",
  };

  return (
    <AppShell activeTab="monitoring">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/monitoring")}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {isK8sCluster ? <Cloud className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                {title}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isK8sCluster
                  ? `${children.length} components in this Kubernetes cluster`
                  : `${children.length} nodes in this cluster`}
              </p>
            </div>
          </div>
          <TimeRangePicker selected={timeRange} onChange={setTimeRange} />
        </div>

        {/* Per-component cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {children.map((resource) => {
            const metrics = generateMetrics(resource);
            const TypeIcon = componentTypeIcons[resource.type] || Server;
            const hasIssue = resource.status === "error" || resource.status === "degraded";

            return (
              <div key={resource.id} className="space-y-0">
                <div
                  className={`rounded-lg border p-4 transition-colors ${
                    hasIssue ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground truncate">{resource.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto ${statusStyles[resource.status]}`}>
                      {resource.status}
                    </span>
                  </div>

                  {isK8sCluster && (
                    <p className="text-[10px] text-muted-foreground mb-3">{typeLabels[resource.type]}</p>
                  )}

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Gauge value={metrics.cpuCurrent} label="CPU" />
                    <Gauge value={metrics.memCurrent} label="Memory" />
                    <Gauge value={metrics.storage} label="Storage" />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">CPU ({timeRange.label.replace("Last ", "")})</p>
                      <MiniChart data={metrics.cpu} color="bg-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Memory ({timeRange.label.replace("Last ", "")})</p>
                      <MiniChart data={metrics.memory} color="bg-info" />
                    </div>
                  </div>

                  {hasIssue && (
                    <button
                      onClick={() => handleAiDiagnose(resource)}
                      className={`mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
                        aiPanelId === resource.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      {aiPanelId === resource.id ? "Hide AI Diagnosis" : "Diagnose with AI"}
                    </button>
                  )}

                  <div className="mt-2">
                    <button
                      onClick={() => navigate(`/infrastructure/${resource.id}`)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Inspect in Infrastructure <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* AI panel below card */}
                {aiPanelId === resource.id && (
                  <div className="rounded-b-lg border border-t-0 border-border bg-muted/20 p-3">
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
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing metrics, logs, and events…
                      </div>
                    ) : (
                      <div className="text-xs text-foreground leading-relaxed whitespace-pre-line bg-card rounded-md p-3 border border-border">
                        {aiResult}
                      </div>
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

export default MonitoringDetailPage;
