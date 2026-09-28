/**
 * Stress-test data generators for 3,000 infrastructure resources and 200 alerts.
 * These are procedurally generated to test UI performance at scale.
 */

import type { Resource, ResourceType, ResourceStatus } from "@/pages/InfrastructurePage";
import type {
  CloudProvider, Vpc, VpcResource, VpcConnection,
  ResourceLayer, VpcResourceType, HealthStatus,
} from "./topologyTypes";

// ─── Config ─────────────────────────────────────────────────────────────────

const TOTAL_RESOURCES = 3000;
const TOTAL_ALERTS = 200;

const providers = ["AWS", "GCP", "Azure"] as const;
const regions: Record<string, string[]> = {
  AWS: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "eu-central-1"],
  GCP: ["us-central1", "us-east4", "europe-west1", "asia-east1"],
  Azure: ["eastus", "westus2", "westeurope", "southeastasia"],
};
const envs = ["Production", "Staging", "Development"];
const statuses: ResourceStatus[] = ["running", "running", "running", "running", "stopped", "error", "degraded"];
const healthStatuses: HealthStatus[] = ["healthy", "healthy", "healthy", "healthy", "warning", "critical"];

const resourceTypes: ResourceType[] = [
  "single-vm", "vm-cluster", "k8s-deployment", "k8s-service", "k8s-ingress",
  "k8s-cronjob", "k8s-statefulset", "k8s-daemonset", "k8s-storage",
  "managed-service", "network", "gpu-node", "gpu-pool",
];

const vpcResourceTypes: VpcResourceType[] = [
  "waf", "cloud-armor", "shield",
  "dns", "nat-gateway", "internet-gateway", "transit-gateway",
  "alb", "nlb", "gclb", "api-gateway",
  "eks-cluster", "gke-cluster", "k8s-deployment", "k8s-service", "k8s-pod",
  "k8s-statefulset", "k8s-daemonset", "k8s-cronjob",
  "monolith-vm", "fargate-task", "cloud-run",
  "ml-training", "ml-inference", "gpu-pool",
  "rds", "cloud-sql", "dynamodb", "elasticache", "redis",
  "s3", "gcs", "cdn",
];

const layerForType: Record<VpcResourceType, ResourceLayer> = {
  waf: "waf", "cloud-armor": "waf", shield: "waf",
  dns: "network", "nat-gateway": "network", "internet-gateway": "network",
  "transit-gateway": "network", "vpn-gateway": "network",
  alb: "loadbalancer", nlb: "loadbalancer", clb: "loadbalancer",
  gclb: "loadbalancer", "api-gateway": "loadbalancer",
  "eks-cluster": "application", "gke-cluster": "application", "aks-cluster": "application",
  "ec2-instance": "application", "gce-instance": "application",
  "k8s-deployment": "application", "k8s-service": "application", "k8s-pod": "application",
  "k8s-statefulset": "application", "k8s-daemonset": "application", "k8s-cronjob": "application",
  "monolith-vm": "application", "microservice-pod": "application", "sidecar-proxy": "application",
  "fargate-task": "application", "cloud-run": "application",
  "ml-training": "application", "ml-inference": "application", "gpu-pool": "application",
  sagemaker: "application",
  rds: "data", "cloud-sql": "data", dynamodb: "data", firestore: "data",
  elasticache: "data", memorystore: "data", redis: "data",
  s3: "data", gcs: "data", ebs: "data", fsx: "data", cdn: "data", cloudfront: "data",
};

// ─── Seeded random ──────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const pickN = <T>(arr: readonly T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, n);
};

// ─── Infrastructure Resources (3000) ────────────────────────────────────────

const serviceNames = [
  "api-gateway", "auth-service", "user-service", "payment-service", "notification-service",
  "order-service", "inventory-service", "search-service", "analytics-engine", "ml-pipeline",
  "data-ingestion", "cache-layer", "message-queue", "scheduler", "config-server",
  "logging-agent", "metrics-collector", "tracing-proxy", "cdn-origin", "dns-resolver",
  "vault-server", "consul-agent", "istio-proxy", "envoy-sidecar", "nginx-ingress",
  "cert-manager", "external-dns", "cluster-autoscaler", "node-exporter", "gpu-operator",
  "model-server", "feature-store", "training-job", "batch-processor", "stream-processor",
  "etl-worker", "report-generator", "email-sender", "sms-gateway", "webhook-relay",
];

