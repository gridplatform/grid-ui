import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import type { Vpc, ResourceLayer, HealthStatus, VpcResource } from "@/data/topologyTypes";
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

// Layer ring radii (relative to center) - larger for bigger expanded view
const layerRadii: Record<ResourceLayer, number> = {
  waf: 80,
  network: 160,
  loadbalancer: 240,
  application: 320,
  data: 400,
};

const MAX_PER_LAYER = 8; // Max resources to show per layer ring

interface VpcBubbleData {
  vpc: Vpc;
  expanded: boolean;
  visibleLayers: Set<ResourceLayer>;
  hoveredResource: string | null;
  connectedResourceIds: Set<string>;
  connectedVpcIds: Set<string>;
  onToggle: (id: string) => void;
  onResourceHover: (id: string | null) => void;
}

const VpcBubbleNode = ({ data }: NodeProps) => {
  const d = data as unknown as VpcBubbleData;
  const vpc = d.vpc;
  const expanded = d.expanded;
  const visibleLayers = d.visibleLayers;
  const hoveredResource = d.hoveredResource;
  const connectedResourceIds = d.connectedResourceIds;
  const onToggle = d.onToggle;
  const onResourceHover = d.onResourceHover;

  const isHighlighted = d.connectedVpcIds?.has(vpc.id) && hoveredResource &&
    !vpc.resources.some(r => r.id === hoveredResource);

  // Group resources by layer and limit per layer
  const resourcesByLayer = useMemo(() => {
    const map = new Map<ResourceLayer, VpcResource[]>();
    vpc.resources.forEach(r => {
      if (!visibleLayers?.has(r.layer)) return;
      if (!map.has(r.layer)) map.set(r.layer, []);
      const arr = map.get(r.layer)!;
      if (arr.length < MAX_PER_LAYER) arr.push(r);
    });
    return map;
  }, [vpc.resources, visibleLayers]);

  // Build positioned resources for expanded view
  const positionedResources = useMemo(() => {
    const items: { resource: VpcResource; x: number; y: number; radius: number }[] = [];
    
    layerOrder.forEach(layer => {
      if (!visibleLayers?.has(layer)) return;
      const resources = resourcesByLayer.get(layer) || [];
      const ringRadius = layerRadii[layer];
      
      resources.forEach((r, i) => {
        const angle = (2 * Math.PI * i) / Math.max(resources.length, 1) - Math.PI / 2;
        items.push({
          resource: r,
          x: Math.cos(angle) * ringRadius,
          y: Math.sin(angle) * ringRadius,
          radius: ringRadius,
        });
      });
    });
    
    return items;
  }, [resourcesByLayer, visibleLayers]);

  // Build internal connections (edges within VPC)
  const internalConnections = useMemo(() => {
    const connections: { from: VpcResource; to: VpcResource; fromPos: { x: number; y: number }; toPos: { x: number; y: number } }[] = [];
    const posMap = new Map(positionedResources.map(p => [p.resource.id, { x: p.x, y: p.y }]));
    
    positionedResources.forEach(({ resource }) => {
      resource.connections.forEach(targetId => {
        const targetPos = posMap.get(targetId);
        const fromPos = posMap.get(resource.id);
        if (targetPos && fromPos) {
          const targetResource = positionedResources.find(p => p.resource.id === targetId)?.resource;
          if (targetResource) {
            // Avoid duplicates
            const exists = connections.some(c => 
              (c.from.id === resource.id && c.to.id === targetId) ||
              (c.from.id === targetId && c.to.id === resource.id)
            );
            if (!exists) {
              connections.push({
                from: resource,
                to: targetResource,
                fromPos,
                toPos: targetPos,
              });
            }
          }
        }
      });
    });
    
    return connections;
  }, [positionedResources]);

  const handleStyle = "!bg-transparent !border-0 !w-0 !h-0";
  const expandedSize = 880;
  const centerX = expanded ? expandedSize / 2 : 120;
  const centerY = expanded ? expandedSize / 2 : 120;

  // ─── Collapsed ────────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="relative cursor-pointer group" onClick={() => onToggle(vpc.id)}>
        <Handle type="target" position={Position.Left} className={handleStyle} />
        <Handle type="source" position={Position.Right} className={handleStyle} />
        <Handle type="target" position={Position.Top} id="top" className={handleStyle} />
        <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />

        <div className={`w-[240px] h-[240px] rounded-full border-2 ${statusBorder[vpc.status]}
          flex flex-col items-center justify-center gap-1
          bg-card/90 backdrop-blur-sm
          transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/10
          ${isHighlighted ? "ring-2 ring-primary/60 shadow-lg shadow-primary/20 scale-105" : ""}`}
        >
          {vpc.healthCounts.critical > 0 && (
            <AlertTriangle className="w-4 h-4 text-destructive absolute top-4 right-4" />
          )}
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${providerBadge[vpc.providerId] || "bg-muted text-muted-foreground"}`}>
            {vpc.providerId}
          </span>
          <span className="text-sm font-semibold text-foreground text-center px-4 leading-tight mt-1">
            {vpc.name}
          </span>
          <span className="text-[10px] text-muted-foreground">{vpc.region}</span>
          <span className="text-[11px] text-muted-foreground font-medium">{vpc.totalResources} resources</span>
          <div className="flex items-center gap-1.5 mt-1">
            {vpc.healthCounts.healthy > 0 && <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--success))]" title={`${vpc.healthCounts.healthy} healthy`} />}
            {vpc.healthCounts.warning > 0 && <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--warning))]" title={`${vpc.healthCounts.warning} warning`} />}
            {vpc.healthCounts.critical > 0 && <div className="w-2.5 h-2.5 rounded-full bg-destructive" title={`${vpc.healthCounts.critical} critical`} />}
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

      {/* Outer VPC boundary */}
      <div 
        className={`relative rounded-full border-2 border-dashed ${statusBorder[vpc.status]} bg-card/30 backdrop-blur-sm
          ${isHighlighted ? "ring-2 ring-primary/60" : ""}`}
        style={{ width: expandedSize, height: expandedSize }}
      >
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(vpc.id); }}
          className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 
            flex items-center justify-center text-foreground transition-colors border border-border"
        >
          ✕
        </button>

        {/* VPC label at top */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${providerBadge[vpc.providerId] || ""}`}>
            {vpc.providerId}
          </span>
          <span className="text-sm font-semibold text-foreground">{vpc.name}</span>
          <span className="text-[10px] text-muted-foreground">{vpc.region} · {vpc.cidr}</span>
        </div>

        {/* Concentric ring guides */}
        <svg className="absolute inset-0 pointer-events-none" width={expandedSize} height={expandedSize}>
          {layerOrder.filter(l => visibleLayers?.has(l)).map(layer => (
            <circle
              key={layer}
              cx={centerX}
              cy={centerY}
              r={layerRadii[layer]}
              fill="none"
              stroke="hsl(0 0% 30%)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.3"
            />
          ))}
          
          {/* Connection lines - BRIGHT for dark mode */}
          {internalConnections.map((conn, i) => {
            const isHovered = hoveredResource === conn.from.id || hoveredResource === conn.to.id;
            const isConnected = connectedResourceIds?.has(conn.from.id) || connectedResourceIds?.has(conn.to.id);
            
            return (
              <line
                key={i}
                x1={centerX + conn.fromPos.x}
                y1={centerY + conn.fromPos.y}
                x2={centerX + conn.toPos.x}
                y2={centerY + conn.toPos.y}
                stroke={isHovered ? "hsl(160 100% 50%)" : isConnected ? "hsl(200 100% 60%)" : "hsl(220 15% 50%)"}
                strokeWidth={isHovered ? 2.5 : 1.5}
                strokeDasharray={isHovered ? "none" : "4 2"}
                opacity={isHovered ? 1 : isConnected ? 0.8 : 0.5}
                className="transition-all duration-150"
              />
            );
          })}
        </svg>

        {/* Resource nodes */}
        {positionedResources.map(({ resource, x, y }) => {
          const isHov = hoveredResource === resource.id;
          const isCon = connectedResourceIds?.has(resource.id);
          
          return (
            <div
              key={resource.id}
              className={`absolute flex flex-col items-center gap-0.5 cursor-pointer transition-all duration-150
                ${isHov ? "scale-125 z-40" : isCon ? "scale-110 z-30" : "z-20"}`}
              style={{
                left: centerX + x - 28,
                top: centerY + y - 28,
                width: 56,
              }}
              onMouseEnter={() => onResourceHover(resource.id)}
              onMouseLeave={() => onResourceHover(null)}
            >
              {/* Node circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                  ${statusBorder[resource.status]}
                  ${isHov ? "ring-2 ring-primary shadow-lg shadow-primary/30 bg-primary/20" : 
                    isCon ? "ring-1 ring-accent bg-accent/10" : "bg-card/80"}`}
              >
                <div className={`w-3 h-3 rounded-full ${statusFill[resource.status]}`} />
              </div>
              
              {/* Label */}
              <span className={`text-[8px] text-center leading-tight max-w-[56px] truncate
                ${isHov ? "text-primary font-semibold" : isCon ? "text-accent-foreground" : "text-muted-foreground"}`}>
                {resource.name.split('-').slice(0, 2).join('-')}
              </span>
              <span className="text-[7px] text-muted-foreground/60">{resource.layer}</span>
            </div>
          );
        })}

        {/* Stats at bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-card/80 px-4 py-2 rounded-full border border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
            <span className="text-[10px] text-foreground">{vpc.healthCounts.healthy}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--warning))]" />
            <span className="text-[10px] text-foreground">{vpc.healthCounts.warning}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-[10px] text-foreground">{vpc.healthCounts.critical}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(VpcBubbleNode);
