import { describe, expect, it } from "vitest";
import {
  infrastructureListVisibility,
  isLiveResidue,
  validateCatalogVocabulary,
} from "./catalogVisibility";

describe("catalogVisibility", () => {
  it("hides flagged-off providers on infrastructure", () => {
    expect(infrastructureListVisibility("oracle", "vm")).toBe("hidden");
    expect(infrastructureListVisibility("azure", "virtual-machine")).toBe("hidden");
  });

  it("shows enabled aws/gcp catalog subtypes", () => {
    expect(infrastructureListVisibility("aws", "vpc")).toBe("visible");
    expect(infrastructureListVisibility("gcp", "cloud-sql-sqlserver")).toBe("visible");
  });

  it("marks unknown subtype as invalid", () => {
    expect(infrastructureListVisibility("aws", "not-a-real-type-xyz")).toBe("invalid");
  });

  it("detects live residue when offering is off", () => {
    expect(isLiveResidue("oracle", "vm", "running")).toBe(true);
    expect(isLiveResidue("aws", "vpc", "running")).toBe(false);
    expect(isLiveResidue("oracle", "vm", "pending")).toBe(false);
  });

  it("rejects JSON when kind and primary disagree", () => {
    const result = validateCatalogVocabulary("aws", {
      metadata: { kind: "vpc", name: "x" },
      provider: "aws",
      resources: [{ type: "ec2-instance", name: "a", role: "primary" }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /must equal the primary/i.test(e))).toBe(true);
  });

  it("accepts matching kind and primary catalog words", () => {
    const result = validateCatalogVocabulary("aws", {
      metadata: { kind: "vpc", name: "x" },
      provider: "aws",
      resources: [{ type: "vpc", name: "main", role: "primary" }],
    });
    expect(result.ok).toBe(true);
  });
});
