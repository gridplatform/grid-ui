import type { Node, Edge } from "@xyflow/react";
import type { TopologyProvider } from "@/types/api";
import type { ResourceLayer } from "@/data/topologyTypes";

const COLLAPSED_SIZE = 260;
const EXPANDED_SIZE = 900;
const GAP_X = 100;
const GAP_Y = 100;
const SECTION_GAP = 140;

export function buildBubbleLayout(
  providers: TopologyProvider[],
  expandedVpcs: Set<string>,
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
        vpcCount: provider.vpcs.length,
        totalResources: provider.totalResources,
        healthCounts: provider.healthCounts,
      },
      selectable: false,
      draggable: false,
    });

    currentY += 60;

    // Horizontal flow layout - VPCs placed left to right, wrapping when needed
    let currentX = 60;
    let rowY = currentY;
    let rowMaxH = 0;
    const maxRowWidth = 4000; // Wide horizontal layout

    provider.vpcs.forEach((vpc) => {
      const isExpanded = expandedVpcs.has(vpc.id);
      const nodeW = isExpanded ? EXPANDED_SIZE : COLLAPSED_SIZE;
      const nodeH = isExpanded ? EXPANDED_SIZE : COLLAPSED_SIZE;

      // Wrap to next row if exceeds max width
      if (currentX + nodeW > maxRowWidth && currentX > 60) {
        rowY += rowMaxH + GAP_Y;
        currentX = 60;
        rowMaxH = 0;
      }

      allNodeIds.add(vpc.id);

      nodes.push({
        id: vpc.id,
        type: "vpcBubble",
        position: { x: currentX, y: rowY },
        zIndex: isExpanded ? 100 : 0,
        data: {
          vpc,
          expanded: isExpanded,
          visibleLayers,
          onToggle,
          onResourceHover,
          hoveredResource: null as string | null,
          connectedResourceIds: new Set<string>(),
          connectedVpcIds: new Set<string>(),
        },
      });

      rowMaxH = Math.max(rowMaxH, nodeH);
      currentX += nodeW + GAP_X;
    });

    currentY = rowY + rowMaxH + SECTION_GAP;
  }

  // VPC-to-VPC edges - bright and visible in dark mode
  const seen = new Set<string>();
  providers.forEach((p) => {
    p.vpcs.forEach((v) => {
      v.vpcConnections.forEach((conn) => {
        if (!allNodeIds.has(v.id) || !allNodeIds.has(conn.targetVpcId)) return;
        const key = [v.id, conn.targetVpcId].sort().join("|");
        if (seen.has(key)) return;
        seen.add(key);
        edges.push({
          id: `vpc-edge-${key}`,
          source: v.id,
          target: conn.targetVpcId,
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
