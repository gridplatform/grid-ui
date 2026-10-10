import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDriftCheckSnapshot,
  isDriftCheckPending,
  startDriftCheck,
  subscribeDriftCheck,
  type DriftReport,
} from "./driftCheckStore";

function sampleReport(id: string): DriftReport {
  return {
    infrastructureId: id,
    kind: "in_sync",
    hasDrift: false,
    gitChangedSinceApply: false,
    summary: "ok",
    changes: [],
    actions: { applyGitDesired: "a", updateGitToMatchLive: "b" },
    checkedAt: new Date().toISOString(),
  };
}

describe("driftCheckStore", () => {
  beforeEach(async () => {
    // Drain any leftover pending from prior tests by waiting.
    // Store is module-scoped; use unique ids per test.
  });

  it("marks pending while fetch runs and clears after", async () => {
    const id = `infra-${Math.random()}`;
    let resolve!: (r: DriftReport) => void;
    const fetch = () =>
      new Promise<DriftReport>((r) => {
        resolve = r;
      });

    const bumps: boolean[] = [];
    const unsub = subscribeDriftCheck(() => {
      bumps.push(isDriftCheckPending(id));
    });

    const p = startDriftCheck(id, fetch);
    expect(isDriftCheckPending(id)).toBe(true);
    expect(getDriftCheckSnapshot(id).isPending).toBe(true);

    resolve(sampleReport(id));
    const report = await p;
    expect(report.summary).toBe("ok");
    expect(isDriftCheckPending(id)).toBe(false);
    expect(getDriftCheckSnapshot(id).report?.summary).toBe("ok");
    expect(bumps).toContain(true);
    expect(bumps[bumps.length - 1]).toBe(false);
    unsub();
  });

  it("dedupes concurrent starts for the same id", async () => {
    const id = `infra-dup-${Math.random()}`;
    const fetch = vi.fn(
      () =>
        new Promise<DriftReport>((r) => {
          setTimeout(() => r(sampleReport(id)), 20);
        })
    );

    const [a, b] = await Promise.all([
      startDriftCheck(id, fetch),
      startDriftCheck(id, fetch),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a.infrastructureId).toBe(id);
    expect(b.infrastructureId).toBe(id);
  });
});
