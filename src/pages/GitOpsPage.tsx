import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { GitBranch, RefreshCw, Save, AlertTriangle } from "lucide-react";
import {
  useGitOpsStatus,
  useSaveGitOpsSettings,
  useSyncGitOps,
  useDriftCheck,
} from "@/hooks/useGridApi";
import { useNavigate } from "react-router-dom";

const GitOpsPage = () => {
  const navigate = useNavigate();
  const { data: status, isLoading, refetch } = useGitOpsStatus();
  const saveSettings = useSaveGitOpsSettings();
  const sync = useSyncGitOps();
  const driftCheck = useDriftCheck();

  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [pathPrefix, setPathPrefix] = useState("");
  const [syncIntervalSec, setSyncIntervalSec] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [driftById, setDriftById] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (hydrated || !status?.settings) return;
    setRepoUrl(status.settings.repoUrl || "");
    setBranch(status.settings.branch || "main");
    setPathPrefix(status.settings.pathPrefix || "");
    setSyncIntervalSec(status.settings.syncIntervalSec || 0);
    setEnabled(status.settings.enabled !== false);
    setHydrated(true);
  }, [status, hydrated]);

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync({
        repoUrl,
        branch,
        pathPrefix,
        syncIntervalSec,
        enabled,
      });
      setNote("GitOps settings saved.");
      await refetch();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync();
      setNote(
        `Sync ok — ${result.synced} files · created ${result.created.length} · updated ${result.updated.length} · unchanged ${result.unchanged.length}` +
          (result.commit ? ` · ${result.commit.slice(0, 8)}` : "")
      );
      await refetch();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Sync failed");
    }
  };

  const handleDrift = async (id: string) => {
    try {
      const report = await driftCheck.mutateAsync(id);
      setDriftById((prev) => ({ ...prev, [id]: report }));
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Drift check failed");
    }
  };

  return (
    <AppShell activeTab="gitops">
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            GitOps desired state
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Point Grid at the Git repo where you commit desired-state JSON under{" "}
            <code className="font-mono">projects/&lt;app&gt;/&lt;cloud&gt;/&lt;env&gt;/…</code>
            . Sync pulls that tree into <code className="font-mono">GRID_CONFIG_ROOT</code>; drift
            compares desired state to Terraform state / live.
          </p>
        </div>

        {note && (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            {note}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-medium text-foreground">Repository</h2>
          <label className="block text-xs text-muted-foreground">
            Repo URL
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/gridplatform/grid-config.git"
              className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-xs text-muted-foreground">
              Branch
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Path prefix
              <input
                value={pathPrefix}
                onChange={(e) => setPathPrefix(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Auto-sync (seconds, 0=off)
              <input
                type="number"
                min={0}
                value={syncIntervalSec}
                onChange={(e) => setSyncIntervalSec(Number(e.target.value) || 0)}
                className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void handleSave()}
              disabled={saveSettings.isPending}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={() => void handleSync()}
              disabled={sync.isPending}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-secondary flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sync.isPending ? "animate-spin" : ""}`} />
              Sync now
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-medium text-foreground">Status</h2>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <dt className="text-muted-foreground">Sync</dt>
              <dd className="text-foreground font-mono">{status?.syncStatus || "idle"}</dd>
              <dt className="text-muted-foreground">Last sync</dt>
              <dd className="text-foreground font-mono">{status?.lastSyncAt || "—"}</dd>
              <dt className="text-muted-foreground">Commit</dt>
              <dd className="text-foreground font-mono truncate">
                {status?.lastCommit?.slice(0, 12) || "—"}
                {status?.lastCommitMessage ? ` · ${status.lastCommitMessage}` : ""}
              </dd>
              <dt className="text-muted-foreground">Tracked</dt>
              <dd className="text-foreground font-mono">{status?.trackedCount ?? 0}</dd>
              {status?.lastSyncError && (
                <>
                  <dt className="text-destructive">Error</dt>
                  <dd className="text-destructive">{status.lastSyncError}</dd>
                </>
              )}
            </dl>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Synced infrastructures</h2>
            <p className="text-xs text-muted-foreground mt-1">
              After Sync, check drift, then open the resource to Plan / Apply.
            </p>
          </div>
          {(status?.infrastructures || []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              None yet. Commit <code className="font-mono">infrastructures/&lt;name&gt;/grid.json</code>{" "}
              in your repo, then Sync.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(status?.infrastructures || []).map((row) => {
                const report = driftById[row.id] as
                  | {
                      hasDrift?: boolean;
                      kind?: string;
                      summary?: string;
                      changes?: string[];
                      actions?: { applyGitDesired?: string; updateGitToMatchLive?: string };
                    }
                  | undefined;
                return (
                  <div key={row.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <button
                          className="text-sm font-medium text-foreground hover:underline"
                          onClick={() => navigate(`/infrastructure/${row.id}`)}
                        >
                          {row.name}
                        </button>
                        <p className="text-[11px] text-muted-foreground font-mono">{row.gitPath}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {row.desiredAhead && (
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-warning/10 text-warning flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Git ahead
                          </span>
                        )}
                        <button
                          onClick={() => void handleDrift(row.id)}
                          disabled={driftCheck.isPending}
                          className="px-2 py-1 text-xs border border-border rounded-md hover:bg-secondary disabled:opacity-50"
                        >
                          Check drift
                        </button>
                        <button
                          onClick={() => navigate(`/infrastructure/${row.id}`)}
                          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                    {report && (
                      <div className="rounded-md border border-border bg-background p-3 text-xs space-y-1">
                        <p className="text-foreground font-medium">
                          {report.kind}
                          {report.hasDrift ? " · changes detected" : " · in sync"}
                        </p>
                        <p className="text-muted-foreground">{report.summary}</p>
                        {report.changes?.slice(0, 8).map((c, i) => (
                          <p key={i} className="font-mono text-muted-foreground">
                            {c}
                          </p>
                        ))}
                        {report.actions && (
                          <div className="pt-2 space-y-1 text-muted-foreground">
                            <p>
                              <span className="text-foreground">Match Git → live:</span>{" "}
                              {report.actions.applyGitDesired}
                            </p>
                            <p>
                              <span className="text-foreground">Keep live → update Git:</span>{" "}
                              {report.actions.updateGitToMatchLive}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default GitOpsPage;
