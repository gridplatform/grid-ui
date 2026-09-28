import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Cloud, Server, AlertTriangle } from "lucide-react";

const providerColors: Record<string, string> = {
  AWS: "hsl(38 92% 50%)",
  GCP: "hsl(217 91% 60%)",
  Azure: "hsl(200 90% 50%)",
  "On-Prem": "hsl(var(--muted-foreground))",
};

const providerLogos: Record<string, string> = {
  AWS: "☁️",
  GCP: "🌐",
  Azure: "🔷",
  "On-Prem": "🏢",
};

const ProviderNode = ({ data }: NodeProps) => {
  const d = data as any;
  const color = providerColors[d.providerType] || providerColors["On-Prem"];
  const hasCritical = d.healthCounts?.critical > 0;
  const hasWarning = d.healthCounts?.warning > 0;

  return (
    <div className="cursor-pointer group">
      <Handle type="target" position={Position.Left} className="!w-0 !h-0 !border-0 !bg-transparent" />

      <div
        className="rounded-xl bg-card border-2 p-5 min-w-[220px] transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-lg"
        style={{
          borderColor: hasCritical ? "hsl(var(--destructive))" : hasWarning ? "hsl(var(--warning))" : color,
          boxShadow: `0 0 20px ${color}15`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{providerLogos[d.providerType] || "☁️"}</span>
          <div>
            <div className="font-semibold text-sm text-foreground">{d.label}</div>
            <div className="text-[10px] text-muted-foreground">{d.providerType}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Cloud className="w-3 h-3" />
            <span><span className="text-foreground font-medium">{d.vpcCount}</span> VPCs</span>
          </div>
          <div className="flex items-center gap-1">
            <Server className="w-3 h-3" />
            <span><span className="text-foreground font-medium">{d.totalResources}</span> resources</span>
          </div>
        </div>

        {(hasCritical || hasWarning) && (
          <div className="mt-2 flex items-center gap-2 text-[10px]">
            {hasCritical && (
              <span className="flex items-center gap-0.5 text-destructive">
                <AlertTriangle className="w-2.5 h-2.5" />
                {d.healthCounts.critical} critical
              </span>
            )}
            {hasWarning && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <AlertTriangle className="w-2.5 h-2.5" />
                {d.healthCounts.warning} warnings
              </span>
            )}
          </div>
        )}

        <div className="mt-2 text-[9px] text-muted-foreground text-center">Click to explore VPCs →</div>
      </div>

      <Handle type="source" position={Position.Right} className="!w-0 !h-0 !border-0 !bg-transparent" />
    </div>
  );
};

export default memo(ProviderNode);
