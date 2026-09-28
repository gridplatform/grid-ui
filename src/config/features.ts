/**
 * Console-facing view of the flags in ./featureFlags.
 *
 * Product flags decide which pages and tabs render. Deploy flags decide which
 * provider x resource type targets the Deployments page offers, and categories
 * are shown only while they still have at least one enabled target.
 */

import {
  KUBERNETES_CLUSTER_TARGETS,
  TERRAFORM_CATEGORIES,
  type TerraformCategory,
  type TerraformTarget,
} from "@/lib/deployContract";
import { isDeployEnabled, isProductEnabled, productFlags } from "./featureFlags";

export { isDeployEnabled, isProductEnabled, productFlags };
export type { ProductFlagKey as FeatureKey } from "./featureFlags";

/** Targets in a category that are deployable right now. */
export function enabledTargetsForCategory(category: TerraformCategory): TerraformTarget[] {
  const entry = TERRAFORM_CATEGORIES.find((c) => c.id === category);
  if (!entry) return [];
  return entry.targets.filter((t) => isDeployEnabled(t.provider, t.resourceType));
}

/** A category shows up while any of its provider x type pairs is on. */
export function isTerraformCategoryEnabled(category: TerraformCategory): boolean {
  if (category === "other") return true;
  return enabledTargetsForCategory(category).length > 0;
}

export function enabledTerraformCategories(): TerraformCategory[] {
  return TERRAFORM_CATEGORIES.filter((c) => isTerraformCategoryEnabled(c.id)).map((c) => c.id);
}

/** Cluster targets whose provider x type pair is on (EKS and GKE by default). */
export function enabledClusterTargets(): typeof KUBERNETES_CLUSTER_TARGETS {
  return KUBERNETES_CLUSTER_TARGETS.filter((t) => isDeployEnabled(t.provider, t.resourceType));
}
