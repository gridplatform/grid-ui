import { memo } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

const connTypeColors: Record<string, string> = {
  peering: "hsl(var(--info))",
  vpn: "hsl(var(--warning))",
  "transit-gateway": "hsl(var(--success))",
  internet: "hsl(var(--destructive))",
};

const CrossVpcEdge = ({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
    curvature: 0.4,
  });

  const connType = (data as any)?.connType || "peering";
  const label = (data as any)?.label || connType;
  const color = connTypeColors[connType] || "hsl(var(--muted-foreground))";

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="8 4"
        strokeOpacity={0.6}
        markerEnd={`url(#arrow-${id})`}
      >
        <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.5s" repeatCount="indefinite" />
      </path>

      {/* Label */}
      <foreignObject x={labelX - 45} y={labelY - 10} width={90} height={20} className="pointer-events-none">
        <div className="flex items-center justify-center h-full">
          <span
            className="text-[8px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: "hsl(var(--card))",
              color,
              border: `1px solid ${color}40`,
            }}
          >
            {label}
          </span>
        </div>
      </foreignObject>

      {/* Arrow marker */}
      <defs>
        <marker id={`arrow-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} fillOpacity={0.7} />
        </marker>
      </defs>
    </>
  );
};

export default memo(CrossVpcEdge);
