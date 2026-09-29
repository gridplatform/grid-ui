/**
 * Deploy payload shapes the Grid Console submits to the API / CLI.
 *
 * Two engines:
 * - terraform — cloud infrastructure from grid-terraform modules
 * - kubernetes  — workloads into an existing cluster (manifests / Helm / Kustomize)
 *
 * Workloads are intentionally outside Terraform apply jurisdiction.
 *
 * Categories group Terraform targets for display only. Whether a target can be
 * deployed is decided per provider x resource type in config/featureFlags.ts.
 */

export type DeployEngine = "terraform" | "kubernetes";

export type TerraformCategory =
  | "compute"
  | "network"
  | "kubernetes-cluster"
  | "database"
  | "storage"
  | "ai-ml"
  | "identity"
  | "security"
  | "messaging"
  | "serverless"
  | "containers"
  | "edge"
  | "analytics"
  | "cicd"
  | "observability-infra"
  | "other";

export type KubernetesWorkloadKind =
  | "workload"
  | "helm-release"
  | "kustomize"
  | "cronjob"
  | "job"
  | "config";

export interface GridDeployRequest {
  /** Human-readable name */
  name: string;
  /** terraform | kubernetes */
  engine: DeployEngine;
  /** Cloud or platform id (aws, gcp, azure, …) when engine=terraform */
  provider?: string;
  /** Environment label (production, staging, …) */
  environment: string;
  /**
   * Terraform: module type / catalog type (e.g. ec2-instance, vpc, eks).
   * Kubernetes: workload kind (workload, helm-release, …).
   */
  resourceType: string;
  /** Engine-specific configuration object (validated by API/CLI). */
  config: Record<string, unknown>;
  /** When set, update this infrastructure's desired state then plan/apply */
  infrastructureId?: string;
  /** plan = preview only; apply = converge (default) */
  mode?: "plan" | "apply";
}

/** One deployable provider x resource type pair offered in the console. */
export interface TerraformTarget {
  provider: string;
  resourceType: string;
  label: string;
}

const PROVIDER_REGION_HINTS: Record<string, string> = {
  aws: "us-east-1",
  gcp: "us-central1",
  azure: "eastus",
  oracle: "us-ashburn-1",
  ibm: "us-south",
  alibaba: "ap-southeast-1",
  tencent: "ap-singapore",
  huawei: "ap-southeast-1",
  ovh: "GRA",
  "deutsche-telekom": "eu-de",
  ctrls: "in-mumbai",
  yotta: "in-mumbai",
  rancher: "us-east-1",
  openshift: "us-east-1",
};

export function regionHintFor(provider: string): string {
  return PROVIDER_REGION_HINTS[provider] ?? "us-east-1";
}

/** Cloud targets for provisioning a Kubernetes cluster (infrastructure). */
export const KUBERNETES_CLUSTER_TARGETS: (TerraformTarget & {
  id: string;
  regionHint: string;
})[] = [
  { id: "eks", provider: "aws", resourceType: "eks", label: "Amazon EKS cluster", regionHint: "us-east-1" },
  { id: "gke", provider: "gcp", resourceType: "gke", label: "Google GKE cluster", regionHint: "us-central1" },
  { id: "aks", provider: "azure", resourceType: "aks", label: "Azure AKS cluster", regionHint: "eastus" },
  { id: "oke", provider: "oracle", resourceType: "oke", label: "Oracle OKE cluster", regionHint: "us-ashburn-1" },
  { id: "rosa", provider: "openshift", resourceType: "rosa-cluster", label: "Red Hat ROSA cluster", regionHint: "us-east-1" },
  { id: "roks", provider: "ibm", resourceType: "roks", label: "IBM ROKS cluster", regionHint: "us-south" },
];

