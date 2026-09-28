/**
 * VPC-Centric Topology Data Model
 * 
 * 3 levels: Provider → VPC → Resources (radial layout)
 * Within a VPC: WAF → Network → Load Balancer → Application → Data (concentric rings)
 * 
 * This file re-exports types from the central API types for backwards compatibility.
 * New code should import directly from @/types/api.
 * 
 * @see src/types/api.ts for authoritative type definitions
 * @see README.md for backend API contract documentation
 */

// Re-export from central types for backwards compatibility
export type {
  ResourceLayer,
  VpcResourceType,
  HealthStatus,
  CloudProviderType,
} from "@/types/api";

// VpcConnection is defined locally to avoid conflict
export type VpcConnectionType = "peering" | "vpn" | "transit-gateway" | "internet";
// Import types for local use
import type {
  ResourceLayer,
  VpcResourceType,
  HealthStatus,
  CloudProviderType,
  TopologyResource,
  TopologyVpc,
  TopologyProvider,
} from "@/types/api";

/**
 * VPC Resource - matches TopologyResource from API
 * @deprecated Use TopologyResource from @/types/api instead
 */
export interface VpcResource {
  id: string;
  name: string;
  type: VpcResourceType;
  layer: ResourceLayer;
  status: HealthStatus;
  /** IDs of connected resources (within or across VPCs) */
  connections: string[];
  cpu?: string;
  memory?: string;
  gpu?: string;
  replicas?: number;
  meta?: Record<string, string>;
}

/**
 * VPC Connection
 */
export interface VpcConnection {
  targetVpcId: string;
  type: VpcConnectionType;
  label?: string;
}

export interface VpcConnection {
  targetVpcId: string;
  type: VpcConnectionType;
  label?: string;
}

/**
 * VPC containing resources
 * @deprecated Use TopologyVpc from @/types/api instead
 */
export interface Vpc {
  id: string;
  name: string;
  region: string;
  cidr: string;
  providerId: string;
  resources: VpcResource[];
  vpcConnections: VpcConnection[];
  totalResources: number;
  healthCounts: { healthy: number; warning: number; critical: number };
  status: HealthStatus;
}

/**
 * Cloud Provider summary
 * @deprecated Use TopologyProvider from @/types/api instead
 */
export interface CloudProvider {
  id: string;
  name: string;
  type: "AWS" | "GCP" | "Azure" | "On-Prem";
  vpcs: Vpc[];
  totalResources: number;
  healthCounts: { healthy: number; warning: number; critical: number };
}

export type TopologyLevel = "providers" | "vpcs" | "resources";

export interface TopologyBreadcrumb {
  level: TopologyLevel;
  id: string;
  label: string;
}

// ─── Layer Configuration ────────────────────────────────────────────────────

export const layerOrder: ResourceLayer[] = ["waf", "network", "loadbalancer", "application", "data"];

export const layerLabels: Record<ResourceLayer, string> = {
  waf: "WAF / Security",
  network: "Network",
  loadbalancer: "Load Balancers",
  application: "Application",
  data: "Data Layer",
};

/**
 * Radii for concentric ring layout inside expanded VPC bubbles
 * Matches README.md specification:
 * - WAF: 80px
 * - Network: 160px
 * - Load Balancers: 240px
 * - Application: 320px
 * - Data: 400px
 */
export const layerRadii: Record<ResourceLayer, number> = {
  waf: 80,
  network: 160,
  loadbalancer: 240,
  application: 320,
  data: 400,
};

/**
 * Maps VPC resource types to their layer
 */
export const layerForType: Record<VpcResourceType, ResourceLayer> = {
  // WAF / Security
  waf: "waf",
  "cloud-armor": "waf",
  shield: "waf",
  // Network
  dns: "network",
  "nat-gateway": "network",
  "internet-gateway": "network",
  "transit-gateway": "network",
  "vpn-gateway": "network",
  // Load Balancers
  alb: "loadbalancer",
  nlb: "loadbalancer",
  clb: "loadbalancer",
  gclb: "loadbalancer",
  "api-gateway": "loadbalancer",
  // Application / Compute
  "eks-cluster": "application",
  "gke-cluster": "application",
  "aks-cluster": "application",
  "ec2-instance": "application",
  "gce-instance": "application",
  "k8s-deployment": "application",
  "k8s-service": "application",
  "k8s-pod": "application",
  "k8s-statefulset": "application",
  "k8s-daemonset": "application",
  "k8s-cronjob": "application",
  "monolith-vm": "application",
  "microservice-pod": "application",
  "sidecar-proxy": "application",
  "fargate-task": "application",
  "cloud-run": "application",
  "ml-training": "application",
  "ml-inference": "application",
  "gpu-pool": "application",
  sagemaker: "application",
  // Data
  rds: "data",
  "cloud-sql": "data",
  dynamodb: "data",
  firestore: "data",
  elasticache: "data",
  memorystore: "data",
  redis: "data",
  s3: "data",
  gcs: "data",
  ebs: "data",
  fsx: "data",
  cdn: "data",
  cloudfront: "data",
};
