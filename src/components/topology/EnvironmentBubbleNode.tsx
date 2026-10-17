import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import type { ResourceLayer, HealthStatus } from "@/data/topologyTypes";
import type { TopologyEnvironment, TopologyResource } from "@/types/api";
import { layerOrder } from "@/data/topologyTypes";

const statusBorder: Record<HealthStatus, string> = {
  healthy: "border-[hsl(var(--success))]",
  warning: "border-[hsl(var(--warning))]",
  critical: "border-destructive",
  unknown: "border-muted",
};

const statusFill: Record<HealthStatus, string> = {
  healthy: "bg-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning))]",
  critical: "bg-destructive",
  unknown: "bg-muted-foreground",
};

const providerBadge: Record<string, string> = {
  aws: "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]",
  gcp: "bg-[hsl(var(--info))]/20 text-[hsl(var(--info))]",
  azure: "bg-sky-500/20 text-sky-400",
};

function providerLabel(providerId: string): string {
  return providerId.replace(/^provider-/, "");
}

/** Arc reserved for one type so neighboring labels can sit on the same ring. */
const LABEL_CHORD = 72;
const RING_STEP = 48;
const LAYER_GAP = 16;
const FIRST_RADIUS = 86;

interface TypeMark {
  id: string;
  type: string;
  layer: ResourceLayer;
  count: number;
  status: HealthStatus;
  /** Resource ids of this type, for hover. */
  resourceIds: string[];
  x: number;
  y: number;
  radius: number;
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("healthy")) return "healthy";
  return "unknown";
}

/**
 * One mark per catalog type, on as many rings as that layer needs.
 * Nothing is dropped after a fixed count.
 */
export function placeEnvironmentTypes(
  resources: TopologyResource[],
  visibleLayers?: Set<ResourceLayer>
): { marks: TypeMark[]; size: number } {
  const byLayer = new Map<ResourceLayer, Map<string, TopologyResource[]>>();
  for (const resource of resources) {
    if (visibleLayers && !visibleLayers.has(resource.layer)) continue;
    const types = byLayer.get(resource.layer) || new Map<string, TopologyResource[]>();
    const list = types.get(resource.type) || [];
    list.push(resource);
    types.set(resource.type, list);
    byLayer.set(resource.layer, types);
  }

  const marks: TypeMark[] = [];
  let radius = FIRST_RADIUS;

  for (const layer of layerOrder) {
    const types = byLayer.get(layer);
    if (!types || types.size === 0) continue;
    const ordered = [...types.entries()].sort(([a], [b]) => a.localeCompare(b));
    let offset = 0;
    while (offset < ordered.length) {
      const slots = Math.max(6, Math.floor((2 * Math.PI * radius) / LABEL_CHORD));
      const slice = ordered.slice(offset, offset + slots);
      slice.forEach(([, group], i) => {
        const angle = (2 * Math.PI * i) / slice.length - Math.PI / 2;
        const first = group[0];
        marks.push({
          id: `${layer}:${first.type}`,
          type: first.type,
          layer,
          count: group.length,
          status: worstStatus(group.map((r) => r.status)),
          resourceIds: group.map((r) => r.id),
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          radius,
        });
      });
      offset += slice.length;
      radius += RING_STEP;
    }
    radius += LAYER_GAP;
  }

  const outer = marks.reduce((max, mark) => Math.max(max, mark.radius), FIRST_RADIUS);
  const size = Math.max(640, Math.ceil((outer + 168) * 2));
  return { marks, size };
}

export function environmentBubbleSize(
  resources: TopologyResource[],
  visibleLayers?: Set<ResourceLayer>
): number {
  return placeEnvironmentTypes(resources, visibleLayers).size;
}

interface EnvironmentBubbleData {
  environment: TopologyEnvironment;
  expanded: boolean;
  visibleLayers: Set<ResourceLayer>;
  hoveredResource: string | null;
  connectedResourceIds: Set<string>;
  connectedEnvironmentIds: Set<string>;
  onToggle: (id: string) => void;
  onResourceHover: (id: string | null) => void;
}

