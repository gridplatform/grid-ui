import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { ArrowLeft, Activity } from "lucide-react";
import { useInfrastructure, useMetrics } from "@/hooks/useGridApi";

const MonitoringDetailPage = () => {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const { data: infra, isLoading, error } = useInfrastructure(resourceId || "");
  const { data: metrics = [], isLoading: metricsLoading } = useMetrics(resourceId || "", "1h");

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
              <div>
                <h1 className="text-lg font-semibold text-foreground">{infra.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {infra.environment} · {infra.provider} · {infra.status}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium text-foreground mb-3">Metrics (1h)</h2>
              {metricsLoading ? (
                <p className="text-sm text-muted-foreground">Loading metrics…</p>
              ) : metrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No metrics available for this resource yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {metrics.map((series) => (
                    <div key={series.metric} className="text-sm">
                      <p className="font-medium text-foreground">{series.metric}</p>
                      <p className="text-xs text-muted-foreground">
                        {series.data.length} data points
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