const clusterNames = [
  "eks-prod-east", "eks-prod-west", "eks-staging", "gke-platform", "gke-data",
  "aks-prod", "aks-staging", "eks-ml-gpu", "gke-ml-train", "eks-edge-1",
  "gke-analytics", "aks-integration", "eks-dr-west", "gke-sandbox", "aks-dev",
];

export function generateStressResources(): Resource[] {
  const resources: Resource[] = [];

  for (let i = 0; i < TOTAL_RESOURCES; i++) {
    const provider = pick(providers);
    const region = pick(regions[provider]);
    const type = pick(resourceTypes);
    const status = pick(statuses);
    const env = pick(envs);
    const baseName = pick(serviceNames);
    const cluster = type.startsWith("k8s") || type === "gpu-node" || type === "gpu-pool"
      ? pick(clusterNames) : undefined;

    const id = `res-${String(i).padStart(4, "0")}`;
    const name = `${baseName}-${i}`;

    const connectionCount = Math.floor(rand() * 4);
    const connectionTargets = Array.from({ length: connectionCount }, () =>
      `res-${String(Math.floor(rand() * TOTAL_RESOURCES)).padStart(4, "0")}`
    ).filter(c => c !== id);

    resources.push({
      id,
      name,
      type,
      status,
      region,
      ip: type === "network" ? `10.${Math.floor(rand() * 255)}.0.0/16` : `10.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}`,
      cpu: type === "network" ? "—" : `${Math.ceil(rand() * 96)} vCPU`,
      memory: type === "network" ? "—" : `${Math.ceil(rand() * 768)} GB`,
      environment: env,
      provider,
      connections: connectionTargets,
      config: { generated: true, index: i },
      cluster,
    });
  }

  return resources;
}

// ─── Topology Data (3000 resources across VPCs) ─────────────────────────────

interface VpcSpec {
  id: string;
  name: string;
  region: string;
  cidr: string;
  providerId: string;
  resourceCount: number;
}

function calcHealth(resources: VpcResource[]) {
  const h = { healthy: 0, warning: 0, critical: 0 };
  resources.forEach((r) => {
    if (r.status === "critical") h.critical++;
    else if (r.status === "warning") h.warning++;
    else if (r.status === "healthy") h.healthy++;
  });
  return h;
}

function calcStatus(h: { healthy: number; warning: number; critical: number }): HealthStatus {
  if (h.critical > 0) return "critical";
  if (h.warning > 0) return "warning";
  return "healthy";
}

