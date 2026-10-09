import { describe, expect, it } from "vitest";
import {
  clusterDeployTemplate,
  regionHintFor,
  terraformDeployTemplate,
  TERRAFORM_CATEGORIES,
  type TerraformTarget,
} from "@/lib/deployContract";

describe("deployContract", () => {
  it("returns region hints by provider", () => {
    expect(regionHintFor("aws")).toBe("us-east-1");
    expect(regionHintFor("gcp")).toBe("us-central1");
    expect(regionHintFor("unknown-cloud")).toBe("us-east-1");
  });

  it("exposes terraform categories with targets", () => {
    expect(TERRAFORM_CATEGORIES.length).toBeGreaterThan(0);
    const network = TERRAFORM_CATEGORIES.find((c) => c.id === "network");
    expect(network?.targets.length).toBeGreaterThan(0);
  });

  it("builds a terraform deploy template object", () => {
    const target: TerraformTarget = {
      provider: "aws",
      resourceType: "vpc",
      label: "VPC",
    };
    const tpl = terraformDeployTemplate("network", target);
    const parsed = JSON.parse(tpl);
    expect(parsed.engine).toBe("terraform");
    expect(parsed.provider).toBe("aws");
    expect(parsed.resourceType).toBe("vpc");
    expect(parsed.config.region).toBe("us-east-1");
  });

  it("builds a cluster deploy template", () => {
    const tpl = clusterDeployTemplate("eks");
    const parsed = JSON.parse(tpl);
    expect(parsed.provider).toBe("aws");
    expect(parsed.resourceType).toBe("eks");
    expect(parsed.config.kubernetes_version).toBeTruthy();
  });
});
