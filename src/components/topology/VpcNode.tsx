import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import type { HealthStatus } from "@/data/topologyTypes";
import { layerLabels } from "@/data/topologyTypes";

const statusBorder: Record<HealthStatus, string> = {
  healthy: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
  unknown: "hsl(var(--muted-foreground))",
};

const layerColors: Record<string, string> = {
  waf: "hsl(var(--destructive))",
  network: "hsl(var(--info))",
  loadbalancer: "hsl(var(--warning))",
  application: "hsl(var(--success))",
  data: "hsl(160 60% 60%)",
};

const VpcNode = ({ data }: NodeProps) => {
  const d = data as any;
  const borderColor = statusBorder[d.status as HealthStatus] || statusBorder.unknown;
  const hasCritical = d.healthCounts?.critical > 0;
  const hasWarning = d.healthCounts?.warning > 0;

  const layers = d.layerCounts as Record<string, number>;

  return (
    <div className="cursor-pointer group">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-border !border-0" />

      <div
        className="rounded-full bg-card flex flex-col items-center justify-center transition-all duration-200 group-hover:scale-105"
        style={{
          width: 180,
          height: 180,
          border: `3px solid ${borderColor}`,
          boxShadow: `0 0 24px ${borderColor}20, inset 0 0 30px hsl(var(--background) / 0.5)`,
        }}
      >
        <div className="font-semibold text-xs text-foreground text-center leading-tight px-3">{d.label}</div>
        <div className="text-[9px] text-muted-foreground mt-0.5">{d.region} · {d.cidr}</div>
        <div className="text-[10px] text-foreground font-medium mt-1">{d.totalResources} resources</div>

        {/* Layer dots */}
        <div className="flex items-center gap-1 mt-1.5">
          {Object.entries(layers).map(([layer, count]) => (
            <div
              key={layer}
              className="flex items-center gap-0.5"
              title={`${layerLabels[layer as keyof typeof layerLabels] || layer}: ${count}`}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: layerColors[layer] || "hsl(var(--muted-foreground))" }} />
              <span className="text-[7px] text-muted-foreground">{count as number}</span>
            </div>
          ))}
        </div>

        {(hasCritical || hasWarning) && (
          <div className="flex items-center gap-1.5 mt-1">
            {hasCritical && (
              <span className="flex items-center gap-0.5 text-[8px] text-destructive">
                <AlertTriangle className="w-2 h-2" />
                {d.healthCounts.critical}
              </span>
            )}
            {hasWarning && (
              <span className="flex items-center gap-0.5 text-[8px] text-amber-500">
                <AlertTriangle className="w-2 h-2" />
                {d.healthCounts.warning}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-border !border-0" />
    </div>
  );
};

export default memo(VpcNode);
