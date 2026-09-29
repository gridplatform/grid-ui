import { useMemo, useState } from "react";
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
} from "lucide-react";
import {
  useCreateRelease,
  useEnvironments,
  useInfrastructures,
  usePendingApprovals,
  useReleases,
} from "@/hooks/useGridApi";
import { DeploymentLiveLogs } from "@/components/DeploymentLiveLogs";
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
  rolled_back: { label: "Rolled back", color: "bg-muted text-muted-foreground", icon: Calendar },
};

const modeLabels: Record<ReleaseMode, string> = {
  plan: "Plan",
  apply: "Apply (live)",
  custom: "Custom CLI",
};

const ReleasesPage = () => {
  const { data: releases = [], isLoading, error } = useReleases();
  const { data: approvals = [] } = usePendingApprovals();
  const { data: environments = [] } = useEnvironments();
  const { data: infrastructures = [] } = useInfrastructures();
  const createRelease = useCreateRelease();

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
    setEnvironment(environments[0]?.slug || "");
    setProvider("");
    setInfrastructureId("");
    setCustomCommand("grid status --config-dir .");
    setReleaseName("");
    setShowModal(true);
  };

  const handleCreate = async () => {
    setSubmitNote(null);
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

  const renderRow = (release: Release) => {
    const sc = statusConfig[release.status] ?? {
      label: release.status,
      color: "bg-muted text-muted-foreground",
      icon: Clock,
    };
    const Icon = sc.icon;
    const open = expandedId === release.id;
    return (
      <div key={release.id} className="border-b border-border last:border-b-0">
        <button
          type="button"
          onClick={() => {
            setExpandedId(open ? null : release.id);
            if (release.deploymentId) setWatchingId(release.deploymentId);
          }}
          className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
        >
          <div className="min-w-0 flex items-start sm:items-center gap-3">
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
              </p>
              {release.message && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{release.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 pl-7 sm:pl-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
              {sc.label}
            </span>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {new Date(release.createdAt).toLocaleString()}
            </span>
          </div>
        </button>
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
              Plan or apply desired-state changes. One release runs at a time; others queue.
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
                <h2 className="text-sm font-semibold text-foreground">New release</h2>
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
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "plan", label: "Plan", icon: FileSearch },
                        { id: "apply", label: "Apply", icon: Play },
                        { id: "custom", label: "Custom", icon: Terminal },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMode(opt.id)}
                        className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-xs transition-colors ${
                          mode === opt.id
                            ? "border-primary/50 bg-primary/10 text-foreground"
                            : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {mode === "plan" && "Dry-run: show what would change (terraform plan)."}
                    {mode === "apply" && "Live: apply desired-state JSON to the cloud."}
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
                      placeholder="grid status --config-dir ."
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
                    placeholder="e.g. staging VPC plan"
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
                  className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {createRelease.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {active ? "Queue release" : "Start release"}
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
