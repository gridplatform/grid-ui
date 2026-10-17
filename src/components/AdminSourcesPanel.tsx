import { useEffect, useState } from "react";
import { FolderGit2, RefreshCw, Save } from "lucide-react";
import {
  useGitOpsStatus,
  useSaveGitOpsSettings,
  useSyncGitOps,
  useModuleBankStatus,
  useSyncModuleBank,
  useSaveModuleBankSettings,
} from "@/hooks/useGridApi";

function authExpiryBanner(expiresAt?: string): { kind: "ok" | "warn" | "error"; text: string } | null {
  if (!expiresAt) return null;
  const end = new Date(`${expiresAt}T23:59:59Z`).getTime();
  if (Number.isNaN(end)) return null;
  const days = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) {
    return {
      kind: "error",
      text: `Host Git token marked expired on ${expiresAt}. Create a new PAT/deploy token on your Git host and update Sources.`,
    };
  }
  if (days <= 14) {
    return {
      kind: "warn",
      text: `Host Git token expires on ${expiresAt} (${days} day${days === 1 ? "" : "s"} left). Rotate before Sync breaks.`,
    };
  }
  return { kind: "ok", text: `Host Git token valid until ${expiresAt}.` };
}

/**
 * Admin-only: where intent JSON and the Terraform module bank come from.
 * Named "Sources" so "GitOps" stays free for future Argo CD / CD pipelines.
 */
