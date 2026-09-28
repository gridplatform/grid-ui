import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import {
  ArrowLeft, Save, X, Sparkles, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Server, Cloud, Network, Database, Monitor, Globe,
  Box, Timer, Layers, Shield, Container, HardDrive, Cpu,
} from "lucide-react";
import { mockResources, type Resource, type ResourceType } from "./InfrastructurePage";

const typeIcons: Record<ResourceType, React.ElementType> = {
  "single-vm": Monitor, "vm-cluster": Server, kubernetes: Cloud, network: Network, "managed-service": Database,
  "k8s-ingress": Globe, "k8s-deployment": Box, "k8s-service": Layers, "k8s-cronjob": Timer,
  "k8s-statefulset": Container, "k8s-daemonset": Shield, "k8s-storage": HardDrive,
  "gpu-node": Cpu, "gpu-pool": Cpu,
};

const statusColors: Record<string, string> = {
  running: "bg-success/10 text-success",
  stopped: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
  degraded: "bg-warning/10 text-warning",
};

// ─── AI mock ─────────────────────────────────────────────────────────────────

interface AiAnalysis {
  issues: string[];
  suggestions: string[];
  suggestedChanges: string;
}

const mockAiAnalyze = (resource: Resource): AiAnalysis => {
  if (resource.status === "error") {
    return {
      issues: [
        `Resource ${resource.name} is in ERROR state.`,
        "Latest deployment failed with timeout waiting for state change.",
        "Disk I/O is critically high on additional volume /dev/sdf.",
      ],
      suggestions: [
        "Increase IOPS on /dev/sdf volume from current to 64000.",
        "Consider scaling to r5.8xlarge for additional headroom.",
        "Review security group rules — port 5432 is open to 0.0.0.0/0.",
      ],
      suggestedChanges: JSON.stringify({
        ...resource.config,
        instance_type: "r5.8xlarge",
        additional_volumes: [{ device_name: "/dev/sdf", volume_size: 1000, volume_type: "io2", iops: 64000 }],
      }, null, 2),
    };
  }
  if (resource.status === "degraded") {
    return {
      issues: [
        `Cluster ${resource.name} has degraded node pool.`,
        "2 of 3 nodes are NotReady due to resource pressure.",
      ],
      suggestions: [
        "Scale node pool 'default' from 3 to 5 nodes.",
        "Increase machine type to m5.2xlarge.",
        "Check pod resource limits — several pods are OOMKilled.",
      ],
      suggestedChanges: JSON.stringify({
        ...resource.config,
        node_pools: [{ name: "default", machine_type: "m5.2xlarge", count: 5 }],
      }, null, 2),
    };
  }
  return {
    issues: ["No critical issues detected."],
    suggestions: [
      "Consider enabling enhanced monitoring for better observability.",
      "Review cost optimization — instance may be over-provisioned.",
    ],
    suggestedChanges: JSON.stringify(resource.config, null, 2),
  };
};

// ─── Component ───────────────────────────────────────────────────────────────

