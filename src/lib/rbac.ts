import type { UserRole } from "@/types/api";

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

export const ASSIGNABLE_ROLES: UserRole[] = ["developer", "maintainer", "admin"];
