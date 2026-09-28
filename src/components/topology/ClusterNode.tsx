import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Cloud, Server, Brain, Monitor, Database, Network as NetworkIcon,
  AlertTriangle, ArrowRight, Cpu,
} from "lucide-react";

const clusterTypeIcons: Record<string, React.ElementType> = {
  gke: Cloud, eks: Cloud, aks: Cloud,
  "self-managed": Server, "vm-group": Database,
  "ml-cluster": Brain,
};

const clusterTypeLabels: Record<string, string> = {
  gke: "GKE", eks: "EKS", aks: "AKS",
  "self-managed": "Self-Managed", "vm-group": "Service Group",
  "ml-cluster": "ML Cluster",
};

const envBorderColors: Record<string, string> = {
  Production: "hsl(var(--primary))",
  Staging: "hsl(var(--warning))",
  Development: "hsl(var(--muted-foreground))",
};

const statusRing: Record<string, string> = {
  healthy: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
  unknown: "hsl(var(--muted-foreground))",
};

const ClusterNode = ({ data }: NodeProps) => {
  const d = data as any;
  const Icon = clusterTypeIcons[d.clusterType] || Server;
  const borderColor = statusRing[d.status] || envBorderColors[d.environment];
  const hasCritical = d.criticalCount > 0;

  return (
    <div
      className="rounded-xl border-2 bg-card/95 backdrop-blur-sm p-3.5 cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg group"
      style={{
        borderColor,
        minWidth: 200,
        boxShadow: hasCritical ? `0 0 16px hsl(var(--destructive) / 0.2)` : `0 0 10px ${borderColor}15`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-border !border-0" />

      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${borderColor}20`, border: `1.5px solid ${borderColor}` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: borderColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-foreground truncate">{d.label}</div>
          <div className="text-[9px] text-muted-foreground">
            {clusterTypeLabels[d.clusterType] || d.clusterType} · {d.provider}
          </div>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
          {d.environment?.slice(0, 4)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">{d.nodeCount}</div>
          <div className="text-[8px] text-muted-foreground">Nodes</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">{d.namespaceCount}</div>
          <div className="text-[8px] text-muted-foreground">NS</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">{d.totalResources}</div>
          <div className="text-[8px] text-muted-foreground">Resources</div>
        </div>
      </div>

      {/* Health bar */}
      <div className="flex gap-0.5 h-1 rounded-full overflow-hidden bg-secondary">
        {d.healthyCount > 0 && <div className="bg-emerald-500" style={{ flex: d.healthyCount }} />}
        {d.warningCount > 0 && <div className="bg-amber-500" style={{ flex: d.warningCount }} />}
        {d.criticalCount > 0 && <div className="bg-red-500" style={{ flex: d.criticalCount }} />}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Drill down</span>
        <ArrowRight className="w-3 h-3" />
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-border !border-0" />
    </div>
  );
};

export default memo(ClusterNode);