// Define VPC specs distributed across providers
const vpcSpecs: VpcSpec[] = [
  // AWS - 12 VPCs
  { id: "vpc-aws-prod-east", name: "Prod US-East", region: "us-east-1", cidr: "10.0.0.0/16", providerId: "aws", resourceCount: 120 },
  { id: "vpc-aws-prod-west", name: "Prod US-West", region: "us-west-2", cidr: "10.1.0.0/16", providerId: "aws", resourceCount: 100 },
  { id: "vpc-aws-staging", name: "Staging", region: "us-east-1", cidr: "10.2.0.0/16", providerId: "aws", resourceCount: 60 },
  { id: "vpc-aws-dev", name: "Development", region: "us-east-1", cidr: "10.3.0.0/16", providerId: "aws", resourceCount: 40 },
  { id: "vpc-aws-ml-gpu", name: "ML / GPU", region: "us-west-2", cidr: "10.4.0.0/16", providerId: "aws", resourceCount: 80 },
  { id: "vpc-aws-data", name: "Data Pipeline", region: "us-east-1", cidr: "10.5.0.0/16", providerId: "aws", resourceCount: 70 },
  { id: "vpc-aws-edge-1", name: "Edge EU-West", region: "eu-west-1", cidr: "10.6.0.0/16", providerId: "aws", resourceCount: 50 },
  { id: "vpc-aws-edge-2", name: "Edge AP-SE", region: "ap-southeast-1", cidr: "10.7.0.0/16", providerId: "aws", resourceCount: 50 },
  { id: "vpc-aws-security", name: "Security Hub", region: "us-east-1", cidr: "10.8.0.0/16", providerId: "aws", resourceCount: 30 },
  { id: "vpc-aws-shared-svc", name: "Shared Services", region: "us-east-1", cidr: "10.9.0.0/16", providerId: "aws", resourceCount: 60 },
  { id: "vpc-aws-dr", name: "Disaster Recovery", region: "eu-central-1", cidr: "10.10.0.0/16", providerId: "aws", resourceCount: 40 },
  { id: "vpc-aws-sandbox", name: "Sandbox", region: "us-west-2", cidr: "10.11.0.0/16", providerId: "aws", resourceCount: 30 },
  // GCP - 10 VPCs
  { id: "vpc-gcp-prod", name: "Prod Platform", region: "us-central1", cidr: "172.16.0.0/16", providerId: "gcp", resourceCount: 110 },
  { id: "vpc-gcp-staging", name: "Staging", region: "us-central1", cidr: "172.17.0.0/16", providerId: "gcp", resourceCount: 50 },
  { id: "vpc-gcp-data", name: "Data Lake", region: "us-central1", cidr: "172.18.0.0/16", providerId: "gcp", resourceCount: 80 },
  { id: "vpc-gcp-ml", name: "ML Training", region: "us-central1", cidr: "172.19.0.0/16", providerId: "gcp", resourceCount: 70 },
  { id: "vpc-gcp-analytics", name: "Analytics", region: "us-east4", cidr: "172.20.0.0/16", providerId: "gcp", resourceCount: 60 },
  { id: "vpc-gcp-edge-eu", name: "Edge Europe", region: "europe-west1", cidr: "172.21.0.0/16", providerId: "gcp", resourceCount: 40 },
  { id: "vpc-gcp-edge-asia", name: "Edge Asia", region: "asia-east1", cidr: "172.22.0.0/16", providerId: "gcp", resourceCount: 40 },
  { id: "vpc-gcp-sandbox", name: "Sandbox", region: "us-central1", cidr: "172.23.0.0/16", providerId: "gcp", resourceCount: 30 },
  { id: "vpc-gcp-shared", name: "Shared Services", region: "us-central1", cidr: "172.24.0.0/16", providerId: "gcp", resourceCount: 50 },
  { id: "vpc-gcp-security", name: "Security VPC", region: "us-central1", cidr: "172.25.0.0/16", providerId: "gcp", resourceCount: 30 },
  // Azure - 8 VPCs
  { id: "vpc-az-prod", name: "Prod East US", region: "eastus", cidr: "192.168.0.0/16", providerId: "azure", resourceCount: 100 },
  { id: "vpc-az-staging", name: "Staging", region: "eastus", cidr: "192.169.0.0/16", providerId: "azure", resourceCount: 50 },
  { id: "vpc-az-eu", name: "Prod EU", region: "westeurope", cidr: "192.170.0.0/16", providerId: "azure", resourceCount: 80 },
  { id: "vpc-az-asia", name: "Prod Asia", region: "southeastasia", cidr: "192.171.0.0/16", providerId: "azure", resourceCount: 60 },
  { id: "vpc-az-data", name: "Data Services", region: "eastus", cidr: "192.172.0.0/16", providerId: "azure", resourceCount: 70 },
  { id: "vpc-az-ml", name: "ML Workloads", region: "westus2", cidr: "192.173.0.0/16", providerId: "azure", resourceCount: 50 },
  { id: "vpc-az-dr", name: "DR West US", region: "westus2", cidr: "192.174.0.0/16", providerId: "azure", resourceCount: 40 },
  { id: "vpc-az-sandbox", name: "Sandbox", region: "eastus", cidr: "192.175.0.0/16", providerId: "azure", resourceCount: 30 },
];

// Ensure total adds up close to 3000
// Sum: 120+100+60+40+80+70+50+50+30+60+40+30 + 110+50+80+70+60+40+40+30+50+30 + 100+50+80+60+70+50+40+30 = ~1930
// We'll bump some VPCs to reach ~3000
const adjustedVpcSpecs = vpcSpecs.map((v, i) => ({
  ...v,
  resourceCount: v.resourceCount + (i < 20 ? 50 : 20),
}));

function generateVpcResources(vpcId: string, count: number, startIdx: number): VpcResource[] {
  const resources: VpcResource[] = [];
  for (let i = 0; i < count; i++) {
    const globalIdx = startIdx + i;
    const type = pick(vpcResourceTypes);
    const layer = layerForType[type] || "application";
    const status = pick(healthStatuses);

    const connectionCount = Math.floor(rand() * 3);
    const connections: string[] = [];
    for (let c = 0; c < connectionCount; c++) {
      const targetIdx = startIdx + Math.floor(rand() * count);
      if (targetIdx !== globalIdx) {
        connections.push(`${vpcId}-r${targetIdx}`);
      }
    }

    resources.push({
      id: `${vpcId}-r${globalIdx}`,
      name: `${pick(serviceNames)}-${globalIdx}`,
      type,
      layer,
      status,
      connections,
      meta: { generated: "true" },
    });
  }
  return resources;
}

