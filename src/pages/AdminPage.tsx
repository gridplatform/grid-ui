import { useEffect, useState, type ElementType } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { AdminSourcesPanel } from "@/components/AdminSourcesPanel";
import { ShieldCheck, Users, KeyRound, ScrollText, FolderGit2 } from "lucide-react";
import { useCurrentUser, useEnvironments } from "@/hooks/useGridApi";

type AdminTab = "users" | "keys" | "audit" | "environments" | "sources";

const AdminPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get("tab") as AdminTab) || "users";
  const [tab, setTab] = useState<AdminTab>(
    ["users", "keys", "audit", "environments", "sources"].includes(initial)
      ? initial
      : "users"
  );
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const { data: environments = [], isLoading: envsLoading } = useEnvironments();

  useEffect(() => {
    const t = searchParams.get("tab") as AdminTab | null;
    if (t && ["users", "keys", "audit", "environments", "sources"].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);

  const users: never[] = [];
  const apiKeys: never[] = [];
  const auditLog: never[] = [];

  const tabs: { id: AdminTab; label: string; icon: ElementType }[] = [
    { id: "users", label: "Users", icon: Users },
    { id: "keys", label: "API Keys", icon: KeyRound },
    { id: "audit", label: "Audit", icon: ScrollText },
    { id: "environments", label: "Environments", icon: ShieldCheck },
    { id: "sources", label: "Sources", icon: FolderGit2 },
  ];

  const selectTab = (id: AdminTab) => {
    setTab(id);
    setSearchParams(id === "users" ? {} : { tab: id });
  };

  return (
    <AppShell activeTab="overview" isAdmin>
      <div className="p-6 space-y-6 max-w-5xl">
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
          {tab === "users" && (
            <>
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">Users</h2>
              </div>
              {users.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No users returned from the API yet.
                </div>
              ) : null}
            </>
          )}

          {tab === "keys" && (
            <>
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">API keys</h2>
              </div>
              {apiKeys.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No API keys yet.
                </div>
              ) : null}
            </>
          )}

          {tab === "audit" && (
            <>
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">Audit log</h2>
              </div>
              {auditLog.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No audit events yet.
                </div>
              ) : null}
            </>
          )}

          {tab === "environments" && (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">Environments</h2>
                <span className="text-xs text-muted-foreground">
                  {envsLoading ? "loading…" : `${environments.length} envs`}
                </span>
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
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {env.approvalRequired ? "approval required" : "auto"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "sources" && <AdminSourcesPanel />}
        </div>
      </div>
    </AppShell>
  );
};

export default AdminPage;
