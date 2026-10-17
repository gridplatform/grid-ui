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
import type { TopologyProvider } from "@/types/api";
import type { ResourceLayer } from "@/data/topologyTypes";
import EnvironmentBubbleNode from "./topology/EnvironmentBubbleNode";
import ProviderLabelNode from "./topology/ProviderLabelNode";
import { buildBubbleLayout } from "./topology/useBubbleLayout";

const nodeTypes = {
  environmentBubble: EnvironmentBubbleNode,
  providerLabel: ProviderLabelNode,
};

interface TopologyDiagramProps {
  providers: TopologyProvider[];
  visibleLayers: Set<ResourceLayer>;
  visibleProviders: Set<string>;
}

const TopologyDiagram = ({ providers, visibleLayers, visibleProviders }: TopologyDiagramProps) => {
  const [expandedEnvironments, setExpandedEnvironments] = useState<Set<string>>(new Set());
  const [hoveredResource, setHoveredResource] = useState<string | null>(null);

  // Pre-build resource lookup maps
  const { resourceToEnvironment, resourceConnections } = useMemo(() => {
    const resourceEnvironment = new Map<string, string>();
    const resourceLinks = new Map<string, string[]>();
    providers.forEach((provider) =>
      provider.environments.forEach((environment) =>
        environment.resources.forEach((resource) => {
          resourceEnvironment.set(resource.id, environment.id);
          resourceLinks.set(resource.id, resource.connections);
        })
      )
    );
    return { resourceToEnvironment: resourceEnvironment, resourceConnections: resourceLinks };
  }, [providers]);

  const toggleExpand = useCallback((environmentId: string) => {
    setExpandedEnvironments((prev) => {
      const next = new Set(prev);
      next.has(environmentId) ? next.delete(environmentId) : next.add(environmentId);
      return next;
    });
  }, []);

  const filteredProviders = useMemo(
    () => providers.filter((p) => visibleProviders.has(p.id)),
    [providers, visibleProviders]
  );

  // Base layout — only recomputes on structural changes
  const baseLayout = useMemo(
    () => buildBubbleLayout(filteredProviders, expandedEnvironments, visibleLayers, toggleExpand, setHoveredResource),
    [filteredProviders, expandedEnvironments, visibleLayers, toggleExpand]
  );

  // Hover highlights — lightweight
  const connectedResourceIds = useMemo(() => {
    if (!hoveredResource) return new Set<string>();
    return new Set(resourceConnections.get(hoveredResource) || []);
  }, [hoveredResource, resourceConnections]);

  const sourceEnvironmentId = hoveredResource ? resourceToEnvironment.get(hoveredResource) : null;

  const connectedEnvironmentIds = useMemo(() => {
    if (!hoveredResource) return new Set<string>();
    const ids = new Set<string>();
    if (sourceEnvironmentId) ids.add(sourceEnvironmentId);
    connectedResourceIds.forEach((resourceId) => {
      const environmentId = resourceToEnvironment.get(resourceId);
      if (environmentId) ids.add(environmentId);
    });
    return ids;
  }, [hoveredResource, connectedResourceIds, resourceToEnvironment, sourceEnvironmentId]);

  const otherEnvironmentIds = useMemo(() => {
    if (!sourceEnvironmentId) return new Set<string>();
    const targets = new Set<string>();
    connectedResourceIds.forEach((resourceId) => {
      const environmentId = resourceToEnvironment.get(resourceId);
      if (environmentId && environmentId !== sourceEnvironmentId) targets.add(environmentId);
    });
    return targets;
  }, [sourceEnvironmentId, connectedResourceIds, resourceToEnvironment]);

  // Apply hover state + focused connection edges
  const { nodes, edges } = useMemo(() => {
    const nodeIds = new Set(baseLayout.nodes.map((n) => n.id));
    
    const nodes = baseLayout.nodes.map((n) => {
      if (n.type !== "environmentBubble") return n;
      const isDimmed = hoveredResource && !connectedEnvironmentIds.has(n.id);
      return {
        ...n,
        data: { 
          ...n.data, 
          hoveredResource, 
          connectedResourceIds, 
          connectedEnvironmentIds,
          isDimmed,
        },
        style: isDimmed ? { opacity: 0.3, transition: "opacity 0.2s" } : { opacity: 1, transition: "opacity 0.2s" },
      };
    });

    // When hovering: hide default edges, show only active connection paths
    let edges: typeof baseLayout.edges = [];
    
    if (hoveredResource && sourceEnvironmentId) {
      otherEnvironmentIds.forEach((targetId) => {
        if (nodeIds.has(targetId) && nodeIds.has(sourceEnvironmentId)) {
          edges.push({
            id: `active-${sourceEnvironmentId}-${targetId}`,
            source: sourceEnvironmentId,
            target: targetId,
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
      // No hover: keep the peering lines quiet.
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
  }, [baseLayout, hoveredResource, connectedResourceIds, connectedEnvironmentIds, otherEnvironmentIds, sourceEnvironmentId]);

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
      {hoveredResource && otherEnvironmentIds.size > 0 && (
        <div className="absolute bottom-4 left-4 bg-card/95 border border-border rounded-lg px-4 py-3 shadow-xl">
          <div className="text-xs text-muted-foreground mb-2">Active connection</div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-[hsl(150_100%_50%)] rounded" />
            <span className="text-sm text-foreground">
              Linked to {otherEnvironmentIds.size} environment{otherEnvironmentIds.size === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopologyDiagram;
