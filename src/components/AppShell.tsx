import { useState } from "react";
import { ShieldCheck, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { productFlags, type FeatureKey } from "@/config/features";
import { GridLogo } from "@/components/GridLogo";
import { invalidateWorkspaceQueries, useGridSearch } from "@/hooks/useGridApi";
import type { Environment } from "@/types/api";

interface AppShellProps {
  children: React.ReactNode;
  activeTab?: string;
  isAdmin?: boolean;
}

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

const AppShell = ({ children, activeTab = "overview", isAdmin: isAdminProp }: AppShellProps) => {
  const { customLogoUrl, orgName } = useBranding();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = isAdminProp ?? user?.role === "admin";
  const {
    projects,
    projectEnvironments,
    selectedProject,
    selectedEnv,
    projectsLoading,
    envsLoading,
    setSelectedProjectId,
    setSelectedEnvId,
  } = useWorkspace();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  const openWorkspaceMenu = () => {
    setDropdownOpen((open) => {
      const next = !open;
      if (next) {
        invalidateWorkspaceQueries(queryClient);
      }
      return next;
    });
    setUserMenuOpen(false);
  };

  const { data: searchResults, isFetching: searchLoading } = useGridSearch(
    searchOpen ? searchQuery : ""
  );

  const allTabs: NavTab[] = [
    { id: "overview", label: "Overview", path: "/dashboard" },
    { id: "deployments", label: "Deployments", path: "/deployments", feature: "deployments" },
    { id: "releases", label: "Releases", path: "/releases", feature: "releases" },
    { id: "infrastructure", label: "Infrastructure", path: "/infrastructure", feature: "infrastructure" },
    { id: "monitoring", label: "Monitoring", path: "/monitoring", feature: "monitoring" },
    { id: "alerts", label: "Alerts", path: "/alerts", feature: "alerts" },
    { id: "apm", label: "APM", path: "/apm", feature: "apm" },
    { id: "logging", label: "Logging", path: "/logging", feature: "logging" },
    { id: "topology", label: "Topology", path: "/topology", feature: "topology" },
  ];

  const tabs = allTabs.filter((tab) => !tab.feature || productFlags[tab.feature]);
  const showAdmin = isAdmin && productFlags.admin;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
    p.slug.toLowerCase().includes(teamSearch.toLowerCase())
  );
  const filteredEnvs = projectEnvironments.filter((e) => {
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
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-foreground font-semibold text-sm hover:opacity-80 transition-opacity flex-shrink-0"
            >
              {customLogoUrl ? (
                <img src={customLogoUrl} alt={orgName} className="w-6 h-6 rounded object-contain" />
              ) : (
                <GridLogo className="w-6 h-6" alt={orgName} />
              )}
              <span className="hidden sm:inline">{orgName}</span>
            </button>

            <span className="text-muted-foreground text-sm">/</span>

            <div className="relative min-w-0">
              <button
                onClick={openWorkspaceMenu}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm min-w-0"
              >
                <div className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-xs text-foreground font-medium flex-shrink-0">
                  {selectedProject?.avatar || "?"}
                </div>
                <span className="text-foreground truncate max-w-[100px] sm:max-w-[160px]">
                  {selectedProject?.name || (projectsLoading ? "…" : "No project")}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground truncate max-w-[90px] sm:max-w-[140px]">
                  {selectedEnv ? formatEnvLabel(selectedEnv) : envsLoading ? "…" : "No env"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 z-50 w-[min(560px,calc(100vw-2rem))] bg-popover border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:divide-x divide-border">
                      <div className="sm:w-1/2 p-2 border-b sm:border-b-0 border-border">
                        <div className="px-2 pb-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 px-0.5">
                            Projects
                          </p>
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Find project…"
                              value={teamSearch}
                              onChange={(e) => setTeamSearch(e.target.value)}
                              className="w-full bg-secondary text-foreground text-sm pl-8 pr-3 py-1.5 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                          {projectsLoading && (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</p>
                          )}
                          {!projectsLoading && filteredProjects.length === 0 && (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                              No projects from config root.
                            </p>
                          )}
                          {filteredProjects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => setSelectedProjectId(project.id)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                                selectedProject?.id === project.id
                                  ? "bg-secondary text-foreground"
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              <div className="w-5 h-5 rounded bg-accent flex items-center justify-center text-xs font-medium flex-shrink-0">
                                {project.avatar}
                              </div>
                              <div className="min-w-0 text-left flex-1">
                                <span className="block truncate">{project.name}</span>
                                <span className="block text-[10px] text-muted-foreground truncate">
                                  {project.kind === "multi-cloud"
                                    ? project.clouds.join(" · ")
                                    : project.clouds[0] || "—"}
                                  {` · ${project.unitCount} units`}
                                </span>
                              </div>
                              {selectedProject?.id === project.id && (
                                <span className="text-primary flex-shrink-0">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-border px-2">
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Add apps under <code className="font-mono">projects/&lt;slug&gt;/</code> in
                            the config repo. Changes land via Git sync — not from this UI.
                          </p>
                        </div>
                      </div>

                      <div className="sm:w-1/2 p-2">
                        <div className="px-2 pb-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 px-0.5">
                            Environments
                          </p>
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Find environment…"
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
            href="https://github.com/gridplatform/grid-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary text-muted-foreground text-sm hover:border-muted-foreground/50 hover:text-foreground transition-colors mr-2"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Docs</span>
          </a>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-secondary text-muted-foreground text-sm hover:border-muted-foreground/50 transition-colors mr-3"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Find…</span>
            <kbd className="hidden sm:inline ml-4 text-xs border border-border rounded px-1.5 py-0.5 text-muted-foreground">
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
                        void logout().then(() => navigate("/"));
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

        <div className="flex items-center gap-0 px-4 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
          />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg animate-fade-in px-4">
            <div className="bg-popover border border-border rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center px-4 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground mr-3" />
                <input
                  type="text"
                  placeholder="Search projects, environments, infrastructure…"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-foreground text-sm py-3 focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-80 overflow-y-auto">
                {searchQuery.trim().length < 2 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Type at least 2 characters — results from grid-core.
                  </div>
                ) : searchLoading && !searchResults ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Searching…</div>
                ) : (
                  <div className="p-2 space-y-3">
                    {(searchResults?.projects || []).length > 0 && (
                      <div>
                        <p className="px-2 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                          Projects
                        </p>
                        {searchResults!.projects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProjectId(p.id);
                              setSearchOpen(false);
                              setSearchQuery("");
                            }}
                            className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-secondary"
                          >
                            {p.name}
                            <span className="text-xs text-muted-foreground ml-2">
                              {p.clouds.join(", ")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {(searchResults?.environments || []).length > 0 && (
                      <div>
                        <p className="px-2 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                          Environments
                        </p>
                        {searchResults!.environments.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => {
                              setSelectedEnvId(e.id);
                              setSearchOpen(false);
                              setSearchQuery("");
                            }}
                            className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-secondary"
                          >
                            {e.name}
                            <span className="text-xs text-muted-foreground ml-2">{e.slug}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {(searchResults?.infrastructures || []).length > 0 && (
                      <div>
                        <p className="px-2 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                          Infrastructure
                        </p>
                        {searchResults!.infrastructures.map((i) => (
                          <button
                            key={i.id}
                            type="button"
                            onClick={() => {
                              navigate(`/infrastructure/${i.id}`);
                              setSearchOpen(false);
                              setSearchQuery("");
                            }}
                            className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-secondary"
                          >
                            {i.name}
                            <span className="text-xs text-muted-foreground ml-2">
                              {i.project} · {i.environment} · {i.provider}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults &&
                      !searchResults.projects.length &&
                      !searchResults.environments.length &&
                      !searchResults.infrastructures.length && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No matches.
                        </div>
                      )}
                  </div>
                )}
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
