/**
 * Grid Backend API Type Definitions
 * 
 * These types define the contract between the Grid Console frontend
 * and the Grid Backend API. All UI components should use these types
 * when working with API data.
 * 
 * @see README.md for complete API endpoint documentation
 * @see user-uploads://grid-prd-v1.0.md for full PRD specification
 */

// ─── Health & Status ────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";
export type ResourceStatus =
  | "running"
  | "stopped"
  | "error"
  | "degraded"
  | "pending"
  | "destroyed"
  /** Desired-state JSON removed from Git; awaiting explicit destroy */
  | "stale";
export type DeploymentStatus =
  | "pending"
  | "planning"
  | "running"
  | "success"
  | "failed"
  | "cancelled";
export type LifecycleMode = "plan" | "apply" | "destroy";
export type ReleaseStatus = "queued" | "pending_approval" | "approved" | "deploying" | "success" | "failed" | "rolled_back";
export type ReleaseMode = "plan" | "apply" | "destroy" | "custom";
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "firing" | "acknowledged" | "resolved";

export interface HealthCounts {
  healthy: number;
  warning: number;
  critical: number;
}

// ─── Topology Types (matches README.md Backend API Contract) ────────────────

export type ResourceLayer = "waf" | "network" | "loadbalancer" | "application" | "data";

export type VpcResourceType =
  // WAF / Security
  | "waf" | "cloud-armor" | "shield"
  // Network
  | "dns" | "nat-gateway" | "internet-gateway" | "transit-gateway" | "vpn-gateway"
  // Load Balancers
  | "alb" | "nlb" | "clb" | "gclb" | "api-gateway"
  // Compute / App
  | "eks-cluster" | "gke-cluster" | "aks-cluster"
  | "ec2-instance" | "gce-instance"
  | "k8s-deployment" | "k8s-service" | "k8s-pod" | "k8s-statefulset" | "k8s-daemonset" | "k8s-cronjob"
  | "monolith-vm" | "microservice-pod" | "sidecar-proxy"
  | "fargate-task" | "cloud-run"
  | "ml-training" | "ml-inference" | "gpu-pool" | "sagemaker"
  // Data
  | "rds" | "cloud-sql" | "dynamodb" | "firestore"
  | "elasticache" | "memorystore" | "redis"
  | "s3" | "gcs" | "ebs" | "fsx"
  | "cdn" | "cloudfront";

export type VpcConnectionType = "peering" | "vpn" | "transit-gateway" | "internet";
export type CloudProviderType = string;

/**
 * Resource within a VPC
 * GET /api/v1/topology/vpcs/:id/resources → TopologyResource[]
 */
export interface TopologyResource {
  id: string;
  name: string;
  type: VpcResourceType;
  layer: ResourceLayer;
  status: HealthStatus;
  /** IDs of connected resources (within or across VPCs) */
  connections: string[];
  /** Optional resource metadata (CPU, memory, etc.) */
  cpu?: string;
  memory?: string;
  gpu?: string;
  replicas?: number;
  meta?: Record<string, string>;
}

/**
 * Cross-VPC connection
 * GET /api/v1/topology/vpcs/:id/connections → VpcConnection[]
 */
export interface VpcConnection {
  targetVpcId: string;
  type: VpcConnectionType;
  label?: string;
}

/**
 * VPC containing resources
 * GET /api/v1/topology/providers/:id/vpcs → TopologyVpc[]
 */
export interface TopologyVpc {
  id: string;
  name: string;
  region: string;
  cidr: string;
  providerId: string;
  resources: TopologyResource[];
  vpcConnections: VpcConnection[];
  totalResources: number;
  healthCounts: HealthCounts;
  status: HealthStatus;
}

/**
 * Cloud provider summary
 * GET /api/v1/topology/providers → TopologyProvider[]
 */
export interface TopologyProvider {
  id: string;
  name: string;
  type: CloudProviderType;
  vpcs: TopologyVpc[];
  totalResources: number;
  healthCounts: HealthCounts;
}

// ─── Infrastructure Types ───────────────────────────────────────────────────

/** Catalog resource type string (e.g. alb, vpc, access-analyzer). */
export type InfrastructureType = string;

/**
 * Infrastructure resource
 * GET /api/v1/infrastructures → Infrastructure[]
 */
