import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import {
  ArrowLeft, Save, Sparkles, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Box,
} from "lucide-react";
import { type Resource } from "./InfrastructurePage";
import {
  useApplyInfrastructure,
  useDestroyInfrastructure,
  useDriftCheck,
  useInfrastructure,
  usePlanInfrastructure,
  useRelease,
  useRestoreInfrastructureConfig,
  useUpdateInfrastructure,
} from "@/hooks/useGridApi";
import { useAuth } from "@/contexts/AuthContext";
import { DeploymentLiveLogs } from "@/components/DeploymentLiveLogs";
import { categoryForResourceType, categoryLabel } from "@/lib/resourceCategory";
import type { TerraformCategory } from "@/lib/deployContract";
import type { ReleaseMode } from "@/types/api";

const statusColors: Record<string, string> = {
  running: "bg-success/10 text-success",
  stopped: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
  degraded: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
  destroyed: "bg-destructive/10 text-destructive",
  stale: "bg-warning/15 text-warning border border-warning/30",
};

interface AiAnalysis {
  issues: string[];
  suggestions: string[];
  suggestedChanges: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const InfrastructureDetailPage = () => {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: liveInfra, isLoading: liveLoading, refetch } = useInfrastructure(resourceId || "");
  const updateInfra = useUpdateInfrastructure();
  const planInfra = usePlanInfrastructure();
  const applyInfra = useApplyInfrastructure();
  const destroyInfra = useDestroyInfrastructure();
  const restoreConfig = useRestoreInfrastructureConfig();
  const driftCheck = useDriftCheck();
  const [driftReport, setDriftReport] = useState<{
    hasDrift?: boolean;
    kind?: string;
    summary?: string;
    changes?: string[];
    actions?: { applyGitDesired?: string; updateGitToMatchLive?: string };
  } | null>(null);

  const resource: Resource | null = liveInfra
    ? (() => {
        const subtype = (() => {
          const resources = (liveInfra.configJson as { resources?: Array<{ type?: string }> })
            ?.resources;
          const fromRes = resources?.[0]?.type;
          if (fromRes) return fromRes.toLowerCase();
          const path = liveInfra.gitPath?.replace(/\\/g, "/");
          if (path) {
            const parts = path.split("/").filter(Boolean);
            if (parts.length >= 2) return parts[parts.length - 2].toLowerCase();
          }
          return "unknown";
        })();
        const category = categoryForResourceType(subtype);
        return {
          id: liveInfra.id,
          name: liveInfra.name,
          type: subtype,
          category,
          engine: "terraform" as const,
          status:
            liveInfra.status === "running" ||
            liveInfra.status === "error" ||
            liveInfra.status === "degraded" ||
            liveInfra.status === "stale" ||
            liveInfra.status === "pending"
              ? liveInfra.status
              : ("stopped" as const),
          region: String((liveInfra.configJson as { region?: string }).region || "—"),
          environment: liveInfra.environment,
          provider: liveInfra.provider,
          ip: "—",
          cpu: "—",
          memory: "—",
          connections: [],
          config: liveInfra.configJson,
        };
      })()
    : null;

  const [activeTab, setActiveTab] = useState<"details" | "ai">("details");
  const [editMode, setEditMode] = useState(false);
  const [editedJson, setEditedJson] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [activeReleaseId, setActiveReleaseId] = useState<string | null>(null);
  const { data: activeRelease } = useRelease(activeReleaseId || "");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysis | null>(null);
  const [aiEdited, setAiEdited] = useState("");
  const [aiApprovalStatus, setAiApprovalStatus] = useState<"pending" | "approved" | "rejected" | null>(null);

  useEffect(() => {
    if (resource && !editMode) {
      setEditedJson(JSON.stringify(resource.config, null, 2));
    }
  }, [resource?.id, resource?.config, editMode]);

