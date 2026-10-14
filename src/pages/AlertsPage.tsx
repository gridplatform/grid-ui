import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Settings,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  useAlerts,
  useAlertRules,
  useAlertChannels,
  useUpsertAlertRule,
  useDeleteAlertRule,
  useUpsertAlertChannel,
  useDeleteAlertChannel,
} from "@/hooks/useGridApi";
import type {
  AlertChannel,
  AlertChannelType,
  AlertRule,
  AlertSeverity,
  AlertStatus,
} from "@/types/api";

const statusStyles: Record<AlertStatus, string> = {
  firing: "bg-destructive/10 text-destructive",
  suppressed: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
};
const statusIcons: Record<AlertStatus, React.ElementType> = {
  firing: AlertTriangle,
  suppressed: Clock,
  resolved: CheckCircle2,
};

const inputClass =
  "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

const AlertsPage = () => {
  const { data: alerts = [], isLoading, error } = useAlerts();
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "">("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"rules" | "channels">("rules");

  const filtered = useMemo(() => {
    if (!statusFilter) return alerts;
    return alerts.filter((a) => a.status === statusFilter);
  }, [alerts, statusFilter]);

  const firingCount = alerts.filter((a) => a.status === "firing").length;
  const suppressedCount = alerts.filter((a) => a.status === "suppressed").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;

  return (
    <AppShell activeTab="alerts">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alerts
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Active firings from Alertmanager. Use Settings to manage rules and channels.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-secondary"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Firing", count: firingCount, style: statusStyles.firing },
            { label: "Suppressed", count: suppressedCount, style: statusStyles.suppressed },
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
            <option value="suppressed">Suppressed</option>
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
            <div className="p-8 text-center text-sm text-muted-foreground">
              No alerts. Create a rule in Settings when you are ready.
            </div>
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

      {settingsOpen && (
        <AlertSettingsPanel
          tab={settingsTab}
          onTabChange={setSettingsTab}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </AppShell>
  );
};

function AlertSettingsPanel({
  tab,
  onTabChange,
  onClose,
}: {
  tab: "rules" | "channels";
  onTabChange: (t: "rules" | "channels") => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-lg border-l border-border bg-background shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Alert settings</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Rules → Prometheus · Channels → Alertmanager · applies on save.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 border-b border-border px-4 py-2">
          {(
            [
              ["rules", "Rules"],
              ["channels", "Channels"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`rounded-md px-3 py-1.5 text-xs ${
                tab === id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "rules" ? <RulesSettings /> : <ChannelsSettings />}
        </div>
      </div>
    </div>
  );
}

function RulesSettings() {
  const { data: rules = [], isLoading } = useAlertRules();
  const { data: channels = [] } = useAlertChannels();
  const upsert = useUpsertAlertRule();
  const remove = useDeleteAlertRule();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState('up{grid_unit_id!=""} == 0');
  const [forDuration, setForDuration] = useState("5m");
  const [severity, setSeverity] = useState<AlertSeverity>("warning");
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const onCreate = async () => {
    setFormError(null);
    try {
      await upsert.mutateAsync({
        name,
        description,
        condition,
        forDuration,
        severity,
        channelIds,
        enabled: true,
      });
      setName("");
      setDescription("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save rule");
    }
  };

  const toggleChannel = (id: string) => {
    setChannelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-border p-3">
        <h3 className="text-xs font-medium text-foreground flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New alert rule
        </h3>
        <input className={inputClass} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className={inputClass}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <textarea
          className={`${inputClass} font-mono text-xs min-h-[72px]`}
          placeholder="PromQL condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass}
            placeholder="for (e.g. 5m)"
            value={forDuration}
            onChange={(e) => setForDuration(e.target.value)}
          />
          <select
            className={inputClass}
            value={severity}
            onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
          >
            <option value="critical">critical</option>
            <option value="warning">warning</option>
            <option value="info">info</option>
          </select>
        </div>
        {channels.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">Notify channels</p>
            {channels.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={channelIds.includes(c.id)}
                  onChange={() => toggleChannel(c.id)}
                />
                {c.name} ({c.type})
              </label>
            ))}
          </div>
        )}
        {formError && <p className="text-xs text-destructive">{formError}</p>}
        <button
          type="button"
          disabled={!name.trim() || !condition.trim() || upsert.isPending}
          onClick={onCreate}
          className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {upsert.isPending ? "Saving…" : "Create rule"}
        </button>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium text-foreground">Configured rules</h3>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rules yet.</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {rules.map((r: AlertRule) => (
              <div key={r.id} className="flex items-start gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{r.name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">{r.condition}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.severity} · for {r.forDuration} · {r.enabled ? "enabled" : "disabled"}
                  </p>
                </div>
                <button
                  type="button"
                  className="p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(r.id)}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ChannelsSettings() {
  const { data: channels = [], isLoading } = useAlertChannels();
  const upsert = useUpsertAlertChannel();
  const remove = useDeleteAlertChannel();
  const [name, setName] = useState("");
  const [type, setType] = useState<AlertChannelType>("webhook");
  const [url, setUrl] = useState("");
  const [to, setTo] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const onCreate = async () => {
    setFormError(null);
    try {
      await upsert.mutateAsync({
        name,
        type,
        url: type === "email" ? undefined : url,
        to: type === "email" ? to : undefined,
        enabled: true,
      });
      setName("");
      setUrl("");
      setTo("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save channel");
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-border p-3">
        <h3 className="text-xs font-medium text-foreground flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New channel
        </h3>
        <input className={inputClass} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value as AlertChannelType)}
        >
          <option value="webhook">webhook</option>
          <option value="slack">slack</option>
          <option value="email">email</option>
        </select>
        {type === "email" ? (
          <input
            className={inputClass}
            placeholder="to@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        ) : (
          <input
            className={inputClass}
            placeholder={type === "slack" ? "Slack webhook URL" : "Webhook URL"}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        )}
        {formError && <p className="text-xs text-destructive">{formError}</p>}
        <button
          type="button"
          disabled={
            !name.trim() ||
            upsert.isPending ||
            (type === "email" ? !to.trim() : !url.trim())
          }
          onClick={onCreate}
          className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {upsert.isPending ? "Saving…" : "Create channel"}
        </button>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium text-foreground">Configured channels</h3>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : channels.length === 0 ? (
          <p className="text-xs text-muted-foreground">No channels yet.</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {channels.map((c: AlertChannel) => (
              <div key={c.id} className="flex items-start gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {c.type}
                    {c.url ? ` · ${c.url}` : ""}
                    {c.to ? ` · ${c.to}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(c.id)}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AlertsPage;
