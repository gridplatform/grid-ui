import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe, AlertTriangle, ArrowRight } from "lucide-react";

const providerColors: Record<string, string> = {
  AWS: "hsl(var(--warning))",
  GCP: "hsl(var(--primary))",
  Azure: "hsl(var(--info, 210 100% 50%))",
  "On-Prem": "hsl(var(--muted-foreground))",
};

const RegionNode = ({ data }: NodeProps) => {
  const d = data as any;
  const borderColor = providerColors[d.provider] || "hsl(var(--border))";
  const hasCritical = d.criticalCount > 0;
  const hasWarning = d.warningCount > 0;

  return (
    <div
      className="rounded-xl border-2 bg-card/95 backdrop-blur-sm p-4 cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg group"
      style={{
        borderColor,
        minWidth: 220,
        boxShadow: hasCritical ? `0 0 20px hsl(var(--destructive) / 0.2)` : hasWarning ? `0 0 20px hsl(var(--warning) / 0.15)` : `0 0 12px ${borderColor}15`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-border !border-0" />

      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${borderColor}20` }}>
          <Globe className="w-4 h-4" style={{ color: borderColor }} />
        </div>
        <div>
          <div className="text-xs font-bold text-foreground">{d.label}</div>
          <div className="text-[10px] text-muted-foreground">{d.provider} · {d.location}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2.5">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{d.totalResources}</div>
          <div className="text-[9px] text-muted-foreground">Resources</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{d.clusterCount}</div>
          <div className="text-[9px] text-muted-foreground">Clusters</div>
        </div>
      </div>

      {/* Health bar */}
      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-secondary mb-1.5">
        {d.healthyCount > 0 && <div className="bg-emerald-500 transition-all" style={{ flex: d.healthyCount }} />}
        {d.warningCount > 0 && <div className="bg-amber-500 transition-all" style={{ flex: d.warningCount }} />}
        {d.criticalCount > 0 && <div className="bg-red-500 transition-all" style={{ flex: d.criticalCount }} />}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span className="text-emerald-500">{d.healthyCount} healthy</span>
        {d.warningCount > 0 && <span className="text-amber-500">{d.warningCount} warn</span>}
        {d.criticalCount > 0 && <span className="text-red-500">{d.criticalCount} crit</span>}
      </div>

      {/* Drill-down hint */}
      <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Click to explore</span>
        <ArrowRight className="w-3 h-3" />
      </div>

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-border !border-0" />
    </div>
  );
};

export default memo(RegionNode);
