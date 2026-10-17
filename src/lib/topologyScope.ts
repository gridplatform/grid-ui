import type { TopologyProvider, TopologyResource } from "@/types/api";
import { isInfrastructureListed } from "@/lib/catalogVisibility";

function counts(resources: TopologyResource[]) {
  return {
    healthy: resources.filter((r) => r.status === "healthy").length,
    warning: resources.filter((r) => r.status === "warning").length,
    critical: resources.filter((r) => r.status === "critical").length,
  };
}

/**
 * Keep circles whose provider and component type are offered in featureFlags.
 * That file is the only enable switch.
 */
export function scopeTopologyProviders(
  providers: TopologyProvider[]
): TopologyProvider[] {
  return providers
    .map((provider) => {
      const environments = provider.environments
        .map((environment) => {
          const resources = environment.resources.filter((resource) =>
            isInfrastructureListed(provider.type, resource.type)
          );
          return {
            ...environment,
            resources,
            totalResources: resources.length,
            healthCounts: counts(resources),
          };
        })
        .filter((environment) => environment.resources.length > 0);
      const all = environments.flatMap((environment) => environment.resources);
      return {
        ...provider,
        environments,
        totalResources: all.length,
        healthCounts: counts(all),
      };
    })
    .filter((provider) => provider.environments.length > 0);
}
