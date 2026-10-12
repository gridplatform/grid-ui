import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Activity, ChevronRight, Search, Server, X } from "lucide-react";
import { useEnvironments, useInfrastructures, useMonitoringDashboards } from "@/hooks/useGridApi";
import { infrastructureListVisibility } from "@/lib/catalogVisibility";
import { isConsoleProviderReleased } from "@/config/featureFlags";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { HealthStatus } from "@/types/api";

const healthColors: Record<HealthStatus, string> = {
  healthy: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
  unknown: "bg-muted text-muted-foreground",
};

const healthActiveBorder: Record<HealthStatus, string> = {
  healthy: "border-success ring-1 ring-success",
  warning: "border-warning ring-1 ring-warning",
  critical: "border-destructive ring-1 ring-destructive",
  unknown: "border-foreground/40 ring-1 ring-foreground/30",
};

const MonitoringPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState<HealthStatus | "">("");
  const { data: dashboards = [], isLoading, error } = useMonitoringDashboards();
  const { data: environments = [] } = useEnvironments();
  const { projectSlug, envSlug } = useWorkspace();
  const { data: infrastructures = [] } = useInfrastructures({
    project: projectSlug,
    environment: envSlug || undefined,
    enabled: true,
  });

  /** Subtype from infrastructure list when monitoring payload lacks it. */
  const infraTypeById = useMemo(() => {
    const m = new Map<string, { provider: string; type: string }>();
    for (const i of infrastructures) {
      m.set(i.id, { provider: i.provider, type: (i.type || "").toLowerCase() });
    }
    return m;
  }, [infrastructures]);

  const catalogScoped = useMemo(() => {
    return dashboards.filter((r) => {
      const meta = infraTypeById.get(r.id);
      const provider = meta?.provider || r.provider;
      const subtype = meta?.type || "";
      if (!subtype) {
        // No subtype in workspace cache — still honor provider release gate.
        return isConsoleProviderReleased(provider);
      }
      return infrastructureListVisibility(provider, subtype) !== "hidden";
    });
  }, [dashboards, infraTypeById]);

  const filtered = useMemo(() => {
    return catalogScoped.filter((r) => {
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
  }, [catalogScoped, searchQuery, envFilter, healthFilter]);

  const counts = useMemo(() => {
    return {
      healthy: catalogScoped.filter((d) => d.health === "healthy").length,
      warning: catalogScoped.filter((d) => d.health === "warning").length,
      critical: catalogScoped.filter((d) => d.health === "critical").length,
      unknown: catalogScoped.filter((d) => d.health === "unknown").length,
    };
  }, [catalogScoped]);

  const healthCards: { key: HealthStatus; label: string; count: number }[] = [
    { key: "healthy", label: "Healthy", count: counts.healthy },
    { key: "warning", label: "Warning", count: counts.warning },
    { key: "critical", label: "Critical", count: counts.critical },
    { key: "unknown", label: "Unknown", count: counts.unknown },
  ];

  const toggleHealth = (key: HealthStatus) => {
    setHealthFilter((prev) => (prev === key ? "" : key));
  };

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
            control-plane inventory status.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filter by health
            </p>
            {healthFilter ? (
              <button
                type="button"
                onClick={() => setHealthFilter("")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
                Clear filter
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {healthCards.map(({ key, label, count }) => {
              const active = healthFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleHealth(key)}
                  aria-pressed={active}
                  title={`Show ${label.toLowerCase()} only`}
                  className={`cursor-pointer p-3 rounded-lg border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? `${healthColors[key]} ${healthActiveBorder[key]}`
                      : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  <p
                    className={`text-xl font-semibold ${
                      active ? "" : healthColors[key].split(" ")[1]
                    }`}
                  >
                    {count}
                  </p>
                  <p className={`text-xs ${active ? "opacity-90" : "text-muted-foreground"}`}>
                    {label}
                    {active ? " · filtered" : ""}
                  </p>
                </button>
              );
            })}
          </div>
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
          <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-medium text-foreground">
              Resources
              {healthFilter ? (
                <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${healthColors[healthFilter]}`}>
                  {healthFilter}
                </span>
              ) : null}
            </h2>
            <span className="text-xs text-muted-foreground">
              {isLoading
                ? "loading…"
                : healthFilter
                  ? `${filtered.length} of ${catalogScoped.length} items`
                  : `${filtered.length} items`}
            </span>
          </div>
          {!isLoading && filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {catalogScoped.length === 0
                ? "No monitored resources for enabled catalog offerings."
                : "No resources match this filter."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((resource) => (
                <button
                  key={resource.id}
                  type="button"
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
