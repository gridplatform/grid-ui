import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_GRID_API_URL || "/api/v1";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== "false";

type LiveStatus = "pending" | "planning" | "running" | "success" | "failed" | "cancelled" | string;

export type DeploymentLiveLogsProps = {
  deploymentId: string | null;
  title?: string;
  className?: string;
};

/**
 * Streams CLI/terraform output for a deployment via SSE
 * (GET /deployments/:id/logs/stream). Falls back to polling if EventSource fails.
 */
export function DeploymentLiveLogs({
  deploymentId,
  title = "Live CLI output",
  className = "",
}: DeploymentLiveLogsProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<LiveStatus>("pending");
  const [progress, setProgress] = useState<number | undefined>();
  const [planSummary, setPlanSummary] = useState<string | undefined>();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!deploymentId || USE_MOCK) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    setLogs([]);
    setStatus("pending");
    setProgress(undefined);
    setPlanSummary(undefined);
    setError(null);
    setConnected(false);

    const applySnapshot = (data: {
      logs?: string[];
      status?: LiveStatus;
      progress?: number;
      planSummary?: string;
    }) => {
      if (data.logs) setLogs(data.logs);
      if (data.status) setStatus(data.status);
      if (data.progress != null) setProgress(data.progress);
      if (data.planSummary) setPlanSummary(data.planSummary);
    };

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/deployments/${deploymentId}/logs`);
          if (!res.ok) return;
          const data = (await res.json()) as {
            logs: string[];
            status: LiveStatus;
            progress?: number;
            planSummary?: string;
          };
          if (cancelled) return;
          applySnapshot(data);
          setConnected(true);
          if (data.status === "success" || data.status === "failed" || data.status === "cancelled") {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
          }
        } catch {
          // keep trying while active
        }
      }, 1000);
    };

    let gotSnapshot = false;

    try {
      es = new EventSource(`${API_BASE_URL}/deployments/${deploymentId}/logs/stream`);

      es.addEventListener("snapshot", (ev) => {
        const data = JSON.parse((ev as MessageEvent).data) as {
          logs: string[];
          status: LiveStatus;
          progress?: number;
          planSummary?: string;
        };
        applySnapshot(data);
        gotSnapshot = true;
        setConnected(true);
      });

      es.addEventListener("log", (ev) => {
        const data = JSON.parse((ev as MessageEvent).data) as {
          lines: string[];
          status: LiveStatus;
          progress?: number;
        };
        setLogs((prev) => [...prev, ...data.lines]);
        setStatus(data.status);
        if (data.progress != null) setProgress(data.progress);
        setConnected(true);
      });

      es.addEventListener("ping", (ev) => {
        const data = JSON.parse((ev as MessageEvent).data) as {
          status: LiveStatus;
          progress?: number;
        };
        setStatus(data.status);
        if (data.progress != null) setProgress(data.progress);
        setConnected(true);
      });

      es.addEventListener("done", (ev) => {
        const data = JSON.parse((ev as MessageEvent).data) as {
          status: LiveStatus;
          progress?: number;
          planSummary?: string;
          logs?: string[];
        };
        if (data.logs) setLogs(data.logs);
        setStatus(data.status);
        if (data.progress != null) setProgress(data.progress);
        if (data.planSummary) setPlanSummary(data.planSummary);
        es?.close();
      });

      es.onerror = () => {
        if (!gotSnapshot) {
          es?.close();
          setError("SSE unavailable — polling logs");
          startPolling();
        }
      };
    } catch {
      startPolling();
      setError("SSE unavailable — polling logs");
    }

    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect only when id changes
  }, [deploymentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (!deploymentId || USE_MOCK) return null;

  const active = status === "pending" || status === "planning" || status === "running";

  return (
    <div className={`rounded-lg border border-border bg-card overflow-hidden ${className}`}>
      <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {active ? <Loader2 className="w-3.5 h-3.5 animate-spin text-info" /> : null}
          <h3 className="text-sm font-medium text-foreground truncate">{title}</h3>
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
            {status}
          </span>
          {progress != null && (
            <span className="text-xs text-muted-foreground font-mono">{progress}%</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {connected ? "live" : "connecting…"}
          {error ? ` · ${error}` : ""}
        </span>
      </div>
      <pre className="h-56 overflow-auto bg-background p-3 text-[11px] leading-relaxed font-mono text-muted-foreground whitespace-pre-wrap">
        {logs.length === 0 ? (
          <span className="text-muted-foreground/70">Waiting for CLI output…</span>
        ) : (
          logs.map((line, i) => (
            <div key={`${i}-${line.slice(0, 24)}`}>{line}</div>
          ))
        )}
        <div ref={bottomRef} />
      </pre>
      {planSummary && (
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground font-mono whitespace-pre-wrap max-h-32 overflow-auto">
          {planSummary.split("\n").slice(0, 8).join("\n")}
        </div>
      )}
    </div>
  );
}
