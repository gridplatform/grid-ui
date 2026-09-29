import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Rocket, Clock, CheckCircle2, XCircle, ListOrdered, Calendar, Loader2,
} from "lucide-react";
import {
  useEnvironments,
  usePendingApprovals,
  useReleases,
} from "@/hooks/useGridApi";
import type { ReleaseStatus } from "@/types/api";

const statusConfig: Partial<
  Record<ReleaseStatus | string, { label: string; color: string; icon: React.ElementType }>
> = {
  pending_approval: { label: "Pending Approval", color: "bg-warning/10 text-warning", icon: Clock },
  approved: { label: "Approved", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  queued: { label: "Queued", color: "bg-muted text-muted-foreground", icon: ListOrdered },
  deploying: { label: "Deploying", color: "bg-blue-500/10 text-blue-400", icon: Loader2 },
  success: { label: "Success", color: "bg-success/10 text-success", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive", icon: XCircle },
  rolled_back: { label: "Rolled back", color: "bg-muted text-muted-foreground", icon: Calendar },
};

const ReleasesPage = () => {
  const { data: releases = [], isLoading, error } = useReleases();
  const { data: approvals = [] } = usePendingApprovals();
  const { data: environments = [] } = useEnvironments();
  const [envFilter, setEnvFilter] = useState("");

  const filtered = useMemo(() => {
    if (!envFilter) return releases;
    return releases.filter((r) => r.environment === envFilter);
  }, [releases, envFilter]);

  const pending = filtered.filter((r) => r.status === "pending_approval");
  const rest = filtered.filter((r) => r.status !== "pending_approval");

  return (
    <AppShell activeTab="releases">
      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Releases
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Live releases from grid-core. {approvals.length} pending approval
              {approvals.length === 1 ? "" : "s"}.
            </p>
          </div>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All environments</option>
            {environments.map((env) => (
              <option key={env.id} value={env.slug}>
                {env.kind === "ephemeral"
                  ? `${env.name}${env.expired ? " (expired)" : ""}`
                  : env.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load releases"}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Release queue</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading ? "loading…" : `${filtered.length} releases`}
            </span>
          </div>

          {!isLoading && filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No releases yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {[...pending, ...rest].map((release) => {
                const sc = statusConfig[release.status] ?? {
                  label: release.status,
                  color: "bg-muted text-muted-foreground",
                  icon: Clock,
                };
                const Icon = sc.icon;
                return (
                  <div key={release.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          release.status === "deploying" ? "animate-spin" : ""
                        } ${sc.color.split(" ")[1]}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {release.name}
                          {release.version ? ` ${release.version}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {release.environment} · {release.type}
                          {release.gitBranch ? ` · ${release.gitBranch}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${sc.color}`}>
                      {sc.label}
                    </span>
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

export default ReleasesPage;