export function AdminSourcesPanel() {
  const { data: status, isLoading, refetch } = useGitOpsStatus();
  const saveSettings = useSaveGitOpsSettings();
  const syncDesiredState = useSyncGitOps();
  const { data: moduleBank, refetch: refetchModuleBank } = useModuleBankStatus();
  const syncModuleBank = useSyncModuleBank();
  const saveModuleBankSettings = useSaveModuleBankSettings();

  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [pathPrefix, setPathPrefix] = useState("");
  const [syncIntervalSec, setSyncIntervalSec] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [gitUsername, setGitUsername] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");
  const [clearAuth, setClearAuth] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [moduleNote, setModuleNote] = useState<string | null>(null);
  const [moduleVersion, setModuleVersion] = useState("main");
  const [moduleSyncIntervalSec, setModuleSyncIntervalSec] = useState(20);
  const [moduleHydrated, setModuleHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !status?.settings) return;
    setRepoUrl(status.settings.repoUrl || "");
    setBranch(status.settings.branch || "main");
    setPathPrefix(status.settings.pathPrefix || "");
    setSyncIntervalSec(status.settings.syncIntervalSec || 0);
    setEnabled(status.settings.enabled !== false);
    setTokenExpiresAt(status.settings.authExpiresAt || "");
    setHydrated(true);
  }, [status, hydrated]);

  const handleSave = async () => {
    try {
      const body: Parameters<typeof saveSettings.mutateAsync>[0] = {
        repoUrl,
        branch,
        pathPrefix,
        syncIntervalSec,
        enabled,
      };
      if (clearAuth) {
        body.clearAuth = true;
      } else {
        if (gitToken.trim()) {
          if (!gitUsername.trim()) {
            setNote(
              "HTTPS username is required when saving a new token (e.g. git, oauth2, x-token-auth)."
            );
            return;
          }
          if (!tokenExpiresAt.trim()) {
            setNote(
              "Set “Token valid until” to the expiry date from your Git host (required when saving a new token)."
            );
            return;
          }
          body.username = gitUsername.trim();
          body.token = gitToken.trim();
          body.tokenExpiresAt = tokenExpiresAt.trim();
        } else {
          if (gitUsername.trim()) body.username = gitUsername.trim();
          if (tokenExpiresAt.trim() && status?.settings?.authConfigured) {
            body.tokenExpiresAt = tokenExpiresAt.trim();
          }
        }
      }
      const saved = await saveSettings.mutateAsync(body);
      setGitToken("");
      setClearAuth(false);
      setNote(
        saved.authConfigured
          ? `Source settings saved (HTTPS auth configured${
              saved.authExpiresAt ? `, valid until ${saved.authExpiresAt}` : ""
            }).`
          : "Source settings saved."
      );
      await refetch();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Save failed");
    }
  };

  const expiryInfo = status?.settings?.authConfigured
    ? authExpiryBanner(status.settings.authExpiresAt)
    : null;

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

  useEffect(() => {
    if (!moduleBank || moduleHydrated) return;
    setModuleVersion(moduleBank.version || moduleBank.ref || "main");
    setModuleSyncIntervalSec(
      typeof moduleBank.syncIntervalSec === "number" ? moduleBank.syncIntervalSec : 20
    );
    setModuleHydrated(true);
  }, [moduleBank, moduleHydrated]);

  const handleModuleBankSync = async () => {
    try {
      const result = await syncModuleBank.mutateAsync({ version: moduleVersion });
      setModuleNote(
        `Module bank synced · version ${result.version || moduleVersion}` +
          (result.lastCommit ? ` · ${result.lastCommit.slice(0, 8)}` : "") +
          (result.lastCommitMessage ? ` · ${result.lastCommitMessage}` : "")
      );
      await refetchModuleBank();
    } catch (e) {
      setModuleNote(e instanceof Error ? e.message : "Module bank sync failed");
    }
  };

  const handleSaveModuleBank = async () => {
    try {
      const result = await saveModuleBankSettings.mutateAsync({
        version: moduleVersion,
        syncIntervalSec: moduleSyncIntervalSec,
      });
      setModuleNote(
        `Saved · version ${result.settings.version} · auto-sync every ${result.settings.syncIntervalSec}s` +
          (result.status.lastCommit ? ` · ${result.status.lastCommit.slice(0, 8)}` : "")
      );
      await refetchModuleBank();
    } catch (e) {
      setModuleNote(e instanceof Error ? e.message : "Save module bank settings failed");
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
          Configure where Grid pulls <strong>intent</strong> JSON (any Git host) and the{" "}
          <strong>Terraform module bank</strong>. Sync is available
          here and on Infrastructure (drift lives on Infrastructure).
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
            <h3 className="text-sm font-medium text-foreground">Intent repository</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Private or public Git repo with{" "}
              <code className="font-mono">projects/&lt;app&gt;/&lt;cloud&gt;/&lt;env&gt;/…</code>.
              Synced into <code className="font-mono">GRID_CONFIG_ROOT</code>. HTTPS tokens are
              stored under the data directory (not in the URL); SSH deploy keys on the host also
              work.
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
            placeholder="https://git.example.com/org/intent.git or git@host:org/intent.git"
            className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
          />
        </label>
        <p className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2 bg-secondary/40">
          Grid does <strong>not</strong> generate this secret. Create a{" "}
          <strong>personal access token</strong>, <strong>deploy token</strong>, or{" "}
          <strong>app password</strong> on your Git host
          with read access to the intent repo, paste it below, and set when that host token
          expires.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block text-xs text-muted-foreground">
            HTTPS username (required with token)
            <input
              value={gitUsername}
              onChange={(e) => setGitUsername(e.target.value)}
              placeholder="git (GitLab: oauth2, Bitbucket: x-token-auth)"
              autoComplete="off"
              required={Boolean(gitToken.trim())}
              className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Host token (PAT / deploy token)
            <input
              type="password"
              value={gitToken}
              onChange={(e) => {
                setGitToken(e.target.value);
                if (e.target.value) setClearAuth(false);
              }}
              placeholder={
                status?.settings?.authConfigured
                  ? "•••• configured — leave blank to keep"
                  : "Paste token from your Git host"
              }
              autoComplete="new-password"
              className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Token valid until
            <input
              type="date"
              value={tokenExpiresAt}
              onChange={(e) => {
                setTokenExpiresAt(e.target.value);
                if (e.target.value) setClearAuth(false);
              }}
              required={Boolean(gitToken.trim())}
              className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
            />
          </label>
        </div>
        {expiryInfo && (
          <p
            className={`text-xs rounded-md px-3 py-2 border ${
              expiryInfo.kind === "error"
                ? "border-destructive/40 text-destructive bg-destructive/5"
                : expiryInfo.kind === "warn"
                  ? "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/5"
                  : "border-border text-muted-foreground bg-background"
            }`}
          >
            {expiryInfo.text}
          </p>
        )}
        {status?.settings?.authConfigured && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={clearAuth}
              onChange={(e) => {
                setClearAuth(e.target.checked);
                if (e.target.checked) {
                  setGitToken("");
                  setTokenExpiresAt("");
                }
              }}
            />
            Clear stored HTTPS credentials
          </label>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block text-xs text-muted-foreground">
            Branch
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Path prefix
            <input
              value={pathPrefix}
              onChange={(e) => setPathPrefix(e.target.value)}
              placeholder="Optional subdirectory"
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
              Pick the <strong>module version</strong> to sync into{" "}
              <code className="font-mono">GRID_DATA_DIR/module-bank</code>. Generated Terraform uses
              the same version in <code className="font-mono">git::…?ref=</code>. Auto-sync keeps the
              checkout aligned (default every 20s; overlapping syncs are skipped).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleModuleBankSync()}
            disabled={
              syncModuleBank.isPending ||
              saveModuleBankSettings.isPending ||
              moduleBank?.syncInProgress === true ||
              moduleBank?.remote === false
            }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs text-muted-foreground">
            Module version
            <select
              value={moduleVersion}
              onChange={(e) => setModuleVersion(e.target.value)}
              disabled={moduleBank?.remote === false}
              className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
            >
              {(moduleBank?.availableVersions?.length
                ? moduleBank.availableVersions
                : [moduleVersion, "main"]
              ).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            Auto-sync interval (seconds, 0=off)
            <input
              type="number"
              min={0}
              value={moduleSyncIntervalSec}
              onChange={(e) => setModuleSyncIntervalSec(Number(e.target.value) || 0)}
              disabled={moduleBank?.remote === false}
              className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
            />
          </label>
        </div>
        <label className="block text-xs text-muted-foreground">
          Or type a tag / branch / commit
          <input
            value={moduleVersion}
            onChange={(e) => setModuleVersion(e.target.value)}
            disabled={moduleBank?.remote === false}
            placeholder="Release tag or branch"
            className="mt-1 w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground font-mono"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleSaveModuleBank()}
          disabled={
            saveModuleBankSettings.isPending ||
            syncModuleBank.isPending ||
            moduleBank?.remote === false
          }
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saveModuleBankSettings.isPending ? "Saving…" : "Save version & sync"}
        </button>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-mono text-foreground break-all">{moduleBank?.source || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Active version</dt>
            <dd className="font-mono text-foreground">
              {moduleBank?.version || moduleBank?.ref || "—"}
            </dd>
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
          <div>
            <dt className="text-muted-foreground">Auto-sync</dt>
            <dd className="text-foreground">
              {moduleBank?.syncIntervalSec
                ? `every ${moduleBank.syncIntervalSec}s`
                : "off"}
            </dd>
          </div>
        </dl>
        {moduleBank?.lastSyncError && (
          <p className="text-xs text-destructive">{moduleBank.lastSyncError}</p>
        )}
      </div>
    </div>
  );
}
