import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import {
  Bell, GitBranch, RefreshCw, Plus, Trash2,
  Mail, MessageSquare, Webhook, Phone, AlertTriangle, Clock, CheckCircle2,
  Filter,
} from "lucide-react";
import {
  generateStressAlertRules, generateStressActiveAlerts,
  type StressAlertRule, type StressActiveAlert,
} from "@/data/stressTestData";

// ─── Types ───────────────────────────────────────────────────────────────────

type AlertSeverity = "critical" | "warning" | "info";
type AlertStatus = "firing" | "acknowledged" | "resolved";
type AlertChannel = "slack" | "pagerduty" | "email" | "webhook" | "opsgenie";

// ─── Style maps ──────────────────────────────────────────────────────────────

const channelIcons: Record<AlertChannel, React.ElementType> = {
  slack: MessageSquare, pagerduty: Phone, email: Mail, webhook: Webhook, opsgenie: Bell,
};
const channelLabels: Record<AlertChannel, string> = {
  slack: "Slack", pagerduty: "PagerDuty", email: "Email", webhook: "Webhook", opsgenie: "OpsGenie",
};
const severityStyles: Record<AlertSeverity, string> = {
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};
const statusStyles: Record<AlertStatus, string> = {
  firing: "bg-destructive/10 text-destructive",
  acknowledged: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
};
const statusIcons: Record<AlertStatus, React.ElementType> = {
  firing: AlertTriangle, acknowledged: Clock, resolved: CheckCircle2,
};

// ─── Component ───────────────────────────────────────────────────────────────

const INITIAL_RULES = generateStressAlertRules();
const INITIAL_ALERTS = generateStressActiveAlerts();

const AlertsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"active" | "rules">("active");
  const [alertRules, setAlertRules] = useState<StressAlertRule[]>(INITIAL_RULES);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "">("");
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing">("synced");
  const [lastSyncTime, setLastSyncTime] = useState("2 min ago");
  const [gitSource] = useState({ repo: "acme-org/infra-config", branch: "main" });
  const [visibleCount, setVisibleCount] = useState(50);

  const handleSync = () => {
    setSyncStatus("syncing");
    setTimeout(() => {
      setSyncStatus("synced");
      setLastSyncTime("just now");
      setAlertRules(prev => prev.map(a => ({ ...a, has_local_changes: false, last_synced: "just now" })));
    }, 2000);
  };

  const handleToggleAlert = (id: string) => {
    setAlertRules(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled, has_local_changes: true } : a));
  };

  const handleDeleteAlert = (id: string) => {
    setAlertRules(prev => prev.filter(a => a.id !== id));
  };

  const uncommittedCount = alertRules.filter(a => a.has_local_changes).length;

  const allAlerts = INITIAL_ALERTS;
  const firingCount = allAlerts.filter(a => a.status === "firing").length;
  const acknowledgedCount = allAlerts.filter(a => a.status === "acknowledged").length;
  const resolvedCount = allAlerts.filter(a => a.status === "resolved").length;

  const filteredAlerts = useMemo(() => {
    const base = statusFilter ? allAlerts.filter(a => a.status === statusFilter) : allAlerts;
    return base;
  }, [statusFilter, allAlerts]);

  const visibleAlerts = filteredAlerts.slice(0, visibleCount);

  return (
    <AppShell activeTab="alerts">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Alerts</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {allAlerts.length} alerts · {alertRules.length} rules · Sources: Prometheus Alertmanager, CloudWatch, GCP Monitoring.
            </p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div><p className="text-2xl font-semibold text-foreground">{firingCount}</p><p className="text-sm text-muted-foreground">Firing</p></div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div><p className="text-2xl font-semibold text-foreground">{acknowledgedCount}</p><p className="text-sm text-muted-foreground">Acknowledged</p></div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div><p className="text-2xl font-semibold text-foreground">{resolvedCount}</p><p className="text-sm text-muted-foreground">Resolved (24h)</p></div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div><p className="text-2xl font-semibold text-foreground">{alertRules.filter(a => a.enabled).length}</p><p className="text-sm text-muted-foreground">Active Rules</p></div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-0 border-b border-border">
          <button onClick={() => setTab("active")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "active" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> Active Alerts
              {firingCount > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 py-0.5">{firingCount}</span>}
            </span>
          </button>
          <button onClick={() => setTab("rules")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "rules" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <span className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" /> Alert Rules
              {uncommittedCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">{uncommittedCount}</span>}
            </span>
          </button>
        </div>

        {/* Active alerts tab */}
        {tab === "active" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {(["", "firing", "acknowledged", "resolved"] as const).map(s => (
                <button key={s || "all"} onClick={() => { setStatusFilter(s); setVisibleCount(50); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-accent"}`}>
                  {s || "All"} {s === "firing" ? `(${firingCount})` : s === "acknowledged" ? `(${acknowledgedCount})` : s === "resolved" ? `(${resolvedCount})` : `(${allAlerts.length})`}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {visibleAlerts.map(alert => {
                const StatusIcon = statusIcons[alert.status];
                return (
                  <div key={alert.id} className={`flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors ${alert.status === "firing" ? "bg-destructive/5" : ""}`}>
                    <StatusIcon className={`w-4 h-4 shrink-0 ${alert.status === "firing" ? "text-destructive" : alert.status === "acknowledged" ? "text-warning" : "text-success"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{alert.rule_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${severityStyles[alert.severity]}`}>{alert.severity}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusStyles[alert.status]}`}>{alert.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
                        <span>Resource: <span className="text-foreground">{alert.resource}</span></span>
                        <span>Started: {alert.started_at}</span>
                        {alert.acknowledged_by && <span>Ack'd by: {alert.acknowledged_by}</span>}
                        {alert.resolved_at && <span>Resolved: {alert.resolved_at}</span>}
                      </div>
                    </div>
                    {alert.status === "firing" && (
                      <button className="px-3 py-1.5 rounded-md text-xs bg-warning/10 text-warning hover:bg-warning/20 transition-colors">Acknowledge</button>
                    )}
                  </div>
                );
              })}
            </div>

            {visibleCount < filteredAlerts.length && (
              <div className="text-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 50)}
                  className="px-4 py-2 rounded-md text-sm border border-border text-foreground hover:bg-secondary transition-colors"
                >
                  Load more ({filteredAlerts.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rules tab */}
        {tab === "rules" && (
          <div className="space-y-6">
            {/* Git sync bar */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-foreground font-medium">{gitSource.repo}</span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-foreground">{gitSource.branch}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${syncStatus === "synced" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                  {syncStatus === "syncing" ? "Syncing…" : `Synced ${lastSyncTime}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {uncommittedCount > 0 && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                    <GitBranch className="w-3 h-3" /> Commit & Push ({uncommittedCount})
                  </button>
                )}
                <button onClick={handleSync} disabled={syncStatus === "syncing"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${syncStatus === "syncing" ? "animate-spin" : ""}`} /> Sync now
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border text-foreground hover:bg-secondary transition-colors">
                  <Plus className="w-3 h-3" /> New alert
                </button>
              </div>
            </div>

            {/* Rules table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">Alert Rules</h2>
                <span className="text-xs text-muted-foreground">{alertRules.length} rules · {alertRules.filter(a => a.enabled).length} active</span>
              </div>
              <div className="grid grid-cols-[minmax(200px,2fr)_1fr_100px_120px_1fr_100px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
                <span>Rule</span><span>Condition</span><span>Severity</span><span>Scope</span><span>Channels</span><span></span>
              </div>
              {alertRules.map(rule => (
                <div key={rule.id} className={`grid grid-cols-[minmax(200px,2fr)_1fr_100px_120px_1fr_100px] gap-3 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors ${rule.has_local_changes ? "bg-primary/5" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${rule.enabled ? "text-foreground" : "text-muted-foreground line-through"}`}>{rule.name}</span>
                      {rule.has_local_changes && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">modified</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{rule.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono truncate" title={rule.condition}>{rule.condition}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${severityStyles[rule.severity]}`}>{rule.severity}</span>
                  <span className="text-xs text-muted-foreground">{rule.resource_scope}</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {rule.channels.map(ch => {
                      const Icon = channelIcons[ch];
                      return <span key={ch} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"><Icon className="w-3 h-3" />{channelLabels[ch]}</span>;
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleAlert(rule.id)}
                      className={`px-2 py-1 rounded text-[10px] transition-colors ${rule.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {rule.enabled ? "On" : "Off"}
                    </button>
                    <button onClick={() => handleDeleteAlert(rule.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AlertsPage;
