import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight, Cloud, Server } from "lucide-react";

interface ClusterGroupData {
  label: string;
  provider: string;
  environment: string;
  childCount: number;
  collapsed: boolean;
  onToggle: (id: string) => void;
  [key: string]: unknown;
}

const providerIcons: Record<string, React.ElementType> = {
  AWS: Server,
  GCP: Cloud,
};

const envColors: Record<string, string> = {
  Production: "hsl(var(--primary))",
  Staging: "hsl(var(--warning))",
  Development: "hsl(var(--muted-foreground))",
};

const ClusterGroupNode = ({ data, id }: NodeProps) => {
  const d = data as unknown as ClusterGroupData;
  const ProvIcon = providerIcons[d.provider] || Server;
  const borderColor = envColors[d.environment] || "hsl(var(--border))";

  return (
    <div
      className="rounded-lg border-2 border-dashed bg-card/50 backdrop-blur-sm transition-all duration-200 hover:bg-card/80"
      style={{
        borderColor,
        minWidth: d.collapsed ? 160 : undefined,
        minHeight: d.collapsed ? 60 : undefined,
        padding: d.collapsed ? "12px 16px" : "8px",
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-border !border-0" />

      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={(e) => {
          e.stopPropagation();
          d.onToggle(id);
        }}
      >
        {d.collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <ProvIcon className="w-3.5 h-3.5" style={{ color: borderColor }} />
        <span className="text-xs font-semibold text-foreground">{d.label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {d.childCount} resources
        </span>
      </div>

      {d.collapsed && (
        <div className="mt-2 text-[10px] text-muted-foreground text-center">
          Click to expand
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-border !border-0" />
    </div>
  );
};

export default memo(ClusterGroupNode);