const EnvironmentBubbleNode = ({ data }: NodeProps) => {
  const d = data as unknown as EnvironmentBubbleData;
  const environment = d.environment;
  const expanded = d.expanded;
  const visibleLayers = d.visibleLayers;
  const hoveredResource = d.hoveredResource;
  const connectedResourceIds = d.connectedResourceIds;
  const onToggle = d.onToggle;
  const onResourceHover = d.onResourceHover;

  const isHighlighted = d.connectedEnvironmentIds?.has(environment.id) && hoveredResource &&
    !environment.resources.some(r => r.id === hoveredResource);

  const { marks, size: expandedSize } = useMemo(
    () => placeEnvironmentTypes(environment.resources, visibleLayers),
    [environment.resources, visibleLayers]
  );
  const ringRadii = useMemo(() => {
    const seen = new Set<number>();
    return marks.map((mark) => mark.radius).filter((radius) => {
      if (seen.has(radius)) return false;
      seen.add(radius);
      return true;
    });
  }, [marks]);

  const handleStyle = "!bg-transparent !border-0 !w-0 !h-0";
  const centerX = expanded ? expandedSize / 2 : 120;
  const centerY = expanded ? expandedSize / 2 : 120;

  // ─── Collapsed ────────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="relative cursor-pointer group" onClick={() => onToggle(environment.id)}>
        <Handle type="target" position={Position.Left} className={handleStyle} />
        <Handle type="source" position={Position.Right} className={handleStyle} />
        <Handle type="target" position={Position.Top} id="top" className={handleStyle} />
        <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />

        <div className={`w-[240px] h-[240px] rounded-full border-2 ${statusBorder[environment.status]}
          flex flex-col items-center justify-center gap-1
          bg-card/90 backdrop-blur-sm
          transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/10
          ${isHighlighted ? "ring-2 ring-primary/60 shadow-lg shadow-primary/20 scale-105" : ""}`}
        >
          {environment.healthCounts.critical > 0 && (
            <AlertTriangle className="w-4 h-4 text-destructive absolute top-4 right-4" />
          )}
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${providerBadge[providerLabel(environment.providerId)] || "bg-muted text-muted-foreground"}`}>
            {providerLabel(environment.providerId)}
          </span>
          <span className="text-sm font-semibold text-foreground text-center px-4 leading-tight mt-1">
            {environment.name}
          </span>
          <span className="text-[10px] font-medium text-primary uppercase tracking-wide">
            environment
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">{environment.totalResources} resources</span>
          <div className="flex items-center gap-1.5 mt-1">
            {environment.healthCounts.healthy > 0 && <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--success))]" title={`${environment.healthCounts.healthy} healthy`} />}
            {environment.healthCounts.warning > 0 && <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--warning))]" title={`${environment.healthCounts.warning} warning`} />}
            {environment.healthCounts.critical > 0 && <div className="w-2.5 h-2.5 rounded-full bg-destructive" title={`${environment.healthCounts.critical} critical`} />}
          </div>
          <span className="text-[9px] text-muted-foreground mt-1">Click to expand</span>
        </div>
      </div>
    );
  }

  // ─── Expanded with internal graph ─────────────────────────────────────────
  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} className={handleStyle} />
      <Handle type="source" position={Position.Right} className={handleStyle} />
      <Handle type="target" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />

      {/* Environment boundary */}
      <div 
        className={`relative rounded-full border-2 border-dashed ${statusBorder[environment.status]} bg-card/30 backdrop-blur-sm
          ${isHighlighted ? "ring-2 ring-primary/60" : ""}`}
        style={{ width: expandedSize, height: expandedSize }}
      >
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(environment.id); }}
          className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 
            flex items-center justify-center text-foreground transition-colors border border-border"
        >
          ✕
        </button>

        {/* Environment name */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${providerBadge[providerLabel(environment.providerId)] || "bg-muted text-muted-foreground"}`}>
            {providerLabel(environment.providerId)}
          </span>
          <span className="text-sm font-semibold text-foreground">{environment.name}</span>
          <span className="text-[10px] text-muted-foreground">
            {marks.length} types · {marks.reduce((sum, mark) => sum + mark.count, 0)} components
          </span>
        </div>

        {/* Concentric ring guides */}
        <svg className="absolute inset-0 pointer-events-none" width={expandedSize} height={expandedSize}>
          {ringRadii.map((radius) => (
            <circle
              key={radius}
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="hsl(0 0% 30%)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.3"
            />
          ))}
        </svg>

        {/* One mark per catalog type */}
        {marks.map((mark) => {
          const isHov = !!hoveredResource && mark.resourceIds.includes(hoveredResource);
          const isCon = mark.resourceIds.some((id) => connectedResourceIds?.has(id));
          const deg = (Math.atan2(mark.y, mark.x) * 180) / Math.PI;
          const flip = deg > 90 || deg < -90;
          const label = mark.count > 1 ? `${mark.type} ${mark.count}` : mark.type;

          return (
            <div
              key={mark.id}
              className={`absolute cursor-pointer transition-all duration-150
                ${isHov ? "z-40" : isCon ? "z-30" : "z-20"}`}
              style={{
                left: centerX + mark.x,
                top: centerY + mark.y,
                transform: "translate(-50%, -50%)",
              }}
              onMouseEnter={() => onResourceHover(mark.resourceIds[0] ?? null)}
              onMouseLeave={() => onResourceHover(null)}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all
                  ${statusBorder[mark.status]}
                  ${isHov ? "ring-2 ring-primary shadow-lg shadow-primary/30 bg-primary/20 scale-125" :
                    isCon ? "ring-1 ring-accent bg-accent/10 scale-110" : "bg-card/80"}`}
              >
                <div className={`w-2 h-2 rounded-full ${statusFill[mark.status]}`} />
              </div>
              <span
                title={label}
                className={`absolute left-1/2 top-1/2 whitespace-nowrap text-[9px] font-medium leading-none
                  ${isHov ? "text-primary" : isCon ? "text-accent-foreground" : "text-muted-foreground"}`}
                style={{
                  transformOrigin: "0 50%",
                  transform: flip
                    ? `rotate(${deg + 180}deg) translateX(calc(-100% - 8px)) translateY(-50%)`
                    : `rotate(${deg}deg) translateX(8px) translateY(-50%)`,
                }}
              >
                {label}
              </span>
            </div>
          );
        })}

        {/* Stats in the open center so they do not cover outer type labels */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-6 flex items-center gap-4 bg-card/80 px-4 py-2 rounded-full border border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
            <span className="text-[10px] text-foreground">{environment.healthCounts.healthy}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--warning))]" />
            <span className="text-[10px] text-foreground">{environment.healthCounts.warning}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-[10px] text-foreground">{environment.healthCounts.critical}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(EnvironmentBubbleNode);
