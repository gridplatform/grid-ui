import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { DriftReport } from "@/lib/driftCheckStore";

/**
 * Compact drift result:
 * - No drift → one line, no notes
 * - Drift → Yes + plan excerpt + short what-to-do
 * - Failed → error + excerpt if any
 */
export function DriftResultCard({ report }: { report: DriftReport }) {
  if (report.kind === "unknown") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-xs space-y-2">
        <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
          <XCircle className="w-4 h-4 text-destructive" />
          Drift check failed
        </p>
        {report.changes?.[0] && (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground bg-background rounded-md border border-border p-2">
            {report.changes[0]}
          </pre>
        )}
        {report.planExcerpt && !report.changes?.[0] && (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground bg-background rounded-md border border-border p-2">
            {report.planExcerpt}
          </pre>
        )}
      </div>
    );
  }

  if (!report.hasDrift) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground inline-flex items-center gap-2 w-full">
        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
        No drift
      </div>
    );
  }

  const planLine = report.changes?.find((c) => /Plan:\s*\d+\s*to add/i.test(c));

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-xs space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          Drift detected
        </p>
        {planLine && (
          <p className="font-mono text-muted-foreground">{planLine}</p>
        )}
      </div>

      {report.planExcerpt && (
        <div className="space-y-1">
          <p className="text-foreground font-medium">Terraform plan</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground bg-background rounded-md border border-border p-2">
            {report.planExcerpt}
          </pre>
        </div>
      )}

      <p className="text-muted-foreground border-t border-border pt-2 leading-relaxed">
        Run <span className="text-foreground font-medium">Plan</span> on this unit
        (Releases) to review the full change. If config should win, fix desired-state
        JSON/YAML in Git and apply; if live is correct, update the config to match
        and Sync.
      </p>
    </div>
  );
}