const InfrastructureDetailPage = () => {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const resource = mockResources.find((r) => r.id === resourceId);

  const [activeTab, setActiveTab] = useState<"details" | "ai">("details");
  const [editMode, setEditMode] = useState(false);
  const [editedJson, setEditedJson] = useState("");

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysis | null>(null);
  const [aiEdited, setAiEdited] = useState("");
  const [aiApprovalStatus, setAiApprovalStatus] = useState<"pending" | "approved" | "rejected" | null>(null);

  if (!resource) {
    return (
      <AppShell activeTab="infrastructure">
        <div className="p-6 text-center text-muted-foreground">Resource not found.</div>
      </AppShell>
    );
  }

  const TypeIcon = typeIcons[resource.type];

  const startEdit = () => {
    setEditedJson(JSON.stringify(resource.config, null, 2));
    setEditMode(true);
  };

  const runAiAnalysis = () => {
    setAiLoading(true);
    setAiResult(null);
    setAiApprovalStatus(null);
    setTimeout(() => {
      const result = mockAiAnalyze(resource);
      setAiResult(result);
      setAiEdited(result.suggestedChanges);
      setAiLoading(false);
      setAiApprovalStatus("pending");
    }, 2000);
  };

  const hasIssue = resource.status === "error" || resource.status === "degraded";

  return (
    <AppShell activeTab="infrastructure">
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate("/infrastructure")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Infrastructure
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TypeIcon className="w-6 h-6 text-muted-foreground" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">{resource.name}</h1>
              <p className="text-sm text-muted-foreground">
                {resource.type} · {resource.region} · {resource.environment} · {resource.provider}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[resource.status]}`}>
              {resource.status}
            </span>
          </div>
          {hasIssue && (
            <button
              onClick={() => { setActiveTab("ai"); runAiAnalysis(); }}
              className="px-3 py-1.5 text-sm bg-warning text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Diagnose with AI
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border -mb-px">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "details" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "ai" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI
          </button>
        </div>

        {activeTab === "details" ? (
          /* ─── Details Tab ───────────────────────────────────────────── */
          <div className="space-y-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "ID", value: resource.id },
                { label: "IP", value: resource.ip },
                { label: "CPU", value: resource.cpu },
                { label: "Memory", value: resource.memory },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg border border-border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-sm text-foreground font-mono">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Connections */}
            {resource.connections.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-foreground mb-2">Connected Resources</h3>
                <div className="flex flex-wrap gap-2">
                  {resource.connections.map((cId) => {
                    const connected = mockResources.find((r) => r.id === cId);
                    return (
                      <button
                        key={cId}
                        onClick={() => navigate(`/infrastructure/${cId}`)}
                        className="text-xs px-2.5 py-1 rounded-md border border-border bg-secondary text-foreground hover:bg-accent transition-colors"
                      >
                        {connected ? connected.name : cId}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* JSON Config */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Configuration</h3>
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors">Cancel</button>
                    <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5" />Save
                    </button>
                  </div>
                ) : (
                  <button onClick={startEdit} className="px-3 py-1.5 text-sm text-foreground border border-border rounded-md hover:bg-secondary transition-colors">Edit</button>
                )}
              </div>
              {editMode ? (
                <textarea
                  value={editedJson}
                  onChange={(e) => setEditedJson(e.target.value)}
                  className="w-full h-[400px] bg-background border border-border rounded-md p-4 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  spellCheck={false}
                />
              ) : (
                <pre className="bg-background border border-border rounded-md p-4 text-sm font-mono text-foreground overflow-x-auto">
                  {JSON.stringify(resource.config, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ) : (
          /* ─── AI Tab ────────────────────────────────────────────────── */
          <div className="space-y-6">
            {!aiResult && !aiLoading && (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-sm font-medium text-foreground mb-2">AI Infrastructure Analysis</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Analyze the latest deployment, detect issues, and get suggested config changes. Uses kubectl/oc for K8s logs + pluggable LLM.
                </p>
                <button
                  onClick={runAiAnalysis}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Run Analysis
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Analyzing deployment logs, fetching pod events…</p>
              </div>
            )}

            {aiResult && (
              <>
                {/* Issues */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Issues Detected
                  </h3>
                  <ul className="space-y-2">
                    {aiResult.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-destructive mt-0.5">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggestions */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {aiResult.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Changes (editable) */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-foreground">Suggested Configuration Changes</h3>
                    {aiApprovalStatus === "pending" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">Pending your approval</span>
                    )}
                    {aiApprovalStatus === "approved" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {aiApprovalStatus === "rejected" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    You can edit the suggested config before approving. No changes will be applied automatically.
                  </p>
                  <textarea
                    value={aiEdited}
                    onChange={(e) => setAiEdited(e.target.value)}
                    className="w-full h-[300px] bg-background border border-border rounded-md p-4 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    spellCheck={false}
                    readOnly={aiApprovalStatus !== "pending"}
                  />
                  {aiApprovalStatus === "pending" && (
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => setAiApprovalStatus("rejected")}
                        className="px-3 py-1.5 text-sm text-destructive border border-border rounded-md hover:bg-destructive/10 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setAiApprovalStatus("approved")}
                        className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Apply
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default InfrastructureDetailPage;
