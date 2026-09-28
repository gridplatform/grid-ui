import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import {
  Activity, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight,
  Search, ChevronRight, ChevronLeft, Zap, GitBranch, ExternalLink,
  Server, Code, Hash, Layers,
} from "lucide-react";
import { mockServices, type APMService, type APMOperation, type APMTrace } from "@/data/apmMockData";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const latencyColor = (ms: number) => {
  if (ms < 200) return "text-success";
  if (ms < 1000) return "text-warning";
  return "text-destructive";
};

const serviceTypeIcons: Record<string, React.ElementType> = {
  gateway: Layers,
  web: Server,
  worker: Zap,
  ml: Activity,
  database: GitBranch,
  cache: Hash,
  queue: GitBranch,
};

const methodColors: Record<string, string> = {
  GET: "bg-success/10 text-success",
  POST: "bg-primary/10 text-primary",
  PUT: "bg-warning/10 text-warning",
  DELETE: "bg-destructive/10 text-destructive",
  PATCH: "bg-accent text-accent-foreground",
};

// ─── Component ───────────────────────────────────────────────────────────────

const APMPage = () => {
  const [selectedService, setSelectedService] = useState<APMService | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<APMOperation | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<APMTrace | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ok" | "error">("");

  // ─── Computed ────────────────────────────────────────────────────────────

  const filteredServices = useMemo(() =>
    mockServices.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );

  const filteredTraces = useMemo(() => {
    if (!selectedService) return [];
    let traces = selectedService.traces;
    if (selectedOperation) {
      traces = traces.filter(t => t.operationId === selectedOperation.id);
    }
    if (statusFilter) {
      traces = traces.filter(t => t.status === statusFilter);
    }
    return traces;
  }, [selectedService, selectedOperation, statusFilter]);

  const totalRequests = mockServices.reduce((s, svc) => s + svc.requests, 0);
  const avgErrorRate = mockServices.reduce((s, svc) => s + svc.errorRate, 0) / mockServices.length;
  const avgP50 = Math.round(mockServices.reduce((s, svc) => s + svc.p50, 0) / mockServices.length);
  const maxP99 = Math.max(...mockServices.map(s => s.p99));

  // ─── Render: Service Detail ─────────────────────────────────────────────

  if (selectedService) {
    return (
      <AppShell activeTab="apm">
        <div className="p-6 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => { setSelectedService(null); setSelectedOperation(null); setSelectedTrace(null); }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> All Services
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground font-medium">{selectedService.name}</span>
            {selectedOperation && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground font-medium">{selectedOperation.name}</span>
              </>
            )}
          </div>

          {/* Service header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {selectedService.name}
                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">{selectedService.language}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">{selectedService.framework}</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedService.instances} instances · {selectedService.env} · {selectedService.type}
              </p>
            </div>
          </div>

          {/* Service KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground">Requests (5m)</p>
              <p className="text-xl font-semibold text-foreground">{selectedService.requests.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground">Error Rate</p>
              <p className={`text-xl font-semibold ${selectedService.errorRate > 5 ? "text-destructive" : selectedService.errorRate > 1 ? "text-warning" : "text-success"}`}>
                {selectedService.errorRate}%
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground">p50</p>
              <p className={`text-xl font-semibold ${latencyColor(selectedService.p50)}`}>{formatDuration(selectedService.p50)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground">p95</p>
              <p className={`text-xl font-semibold ${latencyColor(selectedService.p95)}`}>{formatDuration(selectedService.p95)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground">p99</p>
              <p className={`text-xl font-semibold ${latencyColor(selectedService.p99)}`}>{formatDuration(selectedService.p99)}</p>
            </div>
          </div>

          {/* Operations table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-foreground">
                {selectedOperation ? "Traces" : "Operations / Endpoints"}
              </h2>
              {selectedOperation && (
                <button onClick={() => { setSelectedOperation(null); setSelectedTrace(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <ChevronLeft className="w-3 h-3" /> Back to operations
                </button>
              )}
            </div>

            {!selectedOperation ? (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_100px_80px_80px_80px_60px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
                  <span>Operation</span>
                  <span>Type</span>
                  <span>Requests</span>
                  <span>Error %</span>
                  <span>p50</span>
                  <span>p99</span>
                  <span>Trend</span>
                </div>
                {selectedService.operations.map(op => (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOperation(op)}
                    className="grid grid-cols-[1fr_80px_100px_80px_80px_80px_60px] gap-3 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {op.method && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${methodColors[op.method] || "bg-secondary text-foreground"}`}>
                          {op.method}
                        </span>
                      )}
                      <span className="text-sm text-foreground font-medium font-mono">{op.name.replace(`${op.method} `, "")}</span>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{op.type}</span>
                    <span className="text-sm text-foreground">{op.requests.toLocaleString()}</span>
                    <span className={`text-sm font-medium ${op.errorRate > 5 ? "text-destructive" : op.errorRate > 1 ? "text-warning" : "text-success"}`}>
                      {op.errorRate}%
                    </span>
                    <span className={`text-sm ${latencyColor(op.p50)}`}>{formatDuration(op.p50)}</span>
                    <span className={`text-sm ${latencyColor(op.p99)}`}>{formatDuration(op.p99)}</span>
                    <span className="flex items-center">
                      {op.trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5 text-destructive" /> :
                       op.trend === "down" ? <ArrowDownRight className="w-3.5 h-3.5 text-success" /> :
                       <Activity className="w-3.5 h-3.5 text-muted-foreground" />}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Traces for selected operation */
              <div className="space-y-4">
                {/* Operation KPI strip */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="p-2 rounded border border-border bg-card text-center">
                    <p className="text-xs text-muted-foreground">Requests</p>
                    <p className="text-lg font-semibold text-foreground">{selectedOperation.requests.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded border border-border bg-card text-center">
                    <p className="text-xs text-muted-foreground">Errors</p>
                    <p className={`text-lg font-semibold ${selectedOperation.errorRate > 1 ? "text-destructive" : "text-success"}`}>{selectedOperation.errorRate}%</p>
                  </div>
                  <div className="p-2 rounded border border-border bg-card text-center">
                    <p className="text-xs text-muted-foreground">p50</p>
                    <p className={`text-lg font-semibold ${latencyColor(selectedOperation.p50)}`}>{formatDuration(selectedOperation.p50)}</p>
                  </div>
                  <div className="p-2 rounded border border-border bg-card text-center">
                    <p className="text-xs text-muted-foreground">p95</p>
                    <p className={`text-lg font-semibold ${latencyColor(selectedOperation.p95)}`}>{formatDuration(selectedOperation.p95)}</p>
                  </div>
                  <div className="p-2 rounded border border-border bg-card text-center">
                    <p className="text-xs text-muted-foreground">p99</p>
                    <p className={`text-lg font-semibold ${latencyColor(selectedOperation.p99)}`}>{formatDuration(selectedOperation.p99)}</p>
                  </div>
                </div>

                {/* Filter bar */}
                <div className="flex items-center gap-3">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as "" | "ok" | "error")}
                    className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All statuses</option>
                    <option value="ok">OK</option>
                    <option value="error">Error</option>
                  </select>
                  <span className="text-xs text-muted-foreground">{filteredTraces.length} traces</span>
                </div>

                {/* Traces list */}
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="grid grid-cols-[1fr_140px_80px_60px_60px_80px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
                    <span>Operation</span>
                    <span>Trace ID</span>
                    <span>Duration</span>
                    <span>Spans</span>
                    <span>Status</span>
                    <span>Time</span>
                  </div>
                  {filteredTraces.map(trace => (
                    <div key={trace.id}>
                      <div
                        onClick={() => setSelectedTrace(selectedTrace?.id === trace.id ? null : trace)}
                        className="grid grid-cols-[1fr_140px_80px_60px_60px_80px] gap-3 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground font-medium">{trace.operation}</span>
                          {trace.statusCode && (
                            <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${trace.statusCode >= 500 ? "bg-destructive/10 text-destructive" : trace.statusCode >= 400 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                              {trace.statusCode}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono truncate">{trace.traceId}</span>
                        <span className={`text-sm font-medium ${latencyColor(trace.duration)}`}>{formatDuration(trace.duration)}</span>
                        <span className="text-xs text-muted-foreground">{trace.spans}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${trace.status === "ok" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {trace.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{trace.timestamp}</span>
                      </div>

                      {/* Expanded trace detail */}
                      {selectedTrace?.id === trace.id && (
                        <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">
                              Trace <span className="font-mono text-muted-foreground">{trace.traceId}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground">{trace.spans} spans · {formatDuration(trace.duration)}</span>
                          </div>
                          {/* Waterfall */}
                          <div className="space-y-1">
                            {Array.from({ length: Math.min(trace.spans, 8) }, (_, i) => {
                              const spanDur = Math.round(trace.duration * (0.1 + Math.random() * 0.4));
                              const offset = Math.round(Math.random() * 50);
                              const isErr = trace.status === "error" && i === 1;
                              return (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-24 truncate text-right">
                                    {i === 0 ? selectedService.name : `span-${i}`}
                                  </span>
                                  <div className="flex-1 h-4 relative bg-secondary/50 rounded-sm overflow-hidden">
                                    <div
                                      className={`absolute top-0 h-full rounded-sm ${isErr ? "bg-destructive/60" : "bg-primary/40"}`}
                                      style={{ left: `${offset}%`, width: `${Math.min(100 - offset, Math.max(5, (spanDur / trace.duration) * 100))}%` }}
                                    />
                                  </div>
                                  <span className={`text-[10px] w-12 text-right ${isErr ? "text-destructive" : "text-muted-foreground"}`}>
                                    {formatDuration(spanDur)}
                                  </span>
                                </div>
                              );
                            })}
                            {trace.spans > 8 && <p className="text-[10px] text-muted-foreground text-center">+ {trace.spans - 8} more spans</p>}
                          </div>
                          {/* Tags */}
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                            {Object.entries(trace.tags).map(([k, v]) => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{k}={v}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // ─── Render: Service List (default view) ────────────────────────────────

  return (
    <AppShell activeTab="apm">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Application Performance Monitoring</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Service catalog · Click a service to view operations, endpoints & traces
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://www.jaegertracing.io" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              Jaeger <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-muted-foreground">·</span>
            <a href="https://opentelemetry.io" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              OTel <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Server className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-semibold text-foreground">{mockServices.length}</p><p className="text-sm text-muted-foreground">Services</p></div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><GitBranch className="w-5 h-5 text-success" /></div>
            <div><p className="text-2xl font-semibold text-foreground">{(totalRequests / 1000).toFixed(0)}k</p><p className="text-sm text-muted-foreground">Requests (5m)</p></div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-2xl font-semibold text-foreground">{avgErrorRate.toFixed(1)}%</p><p className="text-sm text-muted-foreground">Avg Error Rate</p></div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Clock className="w-5 h-5 text-warning" /></div>
            <div><p className="text-2xl font-semibold text-foreground">{formatDuration(avgP50)}</p><p className="text-sm text-muted-foreground">Avg p50</p></div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search services…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        {/* Services table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_120px_100px_80px_80px_80px_60px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
            <span>Service</span>
            <span>Type</span>
            <span>Requests (5m)</span>
            <span>Error Rate</span>
            <span>p50</span>
            <span>p99</span>
            <span>Instances</span>
            <span>Trend</span>
          </div>
          {filteredServices.map(svc => {
            const Icon = serviceTypeIcons[svc.type] || Server;
            return (
              <div
                key={svc.id}
                onClick={() => { setSelectedService(svc); setSelectedOperation(null); setSelectedTrace(null); }}
                className="grid grid-cols-[1fr_100px_120px_100px_80px_80px_80px_60px] gap-3 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-secondary flex items-center justify-center">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <span className="text-sm text-foreground font-medium">{svc.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{svc.language} · {svc.framework}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground capitalize">{svc.type}</span>
                <span className="text-sm text-foreground">{svc.requests.toLocaleString()}</span>
                <span className={`text-sm font-medium ${svc.errorRate > 5 ? "text-destructive" : svc.errorRate > 1 ? "text-warning" : "text-success"}`}>
                  {svc.errorRate}%
                </span>
                <span className={`text-sm ${latencyColor(svc.p50)}`}>{formatDuration(svc.p50)}</span>
                <span className={`text-sm ${latencyColor(svc.p99)}`}>{formatDuration(svc.p99)}</span>
                <span className="text-sm text-foreground">{svc.instances}</span>
                <span className="flex items-center">
                  {svc.trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5 text-destructive" /> :
                   svc.trend === "down" ? <ArrowDownRight className="w-3.5 h-3.5 text-success" /> :
                   <Activity className="w-3.5 h-3.5 text-muted-foreground" />}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default APMPage;