export function buildStressTopologyData(): CloudProvider[] {
  let resourceIdx = 0;

  const providerMap: Record<string, { name: string; type: CloudProvider["type"]; vpcs: Vpc[] }> = {
    aws: { name: "Amazon Web Services", type: "AWS", vpcs: [] },
    gcp: { name: "Google Cloud Platform", type: "GCP", vpcs: [] },
    azure: { name: "Microsoft Azure", type: "Azure" as CloudProvider["type"], vpcs: [] },
  };

  const allVpcIds = adjustedVpcSpecs.map(v => v.id);

  for (const spec of adjustedVpcSpecs) {
    const resources = generateVpcResources(spec.id, spec.resourceCount, resourceIdx);
    resourceIdx += spec.resourceCount;

    // Generate 1-3 VPC connections
    const connectionCount = 1 + Math.floor(rand() * 3);
    const vpcConnections: VpcConnection[] = [];
    const connectionTypes: VpcConnection["type"][] = ["peering", "vpn", "transit-gateway"];
    for (let c = 0; c < connectionCount; c++) {
      const targetVpc = pick(allVpcIds.filter(id => id !== spec.id));
      if (!vpcConnections.find(vc => vc.targetVpcId === targetVpc)) {
        vpcConnections.push({
          targetVpcId: targetVpc,
          type: pick(connectionTypes),
          label: pick(["VPC Peering", "Site-to-Site VPN", "Transit GW", "Cross-Cloud VPN"]),
        });
      }
    }

    const healthCounts = calcHealth(resources);
    const vpc: Vpc = {
      id: spec.id,
      name: spec.name,
      region: spec.region,
      cidr: spec.cidr,
      providerId: spec.providerId,
      resources,
      vpcConnections,
      totalResources: resources.length,
      healthCounts,
      status: calcStatus(healthCounts),
    };

    providerMap[spec.providerId].vpcs.push(vpc);
  }

  return Object.entries(providerMap).map(([id, data]) => {
    const totalResources = data.vpcs.reduce((s, v) => s + v.totalResources, 0);
    const healthCounts = {
      healthy: data.vpcs.reduce((s, v) => s + v.healthCounts.healthy, 0),
      warning: data.vpcs.reduce((s, v) => s + v.healthCounts.warning, 0),
      critical: data.vpcs.reduce((s, v) => s + v.healthCounts.critical, 0),
    };
    return { id, name: data.name, type: data.type, vpcs: data.vpcs, totalResources, healthCounts };
  });
}

// ─── Alerts (200) ───────────────────────────────────────────────────────────

type AlertSeverity = "critical" | "warning" | "info";
type AlertStatus = "firing" | "acknowledged" | "resolved";
type AlertChannel = "slack" | "pagerduty" | "email" | "webhook" | "opsgenie";

export interface StressAlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  resource_scope: string;
  severity: AlertSeverity;
  channels: AlertChannel[];
  enabled: boolean;
  source_file: string;
  last_synced: string;
  has_local_changes: boolean;
}

export interface StressActiveAlert {
  id: string;
  rule_name: string;
  resource: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  started_at: string;
  acknowledged_by?: string;
  resolved_at?: string;
}

const alertNames = [
  "High CPU Usage", "Memory Pressure", "Disk Almost Full", "Pod CrashLoopBackOff",
  "Node Not Ready", "High Latency P99", "Error Rate Spike", "OOMKilled",
  "Network Packet Loss", "TLS Certificate Expiring", "Deployment Rollback",
  "Replica Count Mismatch", "PVC Filling Up", "DNS Resolution Failure",
  "GPU Memory Exhausted", "Training Job Stalled", "Model Inference Timeout",
  "Database Connection Pool Full", "Cache Hit Rate Low", "Queue Depth Too High",
  "API 5xx Rate", "Authentication Failures", "Rate Limit Exceeded",
  "SSL Handshake Errors", "Upstream Timeout", "Config Drift Detected",
  "Secret Rotation Due", "Backup Failed", "Log Ingestion Lag", "Metric Scrape Failure",
];

