import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  useDriftCheck,
  useDriftCheckStatus,
  useGitOpsStatus,
  useSyncGitOps,
} from "@/hooks/useGridApi";
import { DriftResultCard } from "@/components/DriftResultCard";
import { isDriftCheckPending } from "@/lib/driftCheckStore";

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
  // Re-render when any drift check flips pending (list has many ids).
  useDriftCheckStatus(undefined);

  const tracked = status?.infrastructures || [];
  const ahead = tracked.filter((r) => r.desiredAhead);
  const anyDriftPending = driftCheck.isPending || tracked.some((r) => isDriftCheckPending(r.id));

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
    setNote("Checking drift…");
    try {
      const report = await driftCheck.mutateAsync(id);
      setNote(
        report.kind === "unknown"
          ? "Drift check failed"
          : report.hasDrift
            ? "Drift detected"
            : "No drift"
      );
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
          {tracked.map((row) => (
            <DriftTrackedRow
              key={row.id}
              row={row}
              onOpen={() => navigate(`/infrastructure/${row.id}`)}
              onDrift={() => void handleDrift(row.id)}
              disableDrift={anyDriftPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DriftTrackedRow({
  row,
  onOpen,
  onDrift,
  disableDrift,
}: {
  row: {
    id: string;
    name: string;
    gitPath?: string;
    desiredAhead?: boolean;
  };
  onOpen: () => void;
  onDrift: () => void;
  disableDrift: boolean;
}) {
  const { isPending, report } = useDriftCheckStatus(row.id);

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <button
            type="button"
            className="text-sm font-medium text-foreground hover:underline text-left"
            onClick={onOpen}
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
            onClick={onDrift}
            disabled={disableDrift}
            className="px-2 py-1 text-xs border border-border rounded-md hover:bg-secondary disabled:opacity-50"
          >
            {isPending ? "Checking…" : "Check drift"}
          </button>
        </div>
      </div>
      {isPending && !report && (
        <p className="text-xs text-muted-foreground">Checking drift…</p>
      )}
      {report && !isPending && <DriftResultCard report={report} />}
    </div>
  );
}
