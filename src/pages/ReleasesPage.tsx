import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import {
  Rocket, Clock, CheckCircle2, XCircle, AlertTriangle, Play,
  ChevronDown, ChevronRight, X, Shield, ShieldAlert,
  ToggleLeft, ToggleRight, Loader2, Terminal, Eye, Plus,
  Calendar, GitBranch, Command, ListOrdered, Sparkles,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = "developer" | "maintainer";
type ReleaseStatus = "pending_approval" | "approved" | "queued" | "running" | "success" | "failed" | "rejected" | "scheduled";
type ReleaseType = "terraform" | "gitops" | "custom";

interface Environment {
  id: string;
  name: string;
  approvalRequired: boolean;
}

interface Release {
  id: string;
  name: string;
  version: string;
  environment: string;
  status: ReleaseStatus;
  releaseType: ReleaseType;
  createdBy: string;
  createdByRole: Role;
  createdAt: string;
  approvedBy?: string;
  scheduledAt?: string;
  customCommand?: string;
  logs: string[];
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const initialEnvironments: Environment[] = [
  { id: "prod", name: "Production", approvalRequired: true },
  { id: "staging", name: "Staging", approvalRequired: true },
  { id: "dev", name: "Development", approvalRequired: false },
  { id: "sandbox", name: "Sandbox", approvalRequired: false },
];

const initialReleases: Release[] = [
  { id: "rel-001", name: "api-gateway", version: "v2.4.1", environment: "Production", status: "pending_approval", releaseType: "terraform", createdBy: "alice@grid.io", createdByRole: "developer", createdAt: "2 min ago", logs: ["[plan] Refreshing state...", "[plan] 3 resources to add, 1 to change", "[plan] Waiting for approval..."] },
  { id: "rel-002", name: "worker-service", version: "v1.8.0", environment: "Production", status: "queued", releaseType: "terraform", createdBy: "bob@grid.io", createdByRole: "developer", createdAt: "15 min ago", logs: ["[plan] Refreshing state...", "[plan] 2 resources to change", "[queued] Waiting for current release to finish..."] },
  { id: "rel-003", name: "auth-service", version: "v3.1.0", environment: "Staging", status: "running", releaseType: "gitops", createdBy: "admin@grid.io", createdByRole: "maintainer", createdAt: "30 min ago", logs: ["[gitops] Syncing from main branch...", "[gitops] Applying manifests...", "[gitops] Waiting for rollout..."] },
  { id: "rel-004", name: "web-frontend", version: "v5.2.3", environment: "Development", status: "success", releaseType: "terraform", createdBy: "alice@grid.io", createdByRole: "developer", createdAt: "1h ago", logs: ["[apply] Apply complete! Resources: 1 added, 0 changed, 0 destroyed."] },
  { id: "rel-005", name: "db-migration", version: "v1.0.4", environment: "Production", status: "failed", releaseType: "terraform", createdBy: "admin@grid.io", createdByRole: "maintainer", createdAt: "3h ago", approvedBy: "admin@grid.io", logs: ["[apply] aws_db_instance.primary: Modifying...", "[error] Error: timeout waiting for state change", "[error] Apply failed."] },
  { id: "rel-006", name: "monitoring-stack", version: "v2.0.0", environment: "Sandbox", status: "success", releaseType: "custom", createdBy: "bob@grid.io", createdByRole: "developer", createdAt: "5h ago", customCommand: "grid deploy monitoring --env sandbox --stack full", logs: ["[custom] Running: grid deploy monitoring --env sandbox --stack full", "[custom] Deploy complete."] },
  { id: "rel-007", name: "cache-layer", version: "v1.3.2", environment: "Staging", status: "rejected", releaseType: "terraform", createdBy: "alice@grid.io", createdByRole: "developer", createdAt: "1d ago", logs: ["[plan] 5 resources to destroy — rejected by maintainer."] },
  { id: "rel-008", name: "k8s-ingress", version: "v1.0.0", environment: "Production", status: "scheduled", releaseType: "gitops", createdBy: "admin@grid.io", createdByRole: "maintainer", createdAt: "10 min ago", scheduledAt: "2026-02-26 02:00", logs: ["[scheduled] Will run at 2026-02-26 02:00 UTC"] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusConfig: Record<ReleaseStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending_approval: { label: "Pending Approval", color: "bg-warning/10 text-warning", icon: Clock },
  approved: { label: "Approved", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  queued: { label: "Queued", color: "bg-muted text-muted-foreground", icon: ListOrdered },
  running: { label: "Running", color: "bg-blue-500/10 text-blue-400", icon: Loader2 },
  success: { label: "Success", color: "bg-success/10 text-success", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive", icon: XCircle },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: XCircle },
  scheduled: { label: "Scheduled", color: "bg-info/10 text-info", icon: Calendar },
};

const releaseTypeConfig: Record<ReleaseType, { label: string; icon: React.ElementType; color: string }> = {
  terraform: { label: "Terraform", icon: Play, color: "bg-primary/10 text-primary" },
  gitops: { label: "GitOps", icon: GitBranch, color: "bg-info/10 text-info" },
  custom: { label: "Custom", icon: Command, color: "bg-purple-500/10 text-purple-400" },
};

// ─── Component ───────────────────────────────────────────────────────────────

const ReleasesPage = () => {
  const [currentRole, setCurrentRole] = useState<Role>("maintainer");
  const [releases, setReleases] = useState<Release[]>(initialReleases);
  const [environments, setEnvironments] = useState<Environment[]>(initialEnvironments);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnvSettings, setShowEnvSettings] = useState(false);
  const [envToggleConfirm, setEnvToggleConfirm] = useState<Environment | null>(null);
  const [pendingExpanded, setPendingExpanded] = useState(true);

  // AI state for release detail
  const [releaseDetailTab, setReleaseDetailTab] = useState<"details" | "ai">("details");
  const [releaseAiLoading, setReleaseAiLoading] = useState(false);
  const [releaseAiResult, setReleaseAiResult] = useState<{ issues: string[]; suggestions: string[]; suggestedChanges: string } | null>(null);
  const [releaseAiApprovalStatus, setReleaseAiApprovalStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [releaseAiEdited, setReleaseAiEdited] = useState("");

  const runReleaseAiAnalysis = (release: Release) => {
    setReleaseAiLoading(true);
    setReleaseAiResult(null);
    setReleaseAiApprovalStatus(null);
    setTimeout(() => {
      const isFailed = release.status === "failed";
      setReleaseAiResult({
        issues: isFailed
          ? [`Release ${release.name} ${release.version} failed.`, ...release.logs.filter(l => l.includes("[error]")).map(l => l.replace("[error] ", ""))]
          : ["No critical issues detected in this release."],
        suggestions: isFailed
          ? ["Review resource quotas and limits.", "Check for conflicting state locks.", "Consider rolling back to previous version.", "Verify IAM permissions for the target resources."]
          : ["Release completed successfully.", "Consider enabling enhanced monitoring post-deploy."],
        suggestedChanges: isFailed
          ? JSON.stringify({ action: "rollback", target: release.name, from_version: release.version, to_version: `${release.version.split('.').slice(0, -1).join('.')}.${parseInt(release.version.split('.').pop() || '0') - 1}`, steps: ["Revert state", "Re-apply previous config", "Verify health checks"] }, null, 2)
          : JSON.stringify({ status: "healthy", no_changes_needed: true }, null, 2),
      });
      setReleaseAiEdited(isFailed
        ? JSON.stringify({ action: "rollback", target: release.name, from_version: release.version, to_version: `${release.version.split('.').slice(0, -1).join('.')}.${parseInt(release.version.split('.').pop() || '0') - 1}`, steps: ["Revert state", "Re-apply previous config", "Verify health checks"] }, null, 2)
        : JSON.stringify({ status: "healthy", no_changes_needed: true }, null, 2)
      );
      setReleaseAiLoading(false);
      setReleaseAiApprovalStatus("pending");
    }, 2000);
  };

  // Create release form
  const [newReleaseName, setNewReleaseName] = useState("");
  const [newReleaseVersion, setNewReleaseVersion] = useState("");
  const [newReleaseEnv, setNewReleaseEnv] = useState("Production");
  const [newReleaseType, setNewReleaseType] = useState<ReleaseType>("terraform");
  const [newCustomCommand, setNewCustomCommand] = useState("");
  const [newScheduleEnabled, setNewScheduleEnabled] = useState(false);
  const [newScheduleDate, setNewScheduleDate] = useState("");

  const pendingReleases = releases.filter((r) => r.status === "pending_approval");
  const queuedReleases = releases.filter((r) => r.status === "queued");
  const scheduledReleases = releases.filter((r) => r.status === "scheduled");

  const getEnvApproval = (envName: string) =>
    environments.find((e) => e.name === envName)?.approvalRequired ?? true;

  const selectRelease = (release: Release) => {
    setSelectedRelease(release);
    setReleaseDetailTab("details");
    setReleaseAiLoading(false);
    setReleaseAiResult(null);
    setReleaseAiApprovalStatus(null);
  };

  // ─── Actions ─────────────────────────────────────────────────────

  const handleApprove = (releaseId: string) => {
    setReleases((prev) =>
      prev.map((r) => r.id === releaseId ? { ...r, status: "running" as ReleaseStatus, approvedBy: "admin@grid.io" } : r)
    );
    if (selectedRelease?.id === releaseId) {
      setSelectedRelease((prev) => prev ? { ...prev, status: "running", approvedBy: "admin@grid.io" } : prev);
    }
  };

  const handleReject = (releaseId: string) => {
    setReleases((prev) =>
      prev.map((r) => r.id === releaseId ? { ...r, status: "rejected" as ReleaseStatus } : r)
    );
    if (selectedRelease?.id === releaseId) {
      setSelectedRelease((prev) => (prev ? { ...prev, status: "rejected" } : prev));
    }
  };

  const handleCreateRelease = () => {
    if (!newReleaseName || !newReleaseVersion) return;
    if (newReleaseType === "custom" && !newCustomCommand) return;

    const envNeedsApproval = getEnvApproval(newReleaseEnv);
    const needsApproval = envNeedsApproval && currentRole === "developer";
    const isRunning = releases.some((r) => r.status === "running");

    let status: ReleaseStatus;
    if (newScheduleEnabled && newScheduleDate) {
      status = "scheduled";
    } else if (needsApproval) {
      status = "pending_approval";
    } else if (isRunning) {
      status = "queued";
    } else {
      status = "running";
    }

    const logPrefix = newReleaseType === "terraform" ? "[plan]" : newReleaseType === "gitops" ? "[gitops]" : "[custom]";
    const newRelease: Release = {
      id: `rel-${Date.now()}`,
      name: newReleaseName,
      version: newReleaseVersion,
      environment: newReleaseEnv,
      status,
      releaseType: newReleaseType,
      createdBy: currentRole === "maintainer" ? "admin@grid.io" : "alice@grid.io",
      createdByRole: currentRole,
      createdAt: "Just now",
      customCommand: newReleaseType === "custom" ? newCustomCommand : undefined,
      scheduledAt: newScheduleEnabled ? newScheduleDate : undefined,
      logs: status === "scheduled"
        ? [`[scheduled] Will run at ${newScheduleDate}`]
        : status === "pending_approval"
        ? [`${logPrefix} Waiting for approval...`]
        : status === "queued"
        ? [`${logPrefix} Queued — waiting for current release...`]
        : newReleaseType === "custom"
        ? [`[custom] Running: ${newCustomCommand}`]
        : [`${logPrefix} Starting...`],
    };

    setReleases((prev) => [newRelease, ...prev]);
    setShowCreateModal(false);
    setNewReleaseName("");
    setNewReleaseVersion("");
    setNewReleaseEnv("Production");
    setNewReleaseType("terraform");
    setNewCustomCommand("");
    setNewScheduleEnabled(false);
    setNewScheduleDate("");
  };

  const handleToggleEnvApproval = (env: Environment) => {
    setEnvironments((prev) =>
      prev.map((e) => e.id === env.id ? { ...e, approvalRequired: !e.approvalRequired } : e)
    );
    setEnvToggleConfirm(null);
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <AppShell activeTab="releases">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">Releases</h1>
            {pendingReleases.length > 0 && currentRole === "maintainer" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                {pendingReleases.length} pending
              </span>
            )}
            {queuedReleases.length > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {queuedReleases.length} queued
              </span>
            )}
            {scheduledReleases.length > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-info/10 text-info">
                {scheduledReleases.length} scheduled
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Role toggle */}
            <div className="flex items-center gap-2 mr-4 px-3 py-1.5 rounded-md border border-border bg-card text-xs text-muted-foreground">
              <span>Role:</span>
              <button
                onClick={() => setCurrentRole(currentRole === "developer" ? "maintainer" : "developer")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  currentRole === "maintainer" ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"
                }`}
              >
                {currentRole === "maintainer" ? (
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Maintainer</span>
                ) : (
                  <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Developer</span>
                )}
              </button>
            </div>
            <button onClick={() => setShowEnvSettings(true)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-secondary transition-colors">
              Env Settings
            </button>
            <button onClick={() => setShowCreateModal(true)} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Create Release
            </button>
          </div>
        </div>

        {/* Pending Approval (maintainer only) */}
        {currentRole === "maintainer" && pendingReleases.length > 0 && (
          <div className="rounded-lg border border-warning/20 bg-warning/5 overflow-hidden">
            <button onClick={() => setPendingExpanded(!pendingExpanded)} className="w-full flex items-center justify-between p-4 text-left hover:bg-warning/10 transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium text-foreground">Pending Approval ({pendingReleases.length})</span>
              </div>
              {pendingExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {pendingExpanded && (
              <div className="border-t border-warning/20 divide-y divide-border">
                {pendingReleases.map((release) => {
                  const rtCfg = releaseTypeConfig[release.releaseType];
                  return (
                    <div key={release.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Rocket className="w-4 h-4 text-warning flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm text-foreground font-medium">{release.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{release.version}</span>
                          <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded ${rtCfg.color}`}>{rtCfg.label}</span>
                          <p className="text-xs text-muted-foreground">{release.environment} · by {release.createdBy} · {release.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => selectRelease(release)} className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-secondary transition-colors flex items-center gap-1">
                          <Eye className="w-3 h-3" />View
                        </button>
                        <button onClick={() => handleReject(release.id)} className="px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10 border border-border rounded-md transition-colors">Reject</button>
                        <button onClick={() => handleApprove(release.id)} className="px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />Approve
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* All Releases */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">All Releases</h2>
            <span className="text-xs text-muted-foreground">{releases.length} total</span>
          </div>
          <div className="divide-y divide-border">
            {releases.map((release) => {
              const sc = statusConfig[release.status];
              const StatusIcon = sc.icon;
              const rtCfg = releaseTypeConfig[release.releaseType];
              return (
                <div key={release.id} onClick={() => selectRelease(release)} className="flex items-center px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <StatusIcon className={`w-4 h-4 flex-shrink-0 ${release.status === "running" ? "animate-spin" : ""} ${sc.color.split(" ")[1]}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground font-medium">{release.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{release.version}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${rtCfg.color}`}>{rtCfg.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {release.environment} · by {release.createdBy}
                        {release.scheduledAt && ` · scheduled: ${release.scheduledAt}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                    <span className="text-xs text-muted-foreground w-20 text-right">{release.createdAt}</span>
                    {currentRole === "maintainer" && release.status === "pending_approval" && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleReject(release.id)} className="px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors">Reject</button>
                        <button onClick={() => handleApprove(release.id)} className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity">Approve</button>
                      </div>
                    )}
                    {currentRole === "developer" && release.status === "pending_approval" && (
                      <span className="text-xs text-warning italic">Awaiting maintainer</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Release Detail Slide-out ─────────────────────────────────── */}
      {selectedRelease && (
        <>
          <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={() => setSelectedRelease(null)} />
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedRelease.name}{" "}
                  <span className="text-sm text-muted-foreground font-mono">{selectedRelease.version}</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedRelease.environment} · {selectedRelease.createdAt} · by {selectedRelease.createdBy}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {currentRole === "maintainer" && selectedRelease.status === "pending_approval" && (
                  <>
                    <button onClick={() => handleReject(selectedRelease.id)} className="px-3 py-1.5 text-sm text-destructive border border-border rounded-md hover:bg-destructive/10 transition-colors">Reject</button>
                    <button onClick={() => handleApprove(selectedRelease.id)} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />Approve
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedRelease(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-border px-4">
              <button
                onClick={() => setReleaseDetailTab("details")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  releaseDetailTab === "details" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setReleaseDetailTab("ai")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  releaseDetailTab === "ai" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI
              </button>
              {(selectedRelease.status === "failed" || selectedRelease.status === "rejected") && releaseDetailTab !== "ai" && (
                <button
                  onClick={() => { setReleaseDetailTab("ai"); runReleaseAiAnalysis(selectedRelease); }}
                  className="ml-auto px-3 py-1 text-xs bg-warning text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  Diagnose with AI
                </button>
              )}
            </div>

            {releaseDetailTab === "details" ? (
              <>
                {/* Status */}
                <div className="p-4 border-b border-border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig[selectedRelease.status].color}`}>
                        {statusConfig[selectedRelease.status].label}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Type</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${releaseTypeConfig[selectedRelease.releaseType].color}`}>
                        {releaseTypeConfig[selectedRelease.releaseType].label}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Created by</p>
                      <span className="text-sm text-foreground">{selectedRelease.createdBy}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${selectedRelease.createdByRole === "maintainer" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {selectedRelease.createdByRole}
                      </span>
                    </div>
                    {selectedRelease.approvedBy && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Approved by</p>
                        <span className="text-sm text-foreground">{selectedRelease.approvedBy}</span>
                      </div>
                    )}
                    {selectedRelease.scheduledAt && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Scheduled at</p>
                        <span className="text-sm text-foreground">{selectedRelease.scheduledAt}</span>
                      </div>
                    )}
                    {selectedRelease.customCommand && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Custom command</p>
                        <code className="text-xs font-mono text-foreground bg-background px-2 py-1 rounded border border-border block">
                          {selectedRelease.customCommand}
                        </code>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Approval required</p>
                      <span className="text-sm text-foreground">{getEnvApproval(selectedRelease.environment) ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>

                {/* Logs */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Logs</h3>
                  </div>
                  <div className="bg-background border border-border rounded-md p-4 font-mono text-xs text-muted-foreground space-y-1 max-h-[400px] overflow-y-auto">
                    {selectedRelease.logs.map((line, i) => (
                      <div key={i} className={`${
                        line.includes("[error]") ? "text-destructive"
                        : line.includes("[apply]") || line.includes("[gitops]") ? "text-primary"
                        : line.includes("[custom]") ? "text-purple-400"
                        : line.includes("[scheduled]") ? "text-info"
                        : "text-muted-foreground"
                      }`}>
                        {line}
                      </div>
                    ))}
                    {selectedRelease.status === "running" && (
                      <div className="text-info flex items-center gap-1 mt-2">
                        <Loader2 className="w-3 h-3 animate-spin" />Running…
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* ─── AI Tab ─── */
              <div className="p-4 space-y-4">
                {!releaseAiResult && !releaseAiLoading && (
                  <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-foreground mb-2">AI Release Analysis</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Analyze release logs, detect failures, and get suggested fixes. Uses build logs + pluggable LLM.
                    </p>
                    <button
                      onClick={() => runReleaseAiAnalysis(selectedRelease)}
                      className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Run Analysis
                    </button>
                  </div>
                )}

                {releaseAiLoading && (
                  <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Analyzing release logs, fetching build events…</p>
                  </div>
                )}

                {releaseAiResult && (
                  <>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        Issues Detected
                      </h3>
                      <ul className="space-y-2">
                        {releaseAiResult.issues.map((issue, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-destructive mt-0.5">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Suggestions
                      </h3>
                      <ul className="space-y-2">
                        {releaseAiResult.suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">→</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-foreground">Suggested Changes</h3>
                        {releaseAiApprovalStatus === "pending" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">Pending your approval</span>
                        )}
                        {releaseAiApprovalStatus === "approved" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {releaseAiApprovalStatus === "rejected" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        You can edit the suggested changes before approving. No changes will be applied automatically.
                      </p>
                      <textarea
                        value={releaseAiEdited}
                        onChange={(e) => setReleaseAiEdited(e.target.value)}
                        className="w-full h-[200px] bg-background border border-border rounded-md p-4 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        spellCheck={false}
                        readOnly={releaseAiApprovalStatus !== "pending"}
                      />
                      {releaseAiApprovalStatus === "pending" && (
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={() => setReleaseAiApprovalStatus("rejected")}
                            className="px-3 py-1.5 text-sm text-destructive border border-border rounded-md hover:bg-destructive/10 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => setReleaseAiApprovalStatus("approved")}
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
        </>
      )}

      {/* ─── Create Release Modal ─────────────────────────────────────── */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Create Release</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-muted-foreground hover:text-foreground rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Release type */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Release Type</label>
                <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-md">
                  {(["terraform", "gitops", "custom"] as ReleaseType[]).map((t) => {
                    const cfg = releaseTypeConfig[t];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={t}
                        onClick={() => setNewReleaseType(t)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors flex-1 justify-center ${
                          newReleaseType === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-3 h-3" />{cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Resource Name</label>
                <input type="text" value={newReleaseName} onChange={(e) => setNewReleaseName(e.target.value)} placeholder="e.g. api-gateway" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Version</label>
                <input type="text" value={newReleaseVersion} onChange={(e) => setNewReleaseVersion(e.target.value)} placeholder="e.g. v1.0.0" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Environment</label>
                <select value={newReleaseEnv} onChange={(e) => setNewReleaseEnv(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {environments.map((env) => (
                    <option key={env.id} value={env.name}>{env.name} {env.approvalRequired ? "(approval required)" : ""}</option>
                  ))}
                </select>
              </div>

              {/* Custom command */}
              {newReleaseType === "custom" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">CLI Command</label>
                  <input type="text" value={newCustomCommand} onChange={(e) => setNewCustomCommand(e.target.value)} placeholder="e.g. grid deploy --env prod" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground mt-1">This command will be executed by the backend as a release.</p>
                </div>
              )}

              {/* Schedule */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNewScheduleEnabled(!newScheduleEnabled)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {newScheduleEnabled ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                  Schedule release
                </button>
              </div>
              {newScheduleEnabled && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Run at (UTC)</label>
                  <input type="datetime-local" value={newScheduleDate} onChange={(e) => setNewScheduleDate(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              )}

              {/* Info banners */}
              {newReleaseType === "terraform" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
                  <Play className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Terraform release: <span className="text-foreground font-medium">Grid CLI Plan → Grid CLI Apply</span>. Preview changes before applying.
                  </p>
                </div>
              )}
              {newReleaseType === "gitops" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-info/5 border border-info/20">
                  <GitBranch className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    GitOps release: changes sync from source repo to the cluster.
                  </p>
                </div>
              )}
              {getEnvApproval(newReleaseEnv) && currentRole === "developer" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-warning/5 border border-warning/20">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Approval is enabled for <span className="text-foreground font-medium">{newReleaseEnv}</span>. This release will be submitted for maintainer approval.
                  </p>
                </div>
              )}
              {currentRole === "maintainer" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
                  <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    As a <span className="text-foreground font-medium">maintainer</span>, your release will run immediately (or be queued if another is running).
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleCreateRelease}
                disabled={!newReleaseName || !newReleaseVersion || (newReleaseType === "custom" && !newCustomCommand)}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Rocket className="w-3.5 h-3.5" />
                {newScheduleEnabled ? "Schedule" : getEnvApproval(newReleaseEnv) && currentRole === "developer" ? "Submit for Approval" : "Create & Run"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Environment Settings Modal ───────────────────────────────── */}
      {showEnvSettings && (
        <>
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setShowEnvSettings(false)} />
          <div className="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-lg shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Environment Approval Settings</h2>
              <button onClick={() => setShowEnvSettings(false)} className="p-1 text-muted-foreground hover:text-foreground rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-1">
              {environments.map((env) => (
                <div key={env.id} className="flex items-center justify-between px-3 py-3 rounded-md hover:bg-secondary/50 transition-colors">
                  <div>
                    <span className="text-sm text-foreground font-medium">{env.name}</span>
                    <p className="text-xs text-muted-foreground">{env.approvalRequired ? "Developers must get approval" : "Developers can release directly"}</p>
                  </div>
                  <button onClick={() => setEnvToggleConfirm(env)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {env.approvalRequired ? <><ToggleRight className="w-5 h-5 text-primary" /><span className="text-primary font-medium">On</span></> : <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span>Off</span></>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Toggle Confirmation ───────────────────────────────────────── */}
      {envToggleConfirm && (
        <>
          <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm" onClick={() => setEnvToggleConfirm(null)} />
          <div className="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-sm bg-card border border-border rounded-lg shadow-2xl">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                {envToggleConfirm.approvalRequired ? "Disable" : "Enable"} approval for {envToggleConfirm.name}?
              </h3>
            </div>
            <div className="p-4">
              {envToggleConfirm.approvalRequired ? (
                <div className="flex items-start gap-2 p-3 rounded-md bg-warning/5 border border-warning/20">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    When approval is off, <span className="text-foreground font-medium">developers can release without maintainer approval</span> in this environment. Use for dev/sandbox only.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Enabling approval means developers must get maintainer sign-off before releases run in <span className="text-foreground font-medium">{envToggleConfirm.name}</span>.
                </p>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setEnvToggleConfirm(null)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={() => handleToggleEnvApproval(envToggleConfirm)} className={`px-3 py-1.5 text-sm rounded-md hover:opacity-90 transition-opacity ${envToggleConfirm.approvalRequired ? "bg-warning text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
                {envToggleConfirm.approvalRequired ? "Turn Off" : "Turn On"}
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
};

export default ReleasesPage;
