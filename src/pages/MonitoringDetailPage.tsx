import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { ArrowLeft, Activity } from "lucide-react";
import { useInfraHealth, useInfrastructure, useMetrics } from "@/hooks/useGridApi";
import type { HealthStatus } from "@/types/api";

const healthColors: Record<HealthStatus, string> = {
  healthy: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
  unknown: "bg-muted text-muted-foreground",
};

const MonitoringDetailPage = () => {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const id = resourceId || "";
  const { data: infra, isLoading, error } = useInfrastructure(id);
  const { data: health, isLoading: healthLoading } = useInfraHealth(id);
  const { data: metrics = [], isLoading: metricsLoading } = useMetrics(id, "1h");

  return (
    <AppShell activeTab="monitoring">
      <div className="p-6 space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/monitoring")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Monitoring
        </button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error || !infra ? (
          <p className="text-sm text-muted-foreground">Resource not found.</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-foreground">{infra.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {infra.environment} · {infra.provider} · {infra.status}
                </p>
              </div>
              {health && (
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    healthColors[health.status] || healthColors.unknown
                  }`}
                >
                  {health.status}
                </span>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h2 className="text-sm font-medium text-foreground">Live health</h2>
              {healthLoading ? (
                <p className="text-sm text-muted-foreground">Loading health…</p>
              ) : health ? (
                <>
                  <p className="text-sm text-foreground">{health.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Source: {health.source} · Updated {new Date(health.updatedAt).toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Health unavailable.</p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium text-foreground mb-3">Lifecycle metrics</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Lifecycle metrics from inventory and the latest deployment.
              </p>
              {metricsLoading ? (
                <p className="text-sm text-muted-foreground">Loading metrics…</p>
              ) : metrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No metrics available for this resource yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {metrics.map((series) => (
                    <div key={series.metric} className="text-sm border border-border rounded-md p-3">
                      <p className="font-medium text-foreground">{series.metric}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Object.entries(series.labels)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(" · ")}
                      </p>
                      <p className="text-xs text-foreground mt-2">
                        Latest:{" "}
                        <span className="font-mono">
                          {series.data[series.data.length - 1]?.value ?? "—"}
                        </span>{" "}
                        at {series.data[series.data.length - 1]?.timestamp
                          ? new Date(series.data[series.data.length - 1]!.timestamp).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default MonitoringDetailPage;
