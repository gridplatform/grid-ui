import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { layerLabels, type ResourceLayer } from "@/data/topologyTypes";

const layerColors: Record<string, string> = {
  waf: "hsl(var(--destructive) / 0.15)",
  network: "hsl(var(--info) / 0.12)",
  loadbalancer: "hsl(var(--warning) / 0.1)",
  application: "hsl(var(--success) / 0.08)",
  data: "hsl(160 60% 60% / 0.06)",
};

const layerBorderColors: Record<string, string> = {
  waf: "hsl(var(--destructive) / 0.3)",
  network: "hsl(var(--info) / 0.25)",
  loadbalancer: "hsl(var(--warning) / 0.2)",
  application: "hsl(var(--success) / 0.15)",
  data: "hsl(160 60% 60% / 0.12)",
};

const RingGuideNode = ({ data }: NodeProps) => {
  const d = data as any;
  const radius = d.radius as number;
  const layer = d.layer as ResourceLayer;
  const diameter = radius * 2;
  const label = layerLabels[layer] || layer;

  return (
    <div
      className="pointer-events-none"
      style={{
        width: diameter,
        height: diameter,
        borderRadius: "50%",
        border: `1px dashed ${layerBorderColors[layer] || "hsl(var(--border))"}`,
        background: layerColors[layer] || "transparent",
        position: "relative",
      }}
    >
      <span
        className="absolute text-[9px] font-medium tracking-wide uppercase"
        style={{
          top: -2,
          left: "50%",
          transform: "translate(-50%, -100%)",
          color: layerBorderColors[layer]?.replace("/ 0.", "/ 0.8") || "hsl(var(--muted-foreground))",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default memo(RingGuideNode);
