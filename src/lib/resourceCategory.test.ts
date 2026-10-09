import { describe, expect, it } from "vitest";
import { categoryForResourceType, categoryLabel } from "@/lib/resourceCategory";

describe("resourceCategory", () => {
  it("maps common infra types", () => {
    expect(categoryForResourceType("vpc")).toBe("network");
    expect(categoryForResourceType("ec2-instance")).toBe("compute");
    expect(categoryForResourceType("eks")).toBe("kubernetes-cluster");
    expect(categoryForResourceType("eks-node-group")).toBe("kubernetes-cluster");
  });

  it("falls back safely", () => {
    expect(categoryForResourceType(undefined)).toBe("other");
    expect(categoryForResourceType("unknown")).toBe("other");
    expect(categoryLabel("network")).toBeTruthy();
  });
});
