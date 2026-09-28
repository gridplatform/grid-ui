import { useState, useMemo, useEffect, useRef } from "react";
import AppShell from "@/components/AppShell";
import {
  Search, Filter, Clock, ArrowDown, ArrowUp, Pause, Play, X, Tag,
  ChevronDown, ChevronRight, AlertTriangle, Info, Bug, Skull, FileText,
} from "lucide-react";
import TimeRangePicker, { timeRanges, type TimeRange } from "@/components/TimeRangePicker";

// ─── Types ───────────────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  id: string;
  timestamp: string;
  line: string;
  labels: Record<string, string>;
  level: LogLevel;
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const availableLabels: Record<string, string[]> = {
  app: ["api-gateway", "auth-service", "payment-service", "user-service", "notification-service", "ml-inference", "scheduler"],
  env: ["production", "staging", "development"],
  provider: ["aws", "gcp"],
  cluster: ["prod-eks-1", "staging-eks-1", "prod-gke-1"],
  namespace: ["default", "kube-system", "monitoring", "app"],
  node: ["ip-10-0-1-42", "ip-10-0-2-18", "ip-10-0-3-77", "gke-node-pool-a-01"],
};

const logMessages: Array<{ level: LogLevel; line: string; app: string }> = [
  { level: "info", line: "GET /api/v1/users 200 12ms", app: "api-gateway" },
  { level: "info", line: "POST /api/v1/auth/token 200 45ms", app: "auth-service" },
  { level: "warn", line: "Connection pool nearing limit: 47/50 active connections", app: "payment-service" },
  { level: "error", line: "Failed to process payment: timeout after 30s — retrying (attempt 2/3)", app: "payment-service" },
  { level: "info", line: "Health check passed: all dependencies healthy", app: "user-service" },
  { level: "debug", line: "Cache hit for key user:12345:profile — TTL remaining 142s", app: "user-service" },
  { level: "error", line: "OOMKilled: container exceeded memory limit 512Mi", app: "ml-inference" },
  { level: "fatal", line: "FATAL: database connection refused — postgres:5432 unreachable", app: "payment-service" },
  { level: "info", line: "Scheduled job cron-cleanup completed in 3.2s — 847 records archived", app: "scheduler" },
  { level: "warn", line: "TLS certificate expires in 14 days for *.prod.internal", app: "api-gateway" },
  { level: "info", line: "Deployment rollout complete: auth-service v2.4.1 → v2.4.2 (3/3 replicas ready)", app: "auth-service" },
  { level: "error", line: "Unhandled exception in /api/v1/notifications/send: TypeError: Cannot read property 'email' of undefined", app: "notification-service" },
  { level: "debug", line: "gRPC call to user-service.GetProfile: 2.1ms, status=OK", app: "api-gateway" },
  { level: "warn", line: "Disk usage at 82% on /data volume — threshold 80%", app: "payment-service" },
  { level: "info", line: "Model inference batch processed: 128 requests in 1.4s, avg latency 11ms", app: "ml-inference" },
  { level: "info", line: "WebSocket connection established: client_id=ws-8a3f2b, origin=dashboard.prod.internal", app: "api-gateway" },
  { level: "error", line: "Redis READONLY: cannot write to replica — failover in progress", app: "auth-service" },
  { level: "warn", line: "Rate limit triggered for IP 203.0.113.42: 150 req/min exceeded", app: "api-gateway" },
  { level: "info", line: "Kafka consumer group rebalanced: 6 partitions assigned to 3 consumers", app: "notification-service" },
  { level: "debug", line: "JWT token validated: sub=user:67890, exp=1709251200, iss=auth-service", app: "auth-service" },
  { level: "fatal", line: "PANIC: runtime error: index out of range [5] with length 3", app: "scheduler" },
  { level: "info", line: "GPU utilization: 78%, memory 34.2/80GB, temp 67°C — healthy", app: "ml-inference" },
  { level: "warn", line: "Slow query detected: SELECT * FROM orders WHERE ... took 4.2s", app: "payment-service" },
  { level: "info", line: "NAT Gateway bandwidth: 2.4 Gbps ingress, 1.8 Gbps egress", app: "api-gateway" },
];

const generateMockLogs = (count: number): LogEntry[] => {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const msg = logMessages[i % logMessages.length];
    const ts = new Date(now - (count - i) * 2300);
    const env = i % 7 === 0 ? "staging" : "production";
    const cluster = env === "staging" ? "staging-eks-1" : (msg.app === "ml-inference" ? "prod-gke-1" : "prod-eks-1");
    return {
      id: `log-${i}`,
      timestamp: ts.toISOString(),
      line: msg.line,
      level: msg.level,
      labels: {
        app: msg.app,
        env,
        provider: cluster.includes("gke") ? "gcp" : "aws",
        cluster,
        namespace: msg.app === "ml-inference" ? "ml" : "app",
        node: availableLabels.node[i % availableLabels.node.length],
      },
    };
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const levelIcons: Record<LogLevel, React.ElementType> = {
  debug: Bug, info: Info, warn: AlertTriangle, error: Skull, fatal: Skull,
};

const levelStyles: Record<LogLevel, string> = {
  debug: "text-muted-foreground",
  info: "text-info",
  warn: "text-warning",
  error: "text-destructive",
  fatal: "text-destructive font-bold",
};

const levelBgStyles: Record<LogLevel, string> = {
  debug: "bg-muted/50",
  info: "",
  warn: "bg-warning/5",
  error: "bg-destructive/5",
  fatal: "bg-destructive/10",
};

const formatTimestamp = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
    "." + d.getMilliseconds().toString().padStart(3, "0");
};

