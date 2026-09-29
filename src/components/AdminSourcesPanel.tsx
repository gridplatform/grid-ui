import { useEffect, useState } from "react";
import { FolderGit2, RefreshCw, Save } from "lucide-react";
import {
  useGitOpsStatus,
  useSaveGitOpsSettings,
  useSyncGitOps,
  useModuleBankStatus,
  useSyncModuleBank,
} from "@/hooks/useGridApi";

/**
 * Admin-only: where desired-state JSON and the Terraform module bank come from.
 * Named "Sources" so "GitOps" stays free for future Argo CD / CD pipelines.
 */
export function AdminSourcesPanel() {
  const { data: status, isLoading, refetch } = useGitOpsStatus();
  const saveSettings = useSaveGitOpsSettings();
  const syncDesiredState = useSyncGitOps();
  const { data: moduleBank, refetch: refetchModuleBank } = useModuleBankStatus();
  const syncModuleBank = useSyncModuleBank();

  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [pathPrefix, setPathPrefix] = useState("");
  const [syncIntervalSec, setSyncIntervalSec] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [moduleNote, setModuleNote] = useState<string | null>(null);

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
      setNote("Source settings saved.");
      await refetch();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDesiredStateSync = async () => {
    try {
      const result = await syncDesiredState.mutateAsync();
      setNote(
        `Desired state synced · ${result.synced} files · +${result.created.length} · ~${result.updated.length}` +
          (result.commit ? ` · ${result.commit.slice(0, 8)}` : "")
      );
      await refetch();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Sync failed");
    }
  };

  const handleModuleBankSync = async () => {
    try {
      const result = await syncModuleBank.mutateAsync();
      setModuleNote(
        `Module bank synced` +
          (result.lastCommit ? ` · ${result.lastCommit.slice(0, 8)}` : "") +
          (result.lastCommitMessage ? ` · ${result.lastCommitMessage}` : "")
      );
      await refetchModuleBank();
    } catch (e) {
      setModuleNote(e instanceof Error ? e.message : "Module bank sync failed");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <FolderGit2 className="w-4 h-4" />
          Sources
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Configure where Grid pulls <strong>desired-state</strong> JSON and the{" "}
          <strong>Terraform module bank</strong>. Sync is available here and on Infrastructure
          (drift lives on Infrastructure).
        </p>
      </div>

      {note && (
        <p className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2 bg-background">
          {note}
        </p>
      )}

      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-medium text-foreground">Desired-state repository</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Git repo with{" "}
              <code className="font-mono">projects/&lt;app&gt;/&lt;cloud&gt;/&lt;env&gt;/…</code>.
              Synced into <code className="font-mono">GRID_CONFIG_ROOT</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleDesiredStateSync()}
            disabled={syncDesiredState.isPending || !enabled}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncDesiredState.isPending ? "animate-spin" : ""}`}
            />
            {syncDesiredState.isPending ? "Syncing…" : "Sync"}
          </button>
        </div>
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
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveSettings.isPending}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          Save settings
        </button>
        {!isLoading && (
          <dl className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
            <dt className="text-muted-foreground">Last status</dt>
            <dd className="font-mono text-foreground">{status?.syncStatus || "idle"}</dd>
            <dt className="text-muted-foreground">Last sync</dt>
            <dd className="font-mono text-foreground">{status?.lastSyncAt || "—"}</dd>
            <dt className="text-muted-foreground">Commit</dt>
            <dd className="font-mono text-foreground truncate">
              {status?.lastCommit?.slice(0, 12) || "—"}
            </dd>
          </dl>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-medium text-foreground">Terraform module bank</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Local checkout under <code className="font-mono">GRID_DATA_DIR/module-bank</code>. Sync
              when upstream modules change — generates never re-fetch from Git.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleModuleBankSync()}
            disabled={syncModuleBank.isPending || moduleBank?.remote === false}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncModuleBank.isPending ? "animate-spin" : ""}`}
            />
            {syncModuleBank.isPending ? "Syncing…" : "Sync modules"}
          </button>
        </div>
        {moduleNote && (
          <p className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2">
            {moduleNote}
          </p>
        )}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-mono text-foreground break-all">{moduleBank?.source || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Local path</dt>
            <dd className="font-mono text-foreground break-all">{moduleBank?.localPath || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="text-foreground">
              {moduleBank?.remote === false
                ? "local path"
                : moduleBank?.syncStatus || "—"}
              {moduleBank?.lastCommit ? ` · ${moduleBank.lastCommit.slice(0, 8)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last sync</dt>
            <dd className="text-foreground">{moduleBank?.lastSyncAt || "—"}</dd>
          </div>
        </dl>
        {moduleBank?.lastSyncError && (
          <p className="text-xs text-destructive">{moduleBank.lastSyncError}</p>
        )}
      </div>
    </div>
  );
}
