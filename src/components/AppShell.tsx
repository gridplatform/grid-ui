import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { productFlags, type FeatureKey } from "@/config/features";
import { GridLogo } from "@/components/GridLogo";
import { useEnvironments } from "@/hooks/useGridApi";
import type { Environment } from "@/types/api";

interface AppShellProps {
  children: React.ReactNode;
  activeTab?: string;
  isAdmin?: boolean;
}

const teams = [
  { id: "personal", name: "My Projects", avatar: "M" },
  { id: "infra", name: "Infrastructure Team", avatar: "I" },
  { id: "platform", name: "Platform Eng", avatar: "P" },
];

function formatEnvSubtitle(env: Environment): string {
  if (env.kind === "ephemeral") {
    const ttl = env.ttl ? `TTL ${env.ttl}` : "ephemeral";
    if (env.expired) return `${ttl} · expired`;
    return ttl;
  }
  if (env.unitCount != null) return `${env.unitCount} units`;
  return env.isProduction ? "Production" : "Environment";
}

function formatEnvLabel(env: Environment): string {
  if (env.kind === "ephemeral" && env.baseEnv) {
    return env.name || `${env.baseEnv}/${env.slug}`;
  }
  return env.name || env.slug;
}

type NavTab = {
  id: string;
  label: string;
  path: string;
  feature?: FeatureKey;
};