/** UI categories for Terraform-backed deploys, each with its concrete targets. */
export const TERRAFORM_CATEGORIES: {
  id: TerraformCategory;
  label: string;
  description: string;
  targets: TerraformTarget[];
}[] = [
  {
    id: "compute",
    label: "Compute",
    description: "VMs and autoscaling groups via Terraform modules.",
    targets: [
      { provider: "aws", resourceType: "ec2-instance", label: "EC2 instance" },
      { provider: "aws", resourceType: "autoscaling", label: "EC2 Auto Scaling group" },
      { provider: "aws", resourceType: "gpu-instance", label: "GPU instance" },
      { provider: "gcp", resourceType: "compute-engine-instance", label: "Compute Engine VM" },
      { provider: "gcp", resourceType: "instance-group", label: "Managed instance group" },
      { provider: "gcp", resourceType: "gpu-instance", label: "GPU instance" },
      { provider: "azure", resourceType: "virtual-machine", label: "Azure VM" },
    ],
  },
  {
    id: "network",
    label: "Network",
    description: "VPC, subnets, firewall, DNS, load balancers.",
    targets: [
      { provider: "aws", resourceType: "vpc", label: "VPC" },
      { provider: "aws", resourceType: "security-group", label: "Security group" },
      { provider: "aws", resourceType: "alb", label: "Application Load Balancer" },
      { provider: "aws", resourceType: "route53", label: "Route 53 DNS" },
      { provider: "aws", resourceType: "nat-gateway", label: "NAT gateway" },
      { provider: "gcp", resourceType: "network", label: "VPC network" },
      { provider: "gcp", resourceType: "load-balancer", label: "Cloud Load Balancing" },
      { provider: "gcp", resourceType: "cloud-dns", label: "Cloud DNS" },
      { provider: "gcp", resourceType: "cloud-nat", label: "Cloud NAT" },
      { provider: "azure", resourceType: "network", label: "Virtual network" },
      { provider: "azure", resourceType: "nsg", label: "Network security group" },
    ],
  },
  {
    id: "kubernetes-cluster",
    label: "Kubernetes clusters",
    description:
      "Managed clusters and node pools as separate desired-state units (one YAML per cluster, one YAML per node pool). Workloads live under the Workloads tab.",
    targets: [
      ...KUBERNETES_CLUSTER_TARGETS.map(({ provider, resourceType, label }) => ({
        provider,
        resourceType,
        label,
      })),
      { provider: "aws", resourceType: "eks-node-group", label: "EKS node group" },
      { provider: "aws", resourceType: "eks-gpu-node-group", label: "EKS GPU node group" },
      { provider: "aws", resourceType: "gpu-node-pool", label: "GPU node pool" },
      { provider: "gcp", resourceType: "gke-node-pool", label: "GKE node pool" },
      { provider: "gcp", resourceType: "gpu-node-pool", label: "GPU node pool" },
      { provider: "azure", resourceType: "aks-node-pool", label: "AKS node pool" },
      { provider: "alibaba", resourceType: "ack-node-pool", label: "ACK node pool" },
      { provider: "tencent", resourceType: "tke-node-pool", label: "TKE node pool" },
      { provider: "huawei", resourceType: "cce-node-pool", label: "CCE node pool" },
      { provider: "ovh", resourceType: "kubernetes-node-pool", label: "OVH node pool" },
      { provider: "rancher", resourceType: "node-pool", label: "Rancher node pool" },
    ],
  },
  {
    id: "database",
    label: "Databases",
    description: "Managed databases and caches.",
    targets: [
      { provider: "aws", resourceType: "rds", label: "RDS" },
      { provider: "aws", resourceType: "aurora", label: "Aurora" },
      { provider: "aws", resourceType: "dynamodb-table", label: "DynamoDB" },
      { provider: "aws", resourceType: "elasticache", label: "ElastiCache" },
      { provider: "gcp", resourceType: "cloud-sql-postgres", label: "Cloud SQL PostgreSQL" },
      { provider: "gcp", resourceType: "cloud-sql-mysql", label: "Cloud SQL MySQL" },
      { provider: "gcp", resourceType: "memorystore-redis", label: "Memorystore Redis" },
      { provider: "gcp", resourceType: "spanner", label: "Spanner" },
      { provider: "gcp", resourceType: "bigtable", label: "Bigtable" },
      { provider: "gcp", resourceType: "firestore", label: "Firestore" },
      { provider: "gcp", resourceType: "alloydb", label: "AlloyDB" },
      { provider: "azure", resourceType: "postgresql", label: "PostgreSQL Flexible Server" },
      { provider: "azure", resourceType: "cosmosdb", label: "Cosmos DB" },
      { provider: "azure", resourceType: "redis-cache", label: "Redis Cache" },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    description: "Object and file storage.",
    targets: [
      { provider: "aws", resourceType: "s3-bucket", label: "S3 bucket" },
      { provider: "aws", resourceType: "efs", label: "EFS" },
      { provider: "aws", resourceType: "fsx", label: "FSx" },
      { provider: "gcp", resourceType: "cloud-storage", label: "Cloud Storage" },
      { provider: "gcp", resourceType: "filestore", label: "Filestore" },
      { provider: "azure", resourceType: "storage-account", label: "Storage account" },
    ],
  },
  {
    id: "ai-ml",
    label: "AI / ML",
    description: "Managed AI services and self-hosted LLM infrastructure modules.",
    targets: [
      { provider: "aws", resourceType: "sagemaker", label: "SageMaker" },
      { provider: "aws", resourceType: "bedrock-agent", label: "Bedrock agent" },
      { provider: "aws", resourceType: "bedrock-knowledge-base", label: "Bedrock knowledge base" },
      { provider: "aws", resourceType: "vllm", label: "vLLM" },
      { provider: "aws", resourceType: "kserve", label: "KServe" },
      { provider: "gcp", resourceType: "vertex-ai", label: "Vertex AI" },
      { provider: "gcp", resourceType: "vertex-ai-workbench", label: "Vertex AI Workbench" },
      { provider: "gcp", resourceType: "kuberay", label: "KubeRay" },
      { provider: "azure", resourceType: "openai", label: "Azure OpenAI" },
      { provider: "azure", resourceType: "machine-learning", label: "Azure ML workspace" },
      { provider: "azure", resourceType: "ai-search", label: "Azure AI Search" },
    ],
  },
  {
    id: "identity",
    label: "Identity",
    description: "IAM, Cognito, service accounts, and directory integrations.",
    targets: [
      { provider: "aws", resourceType: "iam", label: "IAM" },
      { provider: "aws", resourceType: "iam-role", label: "IAM role" },
      { provider: "aws", resourceType: "cognito", label: "Cognito" },
      { provider: "gcp", resourceType: "iam", label: "Project IAM" },
      { provider: "gcp", resourceType: "service-account", label: "Service account" },
      { provider: "gcp", resourceType: "workload-identity", label: "Workload Identity" },
      { provider: "azure", resourceType: "managed-identity", label: "Managed identity" },
      { provider: "azure", resourceType: "azure-ad-application", label: "Entra ID application" },
    ],
  },
  {
    id: "security",
    label: "Security",
    description: "Encryption, secrets, WAF, and threat detection modules.",
    targets: [
      { provider: "aws", resourceType: "kms", label: "KMS" },
      { provider: "aws", resourceType: "secrets-manager", label: "Secrets Manager" },
      { provider: "aws", resourceType: "guardduty", label: "GuardDuty" },
      { provider: "aws", resourceType: "wafv2", label: "WAFv2" },
      { provider: "aws", resourceType: "acm", label: "ACM" },
      { provider: "gcp", resourceType: "cloud-kms", label: "Cloud KMS" },
      { provider: "gcp", resourceType: "secret-manager", label: "Secret Manager" },
      { provider: "gcp", resourceType: "certificate-manager", label: "Certificate Manager" },
      { provider: "azure", resourceType: "key-vault", label: "Key Vault" },
    ],
  },
  {
    id: "messaging",
    label: "Messaging",
    description: "Queues, topics, event buses, and streaming brokers.",
    targets: [
      { provider: "aws", resourceType: "sns", label: "SNS" },
      { provider: "aws", resourceType: "sqs", label: "SQS" },
      { provider: "aws", resourceType: "eventbridge", label: "EventBridge" },
      { provider: "aws", resourceType: "msk", label: "MSK" },
      { provider: "aws", resourceType: "kinesis", label: "Kinesis" },
      { provider: "gcp", resourceType: "pubsub", label: "Pub/Sub" },
      { provider: "gcp", resourceType: "pubsub-lite", label: "Pub/Sub Lite" },
      { provider: "azure", resourceType: "service-bus", label: "Service Bus" },
      { provider: "azure", resourceType: "event-grid", label: "Event Grid" },
    ],
  },
  {
    id: "serverless",
    label: "Serverless",
    description: "Functions, HTTP APIs, and workflow orchestration.",
    targets: [
      { provider: "aws", resourceType: "lambda", label: "Lambda" },
      { provider: "aws", resourceType: "apigateway", label: "API Gateway" },
      { provider: "aws", resourceType: "appsync", label: "AppSync" },
      { provider: "aws", resourceType: "step-functions", label: "Step Functions" },
      { provider: "gcp", resourceType: "cloud-functions", label: "Cloud Functions" },
      { provider: "gcp", resourceType: "cloud-functions-gen2", label: "Cloud Functions (gen 2)" },
      { provider: "gcp", resourceType: "cloud-endpoints", label: "Cloud Endpoints" },
      { provider: "azure", resourceType: "logic-app", label: "Logic App" },
    ],
  },
  {
    id: "containers",
    label: "Containers",
    description: "ECS, Cloud Run, Batch, and other non-Kubernetes runtimes.",
    targets: [
      { provider: "aws", resourceType: "ecs", label: "ECS" },
      { provider: "aws", resourceType: "fargate", label: "Fargate" },
      { provider: "aws", resourceType: "batch", label: "Batch" },
      { provider: "aws", resourceType: "apprunner", label: "App Runner" },
      { provider: "gcp", resourceType: "cloud-run", label: "Cloud Run" },
      { provider: "gcp", resourceType: "cloud-run-job", label: "Cloud Run job" },
      { provider: "azure", resourceType: "container-apps", label: "Container Apps" },
      { provider: "azure", resourceType: "container-instance", label: "Container Instances" },
    ],
  },
  {
    id: "edge",
    label: "Edge & CDN",
    description: "CDN distributions, edge caching, and global acceleration.",
    targets: [
      { provider: "aws", resourceType: "cloudfront", label: "CloudFront" },
      { provider: "aws", resourceType: "global-accelerator", label: "Global Accelerator" },
      { provider: "gcp", resourceType: "cloud-cdn", label: "Cloud CDN" },
      { provider: "gcp", resourceType: "media-cdn", label: "Media CDN" },
      { provider: "azure", resourceType: "front-door", label: "Front Door" },
      { provider: "azure", resourceType: "cdn", label: "Azure CDN" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics & data",
    description: "Warehouses, ETL, query engines, and lakehouse tooling.",
    targets: [
      { provider: "aws", resourceType: "glue", label: "Glue" },
      { provider: "aws", resourceType: "athena", label: "Athena" },
      { provider: "aws", resourceType: "redshift", label: "Redshift" },
      { provider: "aws", resourceType: "emr", label: "EMR" },
      { provider: "aws", resourceType: "opensearch", label: "OpenSearch" },
      { provider: "gcp", resourceType: "bigquery", label: "BigQuery" },
      { provider: "gcp", resourceType: "dataproc", label: "Dataproc" },
      { provider: "gcp", resourceType: "dataflow", label: "Dataflow" },
      { provider: "azure", resourceType: "synapse", label: "Synapse" },
      { provider: "azure", resourceType: "databricks", label: "Databricks" },
    ],
  },
  {
    id: "cicd",
    label: "CI/CD",
    description: "Build pipelines, deploy stages, and release automation.",
    targets: [
      { provider: "aws", resourceType: "codebuild", label: "CodeBuild" },
      { provider: "aws", resourceType: "codepipeline", label: "CodePipeline" },
      { provider: "aws", resourceType: "codedeploy", label: "CodeDeploy" },
      { provider: "gcp", resourceType: "cloud-build", label: "Cloud Build" },
      { provider: "gcp", resourceType: "artifact-registry", label: "Artifact Registry" },
      { provider: "azure", resourceType: "devops-pipeline", label: "Azure Pipelines" },
    ],
  },
  {
    id: "observability-infra",
    label: "Observability infra",
    description: "CloudWatch, logging sinks, and platform monitoring resources (not the console Monitoring page).",
    targets: [
      { provider: "aws", resourceType: "cloudwatch", label: "CloudWatch" },
      { provider: "aws", resourceType: "cloudwatch-log-group", label: "CloudWatch log group" },
      { provider: "gcp", resourceType: "cloud-monitoring", label: "Cloud Monitoring" },
      { provider: "gcp", resourceType: "logging", label: "Cloud Logging sink" },
      { provider: "gcp", resourceType: "alert-policy", label: "Alert policy" },
      { provider: "azure", resourceType: "log-analytics", label: "Log Analytics" },
      { provider: "azure", resourceType: "application-insights", label: "Application Insights" },
    ],
  },
];

function baseConfigFor(
  category: TerraformCategory,
  target: TerraformTarget,
  region: string
): Record<string, unknown> {
  switch (category) {
    case "compute":
      return {
        region,
        instance_type: target.provider === "gcp" ? "e2-medium" : "t3.medium",
        disk_size_gb: 20,
        tags: { managed_by: "grid" },
      };
    case "network":
      return {
        region,
        cidr: "10.0.0.0/16",
        subnets: [
          { name: "public-a", cidr: "10.0.1.0/24" },
          { name: "private-a", cidr: "10.0.10.0/24" },
        ],
      };
    case "database":
      return { region, engine_version: "15", instance_class: "db.t4g.medium" };
    case "storage":
      return { region, versioning: true };
    case "ai-ml":
      return {
        region,
        instance_type: target.provider === "gcp" ? "a2-highgpu-1g" : "g5.xlarge",
        desired_size: 2,
      };
    case "identity":
      return { region, description: "Application roles and policies" };
    case "security":
      return { region, description: "Encryption key for application secrets" };
    case "messaging":
      return { region, display_name: "platform-events" };
    case "serverless":
      return { region, runtime: "nodejs20.x", handler: "index.handler" };
    case "containers":
      return { region, desired_count: 2 };
    case "edge":
      return { region, comment: "Static assets distribution" };
    case "analytics":
      return { region, description: "ETL catalog and crawlers" };
    case "cicd":
      return { region, description: "Build and deploy pipeline" };
    case "observability-infra":
      return { region, retention_in_days: 30 };
    default:
      return { region };
  }
}

/** Starter JSON for a Terraform target inside a category. */
export function terraformDeployTemplate(
  category: TerraformCategory,
  target: TerraformTarget
): string {
  const region = regionHintFor(target.provider);
  const body: GridDeployRequest = {
    name: `my-${target.resourceType}`,
    provider: target.provider,
    engine: "terraform",
    resourceType: target.resourceType,
    environment: "staging",
    config: baseConfigFor(category, target, region),
  };
  return JSON.stringify(body, null, 2);
}

export function clusterDeployTemplate(targetId: string): string {
  const target = KUBERNETES_CLUSTER_TARGETS.find((t) => t.id === targetId) ?? KUBERNETES_CLUSTER_TARGETS[0];
  const body: GridDeployRequest = {
    name: `${target.id}-cluster`,
    provider: target.provider,
    engine: "terraform",
    resourceType: target.resourceType,
    environment: "staging",
    config: {
      region: target.regionHint,
      kubernetes_version: "1.30",
      node_pools: [
        {
          name: "default",
          instance_type: target.provider === "gcp" ? "e2-standard-4" : "m5.large",
          desired_size: 3,
          min_size: 2,
          max_size: 6,
        },
      ],
      private_cluster: true,
      tags: { managed_by: "grid" },
    },
  };
  return JSON.stringify(body, null, 2);
}

/** Workload kinds that run on a cluster — not through Terraform apply. */
export const KUBERNETES_KINDS: {
  id: KubernetesWorkloadKind;
  label: string;
  description: string;
}[] = [
  {
    id: "workload",
    label: "Workload",
    description: "Deployment / StatefulSet / Service / Ingress manifests.",
  },
  {
    id: "helm-release",
    label: "Helm release",
    description: "Install or upgrade a Helm chart into a cluster.",
  },
  {
    id: "kustomize",
    label: "Kustomize",
    description: "Apply a Kustomize overlay.",
  },
  {
    id: "cronjob",
    label: "CronJob",
    description: "Scheduled Kubernetes jobs.",
  },
  {
    id: "job",
    label: "Job",
    description: "One-shot batch jobs.",
  },
  {
    id: "config",
    label: "Config",
    description: "ConfigMap / Secret / NetworkPolicy (cluster-scoped config).",
  },
];
