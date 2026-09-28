import { memo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

const AnimatedEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const isHighlighted = (data as any)?.highlighted;

  return (
    <>
      {/* Shadow / glow for highlighted edges */}
      {isHighlighted && (
        <path
          d={edgePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={4}
          opacity={0.15}
          className="react-flow__edge-path"
        />
      )}

      {/* Base edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
        strokeWidth={isHighlighted ? 2 : 1}
        opacity={isHighlighted ? 1 : 0.6}
        className="react-flow__edge-path transition-all duration-200"
      />

      {/* Animated flow dots */}
      <circle r={isHighlighted ? 3 : 2} fill={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} opacity={isHighlighted ? 1 : 0.5}>
        <animateMotion dur={isHighlighted ? "1.5s" : "3s"} repeatCount="indefinite" path={edgePath} />
      </circle>

      {/* Arrow marker at end */}
      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth={isHighlighted ? 8 : 6}
          markerHeight={isHighlighted ? 8 : 6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"} />
        </marker>
      </defs>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={1}
        markerEnd={`url(#arrow-${id})`}
      />
    </>
  );
};

export default memo(AnimatedEdge);