const AppShell = ({ children, activeTab = "overview", isAdmin = true }: AppShellProps) => {
  const { customLogoUrl, orgName } = useBranding();
  const navigate = useNavigate();
  const { data: environments = [], isLoading: envsLoading } = useEnvironments();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(teams[0]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  useEffect(() => {
    if (!environments.length) {
      setSelectedEnvId(null);
      return;
    }
    if (!selectedEnvId || !environments.some((e) => e.id === selectedEnvId)) {
      setSelectedEnvId(environments[0].id);
    }
  }, [environments, selectedEnvId]);

  const selectedEnv = useMemo(
    () => environments.find((e) => e.id === selectedEnvId) ?? environments[0] ?? null,
    [environments, selectedEnvId]
  );

  const allTabs: NavTab[] = [
    { id: "overview", label: "Overview", path: "/dashboard" },
    { id: "deployments", label: "Deployments", path: "/deployments", feature: "deployments" },
    { id: "releases", label: "Releases", path: "/releases", feature: "releases" },
    { id: "infrastructure", label: "Infrastructure", path: "/infrastructure", feature: "infrastructure" },
    { id: "gitops", label: "GitOps", path: "/gitops" },
    { id: "monitoring", label: "Monitoring", path: "/monitoring", feature: "monitoring" },
    { id: "alerts", label: "Alerts", path: "/alerts", feature: "alerts" },
    { id: "apm", label: "APM", path: "/apm", feature: "apm" },
    { id: "logging", label: "Logging", path: "/logging", feature: "logging" },
    { id: "topology", label: "Topology", path: "/topology", feature: "topology" },
  ];

  const tabs = allTabs.filter((tab) => !tab.feature || productFlags[tab.feature]);
  const showAdmin = isAdmin && productFlags.admin;

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  );
  const filteredEnvs = environments.filter((e) => {
    const q = projectSearch.toLowerCase();
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.slug.toLowerCase().includes(q) ||
      (e.baseEnv?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="flex items-center h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-foreground font-semibold text-sm hover:opacity-80 transition-opacity"
            >
              {customLogoUrl ? (
                <img src={customLogoUrl} alt={orgName} className="w-6 h-6 rounded object-contain" />
              ) : (
                <GridLogo className="w-6 h-6" alt={orgName} />
              )}
              <span>{orgName}</span>
            </button>

            <span className="text-muted-foreground text-sm">/</span>

            <div className="relative">
              <button
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
              >
                <div className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-xs text-foreground font-medium">
                  {selectedTeam.avatar}
                </div>
                <span className="text-foreground">{selectedTeam.name}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">
                  {selectedEnv ? formatEnvLabel(selectedEnv) : envsLoading ? "…" : "No env"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 z-50 w-[560px] bg-popover border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in">
                    <div className="flex divide-x divide-border">
                      <div className="w-1/2 p-2">
                        <div className="px-2 pb-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Find Team…"
                              value={teamSearch}
                              onChange={(e) => setTeamSearch(e.target.value)}
                              className="w-full bg-secondary text-foreground text-sm pl-8 pr-3 py-1.5 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {filteredTeams.map((team) => (
                            <button
                              key={team.id}
                              onClick={() => {
                                setSelectedTeam(team);
                              }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                                selectedTeam.id === team.id
                                  ? "bg-secondary text-foreground"
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              <div className="w-5 h-5 rounded bg-accent flex items-center justify-center text-xs font-medium">
                                {team.avatar}
                              </div>
                              <span>{team.name}</span>
                              {selectedTeam.id === team.id && (
                                <span className="ml-auto text-primary">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-border">
                          <button className="w-full text-left px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
                            + Create Team
                          </button>
                        </div>
                      </div>

                      <div className="w-1/2 p-2">
                        <div className="px-2 pb-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Find Environment…"
                              value={projectSearch}
                              onChange={(e) => setProjectSearch(e.target.value)}
                              className="w-full bg-secondary text-foreground text-sm pl-8 pr-3 py-1.5 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="space-y-0.5 max-h-64 overflow-y-auto">
                          {envsLoading && (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</p>
                          )}
                          {!envsLoading && filteredEnvs.length === 0 && (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                              No environments from grid-core.
                            </p>
                          )}
                          {filteredEnvs.map((env) => (
                            <button
                              key={env.id}
                              onClick={() => {
                                setSelectedEnvId(env.id);
                                setDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
                                selectedEnv?.id === env.id
                                  ? "bg-secondary text-foreground"
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    env.expired
                                      ? "bg-destructive"
                                      : env.kind === "ephemeral"
                                        ? "bg-warning"
                                        : "bg-success"
                                  }`}
                                />
                                <span className="truncate">{formatEnvLabel(env)}</span>
                              </div>
                              <span
                                className={`text-xs flex-shrink-0 ml-2 ${
                                  env.expired ? "text-destructive" : "text-muted-foreground"
                                }`}
                              >
                                {formatEnvSubtitle(env)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <a
            href="https://doc.greatplatform.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary text-muted-foreground text-sm hover:border-muted-foreground/50 hover:text-foreground transition-colors mr-2"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Docs</span>
          </a>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-secondary text-muted-foreground text-sm hover:border-muted-foreground/50 transition-colors mr-3"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find…</span>
            <kbd className="ml-4 text-xs border border-border rounded px-1.5 py-0.5 text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setDropdownOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:ring-2 hover:ring-border transition-all"
            >
              <User className="w-4 h-4" />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-2 z-50 w-52 bg-popover border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in">
                  <div className="p-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground px-2">admin@grid.io</p>
                    <p className="text-xs text-muted-foreground px-2">Administrator</p>
                  </div>
                  <div className="p-1">
                    {showAdmin && (
                      <button
                        onClick={() => {
                          navigate("/admin");
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Admin
                      </button>
                    )}
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate("/");
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-secondary rounded-md transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0 px-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {searchOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg animate-fade-in">
            <div className="bg-popover border border-border rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center px-4 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground mr-3" />
                <input
                  type="text"
                  placeholder="Search resources, environments, users…"
                  autoFocus
                  className="w-full bg-transparent text-foreground text-sm py-3 focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="p-4 text-center text-sm text-muted-foreground">
                Start typing to search…
              </div>
            </div>
          </div>
        </>
      )}

      <main>{children}</main>
    </div>
  );
};

export default AppShell;
