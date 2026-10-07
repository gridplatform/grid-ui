import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Bell, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useAlerts } from "@/hooks/useGridApi";
import type { AlertStatus } from "@/types/api";

const statusStyles: Record<AlertStatus, string> = {
  firing: "bg-destructive/10 text-destructive",
  acknowledged: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
};
const statusIcons: Record<AlertStatus, React.ElementType> = {
  firing: AlertTriangle,
  acknowledged: Clock,
  resolved: CheckCircle2,
};

const AlertsPage = () => {
  const { data: alerts = [], isLoading, error } = useAlerts();
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "">("");

  const filtered = useMemo(() => {
    if (!statusFilter) return alerts;
    return alerts.filter((a) => a.status === statusFilter);
  }, [alerts, statusFilter]);

  const firingCount = alerts.filter((a) => a.status === "firing").length;
  const acknowledgedCount = alerts.filter((a) => a.status === "acknowledged").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;

  return (
    <AppShell activeTab="alerts">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alerts
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Alerts derived from infrastructure inventory status.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Firing", count: firingCount, style: statusStyles.firing },
            { label: "Acknowledged", count: acknowledgedCount, style: statusStyles.acknowledged },
            { label: "Resolved", count: resolvedCount, style: statusStyles.resolved },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-lg border border-border bg-card">
              <p className={`text-2xl font-semibold ${s.style.split(" ")[1]}`}>{s.count}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load alerts"}
          </div>
        )}

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AlertStatus | "")}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All statuses</option>
            <option value="firing">Firing</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Active alerts</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading ? "loading…" : `${filtered.length} alerts`}
            </span>
          </div>
          {!isLoading && filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No alerts.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((alert) => {
                const Icon = statusIcons[alert.status] || AlertTriangle;
                return (
                  <div key={alert.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon className={`w-4 h-4 mt-0.5 ${statusStyles[alert.status]?.split(" ")[1]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{alert.ruleName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyles[alert.status]}`}>
                          {alert.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{alert.severity}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {alert.resource} · {new Date(alert.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default AlertsPage;
