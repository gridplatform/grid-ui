import type {
  CloudProvider, Vpc, VpcResource, VpcConnection,
  ResourceLayer, VpcResourceType, HealthStatus,
} from "./topologyTypes";

// ─── Helpers ────────────────────────────────────────────────────────────────

function res(
  id: string, name: string, type: VpcResourceType, layer: ResourceLayer,
  status: HealthStatus, connections: string[], meta?: Record<string, string>
): VpcResource {
  return { id, name, type, layer, status, connections, meta };
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

function makeVpc(
  id: string, name: string, region: string, cidr: string, providerId: string,
  resources: VpcResource[], vpcConnections: VpcConnection[]
): Vpc {
  const healthCounts = calcHealth(resources);
  return {
    id, name, region, cidr, providerId, resources, vpcConnections,
    totalResources: resources.length,
    healthCounts,
    status: calcStatus(healthCounts),
  };
}

// ─── AWS: Production VPC ────────────────────────────────────────────────────

const awsProdResources: VpcResource[] = [
  // WAF
  res("aws-waf-1", "AWS WAF Prod", "waf", "waf", "healthy", ["aws-alb-api", "aws-alb-web"]),
  res("aws-shield-1", "AWS Shield Adv", "shield", "waf", "healthy", ["aws-waf-1"]),
  // Network
  res("aws-igw-1", "Internet Gateway", "internet-gateway", "network", "healthy", ["aws-waf-1", "aws-dns-1"]),
  res("aws-nat-1", "NAT Gateway AZ-1", "nat-gateway", "network", "healthy", ["aws-eks-prod"]),
  res("aws-nat-2", "NAT Gateway AZ-2", "nat-gateway", "network", "healthy", ["aws-eks-prod"]),
  res("aws-dns-1", "Route53 Resolver", "dns", "network", "healthy", ["aws-alb-api", "aws-alb-web"]),
  res("aws-tgw-1", "Transit Gateway", "transit-gateway", "network", "healthy", ["aws-nat-1", "aws-nat-2"]),
  // Load Balancers
  res("aws-alb-api", "ALB — API", "alb", "loadbalancer", "healthy", ["aws-k8s-svc-api", "aws-k8s-svc-auth"]),
  res("aws-alb-web", "ALB — Web", "alb", "loadbalancer", "healthy", ["aws-k8s-svc-web"]),
  res("aws-nlb-grpc", "NLB — gRPC", "nlb", "loadbalancer", "warning", ["aws-k8s-svc-grpc"]),
  res("aws-apigw-1", "API Gateway v2", "api-gateway", "loadbalancer", "healthy", ["aws-k8s-svc-api"]),
  // Application
  res("aws-eks-prod", "EKS Prod Cluster", "eks-cluster", "application", "healthy", ["aws-k8s-svc-api", "aws-k8s-svc-web"]),
  res("aws-k8s-svc-api", "api-gateway svc", "k8s-service", "application", "healthy", ["aws-k8s-dep-api"]),
  res("aws-k8s-svc-web", "web-frontend svc", "k8s-service", "application", "healthy", ["aws-k8s-dep-web"]),
  res("aws-k8s-svc-auth", "auth-service svc", "k8s-service", "application", "healthy", ["aws-k8s-dep-auth"]),
  res("aws-k8s-svc-grpc", "grpc-gateway svc", "k8s-service", "application", "warning", ["aws-k8s-dep-grpc"]),
  res("aws-k8s-dep-api", "api-gateway deploy", "k8s-deployment", "application", "healthy", ["aws-rds-primary", "aws-redis-1"]),
  res("aws-k8s-dep-web", "web-frontend deploy", "k8s-deployment", "application", "healthy", ["aws-cdn-1", "aws-s3-assets"]),
  res("aws-k8s-dep-auth", "auth-service deploy", "k8s-deployment", "application", "healthy", ["aws-rds-primary", "aws-redis-1"]),
  res("aws-k8s-dep-grpc", "grpc-backend deploy", "k8s-deployment", "application", "warning", ["aws-rds-replica"]),
  res("aws-monolith-1", "Legacy Billing VM", "monolith-vm", "application", "critical", ["aws-rds-primary"], { cpu: "4 vCPU", memory: "16 GB" }),
  res("aws-monolith-2", "Legacy Reports VM", "monolith-vm", "application", "warning", ["aws-rds-replica"], { cpu: "2 vCPU", memory: "8 GB" }),
  res("aws-fargate-1", "Worker Tasks", "fargate-task", "application", "healthy", ["aws-s3-assets", "aws-rds-primary"]),
  // Data
  res("aws-rds-primary", "RDS Primary", "rds", "data", "healthy", []),
  res("aws-rds-replica", "RDS Read Replica", "rds", "data", "healthy", []),
  res("aws-redis-1", "ElastiCache Redis", "elasticache", "data", "healthy", []),
  res("aws-s3-assets", "S3 Assets", "s3", "data", "healthy", []),
  res("aws-cdn-1", "CloudFront CDN", "cdn", "data", "healthy", []),
  res("aws-dynamo-1", "DynamoDB Sessions", "dynamodb", "data", "healthy", []),
];

// ─── AWS: Staging VPC ───────────────────────────────────────────────────────

const awsStagingResources: VpcResource[] = [
  res("stg-waf-1", "WAF Staging", "waf", "waf", "healthy", ["stg-alb-1"]),
  res("stg-igw-1", "Internet GW", "internet-gateway", "network", "healthy", ["stg-waf-1"]),
  res("stg-nat-1", "NAT Gateway", "nat-gateway", "network", "healthy", ["stg-eks-1"]),
  res("stg-dns-1", "DNS Resolver", "dns", "network", "healthy", ["stg-alb-1"]),
  res("stg-alb-1", "ALB Staging", "alb", "loadbalancer", "healthy", ["stg-svc-api", "stg-svc-web"]),
  res("stg-eks-1", "EKS Staging", "eks-cluster", "application", "healthy", ["stg-svc-api", "stg-svc-web"]),
  res("stg-svc-api", "api svc", "k8s-service", "application", "healthy", ["stg-dep-api"]),
  res("stg-svc-web", "web svc", "k8s-service", "application", "healthy", ["stg-dep-web"]),
  res("stg-dep-api", "api deploy", "k8s-deployment", "application", "healthy", ["stg-rds-1"]),
  res("stg-dep-web", "web deploy", "k8s-deployment", "application", "healthy", ["stg-s3-1"]),
  res("stg-rds-1", "RDS Staging", "rds", "data", "healthy", []),
  res("stg-s3-1", "S3 Staging", "s3", "data", "healthy", []),
];

// ─── AWS: ML VPC ────────────────────────────────────────────────────────────

const awsMlResources: VpcResource[] = [
  res("ml-igw-1", "Internet GW", "internet-gateway", "network", "healthy", ["ml-nat-1"]),
  res("ml-nat-1", "NAT Gateway", "nat-gateway", "network", "healthy", ["ml-eks-1"]),
  res("ml-nlb-1", "NLB Inference", "nlb", "loadbalancer", "healthy", ["ml-inf-1", "ml-inf-2"]),
  res("ml-eks-1", "EKS ML Cluster", "eks-cluster", "application", "healthy", ["ml-train-1", "ml-train-2", "ml-inf-1"]),
  res("ml-train-1", "Training Job A", "ml-training", "application", "healthy", ["ml-fsx-1"], { gpu: "8x A100" }),
  res("ml-train-2", "Training Job B", "ml-training", "application", "warning", ["ml-fsx-1"], { gpu: "4x A100" }),
  res("ml-inf-1", "Inference Endpoint", "ml-inference", "application", "healthy", ["ml-s3-models"], { gpu: "2x T4" }),
  res("ml-inf-2", "Inference Canary", "ml-inference", "application", "healthy", ["ml-s3-models"], { gpu: "1x T4" }),
  res("ml-sagemaker-1", "SageMaker Studio", "sagemaker", "application", "healthy", ["ml-s3-models", "ml-fsx-1"]),
  res("ml-gpu-pool-1", "GPU Pool", "gpu-pool", "application", "healthy", ["ml-train-1", "ml-train-2"], { gpu: "24x A100" }),
  res("ml-s3-models", "S3 Model Store", "s3", "data", "healthy", []),
  res("ml-fsx-1", "FSx Lustre", "fsx", "data", "healthy", []),
];

// ─── GCP: Production VPC ────────────────────────────────────────────────────

const gcpProdResources: VpcResource[] = [
  res("gcp-armor-1", "Cloud Armor", "cloud-armor", "waf", "healthy", ["gcp-gclb-api", "gcp-gclb-web"]),
  res("gcp-dns-1", "Cloud DNS", "dns", "network", "healthy", ["gcp-gclb-api", "gcp-gclb-web"]),
  res("gcp-nat-1", "Cloud NAT", "nat-gateway", "network", "healthy", ["gcp-gke-1"]),
  res("gcp-vpn-1", "VPN Gateway", "vpn-gateway", "network", "healthy", []),
  res("gcp-gclb-api", "GCLB — API", "gclb", "loadbalancer", "healthy", ["gcp-svc-api", "gcp-svc-payments"]),
  res("gcp-gclb-web", "GCLB — Web", "gclb", "loadbalancer", "healthy", ["gcp-svc-web"]),
  res("gcp-gke-1", "GKE Platform", "gke-cluster", "application", "healthy", ["gcp-svc-api", "gcp-svc-web", "gcp-svc-payments"]),
  res("gcp-svc-api", "api svc", "k8s-service", "application", "healthy", ["gcp-dep-api"]),
  res("gcp-svc-web", "web svc", "k8s-service", "application", "healthy", ["gcp-dep-web"]),
  res("gcp-svc-payments", "payments svc", "k8s-service", "application", "healthy", ["gcp-dep-payments"]),
  res("gcp-dep-api", "api deploy", "k8s-deployment", "application", "healthy", ["gcp-sql-1", "gcp-memstore-1"]),
  res("gcp-dep-web", "web deploy", "k8s-deployment", "application", "healthy", ["gcp-gcs-1"]),
  res("gcp-dep-payments", "payments deploy", "k8s-deployment", "application", "healthy", ["gcp-sql-1", "gcp-firestore-1"]),
  res("gcp-legacy-1", "Legacy Monolith", "monolith-vm", "application", "warning", ["gcp-sql-1"], { cpu: "8 vCPU", memory: "32 GB" }),
  res("gcp-cloudrun-1", "Cloud Run Workers", "cloud-run", "application", "healthy", ["gcp-gcs-1", "gcp-firestore-1"]),
  res("gcp-sql-1", "Cloud SQL Primary", "cloud-sql", "data", "healthy", []),
  res("gcp-memstore-1", "Memorystore Redis", "memorystore", "data", "healthy", []),
  res("gcp-gcs-1", "GCS Bucket", "gcs", "data", "healthy", []),
  res("gcp-firestore-1", "Firestore", "firestore", "data", "healthy", []),
];

// ─── GCP: Data VPC ──────────────────────────────────────────────────────────

const gcpDataResources: VpcResource[] = [
  res("gd-nat-1", "Cloud NAT", "nat-gateway", "network", "healthy", ["gd-gke-1"]),
  res("gd-vpn-1", "VPN Gateway", "vpn-gateway", "network", "healthy", []),
  res("gd-nlb-1", "Internal NLB", "nlb", "loadbalancer", "healthy", ["gd-kafka-1", "gd-spark-1"]),
  res("gd-gke-1", "GKE Data Cluster", "gke-cluster", "application", "healthy", ["gd-kafka-1", "gd-spark-1"]),
  res("gd-kafka-1", "Kafka Cluster", "k8s-statefulset", "application", "healthy", ["gd-gcs-lake"]),
  res("gd-spark-1", "Spark Workers", "k8s-deployment", "application", "healthy", ["gd-gcs-lake", "gd-sql-warehouse"]),
  res("gd-airflow-1", "Airflow DAGs", "k8s-deployment", "application", "healthy", ["gd-kafka-1", "gd-spark-1"]),
  res("gd-gcs-lake", "GCS Data Lake", "gcs", "data", "healthy", []),
  res("gd-sql-warehouse", "Cloud SQL DWH", "cloud-sql", "data", "healthy", []),
];

// ─── Build VPCs & Providers ─────────────────────────────────────────────────

const awsProdVpc = makeVpc("vpc-aws-prod", "Production VPC", "us-east-1", "10.0.0.0/16", "aws",
  awsProdResources, [
    { targetVpcId: "vpc-aws-staging", type: "peering", label: "VPC Peering" },
    { targetVpcId: "vpc-aws-ml", type: "transit-gateway", label: "Transit GW" },
    { targetVpcId: "vpc-gcp-prod", type: "vpn", label: "Site-to-Site VPN" },
  ]);

const awsStagingVpc = makeVpc("vpc-aws-staging", "Staging VPC", "us-east-1", "10.1.0.0/16", "aws",
  awsStagingResources, [
    { targetVpcId: "vpc-aws-prod", type: "peering", label: "VPC Peering" },
  ]);

const awsMlVpc = makeVpc("vpc-aws-ml", "ML / GPU VPC", "us-west-2", "10.2.0.0/16", "aws",
  awsMlResources, [
    { targetVpcId: "vpc-aws-prod", type: "transit-gateway", label: "Transit GW" },
  ]);

const gcpProdVpc = makeVpc("vpc-gcp-prod", "Production VPC", "us-central1", "172.16.0.0/16", "gcp",
  gcpProdResources, [
    { targetVpcId: "vpc-aws-prod", type: "vpn", label: "Site-to-Site VPN" },
    { targetVpcId: "vpc-gcp-data", type: "peering", label: "VPC Peering" },
  ]);

const gcpDataVpc = makeVpc("vpc-gcp-data", "Data Platform VPC", "us-central1", "172.17.0.0/16", "gcp",
  gcpDataResources, [
    { targetVpcId: "vpc-gcp-prod", type: "peering", label: "VPC Peering" },
  ]);

// ─── Providers ──────────────────────────────────────────────────────────────

function makeProvider(id: string, name: string, type: CloudProvider["type"], vpcs: Vpc[]): CloudProvider {
  const totalResources = vpcs.reduce((s, v) => s + v.totalResources, 0);
  const healthCounts = {
    healthy: vpcs.reduce((s, v) => s + v.healthCounts.healthy, 0),
    warning: vpcs.reduce((s, v) => s + v.healthCounts.warning, 0),
    critical: vpcs.reduce((s, v) => s + v.healthCounts.critical, 0),
  };
  return { id, name, type, vpcs, totalResources, healthCounts };
}

export function buildTopologyData(): CloudProvider[] {
  return [
    makeProvider("aws", "Amazon Web Services", "AWS", [awsProdVpc, awsStagingVpc, awsMlVpc]),
    makeProvider("gcp", "Google Cloud Platform", "GCP", [gcpProdVpc, gcpDataVpc]),
  ];
}
