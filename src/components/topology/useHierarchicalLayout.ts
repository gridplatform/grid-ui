import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type {
  CloudProvider, Vpc, VpcResource, ResourceLayer,
} from "@/data/topologyTypes";
import { layerRadii } from "@/data/topologyTypes";

const PROVIDER_W = 260;
const PROVIDER_H = 180;
const VPC_W = 200;
const VPC_H = 200;
const RESOURCE_W = 90;
const RESOURCE_H = 80;

// ─── Dagre helper ───────────────────────────────────────────────────────────

function layoutDagre(
  nodeSpecs: { id: string; width: number; height: number }[],
  edgeSpecs: { source: string; target: string }[],
  direction: "TB" | "LR" = "LR"
) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 100, ranksep: 140, marginx: 60, marginy: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  nodeSpecs.forEach((n) => g.setNode(n.id, { width: n.width, height: n.height }));
  edgeSpecs.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  nodeSpecs.forEach((n) => {
    const laid = g.node(n.id);
    if (laid) positions.set(n.id, { x: laid.x - n.width / 2, y: laid.y - n.height / 2 });
  });
  return positions;
}

// ─── Provider Level ─────────────────────────────────────────────────────────

export function buildProviderView(providers: CloudProvider[]): { nodes: Node[]; edges: Edge[] } {
  const nodeSpecs = providers.map((p) => ({ id: p.id, width: PROVIDER_W, height: PROVIDER_H }));
  const positions = layoutDagre(nodeSpecs, [], "LR");

  const nodes: Node[] = providers.map((p) => ({
    id: p.id,
    type: "providerNode",
    position: positions.get(p.id) || { x: 0, y: 0 },
    data: {
      label: p.name,
      providerType: p.type,
      vpcCount: p.vpcs.length,
      totalResources: p.totalResources,
      healthCounts: p.healthCounts,
    },
  }));

  return { nodes, edges: [] };
}

// ─── VPC Level ──────────────────────────────────────────────────────────────

export function buildVpcView(vpcs: Vpc[]): { nodes: Node[]; edges: Edge[] } {
  const nodeSpecs = vpcs.map((v) => ({ id: v.id, width: VPC_W, height: VPC_H }));

  // Build edge specs from VPC connections (only within current provider's VPCs)
  const vpcIds = new Set(vpcs.map((v) => v.id));
  const edgeSpecs: { source: string; target: string; label: string; connType: string }[] = [];
  const seen = new Set<string>();
  vpcs.forEach((v) => {
    v.vpcConnections.forEach((conn) => {
      if (!vpcIds.has(conn.targetVpcId)) return;
      const key = [v.id, conn.targetVpcId].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        edgeSpecs.push({ source: v.id, target: conn.targetVpcId, label: conn.label || conn.type, connType: conn.type });
      }
    });
  });

  const positions = layoutDagre(nodeSpecs, edgeSpecs.map((e) => ({ source: e.source, target: e.target })));

  const layerCounts = (resources: VpcResource[]) => {
    const counts: Record<string, number> = {};
    resources.forEach((r) => { counts[r.layer] = (counts[r.layer] || 0) + 1; });
    return counts;
  };

  const nodes: Node[] = vpcs.map((v) => ({
    id: v.id,
    type: "vpcNode",
    position: positions.get(v.id) || { x: 0, y: 0 },
    data: {
      label: v.name,
      region: v.region,
      cidr: v.cidr,
      totalResources: v.totalResources,
      healthCounts: v.healthCounts,
      status: v.status,
      layerCounts: layerCounts(v.resources),
      connectionCount: v.vpcConnections.length,
    },
  }));

  const edges: Edge[] = edgeSpecs.map((e) => ({
    id: `e-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    type: "crossVpcEdge",
    data: { label: e.label, connType: e.connType },
  }));

  // Also add cross-provider VPC connections
  vpcs.forEach((v) => {
    v.vpcConnections.forEach((conn) => {
      if (vpcIds.has(conn.targetVpcId)) return; // already handled above
      // These connect to VPCs not in this view — show as a "ghost" edge label on the VPC node
    });
  });

  return { nodes, edges };
}

// ─── Radial Resource Level ──────────────────────────────────────────────────

function distributeOnRing(
  count: number, radius: number, centerX: number, centerY: number,
  nodeW: number, nodeH: number
): { x: number; y: number }[] {
  if (count === 0) return [];
  const effectiveRadius = radius === 0 && count > 1 ? 50 : radius;
  if (count === 1 && radius === 0) return [{ x: centerX - nodeW / 2, y: centerY - nodeH / 2 }];

  const startAngle = -Math.PI / 2;
  const angleStep = (2 * Math.PI) / count;
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = startAngle + angleStep * i;
    positions.push({
      x: centerX + effectiveRadius * Math.cos(angle) - nodeW / 2,
      y: centerY + effectiveRadius * Math.sin(angle) - nodeH / 2,
    });
  }
  return positions;
}

export function buildRadialResourceView(resources: VpcResource[]): { nodes: Node[]; edges: Edge[] } {
  const centerX = 0;
  const centerY = 0;

  // Group by layer
  const byLayer = new Map<ResourceLayer, VpcResource[]>();
  resources.forEach((r) => {
    if (!byLayer.has(r.layer)) byLayer.set(r.layer, []);
    byLayer.get(r.layer)!.push(r);
  });

  const nodes: Node[] = [];

  // Add ring guide nodes
  const layerEntries: ResourceLayer[] = ["waf", "network", "loadbalancer", "application", "data"];
  layerEntries.forEach((layer) => {
    const radius = layerRadii[layer];
    if (radius === 0) return; // skip center ring guide
    const items = byLayer.get(layer);
    if (!items || items.length === 0) return;
    nodes.push({
      id: `ring-${layer}`,
      type: "ringGuide",
      position: { x: centerX - radius, y: centerY - radius },
      data: { radius, layer },
      selectable: false,
      draggable: false,
    });
  });

  // Place resource nodes on their rings
  byLayer.forEach((items, layer) => {
    const radius = layerRadii[layer];
    const positions = distributeOnRing(items.length, radius, centerX, centerY, RESOURCE_W, RESOURCE_H);
    items.forEach((r, i) => {
      nodes.push({
        id: r.id,
        type: "resourceNode",
        position: positions[i],
        data: {
          label: r.name,
          resourceType: r.type,
          status: r.status,
          layer: r.layer,
          cpu: r.cpu,
          memory: r.memory,
          gpu: r.gpu,
          replicas: r.replicas,
        },
      });
    });
  });

  // Build edges
  const resIds = new Set(resources.map((r) => r.id));
  const edges: Edge[] = [];
  const seen = new Set<string>();
  resources.forEach((r) => {
    r.connections.forEach((targetId) => {
      if (!resIds.has(targetId)) return;
      const key = [r.id, targetId].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({
          id: `e-${r.id}-${targetId}`,
          source: r.id,
          target: targetId,
          type: "animatedEdge",
          data: { highlighted: false },
        });
      }
    });
  });

  return { nodes, edges };
}
