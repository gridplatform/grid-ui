import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CloudProvider, ResourceLayer } from "@/data/topologyTypes";
import VpcBubbleNode from "./topology/VpcBubbleNode";
import ProviderLabelNode from "./topology/ProviderLabelNode";
import { buildBubbleLayout } from "./topology/useBubbleLayout";

const nodeTypes = {
  vpcBubble: VpcBubbleNode,
  providerLabel: ProviderLabelNode,
};

interface TopologyDiagramProps {
  providers: CloudProvider[];
  visibleLayers: Set<ResourceLayer>;
  visibleProviders: Set<string>;
}

const TopologyDiagram = ({ providers, visibleLayers, visibleProviders }: TopologyDiagramProps) => {
  const [expandedVpcs, setExpandedVpcs] = useState<Set<string>>(new Set());
  const [hoveredResource, setHoveredResource] = useState<string | null>(null);

  // Pre-build resource lookup maps
  const { resourceToVpc, resourceConnections } = useMemo(() => {
    const r2v = new Map<string, string>();
    const rConn = new Map<string, string[]>();
    providers.forEach((p) =>
      p.vpcs.forEach((v) =>
        v.resources.forEach((r) => {
          r2v.set(r.id, v.id);
          rConn.set(r.id, r.connections);
        })
      )
    );
    return { resourceToVpc: r2v, resourceConnections: rConn };
  }, [providers]);

  const toggleExpand = useCallback((vpcId: string) => {
    setExpandedVpcs((prev) => {
      const next = new Set(prev);
      next.has(vpcId) ? next.delete(vpcId) : next.add(vpcId);
      return next;
    });
  }, []);

  const filteredProviders = useMemo(
    () => providers.filter((p) => visibleProviders.has(p.id)),
    [providers, visibleProviders]
  );

  // Base layout — only recomputes on structural changes
  const baseLayout = useMemo(
    () => buildBubbleLayout(filteredProviders, expandedVpcs, visibleLayers, toggleExpand, setHoveredResource),
    [filteredProviders, expandedVpcs, visibleLayers, toggleExpand]
  );

  // Hover highlights — lightweight
  const connectedResourceIds = useMemo(() => {
    if (!hoveredResource) return new Set<string>();
    return new Set(resourceConnections.get(hoveredResource) || []);
  }, [hoveredResource, resourceConnections]);

  // Find which VPCs are connected via the hovered resource
  const sourceVpcId = hoveredResource ? resourceToVpc.get(hoveredResource) : null;
  
  const connectedVpcIds = useMemo(() => {
    if (!hoveredResource) return new Set<string>();
    const ids = new Set<string>();
    if (sourceVpcId) ids.add(sourceVpcId);
    connectedResourceIds.forEach((rId) => {
      const v = resourceToVpc.get(rId);
      if (v) ids.add(v);
    });
    return ids;
  }, [hoveredResource, connectedResourceIds, resourceToVpc, sourceVpcId]);

  // Cross-VPC target IDs (VPCs other than source that have connected resources)
  const crossVpcTargets = useMemo(() => {
    if (!sourceVpcId) return new Set<string>();
    const targets = new Set<string>();
    connectedResourceIds.forEach((rId) => {
      const v = resourceToVpc.get(rId);
      if (v && v !== sourceVpcId) targets.add(v);
    });
    return targets;
  }, [sourceVpcId, connectedResourceIds, resourceToVpc]);

  // Apply hover state + focused connection edges
  const { nodes, edges } = useMemo(() => {
    const nodeIds = new Set(baseLayout.nodes.map((n) => n.id));
    
    // Dim non-connected VPCs when hovering
    const nodes = baseLayout.nodes.map((n) => {
      if (n.type !== "vpcBubble") return n;
      const isDimmed = hoveredResource && !connectedVpcIds.has(n.id);
      return {
        ...n,
        data: { 
          ...n.data, 
          hoveredResource, 
          connectedResourceIds, 
          connectedVpcIds,
          isDimmed,
        },
        style: isDimmed ? { opacity: 0.3, transition: "opacity 0.2s" } : { opacity: 1, transition: "opacity 0.2s" },
      };
    });

    // When hovering: hide default edges, show only active connection paths
    let edges: typeof baseLayout.edges = [];
    
    if (hoveredResource && sourceVpcId) {
      // Show ONLY the cross-VPC connections from hovered resource
      crossVpcTargets.forEach((targetVpc) => {
        if (nodeIds.has(targetVpc) && nodeIds.has(sourceVpcId)) {
          edges.push({
            id: `active-${sourceVpcId}-${targetVpc}`,
            source: sourceVpcId,
            target: targetVpc,
            type: "straight",
            style: {
              stroke: "hsl(150 100% 50%)",
              strokeWidth: 4,
            },
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "hsl(150 100% 50%)",
              width: 20,
              height: 20,
            },
            label: "request flow",
            labelStyle: { fill: "hsl(150 100% 70%)", fontSize: 11, fontWeight: 600 },
            labelBgStyle: { fill: "hsl(0 0% 8%)", fillOpacity: 0.9 },
          });
        }
      });
    } else {
      // No hover: show subtle VPC-to-VPC edges
      edges = baseLayout.edges.map(e => ({
        ...e,
        style: {
          ...e.style,
          opacity: 0.25,
          strokeWidth: 1,
        },
      }));
    }

    return { nodes, edges };
  }, [baseLayout, hoveredResource, connectedResourceIds, connectedVpcIds, crossVpcTargets, sourceVpcId]);

  return (
    <div className="h-full w-full rounded-lg border border-border bg-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.03}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="hsl(0 0% 12%)" />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-secondary"
        />
        <MiniMap
          nodeStrokeWidth={3}
          maskColor="hsl(0 0% 4% / 0.85)"
          className="!bg-card !border-border"
          pannable
          zoomable
        />
      </ReactFlow>
      
      {/* Connection Legend */}
      {hoveredResource && crossVpcTargets.size > 0 && (
        <div className="absolute bottom-4 left-4 bg-card/95 border border-border rounded-lg px-4 py-3 shadow-xl">
          <div className="text-xs text-muted-foreground mb-2">Active Connection</div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-[hsl(150_100%_50%)] rounded" />
            <span className="text-sm text-foreground">Request flow to {crossVpcTargets.size} VPC(s)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopologyDiagram;
