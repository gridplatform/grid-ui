/**
 * Mirror of grid-core resourceType — catalog-agnostic unit identity.
 *
 * Unit kind = primary. Other resources in the same unit = secondary.
 * Optional `role: "primary" | "support"` on resources. No product lists.
 */

export type ResourceRole = "primary" | "support";

type ResourceLike = {
  type?: unknown;
  role?: unknown;
};

function normalizeType(raw: string): string {
  return raw.trim().toLowerCase();
}

function readRole(resource: ResourceLike): ResourceRole | undefined {
  const role = resource.role;
  if (role === "primary" || role === "support") return role;
  return undefined;
}

export function typesMatchKind(resourceType: string, kind: string): boolean {
  const a = normalizeType(resourceType);
  const b = normalizeType(kind);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(`${b}-`) || b.startsWith(`${a}-`)) return true;
  return false;
}

function resourceTypeOf(resource: ResourceLike): string | undefined {
  const raw = resource.type;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return normalizeType(raw);
}

export function pickPrimaryResourceType(
  resources: ResourceLike[] | undefined,
  unitKind?: string
): string | undefined {
  if (!resources?.length) return undefined;
  const kind = unitKind?.trim() ? normalizeType(unitKind) : undefined;

  for (const r of resources) {
    const t = resourceTypeOf(r);
    if (t && readRole(r) === "primary") return t;
  }

  if (kind) {
    for (const r of resources) {
      const t = resourceTypeOf(r);
      if (t && readRole(r) !== "support" && typesMatchKind(t, kind)) return t;
    }
  }

  for (const r of resources) {
    const t = resourceTypeOf(r);
    if (t && readRole(r) !== "support") return t;
  }

  for (const r of resources) {
    const t = resourceTypeOf(r);
    if (t) return t;
  }
  return undefined;
}

function kindFromConfig(cfg: Record<string, unknown> | null | undefined): string | undefined {
  if (!cfg || typeof cfg !== "object") return undefined;
  const meta = cfg.metadata as Record<string, unknown> | undefined;
  if (meta && typeof meta === "object") {
    for (const key of ["kind", "resourceType", "unitKind"] as const) {
      const v = meta[key];
      if (typeof v === "string" && v.trim()) return normalizeType(v);
    }
  }
  return undefined;
}

export function resolveResourceType(input: {
  configJson?: Record<string, unknown> | null;
  gitPath?: string | null;
  name?: string;
  apiType?: string | null;
}): string {
  if (input.apiType?.trim() && input.apiType.toLowerCase() !== "unknown") {
    return input.apiType.trim().toLowerCase();
  }

  const cfg = input.configJson;
  const stamped = kindFromConfig(cfg);
  const gitPath = input.gitPath?.replace(/\\/g, "/");
  const fromGit = (() => {
    if (!gitPath) return undefined;
    const parts = gitPath.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const parent = parts[parts.length - 2];
      if (parent && parent !== "projects") return parent.toLowerCase();
    }
    return undefined;
  })();
  const unitKind = stamped || fromGit;

  if (cfg && typeof cfg === "object") {
    const resources = cfg.resources as ResourceLike[] | undefined;
    if (resources?.length) {
      const primary = pickPrimaryResourceType(resources, unitKind);
      if (stamped) return stamped;
      if (primary) return primary;
    }
  }

  if (stamped) return stamped;
  if (fromGit) return fromGit;
  if (input.name?.trim()) return input.name.trim().toLowerCase();
  return "unknown";
}
