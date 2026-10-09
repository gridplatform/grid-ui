import { describe, expect, it } from "vitest";
import {
  accessAtLeast,
  canAccessEnvironment,
  canAccessFeature,
  canAccessProject,
  canApproveReleases,
  canManageUsers,
  isAdminLike,
} from "@/lib/rbac";
import type { User } from "@/types/api";

function memberUser(overrides?: Partial<User>): User {
  return {
    id: "u1",
    email: "member@example.com",
    name: "Member",
    role: "member",
    createdAt: new Date().toISOString(),
    access: {
      role: "member",
      domains: {
        infrastructure: "write",
        kubernetes: "none",
        monitoring: "none",
        apm: "none",
        logs: "none",
        topology: "none",
        secrets: "none",
      },
      infrastructure: "write",
      kubernetes: "none",
      scope: "grants",
      workspace: {
        mode: "grants",
        projects: ["grid-labs"],
        environments: { "grid-labs": ["development"] },
      },
    },
    ...overrides,
  };
}

describe("ui rbac helpers", () => {
  it("classifies admin-like roles", () => {
    expect(isAdminLike("admin")).toBe(true);
    expect(isAdminLike("superadmin")).toBe(true);
    expect(isAdminLike("maintainer")).toBe(false);
    expect(canManageUsers("admin")).toBe(true);
    expect(canApproveReleases("maintainer")).toBe(true);
    expect(canApproveReleases("developer")).toBe(false);
  });

  it("ranks domain levels", () => {
    expect(accessAtLeast("write", "read")).toBe(true);
    expect(accessAtLeast("read", "write")).toBe(false);
  });

  it("scopes projects and environments from workspace grants", () => {
    const user = memberUser();
    expect(canAccessProject(user, "grid-labs")).toBe(true);
    expect(canAccessProject(user, "demo-app")).toBe(false);
    expect(canAccessEnvironment(user, "grid-labs", "development")).toBe(true);
    expect(canAccessEnvironment(user, "grid-labs", "production")).toBe(false);
  });

  it("allows global roles everywhere", () => {
    const developer = memberUser({ role: "developer", access: undefined });
    expect(canAccessProject(developer, "any-project")).toBe(true);
    expect(canAccessFeature(developer, "monitoring")).toBe(true);
    expect(canAccessFeature(developer, "admin")).toBe(false);
  });

  it("gates product features for members by domain", () => {
    const user = memberUser();
    expect(canAccessFeature(user, "infrastructure")).toBe(true);
    expect(canAccessFeature(user, "monitoring")).toBe(false);
    expect(canAccessFeature(user, "admin")).toBe(false);
  });

  it("denies features when grants have no projects", () => {
    const user = memberUser({
      access: {
        role: "member",
        domains: {
          infrastructure: "none",
          kubernetes: "none",
          monitoring: "none",
          apm: "none",
          logs: "none",
          topology: "none",
          secrets: "none",
        },
        infrastructure: "none",
        kubernetes: "none",
        scope: "grants",
        workspace: { mode: "grants", projects: [], environments: {} },
      },
    });
    expect(canAccessFeature(user, "infrastructure")).toBe(false);
  });
});
