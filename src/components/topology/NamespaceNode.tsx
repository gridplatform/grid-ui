import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box, ArrowRight, AlertTriangle } from "lucide-react";

const statusColors: Record<string, string> = {
  healthy: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
  unknown: "hsl(var(--muted-foreground))",
};

const NamespaceNode = ({ data }: NodeProps) => {
  const d = data as any;
  const borderColor = statusColors[d.status] || "hsl(var(--border))";
  const hasCritical = d.criticalCount > 0;

  return (
    <div
      className="rounded-lg border-2 bg-card/95 backdrop-blur-sm p-3 cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg group"
      style={{
        borderColor,
        minWidth: 170,
        boxShadow: hasCritical ? `0 0 14px hsl(var(--destructive) / 0.2)` : `0 0 8px ${borderColor}10`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-border !border-0" />

      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: `${borderColor}20` }}
        >
          <Box className="w-3 h-3" style={{ color: borderColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-foreground truncate">{d.label}</div>
          <div className="text-[9px] text-muted-foreground">namespace</div>
        </div>
        {hasCritical && (
          <AlertTriangle className="w-3.5 h-3.5 text-destructive animate-pulse" />
        )}
      </div>

      <div className="flex items-center gap-3 mb-1.5">
        <div className="text-center">
          <div className="text-xs font-bold text-foreground">{d.deploymentCount}</div>
          <div className="text-[8px] text-muted-foreground">Deploys</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-foreground">{d.podCount}</div>
          <div className="text-[8px] text-muted-foreground">Pods</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-foreground">{d.resourceCount}</div>
          <div className="text-[8px] text-muted-foreground">Total</div>
        </div>
      </div>

      {/* Mini health */}
      <div className="flex gap-0.5 h-1 rounded-full overflow-hidden bg-secondary">
        {d.healthyCount > 0 && <div className="bg-emerald-500" style={{ flex: d.healthyCount }} />}
        {d.warningCount > 0 && <div className="bg-amber-500" style={{ flex: d.warningCount }} />}
        {d.criticalCount > 0 && <div className="bg-red-500" style={{ flex: d.criticalCount }} />}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <span>View resources</span>
        <ArrowRight className="w-3 h-3" />
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-border !border-0" />
    </div>
  );
};

export default memo(NamespaceNode);