export interface Infrastructure {
  id: string;
  userId: string;
  name: string;
  environment: string;
  provider: CloudProviderType;
  configJson: Record<string, unknown>;
  gitRepo?: string;
  gitBranch?: string;
  gitPath?: string;
  gitCommit?: string;
  gitContentHash?: string;
  lastAppliedHash?: string;
  status: ResourceStatus;
  autoApprove: boolean;
  driftDetection: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Infrastructure list item (used in /infrastructure page)
 */
export interface InfrastructureListItem {
  id: string;
  name: string;
  type: InfrastructureType;
  status: ResourceStatus;
  region: string;
  ip?: string;
  cpu?: string;
  memory?: string;
  environment: string;
  provider: CloudProviderType;
  project?: string;
  connections: string[];
  cluster?: string;
  config?: Record<string, unknown>;
  gitPath?: string;
}

// ─── Deployment Types ───────────────────────────────────────────────────────

/**
 * Deployment record
 * GET /api/v1/deployments → Deployment[]
 */
export interface Deployment {
  id: string;
  infrastructureId: string;
  status: DeploymentStatus;
  mode?: LifecycleMode;
  progress?: number;
  startedAt: string;
  completedAt?: string;
  logs?: string[];
  planSummary?: string;
  triggeredBy: string;
  gitCommit?: string;
  gitBranch?: string;
  name?: string;
  engine?: string;
  resourceType?: string;
  provider?: string;
  environment?: string;
}

// ─── Release Types ──────────────────────────────────────────────────────────

export type ReleaseType = "terraform" | "kubernetes" | "custom";

/**
 * Release record
 * GET /api/v1/releases → Release[]
 * POST /api/v1/releases → Release
 */
export interface Release {
  id: string;
  name: string;
  type: ReleaseType;
  status: ReleaseStatus;
  environment: string;
  mode: ReleaseMode;
  infrastructureId?: string;
  infrastructureName?: string;
  customCommand?: string;
  deploymentId?: string;
  version?: string;
  gitCommit?: string;
  gitBranch?: string;
  logs?: string[];
  message?: string;
  createdAt: string;
  deployedAt?: string;
  completedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rollbackFrom?: string;
  createdBy?: string;
}

export interface CreateReleaseRequest {
  name?: string;
  environment: string;
  mode: ReleaseMode;
  infrastructureId?: string;
  customCommand?: string;
}

/**
 * Approval record
 * GET /api/v1/approvals → Approval[]
 */
export interface Approval {
  id: string;
  releaseId: string;
  status: "pending" | "approved" | "rejected";
  requiredRole: "developer" | "maintainer" | "admin";
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  comment?: string;
}

// ─── Cluster Types ──────────────────────────────────────────────────────────

export type ClusterType = "eks" | "gke" | "aks" | "k3s" | "rke" | "custom";
export type DatabaseType = "mongodb" | "postgresql" | "mysql" | "redis" | "elasticsearch" | "kafka";

/**
 * Cluster record
 * GET /api/v1/clusters → Cluster[]
 */
export interface Cluster {
  id: string;
  name: string;
  type: ClusterType;
  provider: CloudProviderType;
  region: string;
  nodeCount: number;
  status: HealthStatus;
  version?: string;
  cpu?: string;
  memory?: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database cluster (e.g., MongoDB replica set)
 * GET /api/v1/clusters/:id (when type is database)
 */
export interface DatabaseCluster extends Cluster {
  databaseType: DatabaseType;
  replicaCount: number;
  shardCount?: number;
  primaryNodeId?: string;
  connectionString?: string;
}

// ─── Monitoring Types ───────────────────────────────────────────────────────

/**
 * Time-series metric data point
 */
export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

/**
 * Metric series
 * GET /api/v1/monitoring/metrics/:infra → TimeSeriesData
 */
export interface TimeSeriesData {
  metric: string;
  labels: Record<string, string>;
  data: MetricDataPoint[];
}

/**
 * Alert record
 * GET /api/v1/monitoring/alerts → Alert[]
 */
export interface Alert {
  id: string;
  ruleName: string;
  resource: string;
  resourceId?: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  startedAt: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
}

/**
 * Alert rule definition
 * POST /api/v1/monitoring/alerts → AlertRule
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  resourceScope: string;
  severity: AlertSeverity;
  channels: ("slack" | "pagerduty" | "email" | "webhook" | "opsgenie")[];
  enabled: boolean;
  sourceFile?: string;
  lastSynced?: string;
  hasLocalChanges?: boolean;
}

// ─── APM Types ──────────────────────────────────────────────────────────────

export type ServiceType = "web" | "worker" | "gateway" | "ml" | "queue";
export type OperationType = "http" | "grpc" | "queue" | "cron" | "internal";

/**
 * APM Service
 * GET /api/v1/apm/services → APMService[]
 */
export interface APMService {
  id: string;
  name: string;
  language: string;
  framework: string;
  type: ServiceType;
  requests: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  instances: number;
  environment: string;
  operations?: APMOperation[];
}

/**
 * APM Operation (endpoint/method)
 * GET /api/v1/apm/services/:id/operations → APMOperation[]
 */
export interface APMOperation {
  id: string;
  name: string;
  method?: string;
  type: OperationType;
  requests: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * APM Trace
 * GET /api/v1/apm/services/:id/operations/:opId/traces → APMTrace[]
 */
export interface APMTrace {
  id: string;
  traceId: string;
  operationId: string;
  duration: number;
  status: "ok" | "error";
  spans: number;
  statusCode?: number;
  tags: Record<string, string>;
  startedAt: string;
}

/**
 * APM Span (within a trace)
 * GET /api/v1/apm/traces/:traceId → APMTrace with spans
 */
export interface APMSpan {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  duration: number;
  startTime: number;
  status: "ok" | "error";
  tags: Record<string, string>;
  logs?: SpanLog[];
}

export interface SpanLog {
  timestamp: string;
  message: string;
  level: "info" | "warn" | "error";
}

// ─── Logging Types ──────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Log entry
 * GET /api/v1/logs → LogEntry[]
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  labels: Record<string, string>;
  traceId?: string;
  spanId?: string;
}

/**
 * Log query parameters
 * GET /api/v1/logs?query=&labels=&limit=
 */
export interface LogQuery {
  query?: string;
  labels?: Record<string, string>;
  start?: string;
  end?: string;
  limit?: number;
  direction?: "forward" | "backward";
}

// ─── Scaling Types ──────────────────────────────────────────────────────────

export type ScalingDirection = "up" | "down" | "both";
export type ScalingStrategy = "horizontal" | "vertical" | "mixed";

/**
 * Scaling schedule
 * GET /api/v1/scaling/schedules → ScalingSchedule[]
 */
export interface ScalingSchedule {
  id: string;
  name: string;
  clusterId: string;
  cronExpression: string;
  targetNodes: number;
  direction: ScalingDirection;
  enabled: boolean;
  nextRun?: string;
  lastRun?: string;
}

/**
 * Scaling policy
 * GET /api/v1/scaling/policies → ScalingPolicy[]
 */
export interface ScalingPolicy {
  id: string;
  name: string;
  clusterId: string;
  metric: string;
  threshold: number;
  operator: "gt" | "lt" | "eq";
  scaleAmount: number;
  cooldownSeconds: number;
  enabled: boolean;
}

// ─── Environment Types ──────────────────────────────────────────────────────

export type EnvironmentKind = "canonical" | "ephemeral";

/**
 * Environment
 * GET /api/v1/environments → Environment[]
 * Canonical envs from GRID_CONFIG_ROOT plus ephemeral TTL clones.
 */
export interface Environment {
  id: string;
  name: string;
  slug: string;
  order: number;
  kind?: EnvironmentKind;
  isProduction: boolean;
  approvalRequired: boolean;
  requiredApproverRole?: "developer" | "maintainer" | "admin";
  /** Present for ephemeral clones — the canonical env they were cloned from */
  baseEnv?: string;
  ttl?: string;
  expiresAt?: string;
  expired?: boolean;
  unitCount?: number;
  /** Project slugs that include this env (from Core auto-detect) */
  projects?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Project (app) — bifurcation of desired-state trees.
 * GET /api/v1/projects → Project[]
 */
export interface Project {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  description?: string;
  clouds: string[];
  environments: string[];
  unitCount: number;
  kind: "multi-cloud" | "single-cloud";
}

// ─── User & Auth Types ──────────────────────────────────────────────────────

export type UserRole = "developer" | "maintainer" | "admin";

/**
 * User
 * GET /api/v1/auth/me → User
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

/**
 * Auth response
 * POST /api/v1/auth/login → AuthResponse
 */
export interface AuthResponse {
  token: string;
  user: User;
  expiresAt: string;
}

// ─── AI/ML Types (V2 Features) ──────────────────────────────────────────────

export type RecommendationType = "cost" | "scaling" | "security" | "performance";

/**
 * AI Recommendation
 * GET /api/v1/ml/recommendations → Recommendation[]
 */
export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  estimatedSavings?: number;
  resourceId?: string;
  action?: string;
  createdAt: string;
}

/**
 * Cost optimization suggestion
 * GET /api/v1/ml/cost-optimization → CostOptimization
 */
export interface CostOptimization {
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  potentialSavings: number;
  recommendations: Recommendation[];
}

// ─── API Response Wrappers ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ─── WebSocket Event Types ──────────────────────────────────────────────────

export interface DeploymentLogEvent {
  type: "log";
  deploymentId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface DeploymentStatusEvent {
  type: "status";
  deploymentId: string;
  status: DeploymentStatus;
  progress?: number;
}

export type DeploymentEvent = DeploymentLogEvent | DeploymentStatusEvent;
