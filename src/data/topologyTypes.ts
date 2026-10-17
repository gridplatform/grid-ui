/**
 * Topology rings and labels.
 * A circle is one provider in one environment. Types inside the circle sit on rings.
 * Provider and subtype enablement lives in featureFlags.ts.
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
  /** Ids of connected resources in this circle or another. */
  connections: string[];
  cpu?: string;
  memory?: string;
  gpu?: string;
  replicas?: number;
  meta?: Record<string, string>;
}

/** Link from one environment circle to another. */
export interface VpcConnection {
  targetId: string;
  type: VpcConnectionType;
  label?: string;
}

/** @deprecated Use TopologyEnvironment from @/types/api. */
export interface Vpc {
  id: string;
  name: string;
  /** Catalog type of the unit (`resourceType` on the API). */
  resourceType?: string;
  region: string;
  cidr: string;
  providerId: string;
  resources: VpcResource[];
  connections: VpcConnection[];
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
  environments: Vpc[];
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

export const layerOrder: ResourceLayer[] = [
  "waf",
  "network",
  "loadbalancer",
  "application",
  "data",
  "ai-ml",
  "observability",
];

export const layerLabels: Record<ResourceLayer, string> = {
  waf: "WAF / Security",
  network: "Network",
  loadbalancer: "Load Balancers",
  application: "Application",
  data: "Data Layer",
  "ai-ml": "AI / ML",
  observability: "Observability",
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
  "ai-ml": 480,
  observability: 560,
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
  sagemaker: "ai-ml",
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
