/**
 * Console catalog visibility (UI only).
 * Keys are provider × subtype, matching desired-state JSON and deployFlags.
 */

import {
  deployFlags,
  isConsoleProviderReleased,
  isDeployEnabled,
  normalizeProviderId,
} from "@/config/featureFlags";
import { pickPrimaryResourceType, resolveResourceType } from "@/lib/resourceType";
import { categoryForResourceType } from "@/lib/resourceCategory";
import type { TerraformCategory } from "@/lib/deployContract";

export type CatalogListVisibility = "visible" | "hidden" | "invalid";

export interface CatalogVocabularyResult {
  ok: boolean;
  errors: string[];
  /** Resolved subtype (kind / primary) when parseable. */
  subtype: string;
  /** Terraform category for the subtype (type column). */
  type: TerraformCategory;
}

function normalizeSubtype(raw: string): string {
  return raw.trim().toLowerCase();
}

/** True when subtype is a defined deployFlags key for that provider (on or off). */
export function isCatalogSubtypeKnown(
  provider: string | undefined,
  resourceType: string
): boolean {
  const id = normalizeProviderId(provider);
  const t = normalizeSubtype(resourceType);
  if (!t || t === "unknown") return false;
  const table = deployFlags[id];
  return Boolean(table && Object.prototype.hasOwnProperty.call(table, t));
}

/** Offering enabled in the console (provider release + deployFlags). */
export function isConsoleOfferingEnabled(
  provider: string | undefined,
  resourceType: string
): boolean {
  return isDeployEnabled(provider, resourceType);
}

/**
 * List-row visibility for Infrastructure and Monitoring.
 * - visible: released provider and enabled subtype
 * - invalid: released provider but unknown subtype (detail can show vocabulary errors)
 * - hidden: unreleased provider or disabled subtype
 */
export function infrastructureListVisibility(
  provider: string | undefined,
  subtype: string
): CatalogListVisibility {
  if (!isConsoleProviderReleased(provider)) {
    return "hidden";
  }
  const t = normalizeSubtype(subtype);
  if (!t || t === "unknown" || !isCatalogSubtypeKnown(provider, t)) {
    return "invalid";
  }
  if (!isConsoleOfferingEnabled(provider, t)) {
    return "hidden";
  }
  return "visible";
}

/** Whether a unit is included in Infrastructure, sync, and env unit counts. */
export function isInfrastructureListed(
  provider: string | undefined,
  subtype: string
): boolean {
  return infrastructureListVisibility(provider, subtype) !== "hidden";
}

/** Active desired-state unit eligible for project / environment unit counts. */
export function isActiveCatalogUnit(unit: {
  status: string;
  provider?: string;
  type?: string;
}): boolean {
  const status = unit.status.toLowerCase();
  if (status === "stale" || status === "destroyed") return false;
  return isInfrastructureListed(unit.provider, (unit.type || "").toLowerCase());
}

/** Live unit that remains after the console offering was turned off. */
export function isLiveResidue(
  provider: string | undefined,
  subtype: string,
  status: string
): boolean {
  const s = status.trim().toLowerCase();
  if (s !== "running" && s !== "degraded" && s !== "error") return false;
  const t = normalizeSubtype(subtype);
  if (!isCatalogSubtypeKnown(provider, t)) return false;
  return !isConsoleOfferingEnabled(provider, t);
}

/**
 * Validate JSON uses catalog subtype words (same as deployFlags keys).
 * metadata.kind and resources[].type must match the catalog vocabulary.
 */
export function validateCatalogVocabulary(
  provider: string | undefined,
  configJson: Record<string, unknown> | null | undefined,
  gitPath?: string | null,
  name?: string
): CatalogVocabularyResult {
  const errors: string[] = [];
  const id = normalizeProviderId(provider);
  const table = deployFlags[id];

  if (!table) {
    errors.push(
      `Provider "${id}" is not in the console catalog (deployFlags). Use a catalog provider id.`
    );
  }

  const subtype = resolveResourceType({
    configJson: configJson ?? undefined,
    gitPath,
    name,
  });
  const type = categoryForResourceType(subtype);

  if (!configJson || typeof configJson !== "object") {
    errors.push("configJson is missing or invalid.");
    return { ok: false, errors, subtype, type };
  }

  const meta = configJson.metadata as Record<string, unknown> | undefined;
  const kindRaw =
    meta && typeof meta === "object" && typeof meta.kind === "string"
      ? normalizeSubtype(meta.kind)
      : undefined;

  const resources = Array.isArray(configJson.resources)
    ? (configJson.resources as Array<Record<string, unknown>>)
    : [];

  if (resources.length === 0) {
    errors.push('JSON must include a non-empty "resources" array.');
  }

  const resourceTypes: string[] = [];
  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];
    const raw = r?.type;
    if (typeof raw !== "string" || !raw.trim()) {
      errors.push(`resources[${i}] is missing a string "type" (catalog subtype).`);
      continue;
    }
    const t = normalizeSubtype(raw);
    resourceTypes.push(t);
    if (table && !Object.prototype.hasOwnProperty.call(table, t)) {
      errors.push(
        `resources[${i}].type "${t}" is not a catalog subtype for provider "${id}". Use the same word as the console catalog / deployFlags key.`
      );
    }
  }

  const primary = pickPrimaryResourceType(resources, kindRaw);
  if (kindRaw) {
    if (table && !Object.prototype.hasOwnProperty.call(table, kindRaw)) {
      errors.push(
        `metadata.kind "${kindRaw}" is not a catalog subtype for provider "${id}".`
      );
    }
    if (primary && kindRaw !== primary) {
      errors.push(
        `metadata.kind ("${kindRaw}") must equal the primary resource type ("${primary}"). Use one catalog subtype word for both.`
      );
    }
  }

  if (primary && table && !Object.prototype.hasOwnProperty.call(table, primary)) {
    errors.push(
      `Primary type "${primary}" is not in the catalog for "${id}".`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    subtype: kindRaw || primary || subtype,
    type: categoryForResourceType(kindRaw || primary || subtype),
  };
}
