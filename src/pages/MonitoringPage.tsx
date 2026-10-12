import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Activity, ChevronRight, Search, Server } from "lucide-react";
import { useEnvironments, useMonitoringDashboards } from "@/hooks/useGridApi";
import type { HealthStatus } from "@/types/api";

const healthColors: Record<HealthStatus, string> = {
  healthy: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
  unknown: "bg-muted text-muted-foreground",
};

const MonitoringPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState<HealthStatus | "">("");
  const { data: dashboards = [], isLoading, error } = useMonitoringDashboards();
  const { data: environments = [] } = useEnvironments();

  const filtered = useMemo(() => {
    return dashboards.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.health.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.resourceStatus.toLowerCase().includes(searchQuery.toLowerCase());
      const matchEnv = !envFilter || r.environment === envFilter;
      const matchHealth = !healthFilter || r.health === healthFilter;
      return matchSearch && matchEnv && matchHealth;
    });
  }, [dashboards, searchQuery, envFilter, healthFilter]);

  const counts = useMemo(() => {
    return {
      healthy: dashboards.filter((d) => d.health === "healthy").length,
      warning: dashboards.filter((d) => d.health === "warning").length,
      critical: dashboards.filter((d) => d.health === "critical").length,
      unknown: dashboards.filter((d) => d.health === "unknown").length,
    };
  }, [dashboards]);

  const healthCards: { key: HealthStatus; label: string; count: number; style: string }[] = [
    { key: "healthy", label: "Healthy", count: counts.healthy, style: healthColors.healthy },
    { key: "warning", label: "Warning", count: counts.warning, style: healthColors.warning },
    { key: "critical", label: "Critical", count: counts.critical, style: healthColors.critical },
    { key: "unknown", label: "Unknown", count: counts.unknown, style: healthColors.unknown },
  ];

  return (
    <AppShell activeTab="monitoring">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Monitoring
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Fleet health from the metrics backend when configured; otherwise
            control-plane inventory status. Click a status card to filter.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {healthCards.map(({ key, label, count, style }) => {
            const active = healthFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setHealthFilter((prev) => (prev === key ? "" : key))}
                aria-pressed={active}
                className={`p-3 rounded-lg border bg-card text-left transition-colors focus:outline-none focus:ring-1 focus:ring-ring ${
                  active
                    ? "border-ring ring-1 ring-ring"
                    : "border-border hover:bg-secondary/40"
                }`}
              >
                <p className={`text-xl font-semibold ${style.split(" ")[1]}`}>{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load monitoring dashboards"}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search resources…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All environments</option>
            {environments.map((env) => (
              <option key={env.id} value={env.slug}>
                {env.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Resources</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading ? "loading…" : `${filtered.length} items`}
            </span>
          </div>
          {!isLoading && filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {dashboards.length === 0
                ? "No monitored resources yet."
                : "No resources match this filter."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((resource) => (
                <button
                  key={resource.id}
                  onClick={() => navigate(`/monitoring/${resource.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Server className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{resource.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {resource.provider} · {resource.environment} ·{" "}
                        {resource.resourceStatus}
                        {resource.source ? ` · ${resource.source}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        healthColors[resource.health] || healthColors.unknown
                      }`}
                    >
                      {resource.health}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default MonitoringPage;
