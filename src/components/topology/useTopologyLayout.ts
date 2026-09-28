import { useMemo, useState, useCallback } from "react";
import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { Resource } from "@/pages/InfrastructurePage";

const NODE_W = 100;
const NODE_H = 80;
const GROUP_PAD_X = 30;
const GROUP_PAD_Y = 44; // extra top for header

export function useTopologyLayout(resources: Resource[], onClickResource: (id: string) => void) {
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(new Set());

  const toggleCluster = useCallback((clusterId: string) => {
    setCollapsedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const clusterMap = new Map<string, Resource[]>();
    const nonClusterResources: Resource[] = [];

    resources.forEach((r) => {
      if (r.cluster) {
        if (!clusterMap.has(r.cluster)) clusterMap.set(r.cluster, []);
        clusterMap.get(r.cluster)!.push(r);
      } else {
        nonClusterResources.push(r);
      }
    });

    // Step 1: Layout each expanded cluster's internals to get its bounding size
    const clusterInternalLayouts = new Map<string, { childNodes: { id: string; x: number; y: number; resource: Resource }[]; width: number; height: number }>();

    clusterMap.forEach((members, clusterId) => {
      if (collapsedClusters.has(clusterId)) return;

      const cg = new dagre.graphlib.Graph();
      cg.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 50, marginx: 10, marginy: 10 });
      cg.setDefaultEdgeLabel(() => ({}));

      members.forEach((r) => cg.setNode(r.id, { width: NODE_W, height: NODE_H }));

      // Internal edges within cluster
      const memberIds = new Set(members.map((m) => m.id));
      members.forEach((r) => {
        r.connections.forEach((targetId) => {
          if (memberIds.has(targetId) && cg.hasNode(targetId)) {
            cg.setEdge(r.id, targetId);
          }
        });
      });

      dagre.layout(cg);

      const childNodes: { id: string; x: number; y: number; resource: Resource }[] = [];
      let maxX = 0, maxY = 0;
      members.forEach((r) => {
        const n = cg.node(r.id);
        if (!n) return;
        childNodes.push({ id: r.id, x: n.x - NODE_W / 2, y: n.y - NODE_H / 2, resource: r });
        maxX = Math.max(maxX, n.x + NODE_W / 2);
        maxY = Math.max(maxY, n.y + NODE_H / 2);
      });

      clusterInternalLayouts.set(clusterId, {
        childNodes,
        width: maxX + GROUP_PAD_X * 2,
        height: maxY + GROUP_PAD_Y + GROUP_PAD_X,
      });
    });

    // Step 2: Build top-level dagre graph with clusters as single nodes
    const topG = new dagre.graphlib.Graph();
    topG.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100, marginx: 60, marginy: 60 });
    topG.setDefaultEdgeLabel(() => ({}));

    // Add non-cluster resources
    nonClusterResources.forEach((r) => {
      topG.setNode(r.id, { width: NODE_W, height: NODE_H });
    });

    // Add clusters as single big nodes
    clusterMap.forEach((members, clusterId) => {
      const isCollapsed = collapsedClusters.has(clusterId);
      if (isCollapsed) {
        topG.setNode(clusterId, { width: 180, height: 70 });
      } else {
        const layout = clusterInternalLayouts.get(clusterId);
        topG.setNode(clusterId, {
          width: layout ? layout.width : 200,
          height: layout ? layout.height : 200,
        });
      }
    });

    // Add top-level edges (cross-cluster and to non-cluster)
    const edgeSet = new Set<string>();
    const edgeList: { source: string; target: string }[] = [];

    const resolveNode = (id: string): string => {
      const r = resources.find((res) => res.id === id);
      if (r?.cluster && collapsedClusters.has(r.cluster)) return r.cluster;
      if (r?.cluster && !collapsedClusters.has(r.cluster)) {
        // For cross-cluster edges, still connect to cluster node if target is inside
        return id; // keep individual
      }
      return id;
    };

    resources.forEach((r) => {
      r.connections.forEach((targetId) => {
        let src = resolveNode(r.id);
        let tgt = resolveNode(targetId);

        // For top-level graph, if src is inside a cluster, use cluster id
        const srcRes = resources.find((res) => res.id === r.id);
        const tgtRes = resources.find((res) => res.id === targetId);

        let topSrc = srcRes?.cluster || r.id;
        let topTgt = tgtRes?.cluster || targetId;

        // If not collapsed, still use cluster for top-level layout
        if (srcRes?.cluster) topSrc = srcRes.cluster;
        if (tgtRes?.cluster) topTgt = tgtRes.cluster;

        // Skip internal edges
        if (topSrc === topTgt) return;

        // Check if nodes exist
        if (!topG.hasNode(topSrc) || !topG.hasNode(topTgt)) return;

        const key = `${topSrc}→${topTgt}`;
        if (edgeSet.has(key)) return;
        edgeSet.add(key);
        topG.setEdge(topSrc, topTgt);
      });
    });

    dagre.layout(topG);

    // Step 3: Convert to React Flow nodes
    const rfNodes: Node[] = [];

    // Cluster group nodes + their children
    clusterMap.forEach((members, clusterId) => {
      const topNode = topG.node(clusterId);
      if (!topNode) return;

      const isCollapsed = collapsedClusters.has(clusterId);
      const firstMember = members[0];
      const clusterX = topNode.x - topNode.width / 2;
      const clusterY = topNode.y - topNode.height / 2;

      rfNodes.push({
        id: clusterId,
        type: "clusterGroup",
        position: { x: clusterX, y: clusterY },
        data: {
          label: clusterId,
          provider: firstMember?.provider || "AWS",
          environment: firstMember?.environment || "Production",
          childCount: members.length,
          collapsed: isCollapsed,
          onToggle: toggleCluster,
        },
        style: {
          width: topNode.width,
          height: topNode.height,
          zIndex: -1,
        },
      });

      if (!isCollapsed) {
        const internalLayout = clusterInternalLayouts.get(clusterId);
        if (internalLayout) {
          internalLayout.childNodes.forEach((child) => {
            rfNodes.push({
              id: child.id,
              type: "topologyNode",
              position: { x: child.x + GROUP_PAD_X, y: child.y + GROUP_PAD_Y },
              parentId: clusterId,
              data: {
                label: child.resource.name,
                resourceType: child.resource.type,
                status: child.resource.status,
                environment: child.resource.environment,
                cluster: child.resource.cluster,
              },
            });
          });
        }
      }
    });

    // Non-cluster nodes
    nonClusterResources.forEach((r) => {
      const n = topG.node(r.id);
      if (!n) return;
      rfNodes.push({
        id: r.id,
        type: "topologyNode",
        position: { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 },
        data: {
          label: r.name,
          resourceType: r.type,
          status: r.status,
          environment: r.environment,
        },
      });
    });

    // Step 4: Build React Flow edges (between visible nodes)
    const rfEdgeSet = new Set<string>();
    const rfEdges: Edge[] = [];

    resources.forEach((r) => {
      r.connections.forEach((targetId) => {
        let src = r.id;
        let tgt = targetId;

        const srcRes = r;
        const tgtRes = resources.find((res) => res.id === targetId);

        if (srcRes.cluster && collapsedClusters.has(srcRes.cluster)) src = srcRes.cluster;
        if (tgtRes?.cluster && collapsedClusters.has(tgtRes.cluster)) tgt = tgtRes.cluster;

        if (src === tgt) return;

        // Check both nodes exist in rfNodes
        const srcExists = rfNodes.some((n) => n.id === src);
        const tgtExists = rfNodes.some((n) => n.id === tgt);
        if (!srcExists || !tgtExists) return;

        const key = [src, tgt].sort().join("↔");
        if (rfEdgeSet.has(key)) return;
        rfEdgeSet.add(key);

        rfEdges.push({
          id: `e-${src}-${tgt}`,
          source: src,
          target: tgt,
          type: "animatedEdge",
          data: { highlighted: false },
        });
      });
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [resources, collapsedClusters, toggleCluster]);

  return { nodes, edges, collapsedClusters, toggleCluster };
}
