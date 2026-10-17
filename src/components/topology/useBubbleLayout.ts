import type { Node, Edge } from "@xyflow/react";
import type { TopologyProvider } from "@/types/api";
import type { ResourceLayer } from "@/data/topologyTypes";
import { environmentBubbleSize } from "./EnvironmentBubbleNode";

const COLLAPSED_SIZE = 260;
const GAP_X = 100;
const GAP_Y = 100;
const SECTION_GAP = 140;

export function buildBubbleLayout(
  providers: TopologyProvider[],
  expandedEnvironments: Set<string>,
  visibleLayers: Set<ResourceLayer>,
  onToggle: (id: string) => void,
  onResourceHover: (id: string | null) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const allNodeIds = new Set<string>();

  let currentY = 0;

  for (const provider of providers) {
    // Provider label
    nodes.push({
      id: `label-${provider.id}`,
      type: "providerLabel",
      position: { x: 20, y: currentY },
      data: {
        label: provider.name,
        type: provider.type,
        environmentCount: provider.environments.length,
        totalResources: provider.totalResources,
        healthCounts: provider.healthCounts,
      },
      selectable: false,
      draggable: false,
    });

    currentY += 60;

    // Circles for this provider, left to right. One circle is one environment.
    let currentX = 60;
    let rowY = currentY;
    let rowMaxH = 0;
    const maxRowWidth = 4000; // Wide horizontal layout

    provider.environments.forEach((environment) => {
      const isExpanded = expandedEnvironments.has(environment.id);
      const expandedSize = environmentBubbleSize(environment.resources, visibleLayers);
      const nodeW = isExpanded ? expandedSize : COLLAPSED_SIZE;
      const nodeH = isExpanded ? expandedSize : COLLAPSED_SIZE;

      // Wrap to next row if exceeds max width
      if (currentX + nodeW > maxRowWidth && currentX > 60) {
        rowY += rowMaxH + GAP_Y;
        currentX = 60;
        rowMaxH = 0;
      }

      allNodeIds.add(environment.id);

      nodes.push({
        id: environment.id,
        type: "environmentBubble",
        position: { x: currentX, y: rowY },
        zIndex: isExpanded ? 100 : 0,
        data: {
          environment,
          expanded: isExpanded,
          visibleLayers,
          onToggle,
          onResourceHover,
          hoveredResource: null as string | null,
          connectedResourceIds: new Set<string>(),
          connectedEnvironmentIds: new Set<string>(),
        },
      });

      rowMaxH = Math.max(rowMaxH, nodeH);
      currentX += nodeW + GAP_X;
    });

    currentY = rowY + rowMaxH + SECTION_GAP;
  }

  // A peering line between two environment circles.
  const seen = new Set<string>();
  providers.forEach((p) => {
    p.environments.forEach((environment) => {
      environment.connections.forEach((conn) => {
        if (!allNodeIds.has(environment.id) || !allNodeIds.has(conn.targetId)) return;
        const key = [environment.id, conn.targetId].sort().join("|");
        if (seen.has(key)) return;
        seen.add(key);
        edges.push({
          id: `env-edge-${key}`,
          source: environment.id,
          target: conn.targetId,
          type: "straight",
          style: {
            stroke: "hsl(200 70% 55%)",
            strokeWidth: 2,
            opacity: 0.7,
          },
          label: conn.label || "peering",
          labelStyle: { fill: "hsl(0 0% 70%)", fontSize: 10 },
          labelBgStyle: { fill: "hsl(0 0% 10%)", fillOpacity: 0.8 },
        });
      });
    });
  });

  return { nodes, edges };
}