  useEffect(() => {
    if (activeRelease?.deploymentId) {
      setWatchingId(activeRelease.deploymentId);
    }
    if (!activeRelease) return;
    setActionNote(
      `${activeRelease.name}: ${activeRelease.status}` +
        (activeRelease.message ? ` — ${activeRelease.message}` : "") +
        `. Logged under Releases` +
        (activeRelease.createdBy ? ` by ${activeRelease.createdBy}` : "") +
        "."
    );
  }, [activeRelease]);

  if (liveLoading) {
    return (
      <AppShell activeTab="infrastructure">
        <div className="p-6 text-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  if (!resource) {
    return (
      <AppShell activeTab="infrastructure">
        <div className="p-6 text-center text-muted-foreground">Resource not found.</div>
      </AppShell>
    );
  }

  const TypeIcon = Box;
  const isLive = !!liveInfra;
  const releaseBusy =
    planInfra.isPending ||
    applyInfra.isPending ||
    destroyInfra.isPending ||
    activeRelease?.status === "queued" ||
    activeRelease?.status === "deploying";

  const startEdit = () => {
    setEditedJson(JSON.stringify(resource.config, null, 2));
    setEditMode(true);
  };

  const saveConfig = async () => {
    try {
      const parsed = JSON.parse(editedJson) as Record<string, unknown>;
      if (isLive && resourceId) {
        await updateInfra.mutateAsync({ id: resourceId, configJson: parsed });
        setActionNote("Desired state saved. Run Plan to preview, Apply to converge.");
      }
      setEditMode(false);
    } catch {
      setActionNote("Invalid JSON — fix before saving.");
    }
  };

  const startLifecycleRelease = async (
    mode: Extract<ReleaseMode, "plan" | "apply" | "destroy">
  ) => {
    if (!resourceId || !isLive) return;
    if (mode === "destroy") {
      if (!isAdmin) {
        setActionNote("Only admins can destroy infrastructure.");
        return;
      }
      if (
        !window.confirm(
          "Destroy all cloud resources for this infrastructure? This creates a destroy release and cannot be undone."
        )
      ) {
        return;
      }
    }
    try {
      const mut =
        mode === "plan" ? planInfra : mode === "apply" ? applyInfra : destroyInfra;
      const release = await mut.mutateAsync(resourceId);
      setActiveReleaseId(release.id);
      if (release.deploymentId) setWatchingId(release.deploymentId);
      setActionNote(
        release.status === "queued"
          ? `${mode} release queued — only one runs at a time. See Releases for the full log.`
          : `${mode} release started by ${release.createdBy || "you"}. See Releases for the audit trail.`
      );
    } catch (e) {
      setActionNote(e instanceof Error ? e.message : `${mode} failed`);
    }
  };

  const runRestoreConfig = async () => {
    if (!resourceId || !isLive) return;
    try {
      await restoreConfig.mutateAsync(resourceId);
      setActionNote("Config restored under GRID_CONFIG_ROOT. Status cleared from stale.");
      await refetch();
    } catch (e) {
      setActionNote(e instanceof Error ? e.message : "Restore failed");
    }
  };

  const runDrift = async () => {
    if (!resourceId || !isLive) return;
    try {
      const report = await driftCheck.mutateAsync(resourceId);
      setDriftReport(report);
      setActionNote(report.summary);
    } catch (e) {
      setActionNote(e instanceof Error ? e.message : "Drift check failed");
    }
  };

  const runAiAnalysis = () => {
    setAiLoading(true);
    setAiResult(null);
    setAiApprovalStatus(null);
    // AI analysis endpoint not wired yet — show empty analysis shell.
    setTimeout(() => {
      const result: AiAnalysis = {
        issues: [],
        suggestions: [],
        suggestedChanges: JSON.stringify(resource.config, null, 2),
      };
      setAiResult(result);
      setAiEdited(result.suggestedChanges);
      setAiLoading(false);
      setAiApprovalStatus("pending");
    }, 400);
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <TypeIcon className="w-6 h-6 text-muted-foreground" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">{resource.name}</h1>
              <p className="text-sm text-muted-foreground">
                {categoryLabel(resource.category as TerraformCategory)} · {resource.type} ·{" "}
                {resource.region} · {resource.environment} · {resource.provider}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[liveInfra?.status || resource.status] || statusColors.pending}`}>
              {liveInfra?.status === "destroyed"
                ? "destroyed"
                : liveInfra?.status === "stale"
                  ? "removed from config"
                  : resource.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isLive && liveInfra?.status === "stale" && (
              <>
                <button
                  onClick={() => void runRestoreConfig()}
                  disabled={restoreConfig.isPending}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  Restore to config
                </button>
                {isAdmin && (
                  <button
                    onClick={() => void startLifecycleRelease("destroy")}
                    disabled={releaseBusy}
                    className="px-3 py-1.5 text-sm border border-destructive/40 text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
                  >
                    Destroy
                  </button>
                )}
              </>
            )}
            {isLive && liveInfra?.status !== "destroyed" && liveInfra?.status !== "stale" && (
              <>
                <button
                  onClick={() => void runDrift()}
                  disabled={driftCheck.isPending}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  Check drift
                </button>
                <button
                  onClick={() => void startLifecycleRelease("plan")}
                  disabled={releaseBusy}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  Plan
                </button>
                <button
                  onClick={() => void startLifecycleRelease("apply")}
                  disabled={releaseBusy}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  Apply
                </button>
                {isAdmin && (
                  <button
                    onClick={() => void startLifecycleRelease("destroy")}
                    disabled={releaseBusy}
                    className="px-3 py-1.5 text-sm border border-destructive/40 text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
                  >
                    Destroy
                  </button>
                )}
              </>
            )}
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
        </div>

        {actionNote && (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{actionNote}</span>
            {activeReleaseId && (
              <button
                type="button"
                onClick={() => navigate("/releases")}
                className="text-primary hover:underline"
              >
                Open Releases
              </button>
            )}
          </div>
        )}

        {liveInfra?.status === "stale" && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Removed from config, still in state
              </p>
              <p className="text-xs text-muted-foreground">
                This unit&apos;s desired-state JSON is gone, but Grid still has applied state for it
                {liveInfra.gitPath ? ` (was ${liveInfra.gitPath})` : ""}. Destroy the cloud
                resources, or restore the config file so it is managed again.
              </p>
            </div>
          </div>
        )}

        {watchingId && (
          <DeploymentLiveLogs
            deploymentId={watchingId}
            title="Live CLI / Terraform output"
          />
        )}

        {driftReport && (
          <div className="rounded-lg border border-border bg-card p-4 text-xs space-y-2">
            <p className="text-sm font-medium text-foreground">
              Drift: {driftReport.kind}
              {driftReport.hasDrift ? " · changes detected" : " · in sync"}
            </p>
            <p className="text-muted-foreground">{driftReport.summary}</p>
            {driftReport.changes?.slice(0, 12).map((c, i) => (
              <p key={i} className="font-mono text-muted-foreground">
                {c}
              </p>
            ))}
            {driftReport.actions && (
              <div className="pt-2 space-y-1 text-muted-foreground border-t border-border">
                <p>
                  <span className="text-foreground">Match Git → live:</span>{" "}
                  {driftReport.actions.applyGitDesired}
                </p>
                <p>
                  <span className="text-foreground">Keep live → update Git:</span>{" "}
                  {driftReport.actions.updateGitToMatchLive}
                </p>
              </div>
            )}
          </div>
        )}

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
                  {resource.connections.map((cId) => (
                      <button
                        key={cId}
                        onClick={() => navigate(`/infrastructure/${cId}`)}
                        className="text-xs px-2.5 py-1 rounded-md border border-border bg-secondary text-foreground hover:bg-accent transition-colors"
                      >
                        {cId}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* JSON Config */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Desired state (JSON)</h3>
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors">Cancel</button>
                    <button
                      onClick={() => void saveConfig()}
                      disabled={updateInfra.isPending}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEdit}
                    disabled={liveInfra?.status === "destroyed"}
                    className="px-3 py-1.5 text-sm text-foreground border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    Edit
                  </button>
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
