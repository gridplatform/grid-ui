import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Rocket,
  Clock,
  CheckCircle2,
  XCircle,
  ListOrdered,
  Calendar,
  Loader2,
  Plus,
  X,
  AlertTriangle,
  Terminal,
  FileSearch,
  Play,
  Trash2,
} from "lucide-react";
import {
  useCreateRelease,
  useEnvironments,
  useInfrastructures,
  usePendingApprovals,
  useReleases,
  useCancelRelease,
  useApproveRelease,
  useRejectRelease,
} from "@/hooks/useGridApi";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DeploymentLiveLogs } from "@/components/DeploymentLiveLogs";
import { canApproveReleases, isAdminLike } from "@/lib/rbac";
import type { Release, ReleaseMode, ReleaseStatus } from "@/types/api";

const statusConfig: Partial<
  Record<ReleaseStatus | string, { label: string; color: string; icon: React.ElementType }>
> = {
  pending_approval: { label: "Pending Approval", color: "bg-warning/10 text-warning", icon: Clock },
  approved: { label: "Approved", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  queued: { label: "Queued", color: "bg-muted text-muted-foreground", icon: ListOrdered },
  deploying: { label: "Releasing", color: "bg-blue-500/10 text-blue-400", icon: Loader2 },
  success: { label: "Success", color: "bg-success/10 text-success", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: XCircle },
  rolled_back: { label: "Rolled back", color: "bg-muted text-muted-foreground", icon: Calendar },
};

const modeLabels: Record<ReleaseMode, string> = {
  plan: "Plan",
  apply: "Apply (live)",
  destroy: "Destroy",
  custom: "Custom CLI",
};

const ReleasesPage = () => {
  const { user } = useAuth();
  const isAdmin = isAdminLike(user?.role);
  const canApprove = canApproveReleases(user?.role);
  const { projectSlug, selectedEnv, selectedProject } = useWorkspace();
  const { data: releases = [], isLoading, error } = useReleases();
  const { data: approvals = [] } = usePendingApprovals();
  const { data: environments = [] } = useEnvironments(projectSlug, {
    enabled: !!projectSlug,
  });
  const { data: infrastructures = [] } = useInfrastructures({
    project: projectSlug,
    enabled: !!projectSlug,
  });
  const createRelease = useCreateRelease();
  const cancelRelease = useCancelRelease();
  const approveRelease = useApproveRelease();
  const rejectRelease = useRejectRelease();

  const [envFilter, setEnvFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState<string | null>(null);

  // Form state
  const [mode, setMode] = useState<ReleaseMode>("plan");
  const [environment, setEnvironment] = useState("");
  const [provider, setProvider] = useState("");
  const [infrastructureId, setInfrastructureId] = useState("");
  const [customCommand, setCustomCommand] = useState("grid status --config-dir .");
  const [releaseName, setReleaseName] = useState("");

  // Workspace project/env changed → keep the modal form on the active project.
  useEffect(() => {
    setEnvironment(selectedEnv?.slug || "");
    setProvider("");
    setInfrastructureId("");
    setEnvFilter("");
  }, [projectSlug, selectedEnv?.slug]);

  const active = useMemo(
    () => releases.find((r) => r.status === "deploying"),
    [releases]
  );
  const queued = useMemo(
    () => releases.filter((r) => r.status === "queued"),
    [releases]
  );

  const filtered = useMemo(() => {
    if (!envFilter) return releases;
    return releases.filter((r) => r.environment === envFilter);
  }, [releases, envFilter]);

  const providersForEnv = useMemo(() => {
    const list = infrastructures.filter(
      (i) => i.status !== "destroyed" && (!environment || i.environment === environment)
    );
    return [...new Set(list.map((i) => i.provider).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [infrastructures, environment]);

  const infraForEnv = useMemo(() => {
    const list = infrastructures.filter((i) => i.status !== "destroyed");
    return list.filter((i) => {
      if (environment && i.environment !== environment) return false;
      if (provider && i.provider !== provider) return false;
      return true;
    });
  }, [infrastructures, environment, provider]);

  const drifted = useMemo(
    () =>
      infrastructures.filter(
        (i) =>
          i.status === "stale" ||
          (i.status !== "destroyed" &&
            typeof (i as { config?: { gitContentHash?: string } }).config === "object")
      ),
    [infrastructures]
  );

  const openModal = () => {
    setSubmitNote(null);
    setMode("plan");
    setEnvironment(selectedEnv?.slug || environments[0]?.slug || "");
    setProvider("");
    setInfrastructureId("");
    setCustomCommand("grid status --config-dir .");
    setReleaseName("");
    setShowModal(true);
  };

  const handleCreate = async () => {
    setSubmitNote(null);
    if (mode === "destroy" && !isAdmin) {
      setSubmitNote("Only admins can destroy infrastructure.");
      return;
    }
    if (!environment) {
      setSubmitNote("Pick an environment.");
      return;
    }
    if (mode !== "custom" && !infrastructureId) {
      setSubmitNote("Pick an infrastructure unit to release.");
      return;
    }
    if (mode === "custom" && !customCommand.trim()) {
      setSubmitNote("Enter a grid CLI command.");
      return;
    }
    try {
      const release = await createRelease.mutateAsync({
        name: releaseName.trim() || undefined,
        environment,
        mode,
        infrastructureId: mode === "custom" ? undefined : infrastructureId,
        customCommand: mode === "custom" ? customCommand.trim() : undefined,
      });
      setShowModal(false);
      setExpandedId(release.id);
      if (release.deploymentId) setWatchingId(release.deploymentId);
      setSubmitNote(
        release.status === "queued"
          ? `Queued behind the active release. Only one runs at a time.`
          : `Release started.`
      );
    } catch (e) {
      setSubmitNote(e instanceof Error ? e.message : "Failed to create release");
    }
  };

  const handleCancel = async (release: Release, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const killing = release.status === "deploying";
    const ok = window.confirm(
      killing
        ? `Kill running release “${release.name}”? Terraform/CLI will be stopped. For apply/destroy, Grid will attempt terraform destroy to clean up partial cloud resources, then clear local state.`
        : `Cancel queued release “${release.name}”? It will not run.`
    );
    if (!ok) return;
    try {
      await cancelRelease.mutateAsync(release.id);
      setSubmitNote(
        killing
          ? `Killed “${release.name}” — see logs for cleanup status.`
          : `Cancelled queued release “${release.name}”.`
      );
    } catch (err) {
      setSubmitNote(err instanceof Error ? err.message : "Cancel failed");
    }
  };

  const handleApprove = async (release: Release, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canApprove) return;
    try {
      await approveRelease.mutateAsync({ id: release.id });
      setSubmitNote(`Approved “${release.name}” — it will queue for execution.`);
    } catch (err) {
      setSubmitNote(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const handleReject = async (release: Release, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canApprove) return;
    const comment = window.prompt(`Reject “${release.name}”? Optional comment:`);
    if (comment === null) return;
    try {
      await rejectRelease.mutateAsync({ id: release.id, comment: comment || "Rejected" });
      setSubmitNote(`Rejected “${release.name}”.`);
    } catch (err) {
      setSubmitNote(err instanceof Error ? err.message : "Reject failed");
    }
  };

  const renderRow = (release: Release) => {
    const sc = statusConfig[release.status] ?? {
      label: release.status,
      color: "bg-muted text-muted-foreground",
      icon: Clock,
    };
    const Icon = sc.icon;
    const open = expandedId === release.id;
    const canCancel =
      isAdmin &&
      (release.status === "queued" ||
        release.status === "deploying" ||
        release.status === "pending_approval" ||
        release.status === "approved");
    const showApprove =
      canApprove &&
      release.status === "pending_approval" &&
      release.createdBy?.toLowerCase() !== user?.email?.toLowerCase();
    return (
      <div key={release.id} className="border-b border-border last:border-b-0">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setExpandedId(open ? null : release.id);
              if (release.deploymentId) setWatchingId(release.deploymentId);
            }}
            className="min-w-0 flex items-start sm:items-center gap-3 text-left hover:opacity-90 flex-1"
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0 ${
                release.status === "deploying" ? "animate-spin" : ""
              } ${sc.color.split(" ")[1]}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {release.name}
                {release.version ? ` ${release.version}` : ""}
              </p>
              <p className="text-xs text-muted-foreground break-words">
                {release.environment}
                {" · "}
                {modeLabels[release.mode] || release.mode}
                {release.infrastructureName ? ` · ${release.infrastructureName}` : ""}
                {release.type === "custom" ? " · custom" : ""}
                {release.createdBy ? ` · by ${release.createdBy}` : ""}
              </p>
              {release.message && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{release.message}</p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2 flex-shrink-0 pl-7 sm:pl-0">
            {showApprove && (
              <>
                <button
                  type="button"
                  onClick={(e) => void handleApprove(release, e)}
                  disabled={approveRelease.isPending}
                  className="text-xs px-2 py-1 rounded-md border border-success/40 text-success hover:bg-success/10 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={(e) => void handleReject(release, e)}
                  disabled={rejectRelease.isPending}
                  className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-secondary disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={(e) => void handleCancel(release, e)}
                disabled={cancelRelease.isPending}
                className="text-xs px-2 py-1 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {release.status === "deploying" ? "Kill" : "Cancel"}
              </button>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
              {sc.label}
            </span>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {new Date(release.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        {open && (
          <div className="px-4 pb-4 space-y-3">
            {release.customCommand && (
              <pre className="text-xs font-mono bg-secondary/50 border border-border rounded-md p-3 overflow-x-auto">
                {release.customCommand}
              </pre>
            )}
            {(release.logs || []).length > 0 && (
              <pre className="text-[11px] font-mono bg-card border border-border rounded-md p-3 max-h-48 overflow-auto whitespace-pre-wrap">
                {(release.logs || []).join("\n")}
              </pre>
            )}
            {release.deploymentId && (
              <DeploymentLiveLogs
                deploymentId={
                  watchingId === release.deploymentId ? release.deploymentId : release.deploymentId
                }
                title="Terraform / CLI output"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppShell activeTab="releases">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Rocket className="w-5 h-5 flex-shrink-0" />
              Releases
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Plan, apply, or (admins) destroy desired-state changes. One release runs at a time;
              others queue.
              {approvals.length > 0 ? ` ${approvals.length} pending approval(s).` : ""}
            </p>
          </div>
          <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-auto"
            >
              <option value="">All environments</option>
              {environments.map((env) => (
                <option key={env.id} value={env.slug}>
                  {env.kind === "ephemeral"
                    ? `${env.name}${env.expired ? " (expired)" : ""}`
                    : env.name}
                </option>
              ))}
            </select>
              <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New release
            </button>
          </div>
        </div>

        {active && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 flex items-start gap-2">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
            <div className="min-w-0 text-xs sm:text-sm">
              <p className="font-medium text-foreground">Release in progress</p>
              <p className="text-muted-foreground truncate">
                {active.name} · {modeLabels[active.mode]} · {active.environment}
                {queued.length > 0 ? ` · ${queued.length} waiting in queue` : ""}
              </p>
                        </div>
                      </div>
        )}

        {drifted.some((i) => i.status === "stale") && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="font-medium text-foreground">Config drift / removed units</p>
              <p className="text-muted-foreground">
                Some infrastructure is stale or out of sync. Create a plan or apply release after
                reviewing the Infrastructure tab.
              </p>
                      </div>
                    </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load releases"}
              </div>
            )}

        {submitNote && !showModal && (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            {submitNote}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-foreground">Release queue</h2>
              <span className="text-xs text-muted-foreground">
                {isLoading ? "loading…" : `${filtered.length} releases`}
              </span>
            </div>

            {!isLoading && filtered.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-3">
                <Rocket className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground">No releases yet.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When desired-state JSON changes, create a <strong>plan</strong> release to preview
                  or an <strong>apply</strong> release to converge. Custom CLI is available as a
                  backdoor.
                </p>
                <button
                  type="button"
                  onClick={openModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  New release
                </button>
              </div>
            ) : (
              <div>{filtered.map(renderRow)}</div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground">How releases work</h3>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <FileSearch className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <span>
                    <strong className="text-foreground">Plan</strong> — terraform plan only (safe
                    preview).
                  </span>
                </li>
                <li className="flex gap-2">
                  <Play className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <span>
                    <strong className="text-foreground">Apply</strong> — live converge from desired
                    JSON.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Terminal className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <span>
                    <strong className="text-foreground">Custom</strong> — run an allowed{" "}
                    <code className="font-mono">grid …</code> CLI command.
                  </span>
                </li>
                <li className="flex gap-2">
                  <ListOrdered className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Only one release deploys at a time; others wait in the queue.</span>
                </li>
              </ul>
                      </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h3 className="text-sm font-medium text-foreground">Queue status</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-secondary/50 p-3">
                  <p className="text-lg font-semibold text-foreground">{active ? 1 : 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Running
                      </p>
                    </div>
                <div className="rounded-md bg-secondary/50 p-3">
                  <p className="text-lg font-semibold text-foreground">{queued.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Waiting
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-xl sm:rounded-xl border border-border bg-card shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                  <h2 className="text-sm font-semibold text-foreground">New release</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedProject?.name || projectSlug || "No project"}
                    {selectedEnv ? ` · ${selectedEnv.name}` : ""}
                </p>
              </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-md hover:bg-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {active && (
                  <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                    A release is already running. Yours will be <strong>queued</strong> until it
                    finishes.
            </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Release type</label>
                  <div
                    className={`grid gap-2 ${isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
                  >
                    {(
                      [
                        { id: "plan" as const, label: "Plan", icon: FileSearch },
                        { id: "apply" as const, label: "Apply", icon: Play },
                        ...(isAdmin
                          ? [{ id: "destroy" as const, label: "Destroy", icon: Trash2 }]
                          : []),
                        { id: "custom" as const, label: "Custom", icon: Terminal },
                      ] as const
                    ).map((opt) => (
              <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMode(opt.id)}
                        className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-xs transition-colors ${
                          mode === opt.id
                            ? opt.id === "destroy"
                              ? "border-destructive/50 bg-destructive/10 text-foreground"
                              : "border-primary/50 bg-primary/10 text-foreground"
                            : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <opt.icon
                          className={`w-4 h-4 ${
                            mode === opt.id && opt.id === "destroy" ? "text-destructive" : ""
                          }`}
                        />
                        {opt.label}
              </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {mode === "plan" && "Dry-run: show what would change (terraform plan)."}
                    {mode === "apply" && "Live: apply desired-state JSON to the cloud."}
                    {mode === "destroy" &&
                      "Admin only: tear down the selected unit (terraform destroy)."}
                    {mode === "custom" && "Backdoor: run an allowed grid CLI command."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Environment</label>
                  <select
                    value={environment}
                    onChange={(e) => {
                      setEnvironment(e.target.value);
                      setProvider("");
                      setInfrastructureId("");
                    }}
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select environment…</option>
                    {environments.map((env) => (
                      <option key={env.id} value={env.slug}>
                        {env.name}
                      </option>
                    ))}
                  </select>
                </div>

                {mode !== "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Provider</label>
                    <select
                      value={provider}
                      onChange={(e) => {
                        setProvider(e.target.value);
                        setInfrastructureId("");
                      }}
                      className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">All providers</option>
                      {providersForEnv.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {mode !== "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Infrastructure</label>
                    <select
                      value={infrastructureId}
                      onChange={(e) => setInfrastructureId(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select unit…</option>
                      {infraForEnv.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.provider ? `${i.provider} · ` : ""}
                          {i.name}
                          {i.status === "stale" ? " (removed from config)" : ` · ${i.status}`}
                        </option>
                      ))}
                    </select>
                    {environment && infraForEnv.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        No infrastructure in this environment
                        {provider ? ` for ${provider}` : ""}. Sync config or pick another env/provider.
                      </p>
                    )}
                  </div>
                )}

                {mode === "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Grid CLI command
                    </label>
                      <textarea
                      value={customCommand}
                      onChange={(e) => setCustomCommand(e.target.value)}
                      rows={3}
                        spellCheck={false}
                      className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="grid plan --config-dir ."
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Allowed subcommands: status, deploy, destroy, plan, generate, validate, prune,
                      init, catalog…
                    </p>
                        </div>
                      )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Name <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    value={releaseName}
                    onChange={(e) => setReleaseName(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Release name"
                  />
                </div>

                {submitNote && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {submitNote}
                    </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                      <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 text-sm border border-border rounded-md hover:bg-secondary"
                >
                  Cancel
                      </button>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={createRelease.isPending}
                  className={`px-3 py-2 text-sm rounded-md hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 ${
                    mode === "destroy"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {createRelease.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {mode === "destroy"
                    ? active
                      ? "Queue destroy"
                      : "Start destroy"
                    : active
                      ? "Queue release"
                      : "Start release"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
};

export default ReleasesPage;
