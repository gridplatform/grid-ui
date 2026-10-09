import { useEffect, useState, type ElementType } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { AdminSourcesPanel } from "@/components/AdminSourcesPanel";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { AdminGroupsPanel } from "@/components/AdminGroupsPanel";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import {
  ShieldCheck,
  Users,
  // KeyRound, // with API Keys tab
  ScrollText,
  FolderGit2,
  Info,
  UsersRound,
} from "lucide-react";
import {
  useAuditLog,
  useCurrentUser,
  useEnvironments,
  useSystemVersion,
  useUpdateEnvironmentApproval,
} from "@/hooks/useGridApi";
import { canManageUsers, isAdminLike } from "@/lib/rbac";

type AdminTab =
  | "users"
  | "groups"
  // | "keys" // reserved — no API-key management yet
  | "audit"
  | "environments"
  | "sources"
  | "about";

const ADMIN_TABS: AdminTab[] = [
  "users",
  "groups",
  // "keys",
  "audit",
  "environments",
  "sources",
  "about",
];

const outcomeClass: Record<string, string> = {
  success: "text-success",
  failure: "text-destructive",
  denied: "text-warning",
};

const uiVersion =
  typeof __GRID_UI_VERSION__ === "string" ? __GRID_UI_VERSION__ : "unknown";

function VersionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-mono text-foreground text-right break-all">{value}</p>
    </div>
  );
}

const AdminPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get("tab") as AdminTab) || "users";
  const [tab, setTab] = useState<AdminTab>(
    ADMIN_TABS.includes(initial) ? initial : "users"
  );
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const managesUsers = canManageUsers(me?.role);
  const { data: environments = [], isLoading: envsLoading } = useEnvironments();
  const { data: auditLog = [], isLoading: auditLoading } = useAuditLog(300, {
    enabled: managesUsers,
  });
  const {
    data: systemVersion,
    isLoading: versionLoading,
    error: versionError,
  } = useSystemVersion();
  const updateApproval = useUpdateEnvironmentApproval();
  const [policyNote, setPolicyNote] = useState<string | null>(null);

  const toggleApproval = async (slug: string, approvalRequired: boolean) => {
    setPolicyNote(null);
    try {
      await updateApproval.mutateAsync({ slug, approvalRequired });
      setPolicyNote(
        `${slug}: approval ${approvalRequired ? "required" : "not required"} for apply/destroy/custom`
      );
    } catch (err) {
      setPolicyNote(err instanceof Error ? err.message : "Failed to update approval policy");
    }
  };

  useEffect(() => {
    const t = searchParams.get("tab") as AdminTab | null;
    if (t && ADMIN_TABS.includes(t)) {
      setTab(t);
    }
  }, [searchParams]);

  const tabs: { id: AdminTab; label: string; icon: ElementType }[] = [
    { id: "users", label: "Users", icon: Users },
    { id: "groups", label: "Groups", icon: UsersRound },
    // { id: "keys", label: "API Keys", icon: KeyRound },
    { id: "audit", label: "Audit", icon: ScrollText },
    { id: "environments", label: "Environments", icon: ShieldCheck },
    { id: "sources", label: "Sources", icon: FolderGit2 },
    { id: "about", label: "About", icon: Info },
  ];

  const selectTab = (id: AdminTab) => {
    setTab(id);
    setSearchParams(id === "users" ? {} : { tab: id });
  };

  return (
    <AppShell activeTab="overview" isAdmin={isAdminLike(me?.role)}>
      <div className="p-6 space-y-6 w-full">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Admin
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {meLoading
              ? "Loading session…"
              : me
                ? `Signed in as ${me.email} (${me.role})`
                : "Admin console — live data where available."}
          </p>
          {!meLoading && me && !managesUsers && (
            <p className="text-xs text-warning mt-2">
              Your role can open this page, but Users, Groups, Audit, and Sources
              management require <span className="font-mono">admin</span> or{" "}
              <span className="font-mono">superadmin</span>. Custom groups do not
              unlock those tabs.
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg w-fit flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {tab === "users" && <AdminUsersPanel />}

          {tab === "groups" && <AdminGroupsPanel />}

          {/* API Keys tab reserved for later — audit actions api_key.create/revoke exist in Core,
              but there is no create/list/revoke API or storage yet.
          {tab === "keys" && (
            <>
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">API keys</h2>
              </div>
              <div className="p-8 text-center text-sm text-muted-foreground">
                API key management is not wired yet.
              </div>
            </>
          )}
          */}

          {tab === "audit" &&
            (!managesUsers ? (
              <AdminAccessDenied section="Audit" />
            ) : (
              <>
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-medium text-foreground">Audit log</h2>
                  <span className="text-xs text-muted-foreground">
                    {auditLoading ? "loading…" : `${auditLog.length} events`}
                  </span>
                </div>
                {auditLoading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Loading audit…
                  </div>
                ) : auditLog.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No audit events yet. Releases, syncs, user changes, and drift checks
                    will show up here.
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-[32rem] overflow-y-auto">
                    {auditLog.map((ev) => (
                      <div key={ev.id} className="px-4 py-3 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-foreground">{ev.summary}</p>
                          <span
                            className={`text-[11px] font-medium uppercase ${
                              outcomeClass[ev.outcome] || "text-muted-foreground"
                            }`}
                          >
                            {ev.outcome}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground break-words">
                          {new Date(ev.at).toLocaleString()}
                          {" · "}
                          {ev.actor}
                          {ev.actorRole ? ` (${ev.actorRole})` : ""}
                          {" · "}
                          <span className="font-mono">{ev.action}</span>
                          {ev.resourceName ? ` · ${ev.resourceName}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ))}

          {tab === "environments" && (
            <>
              <div className="p-4 border-b border-border space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-medium text-foreground">Environments</h2>
                  <span className="text-xs text-muted-foreground">
                    {envsLoading ? "loading…" : `${environments.length} envs`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Environments are discovered from desired-state folders
                  (projects/&lt;app&gt;/&lt;cloud&gt;/&lt;env&gt;/). Toggle approval for any of them —
                  including development or custom env names. Apply, destroy, and custom releases
                  respect this setting; plan does not. Until you set a policy, staging/production
                  default on and development defaults off.
                </p>
                {!managesUsers && (
                  <p className="text-xs text-warning">
                    View only — changing “Require approval” needs{" "}
                    <span className="font-mono">admin</span> or{" "}
                    <span className="font-mono">superadmin</span>.
                  </p>
                )}
                {policyNote && (
                  <p className="text-xs text-muted-foreground">{policyNote}</p>
                )}
              </div>
              {!envsLoading && environments.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No environments from grid-core.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {environments.map((env) => (
                    <div
                      key={env.id}
                      className="flex items-center justify-between px-4 py-3 gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{env.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {env.slug}
                          {env.kind === "ephemeral"
                            ? ` · ephemeral${env.ttl ? ` · TTL ${env.ttl}` : ""}${
                                env.expired ? " · expired" : ""
                              }`
                            : ` · canonical · ${env.unitCount ?? 0} units`}
                        </p>
                      </div>
                      <label
                        className={`flex items-center gap-2 flex-shrink-0 text-xs text-foreground ${
                          managesUsers ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={Boolean(env.approvalRequired)}
                          disabled={updateApproval.isPending || !managesUsers}
                          onChange={(e) => void toggleApproval(env.slug, e.target.checked)}
                        />
                        Require approval
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "sources" &&
            (!managesUsers ? (
              <AdminAccessDenied section="Sources" />
            ) : (
              <AdminSourcesPanel />
            ))}

          {tab === "about" && (
            <>
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">Running versions</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Components and runtime in this control plane.
                </p>
              </div>
              {versionLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
              ) : versionError ? (
                <div className="p-8 text-center text-sm text-destructive">
                  {versionError instanceof Error
                    ? versionError.message
                    : "Failed to load system version"}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <VersionRow label="grid-ui" value={uiVersion} />
                  <VersionRow
                    label="grid-core"
                    value={systemVersion?.core.version || "—"}
                  />
                  <VersionRow
                    label="grid-cli"
                    value={systemVersion?.cli.version || "—"}
                  />
                  <VersionRow
                    label="Terraform"
                    value={systemVersion?.terraform.version || "—"}
                  />
                  <VersionRow
                    label="Node.js"
                    value={systemVersion?.runtime.node || "—"}
                  />
                  <VersionRow
                    label="Platform"
                    value={
                      systemVersion
                        ? `${systemVersion.runtime.platform}/${systemVersion.runtime.arch}`
                        : "—"
                    }
                  />
                  <VersionRow
                    label="Module bank ref"
                    value={systemVersion?.moduleBank.ref || "—"}
                  />
                  <VersionRow
                    label="GitOps branch"
                    value={
                      systemVersion
                        ? systemVersion.gitops.repoConfigured
                          ? systemVersion.gitops.branch
                          : "not configured"
                        : "—"
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default AdminPage;
