import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Activity, ChevronRight, Search, Server } from "lucide-react";
import { useEnvironments, useInfrastructures } from "@/hooks/useGridApi";

const statusColors: Record<string, string> = {
  running: "bg-success/10 text-success",
  stopped: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
  degraded: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
};

const MonitoringPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("");
  const { data: infrastructures = [], isLoading, error } = useInfrastructures();
  const { data: environments = [] } = useEnvironments();

  const filtered = useMemo(() => {
    return infrastructures.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchEnv = !envFilter || r.environment === envFilter;
      return matchSearch && matchEnv;
    });
  }, [infrastructures, searchQuery, envFilter]);

  return (
    <AppShell activeTab="monitoring">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Monitoring
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Infrastructure from grid-core. Open a row for metrics when available.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load infrastructures"}
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
              No monitored resources yet.
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
                        {resource.type} · {resource.environment} · {resource.region}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        statusColors[resource.status] || statusColors.pending
                      }`}
                    >
                      {resource.status}
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
