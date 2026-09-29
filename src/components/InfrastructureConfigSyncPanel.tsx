import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useDriftCheck, useGitOpsStatus, useSyncGitOps } from "@/hooks/useGridApi";

/**
 * Operator-facing desired-state sync + drift for units tracked from the config repo.
 * Repo URL / auto-sync interval live under Admin → Sources.
 */
export function InfrastructureConfigSyncPanel() {
  const navigate = useNavigate();
  const { data: status, refetch } = useGitOpsStatus();
  const sync = useSyncGitOps();
  const driftCheck = useDriftCheck();
  const [note, setNote] = useState<string | null>(null);
  const [driftById, setDriftById] = useState<Record<string, unknown>>({});

  const tracked = status?.infrastructures || [];
  const ahead = tracked.filter((r) => r.desiredAhead);

  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync();
      setNote(
        `Synced ${result.synced} files · +${result.created.length} · ~${result.updated.length}` +
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
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Synced from config</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pull desired-state into Grid, then check drift vs live. Source repo settings are under{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => navigate("/admin?tab=sources")}
            >
              Admin → Sources
            </button>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {status?.syncStatus || "idle"}
            {status?.lastSyncAt
              ? ` · ${new Date(status.lastSyncAt).toLocaleString()}`
              : ""}
            {ahead.length > 0 ? ` · ${ahead.length} ahead of apply` : ""}
          </span>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={sync.isPending}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sync.isPending ? "animate-spin" : ""}`} />
            {sync.isPending ? "Syncing…" : "Sync"}
          </button>
        </div>
      </div>

      {note && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border bg-background">
          {note}
        </div>
      )}

      {tracked.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No config-tracked units yet. Configure Sources in Admin, then Sync.
        </div>
      ) : (
        <div className="divide-y divide-border max-h-72 overflow-y-auto">
          {tracked.map((row) => {
            const report = driftById[row.id] as
              | {
                  hasDrift?: boolean;
                  kind?: string;
                  summary?: string;
                  changes?: string[];
                }
              | undefined;
            return (
              <div key={row.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="text-sm font-medium text-foreground hover:underline text-left"
                      onClick={() => navigate(`/infrastructure/${row.id}`)}
                    >
                      {row.name}
                    </button>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {row.gitPath}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.desiredAhead && (
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-warning/10 text-warning inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Config ahead
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDrift(row.id)}
                      disabled={driftCheck.isPending}
                      className="px-2 py-1 text-xs border border-border rounded-md hover:bg-secondary disabled:opacity-50"
                    >
                      Check drift
                    </button>
                  </div>
                </div>
                {report && (
                  <div className="rounded-md border border-border bg-background p-2 text-xs space-y-1">
                    <p className="text-foreground font-medium">
                      {report.kind}
                      {report.hasDrift ? " · changes detected" : " · in sync"}
                    </p>
                    <p className="text-muted-foreground">{report.summary}</p>
                    {report.changes?.slice(0, 4).map((c, i) => (
                      <p key={i} className="font-mono text-muted-foreground">
                        {c}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