const alertConditions = [
  "avg(cpu_percent) > 90 for 5m",
  "avg(memory_percent) > 85 for 10m",
  "disk_percent > 80",
  "sum(pod_restarts) > 5 in 15m",
  "kube_node_status_condition{condition='Ready',status='false'} == 1",
  "histogram_quantile(0.99, http_request_duration) > 2",
  "rate(http_errors_total[5m]) > 0.05",
  "container_oom_events_total > 0",
  "rate(network_packet_loss[5m]) > 0.01",
  "ssl_cert_expiry_days < 30",
];

const alertMessages = [
  "CPU at {v}% for {t} minutes",
  "Memory at {v}% for {t} minutes",
  "Disk at {v}% on /data volume",
  "Pod restarted {v} times in {t} minutes",
  "Node entered NotReady state",
  "P99 latency at {v}ms",
  "Error rate spike: {v}% in last 5m",
  "Container OOMKilled — memory limit exceeded",
  "Packet loss at {v}% on eth0",
  "TLS cert expires in {v} days",
];

const resourceTargets = [
  "api-gateway-prod-{n}", "auth-service-prod-{n}", "payment-service-prod-{n}",
  "user-service-staging-{n}", "order-service-prod-{n}", "ml-inference-pod-{n}",
  "db-replica-prod-{n}", "cache-node-{n}", "worker-{n}", "nginx-ingress-{n}",
  "gpu-node-{n}", "kafka-broker-{n}", "spark-worker-{n}", "etl-job-{n}",
];

const channels: AlertChannel[] = ["slack", "pagerduty", "email", "webhook", "opsgenie"];
const severities: AlertSeverity[] = ["critical", "critical", "warning", "warning", "warning", "info"];
const alertStatuses: AlertStatus[] = ["firing", "firing", "firing", "acknowledged", "acknowledged", "resolved", "resolved", "resolved"];
const scopes = ["all-vms", "all-resources", "k8s-clusters", "k8s-deployments", "gpu-pools", "managed-services", "network"];
const timeAgo = ["1m ago", "3m ago", "5m ago", "8m ago", "12m ago", "20m ago", "30m ago", "45m ago", "1h ago", "2h ago", "3h ago", "6h ago", "12h ago"];

export function generateStressAlertRules(): StressAlertRule[] {
  const rules: StressAlertRule[] = [];
  const ruleCount = 40; // 40 rules generating 200 active alerts
  for (let i = 0; i < ruleCount; i++) {
    const name = alertNames[i % alertNames.length];
    rules.push({
      id: `rule-${String(i).padStart(3, "0")}`,
      name: `${name}${i >= alertNames.length ? ` (v${Math.floor(i / alertNames.length) + 1})` : ""}`,
      description: `Auto-generated rule ${i}: ${name}`,
      condition: alertConditions[i % alertConditions.length],
      resource_scope: pick(scopes),
      severity: pick(severities),
      channels: pickN(channels, 1 + Math.floor(rand() * 3)),
      enabled: rand() > 0.15,
      source_file: `alerts/${name.toLowerCase().replace(/\s+/g, "-")}-${i}.yaml`,
      last_synced: pick(["just now", "1 min ago", "2 min ago", "5 min ago", "10 min ago"]),
      has_local_changes: rand() > 0.8,
    });
  }
  return rules;
}

export function generateStressActiveAlerts(): StressActiveAlert[] {
  const alerts: StressActiveAlert[] = [];
  for (let i = 0; i < TOTAL_ALERTS; i++) {
    const severity = pick(severities);
    const status = pick(alertStatuses);
    const ruleName = alertNames[i % alertNames.length];
    const msg = alertMessages[i % alertMessages.length]
      .replace("{v}", String(Math.floor(60 + rand() * 40)))
      .replace("{t}", String(Math.floor(2 + rand() * 30)));
    const resource = resourceTargets[i % resourceTargets.length].replace("{n}", String(Math.floor(rand() * 20)));

    alerts.push({
      id: `active-${String(i).padStart(3, "0")}`,
      rule_name: ruleName,
      resource,
      severity,
      status,
      message: msg,
      started_at: pick(timeAgo),
      acknowledged_by: status === "acknowledged" ? "admin@grid.io" : undefined,
      resolved_at: status === "resolved" ? pick(timeAgo) : undefined,
    });
  }
  return alerts;
}
