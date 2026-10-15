import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateWorkspaceQueries,
  useEnvironments,
  useGitOpsStatus,
  useInfrastructures,
  useProjects,
} from "@/hooks/useGridApi";
import { isConsoleProviderReleased } from "@/config/featureFlags";
import { isActiveCatalogUnit } from "@/lib/catalogVisibility";
import type { Environment, Project } from "@/types/api";

const LS_PROJECT = "grid.workspace.projectId";
const LS_ENV = "grid.workspace.envId";

type WorkspaceContextValue = {
  projects: Project[];
  environments: Environment[];
  /** Environments for the selected project (from Core, auto-detected) */
  projectEnvironments: Environment[];
  selectedProject: Project | null;
  selectedEnv: Environment | null;
  envSlug: string | null;
  projectId: string | null;
  projectSlug: string | null;
  projectsLoading: boolean;
  envsLoading: boolean;
  setSelectedProjectId: (id: string) => void;
  setSelectedEnvId: (id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: rawProjects = [], isLoading: projectsLoading } = useProjects();
  const { data: allInfra = [] } = useInfrastructures();
  const { data: gitops } = useGitOpsStatus();

  const listedInfra = useMemo(
    () => allInfra.filter(isActiveCatalogUnit),
    [allInfra]
  );

  const projects = useMemo((): Project[] => {
    return rawProjects.map((p) => {
      const units = listedInfra.filter((i) => i.project === p.slug);
      const clouds = [
        ...new Set(
          units
            .map((i) => String(i.provider || "").trim())
            .filter((c) => c && isConsoleProviderReleased(c))
        ),
      ].sort((a, b) => a.localeCompare(b));
      const displayClouds =
        clouds.length > 0
          ? clouds
          : (p.clouds || []).filter((c) => isConsoleProviderReleased(c));
      return {
        ...p,
        unitCount: units.length,
        clouds: displayClouds.length > 0 ? displayClouds : p.clouds,
        kind: displayClouds.length > 1 ? "multi-cloud" : "single-cloud",
      };
    });
  }, [rawProjects, listedInfra]);

  // Auto-sync / Admin Sync: when desired-state commit or sync time changes, refresh project list.
  const syncFingerprint = `${gitops?.lastCommit ?? ""}|${gitops?.lastSyncAt ?? ""}`;
  const lastSyncFingerprint = useRef<string | null>(null);
  useEffect(() => {
    if (!gitops?.lastCommit && !gitops?.lastSyncAt) return;
    if (lastSyncFingerprint.current === null) {
      lastSyncFingerprint.current = syncFingerprint;
      return;
    }
    if (lastSyncFingerprint.current === syncFingerprint) return;
    lastSyncFingerprint.current = syncFingerprint;
    invalidateWorkspaceQueries(queryClient);
  }, [syncFingerprint, gitops?.lastCommit, gitops?.lastSyncAt, queryClient]);

  const [projectId, setProjectId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_PROJECT);
    } catch {
      return null;
    }
  });
  const [envId, setEnvId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_ENV);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!projects.length) {
      setProjectId(null);
      return;
    }
    if (!projectId || !projects.some((p) => p.id === projectId)) {
      const next = projects[0].id;
      setProjectId(next);
      try {
        localStorage.setItem(LS_PROJECT, next);
      } catch {
        /* ignore */
      }
    }
  }, [projects, projectId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? projects[0] ?? null,
    [projects, projectId]
  );

  const projectSlug = selectedProject?.slug ?? null;

  // Environments for the selected project (picker). Global env list is fetched only where needed.
  const { data: rawProjectEnvironments = [], isLoading: envsLoading } = useEnvironments(
    projectSlug,
    { enabled: !!projectSlug }
  );

  const projectEnvironments = useMemo((): Environment[] => {
    return rawProjectEnvironments.map((env) => {
      const unitCount = listedInfra.filter(
        (i) =>
          i.project === projectSlug &&
          (i.environment || "").toLowerCase() === (env.slug || "").toLowerCase()
      ).length;
      return { ...env, unitCount };
    });
  }, [rawProjectEnvironments, listedInfra, projectSlug]);

  const allEnvironments = projectEnvironments;

  useEffect(() => {
    if (!projectEnvironments.length) {
      setEnvId(null);
      return;
    }
    if (!envId || !projectEnvironments.some((e) => e.id === envId || e.slug === envId)) {
      const next = projectEnvironments[0].id;
      setEnvId(next);
      try {
        localStorage.setItem(LS_ENV, next);
      } catch {
        /* ignore */
      }
    }
  }, [projectEnvironments, envId]);

  const selectedEnv = useMemo(() => {
    if (!projectEnvironments.length) return null;
    return (
      projectEnvironments.find((e) => e.id === envId) ||
      projectEnvironments.find((e) => e.slug === envId) ||
      projectEnvironments[0] ||
      null
    );
  }, [projectEnvironments, envId]);

  const setSelectedProjectId = useCallback((id: string) => {
    setProjectId(id);
    setEnvId(null); // force re-pick env for new project
    try {
      localStorage.setItem(LS_PROJECT, id);
      localStorage.removeItem(LS_ENV);
    } catch {
      /* ignore */
    }
  }, []);

  const setSelectedEnvId = useCallback((id: string) => {
    setEnvId(id);
    try {
      localStorage.setItem(LS_ENV, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value: WorkspaceContextValue = {
    projects,
    environments: allEnvironments,
    projectEnvironments,
    selectedProject,
    selectedEnv,
    envSlug: selectedEnv?.slug ?? null,
    projectId: selectedProject?.id ?? null,
    projectSlug,
    projectsLoading,
    envsLoading,
    setSelectedProjectId,
    setSelectedEnvId,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}

export function useWorkspaceOptional(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}
