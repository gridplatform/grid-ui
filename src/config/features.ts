/** Helpers that apply featureFlags.ts to the Deployments catalog. */

import {
  KUBERNETES_CLUSTER_TARGETS,
  TERRAFORM_CATEGORIES,
  type TerraformCategory,
  type TerraformTarget,
} from "@/lib/deployContract";
import { isDeployEnabled, isProductEnabled, productFlags } from "./featureFlags";

export { isDeployEnabled, isProductEnabled, productFlags };
export type { ProductFlagKey as FeatureKey } from "./featureFlags";

export function enabledTargetsForCategory(category: TerraformCategory): TerraformTarget[] {
  const entry = TERRAFORM_CATEGORIES.find((c) => c.id === category);
  if (!entry) return [];
  return entry.targets.filter((t) => isDeployEnabled(t.provider, t.resourceType));
}

export function isTerraformCategoryEnabled(category: TerraformCategory): boolean {
  if (category === "other") return true;
  return enabledTargetsForCategory(category).length > 0;
}

export function enabledTerraformCategories(): TerraformCategory[] {
  return TERRAFORM_CATEGORIES.filter((c) => isTerraformCategoryEnabled(c.id)).map((c) => c.id);
}

export function enabledClusterTargets(): typeof KUBERNETES_CLUSTER_TARGETS {
  return KUBERNETES_CLUSTER_TARGETS.filter((t) => isDeployEnabled(t.provider, t.resourceType));
}
