import type {
  AccessLevel,
  DomainPermissionMap,
  EffectiveAccess,
  User,
  UserRole,
} from "@/types/api";
import type { FeatureKey } from "@/config/features";

export function isSuperAdmin(role?: UserRole | string | null): boolean {
  return role === "superadmin";
}

export function isAdminLike(role?: UserRole | string | null): boolean {
  return role === "admin" || role === "superadmin";
}

export function canApproveReleases(role?: UserRole | string | null): boolean {
  return role === "maintainer" || isAdminLike(role);
}

export function canManageUsers(role?: UserRole | string | null): boolean {
  return isAdminLike(role);
}

/** Roles admin/superadmin may assign via UI (never superadmin). */
export const ASSIGNABLE_ROLES: UserRole[] = [
  "member",
  "developer",
  "maintainer",
  "admin",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  member: "Member (no access)",
  developer: "Developer",
  maintainer: "Maintainer",
  admin: "Admin",
  superadmin: "Superadmin",
};

const LEVEL_RANK: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
};

export function accessAtLeast(
  level: AccessLevel | undefined | null,
  need: AccessLevel
): boolean {
  return LEVEL_RANK[level || "none"] >= LEVEL_RANK[need];
}

export function domainLevel(
  domains: DomainPermissionMap | undefined | null,
  domain: string
): AccessLevel {
  const v = domains?.[domain];
  if (v === "read" || v === "write" || v === "none") return v;
  return "none";
}

/**
 * Product nav / routes → RBAC domains.
 * Admin is role-gated (admin/superadmin), not a domain.
 */
export const FEATURE_ACCESS_DOMAINS: Partial<
  Record<FeatureKey, { domains: string[]; need?: AccessLevel }>
> = {
  infrastructure: { domains: ["infrastructure"], need: "read" },
  deployments: { domains: ["infrastructure", "kubernetes"], need: "read" },
  releases: { domains: ["infrastructure", "kubernetes"], need: "read" },
  monitoring: { domains: ["monitoring"], need: "read" },
  alerts: { domains: ["monitoring"], need: "read" },
  apm: { domains: ["apm"], need: "read" },
  logging: { domains: ["logs"], need: "read" },
  topology: { domains: ["topology"], need: "read" },
};

export function resolveUserAccess(user?: User | null): EffectiveAccess | null {
  if (!user) return null;
  if (user.access) return user.access;
  // Login payload may omit access until /auth/me refreshes.
  return null;
}

/** True if user may open a product feature (nav + route). */
export function canAccessFeature(
  user: User | null | undefined,
  feature: FeatureKey
): boolean {
  if (!user) return false;
  if (feature === "admin") return canManageUsers(user.role);

  // Global built-in roles have full catalog write — allow all product surfaces.
  if (
    user.role === "developer" ||
    user.role === "maintainer" ||
    user.role === "admin" ||
    user.role === "superadmin"
  ) {
    return true;
  }

  const rule = FEATURE_ACCESS_DOMAINS[feature];
  if (!rule) return true;

  const access = resolveUserAccess(user);
  const domains = access?.domains;
  const need = rule.need || "read";
  return rule.domains.some((d) => accessAtLeast(domainLevel(domains, d), need));
}
