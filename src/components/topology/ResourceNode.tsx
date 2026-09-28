import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Server, Monitor, Globe, Box, Layers, Timer, Shield, Container,
  HardDrive, Network, Database, Cloud, AlertTriangle, Brain, Cpu,
  Radio, Zap, Workflow, Lock, Route, Gauge, Cog,
} from "lucide-react";
import type { VpcResourceType, HealthStatus } from "@/data/topologyTypes";

const typeIcons: Record<VpcResourceType, React.ElementType> = {
  // WAF / Security
  waf: Shield,
  "cloud-armor": Shield,
  shield: Lock,
  // Network
  dns: Globe,
  "nat-gateway": Route,
  "internet-gateway": Globe,
  "transit-gateway": Network,
  "vpn-gateway": Lock,
  // Load Balancers
  alb: Gauge,
  nlb: Gauge,
  clb: Gauge,
  gclb: Gauge,
  "api-gateway": Globe,
  // Compute / App
  "eks-cluster": Container,
  "gke-cluster": Container,
  "aks-cluster": Container,
  "ec2-instance": Monitor,
  "gce-instance": Monitor,
  "k8s-deployment": Box,
  "k8s-service": Layers,
  "k8s-pod": Workflow,
  "k8s-statefulset": Container,
  "k8s-daemonset": Shield,
  "k8s-cronjob": Timer,
  "monolith-vm": Server,
  "microservice-pod": Workflow,
  "sidecar-proxy": Radio,
  "fargate-task": Cloud,
  "cloud-run": Zap,
  "ml-training": Brain,
  "ml-inference": Cpu,
  "gpu-pool": Cpu,
  sagemaker: Brain,
  // Data
  rds: Database,
  "cloud-sql": Database,
  dynamodb: Database,
  firestore: Database,
  elasticache: Zap,
  memorystore: Zap,
  redis: Zap,
  s3: HardDrive,
  gcs: HardDrive,
  ebs: HardDrive,
  fsx: HardDrive,
  cdn: Cloud,
  cloudfront: Cloud,
};

const typeLabels: Partial<Record<VpcResourceType, string>> = {
  waf: "WAF",
  "cloud-armor": "Cloud Armor",
  shield: "Shield",
  dns: "DNS",
  "nat-gateway": "NAT GW",
  "internet-gateway": "Internet GW",
  "transit-gateway": "Transit GW",
  "vpn-gateway": "VPN GW",
  alb: "ALB",
  nlb: "NLB",
  clb: "CLB",
  gclb: "GCLB",
  "api-gateway": "API GW",
  "eks-cluster": "EKS",
  "gke-cluster": "GKE",
  "aks-cluster": "AKS",
  "ec2-instance": "EC2",
  "gce-instance": "GCE",
  "k8s-deployment": "Deployment",
  "k8s-service": "Service",
  "k8s-pod": "Pod",
  "k8s-statefulset": "StatefulSet",
  "k8s-daemonset": "DaemonSet",
  "k8s-cronjob": "CronJob",
  "monolith-vm": "Monolith",
  "microservice-pod": "Microservice",
  "sidecar-proxy": "Sidecar",
  "fargate-task": "Fargate",
  "cloud-run": "Cloud Run",
  "ml-training": "ML Training",
  "ml-inference": "ML Inference",
  "gpu-pool": "GPU Pool",
  sagemaker: "SageMaker",
  rds: "RDS",
  "cloud-sql": "Cloud SQL",
  dynamodb: "DynamoDB",
  firestore: "Firestore",
  elasticache: "ElastiCache",
  memorystore: "Memorystore",
  redis: "Redis",
  s3: "S3",
  gcs: "GCS",
  ebs: "EBS",
  fsx: "FSx",
  cdn: "CDN",
  cloudfront: "CloudFront",
};

const statusColors: Record<HealthStatus, string> = {
  healthy: "hsl(var(--success))",
  unknown: "hsl(var(--muted-foreground))",
  critical: "hsl(var(--destructive))",
  warning: "hsl(var(--warning))",
};

const ResourceNode = ({ data }: NodeProps) => {
  const d = data as any;
  const Icon = typeIcons[d.resourceType as VpcResourceType] || Cog;
  const ringColor = statusColors[d.status as HealthStatus] || statusColors.unknown;

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
        <Icon className="text-foreground" style={{ width: 18, height: 18 }} />
        {d.status === "critical" && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive flex items-center justify-center">
            <AlertTriangle className="w-2 h-2 text-destructive-foreground" />
          </div>
        )}
        {d.replicas && d.replicas > 1 && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-secondary border border-border flex items-center justify-center">
            <span className="text-[7px] font-bold text-foreground">{d.replicas}</span>
          </div>
        )}
      </div>

      <span className="mt-1 text-[10px] font-medium text-foreground text-center leading-tight max-w-[100px] truncate" title={d.label}>
        {d.label}
      </span>
      <span className="text-[8px] text-muted-foreground leading-tight">
        {typeLabels[d.resourceType as VpcResourceType] || d.resourceType}
      </span>
      {d.gpu && (
        <span className="text-[7px] text-primary leading-tight font-medium">{d.gpu}</span>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-border !border-0 !-bottom-0.5" />
    </div>
  );
};

export default memo(ResourceNode);