// ─── Component ───────────────────────────────────────────────────────────────

const LoggingPage = () => {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "">("");
  const [labelFilters, setLabelFilters] = useState<Record<string, string>>({});
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>(timeRanges.find(t => t.value === "1h")!);
  const [tailing, setTailing] = useState(true);
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logs] = useState(() => generateMockLogs(200));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when tailing
  useEffect(() => {
    if (tailing && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tailing, logs]);

  const filtered = useMemo(() => {
    let result = logs;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(l => l.line.toLowerCase().includes(q) || Object.values(l.labels).some(v => v.toLowerCase().includes(q)));
    }
    if (levelFilter) result = result.filter(l => l.level === levelFilter);
    Object.entries(labelFilters).forEach(([k, v]) => {
      if (v) result = result.filter(l => l.labels[k] === v);
    });
    return sortDesc ? [...result].reverse() : result;
  }, [logs, query, levelFilter, labelFilters, sortDesc]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
    filtered.forEach(l => counts[l.level]++);
    return counts;
  }, [filtered]);

  const activeFilterCount = Object.values(labelFilters).filter(Boolean).length + (levelFilter ? 1 : 0);

  const clearFilters = () => { setLevelFilter(""); setLabelFilters({}); setQuery(""); };

  return (
    <AppShell activeTab="logging">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Logging</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Centralized log search & real-time tailing. Backend: Grafana Loki + Alloy.
            </p>
          </div>
          <TimeRangePicker selected={timeRange} onChange={setTimeRange} />
        </div>

        {/* Search & filters bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Search logs… (e.g. "timeout" or {app="api-gateway"})'
              className="w-full bg-secondary border border-border rounded-md pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>

          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as LogLevel | "")}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All levels</option>
            {(["debug", "info", "warn", "error", "fatal"] as LogLevel[]).map(l => (
              <option key={l} value={l}>{l.toUpperCase()} ({levelCounts[l]})</option>
            ))}
          </select>

          {/* Label filter toggle */}
          <button
            onClick={() => setShowLabelPicker(!showLabelPicker)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border transition-colors ${
              activeFilterCount > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:bg-accent"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Labels
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">{activeFilterCount}</span>
            )}
          </button>

          {/* Sort */}
          <button
            onClick={() => setSortDesc(!sortDesc)}
            className="flex items-center gap-1 px-3 py-2 rounded-md text-sm border border-border bg-secondary text-foreground hover:bg-accent transition-colors"
            title={sortDesc ? "Newest first" : "Oldest first"}
          >
            {sortDesc ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
          </button>

          {/* Tail toggle */}
          <button
            onClick={() => setTailing(!tailing)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border transition-colors ${
              tailing ? "border-success bg-success/10 text-success" : "border-border bg-secondary text-foreground hover:bg-accent"
            }`}
          >
            {tailing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {tailing ? "Tailing" : "Paused"}
          </button>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Label picker panel */}
        {showLabelPicker && (
          <div className="p-4 rounded-lg border border-border bg-card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(availableLabels).map(([label, values]) => (
              <div key={label}>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
                <select
                  value={labelFilters[label] || ""}
                  onChange={e => setLabelFilters(prev => ({ ...prev, [label]: e.target.value }))}
                  className="w-full mt-1 bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">All</option>
                  {values.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {filtered.length} entries</span>
          <span className="flex items-center gap-1 text-destructive"><Skull className="w-3 h-3" /> {levelCounts.error + levelCounts.fatal} errors</span>
          <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-3 h-3" /> {levelCounts.warn} warnings</span>
          {tailing && <span className="flex items-center gap-1 text-success animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Live</span>}
        </div>

        {/* Log stream */}
        <div
          ref={scrollRef}
          className="rounded-lg border border-border bg-card overflow-auto font-mono text-xs"
          style={{ maxHeight: "calc(100vh - 340px)" }}
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No logs matching your query.</div>
          ) : (
            filtered.map(log => {
              const LevelIcon = levelIcons[log.level];
              const expanded = expandedLog === log.id;
              return (
                <div key={log.id} className={`border-b border-border last:border-b-0 ${levelBgStyles[log.level]}`}>
                  <button
                    onClick={() => setExpandedLog(expanded ? null : log.id)}
                    className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-muted/30 transition-colors"
                  >
                    {expanded ? <ChevronDown className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />}
                    <span className="text-muted-foreground/60 shrink-0 w-[90px]">{formatTimestamp(log.timestamp)}</span>
                    <LevelIcon className={`w-3 h-3 mt-0.5 shrink-0 ${levelStyles[log.level]}`} />
                    <span className={`shrink-0 w-[50px] uppercase ${levelStyles[log.level]}`}>{log.level}</span>
                    <span className="text-primary/80 shrink-0 w-[140px] truncate">[{log.labels.app}]</span>
                    <span className="text-foreground truncate">{log.line}</span>
                  </button>

                  {expanded && (
                    <div className="px-3 py-2 ml-5 mb-1 space-y-2 bg-muted/20 rounded mx-2">
                      <div className="text-[10px] text-muted-foreground">
                        <span className="font-medium text-foreground">Full timestamp:</span> {log.timestamp}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(log.labels).map(([k, v]) => (
                          <button
                            key={k}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLabelFilters(prev => ({ ...prev, [k]: v }));
                            }}
                            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            <span className="text-foreground">{k}</span>=<span className="text-primary">{v}</span>
                          </button>
                        ))}
                      </div>
                      <div className="text-[10px] text-foreground bg-card rounded p-2 border border-border whitespace-pre-wrap">{log.line}</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default LoggingPage;
