import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Activity, Search } from "lucide-react";
import { useAPMServices, useEnvironments } from "@/hooks/useGridApi";

const APMPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("");
  const { data: services = [], isLoading, error } = useAPMServices();
  const { data: environments = [] } = useEnvironments();

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchSearch =
        !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchEnv = !envFilter || s.environment === envFilter;
      return matchSearch && matchEnv;
    });
  }, [services, searchQuery, envFilter]);

  const totalRequests = filtered.reduce((sum, s) => sum + s.requests, 0);
  const avgErrorRate =
    filtered.length > 0
      ? filtered.reduce((sum, s) => sum + s.errorRate, 0) / filtered.length
      : 0;

  return (
    <AppShell activeTab="apm">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5" />
            APM
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Services from grid-core APM API.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-2xl font-semibold text-foreground">{filtered.length}</p>
            <p className="text-sm text-muted-foreground">Services</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-2xl font-semibold text-foreground">
              {filtered.length ? totalRequests.toLocaleString() : "—"}
            </p>
            <p className="text-sm text-muted-foreground">Requests</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-2xl font-semibold text-foreground">
              {filtered.length ? `${avgErrorRate.toFixed(2)}%` : "—"}
            </p>
            <p className="text-sm text-muted-foreground">Avg error rate</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-2xl font-semibold text-foreground">
              {filtered.length
                ? `${Math.max(...filtered.map((s) => s.p99))}ms`
                : "—"}
            </p>
            <p className="text-sm text-muted-foreground">Max P99</p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load APM services"}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search services…"
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
            <h2 className="text-sm font-medium text-foreground">Services</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading ? "loading…" : `${filtered.length} services`}
            </span>
          </div>
          {!isLoading && filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No APM services yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((svc) => (
                <div key={svc.id} className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-3 px-4 py-3 items-center">
                  <div>
                    <p className="text-sm font-medium text-foreground">{svc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {svc.language} · {svc.framework} · {svc.environment}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{svc.requests.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">{svc.errorRate}%</span>
                  <span className="text-xs text-muted-foreground">{svc.p50}ms</span>
                  <span className="text-xs text-muted-foreground">{svc.p99}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default APMPage;
