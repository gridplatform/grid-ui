import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Server, Monitor, Globe, Box, Layers, Timer, Shield, Container,
  HardDrive, Network, Database, Cloud, AlertTriangle, Cpu,
} from "lucide-react";
import type { ResourceType, ResourceStatus } from "@/pages/InfrastructurePage";

const typeIcons: Record<ResourceType, React.ElementType> = {
  "single-vm": Monitor, "vm-cluster": Server, kubernetes: Cloud, network: Network,
  "managed-service": Database, "k8s-ingress": Globe, "k8s-deployment": Box,
  "k8s-service": Layers, "k8s-cronjob": Timer, "k8s-statefulset": Container,
  "k8s-daemonset": Shield, "k8s-storage": HardDrive,
  "gpu-node": Cpu, "gpu-pool": Cpu,
};

const typeLabels: Record<ResourceType, string> = {
  "single-vm": "VM", "vm-cluster": "VM Cluster", kubernetes: "K8s", network: "Network",
  "managed-service": "Managed", "k8s-ingress": "Ingress", "k8s-deployment": "Deploy",
  "k8s-service": "Service", "k8s-cronjob": "CronJob", "k8s-statefulset": "StatefulSet",
  "k8s-daemonset": "DaemonSet", "k8s-storage": "Storage",
  "gpu-node": "GPU Node", "gpu-pool": "GPU Pool",
};

const statusColors: Record<ResourceStatus, string> = {
  running: "hsl(var(--success))",
  stopped: "hsl(var(--muted-foreground))",
  error: "hsl(var(--destructive))",
  degraded: "hsl(var(--warning))",
};

interface TopologyNodeData {
  label: string;
  resourceType: ResourceType;
  status: ResourceStatus;
  environment: string;
  cluster?: string;
  [key: string]: unknown;
}

const TopologyNode = ({ data }: NodeProps) => {
  const nodeData = data as unknown as TopologyNodeData;
  const Icon = typeIcons[nodeData.resourceType] || Box;
  const hasError = nodeData.status === "error" || nodeData.status === "degraded";
  const ringColor = statusColors[nodeData.status];

  return (
    <div className="flex flex-col items-center group cursor-pointer">
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-border !border-0 !-top-0.5" />

      <div
        className="relative flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 bg-card"
        style={{
          width: 44,
          height: 44,
          border: `2.5px solid ${ringColor}`,
          boxShadow: `0 0 8px ${ringColor}30`,
        }}
      >
        <Icon className="w-4.5 h-4.5 text-foreground" style={{ width: 18, height: 18 }} />
        {hasError && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive flex items-center justify-center">
            <AlertTriangle className="w-2 h-2 text-destructive-foreground" />
          </div>
        )}
      </div>

      <span className="mt-1 text-[10px] font-medium text-foreground text-center leading-tight max-w-[90px] truncate" title={nodeData.label}>
        {nodeData.label}
      </span>
      <span className="text-[8px] text-muted-foreground leading-tight">
        {typeLabels[nodeData.resourceType]}
      </span>

      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-border !border-0 !-bottom-0.5" />
    </div>
  );
};

export default memo(TopologyNode);
