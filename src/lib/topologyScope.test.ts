import { describe, expect, it } from "vitest";
import type { TopologyProvider } from "@/types/api";
import { isInfrastructureListed } from "./catalogVisibility";
import { scopeTopologyProviders } from "./topologyScope";

describe("topologyScope", () => {
  it("uses the same enable switch as the rest of the console", () => {
    expect(isInfrastructureListed("aws", "vpc")).toBe(true);
    expect(isInfrastructureListed("gcp", "network")).toBe(false);
    expect(isInfrastructureListed("azure", "cosmosdb")).toBe(false);
    expect(isInfrastructureListed("alibaba", "oss")).toBe(false);
    expect(isInfrastructureListed("huawei", "peering")).toBe(false);
  });

  it("drops a provider that is not enabled", () => {
    const input = [
      {
        id: "provider-aws",
        name: "aws",
        type: "aws",
        environments: [
          {
            id: "env-provider-aws-production",
            name: "production",
            providerId: "provider-aws",
            resources: [
              { id: "a", name: "edge", type: "vpc", layer: "network", status: "healthy", connections: [] },
            ],
            connections: [],
            totalResources: 1,
            healthCounts: { healthy: 1, warning: 0, critical: 0 },
            status: "healthy",
          },
        ],
        totalResources: 1,
        healthCounts: { healthy: 1, warning: 0, critical: 0 },
      },
      {
        id: "provider-gcp",
        name: "gcp",
        type: "gcp",
        environments: [
          {
            id: "env-provider-gcp-production",
            name: "production",
            providerId: "provider-gcp",
            resources: [
              { id: "g", name: "edge", type: "network", layer: "network", status: "healthy", connections: [] },
            ],
            connections: [],
            totalResources: 1,
            healthCounts: { healthy: 1, warning: 0, critical: 0 },
            status: "healthy",
          },
        ],
        totalResources: 1,
        healthCounts: { healthy: 1, warning: 0, critical: 0 },
      },
    ] as TopologyProvider[];

    expect(scopeTopologyProviders(input).map((p) => p.type)).toEqual(["aws"]);
  });
});
