import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAuthToken } from "@/lib/authStorage";

const API_BASE_URL = import.meta.env.VITE_GRID_API_URL || "/api/v1";

type LiveStatus = "pending" | "planning" | "running" | "success" | "failed" | "cancelled" | string;

type LogPayload = {
  logs?: string[];
  lines?: string[];
  status?: LiveStatus;
  progress?: number;
  planSummary?: string;
};

export type DeploymentLiveLogsProps = {
  deploymentId: string | null;
  title?: string;
  className?: string;
};

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isTerminal(status: LiveStatus | undefined): boolean {
  return status === "success" || status === "failed" || status === "cancelled";
}

/**
 * Streams CLI/terraform output for a deployment.
 * Uses authenticated fetch (EventSource cannot send Bearer tokens).
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
    if (!deploymentId) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const abort = new AbortController();

    setLogs([]);
    setStatus("pending");
    setProgress(undefined);
    setPlanSummary(undefined);
    setError(null);
    setConnected(false);

    const applySnapshot = (data: LogPayload) => {
      if (data.logs) setLogs(data.logs);
      if (data.lines?.length) setLogs((prev) => [...prev, ...data.lines!]);
      if (data.status) setStatus(data.status);
      if (data.progress != null) setProgress(data.progress);
      if (data.planSummary) setPlanSummary(data.planSummary);
    };

    const fetchLogsOnce = async (): Promise<LogPayload | null> => {
      const res = await fetch(`${API_BASE_URL}/deployments/${deploymentId}/logs`, {
        headers: authHeaders(),
        signal: abort.signal,
      });
      if (!res.ok) {
        if (res.status === 401) setError("Auth required — refresh and log in again");
        return null;
      }
      return (await res.json()) as LogPayload;
    };

    const startPolling = () => {
      if (pollTimer) return;
      setError((prev) => prev ?? "Polling logs");
      const tick = async () => {
        try {
          const data = await fetchLogsOnce();
          if (cancelled || !data) return;
          applySnapshot(data);
          setConnected(true);
          if (isTerminal(data.status)) {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
            setError(null);
          }
        } catch {
          /* keep trying while active */
        }
      };
      void tick();
      pollTimer = setInterval(() => void tick(), 1000);
    };

    /** Authenticated SSE via fetch — EventSource cannot send Authorization. */
    const startStream = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/deployments/${deploymentId}/logs/stream`, {
          headers: {
            ...authHeaders(),
            Accept: "text/event-stream",
          },
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          setError("Live stream unavailable — polling logs");
          startPolling();
          return;
        }

        setConnected(true);
        setError(null);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const chunk of parts) {
            const lines = chunk.split("\n");
            let event = "message";
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith("event:")) event = line.slice(6).trim();
              else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
            }
            if (dataLines.length === 0) continue;
            try {
              const data = JSON.parse(dataLines.join("\n")) as LogPayload & {
                message?: string;
              };
              if (event === "snapshot" || event === "done") {
                applySnapshot(data);
              } else if (event === "log") {
                applySnapshot(data);
              } else if (event === "ping") {
                if (data.status) setStatus(data.status);
                if (data.progress != null) setProgress(data.progress);
              } else if (event === "error") {
                setError(data.message || "Stream error");
              }
              if (event === "done" || isTerminal(data.status)) {
                setError(null);
                return;
              }
            } catch {
              /* ignore malformed SSE frames */
            }
          }
        }

        // Stream ended without done — finish via one-shot poll.
        if (!cancelled) startPolling();
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        setError("Live stream unavailable — polling logs");
        startPolling();
      }
    };

    // Immediate snapshot so finished releases show logs without waiting on SSE.
    void (async () => {
      try {
        const data = await fetchLogsOnce();
        if (cancelled || !data) {
          if (!cancelled) void startStream();
          return;
        }
        applySnapshot(data);
        setConnected(true);
        if (isTerminal(data.status)) {
          setError(null);
          return;
        }
        void startStream();
      } catch {
        if (!cancelled) void startStream();
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [deploymentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (!deploymentId) return null;

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
