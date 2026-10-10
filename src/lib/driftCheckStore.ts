/**
 * In-flight drift checks survive route changes.
 * Leaving Infrastructure detail and coming back still shows "Checking…"
 * for that unit until the POST finishes.
 */

export type DriftReport = {
  infrastructureId: string;
  kind: string;
  hasDrift: boolean;
  gitChangedSinceApply: boolean;
  summary: string;
  changes: string[];
  planExcerpt?: string;
  actions: { applyGitDesired: string; updateGitToMatchLive: string };
  checkedAt: string;
};

type Listener = () => void;

const pendingIds = new Set<string>();
const reportsById = new Map<string, DriftReport>();
const errorsById = new Map<string, string>();
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeDriftCheck(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isDriftCheckPending(id: string): boolean {
  return pendingIds.has(id);
}

export function getDriftReport(id: string): DriftReport | undefined {
  return reportsById.get(id);
}

export function getDriftError(id: string): string | undefined {
  return errorsById.get(id);
}

/** Snapshot for React — call after subscribe bump. */
export function getDriftCheckSnapshot(id: string): {
  isPending: boolean;
  report: DriftReport | undefined;
  error: string | undefined;
} {
  return {
    isPending: pendingIds.has(id),
    report: reportsById.get(id),
    error: errorsById.get(id),
  };
}

/**
 * Run (or no-op if already pending for this id) a drift check.
 * Shared across detail page + sync panel.
 */
export async function startDriftCheck(
  id: string,
  fetchReport: (id: string) => Promise<DriftReport>
): Promise<DriftReport> {
  if (pendingIds.has(id)) {
    // Wait until the in-flight check finishes, then return its report.
    return waitForDrift(id);
  }

  pendingIds.add(id);
  errorsById.delete(id);
  emit();

  try {
    const report = await fetchReport(id);
    reportsById.set(id, report);
    emit();
    return report;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Drift check failed";
    errorsById.set(id, message);
    reportsById.delete(id);
    emit();
    throw err;
  } finally {
    pendingIds.delete(id);
    emit();
  }
}

function waitForDrift(id: string): Promise<DriftReport> {
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (pendingIds.has(id)) return;
      unsubscribe();
      const err = errorsById.get(id);
      if (err) {
        reject(new Error(err));
        return;
      }
      const report = reportsById.get(id);
      if (report) resolve(report);
      else reject(new Error("Drift check finished without a report"));
    };
    const unsubscribe = subscribeDriftCheck(tick);
    tick();
  });
}
