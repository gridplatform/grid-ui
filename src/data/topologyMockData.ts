/**
 * Extended mock data for topology view (~130 resources)
 * Multiple clusters, environments, providers with realistic connections
 */
import type { Resource } from "@/pages/InfrastructurePage";

// Helper to generate resources
function vm(id: string, name: string, status: "running"|"stopped"|"error"|"degraded", env: string, provider: string, region: string, connections: string[]): Resource {
  return { id, name, type: "single-vm", status, region, ip: `10.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, cpu: `${2+Math.floor(Math.random()*14)} vCPU`, memory: `${4+Math.floor(Math.random()*60)} GB`, environment: env, provider, connections, config: {} };
}

function vmCluster(id: string, name: string, status: "running"|"stopped"|"error"|"degraded", env: string, provider: string, region: string, connections: string[], nodeCount: number): Resource {
  return { id, name, type: "vm-cluster", status, region, ip: `10.${Math.floor(Math.random()*255)}.0.0/24`, cpu: `${nodeCount*4} vCPU`, memory: `${nodeCount*16} GB`, environment: env, provider, connections, config: { node_count: nodeCount } };
}

function net(id: string, name: string, env: string, provider: string, region: string, connections: string[]): Resource {
  return { id, name, type: "network", status: "running", region, ip: `10.${Math.floor(Math.random()*255)}.0.0/16`, cpu: "—", memory: "—", environment: env, provider, connections, config: {} };
}

function k8s(id: string, name: string, type: Resource["type"], status: Resource["status"], env: string, provider: string, region: string, cluster: string, connections: string[]): Resource {
  return { id, name, type, status, region, ip: type === "k8s-ingress" ? `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}` : "—", cpu: type === "k8s-storage" ? "48 vCPU" : `${Math.floor(Math.random()*4)+1} vCPU`, memory: `${Math.floor(Math.random()*16)+1} GB`, environment: env, provider, connections, config: {}, cluster };
}

function managed(id: string, name: string, status: Resource["status"], env: string, provider: string, region: string, connections: string[], engine: string): Resource {
  return { id, name, type: "managed-service", status, region, ip: `${name}.${region}.${provider.toLowerCase()}.com`, cpu: `${Math.floor(Math.random()*8)+2} vCPU`, memory: `${Math.floor(Math.random()*64)+8} GB`, environment: env, provider, connections, config: { engine } };
}

export const extendedMockResources: Resource[] = [
  // ═══════════════════════════════════════════════════════════
  // NETWORKS (6)
  // ═══════════════════════════════════════════════════════════
  net("net-prod-us", "prod-vpc-us", "Production", "AWS", "us-east-1", ["svm-bastion-1", "svm-jenkins", "vmc-elastic", "vmc-mongo", "ms-pg-prod", "ms-redis-prod"]),
  net("net-prod-eu", "prod-vpc-eu", "Production", "AWS", "eu-west-1", ["svm-bastion-2", "vmc-kafka", "ms-pg-eu"]),
  net("net-prod-gcp", "prod-vpc-gcp", "Production", "GCP", "us-central1", ["svm-monitor-1", "vmc-elastic-gcp", "ms-memstore"]),
  net("net-stg-us", "staging-vpc-us", "Staging", "AWS", "us-east-1", ["svm-stg-bastion", "ms-pg-stg"]),
  net("net-stg-eu", "staging-vpc-eu", "Staging", "AWS", "eu-west-1", ["svm-stg-eu"]),
  net("net-dev", "dev-vpc", "Development", "GCP", "us-central1", ["svm-dev-1"]),

  // ═══════════════════════════════════════════════════════════
  // SINGLE VMs (12)
  // ═══════════════════════════════════════════════════════════
  vm("svm-bastion-1", "bastion-us-east", "running", "Production", "AWS", "us-east-1", ["net-prod-us"]),
  vm("svm-bastion-2", "bastion-eu-west", "running", "Production", "AWS", "eu-west-1", ["net-prod-eu"]),
  vm("svm-jenkins", "jenkins-ci", "running", "Production", "AWS", "us-east-1", ["net-prod-us"]),
  vm("svm-monitor-1", "prometheus-server", "running", "Production", "GCP", "us-central1", ["net-prod-gcp"]),
  vm("svm-monitor-2", "grafana-server", "running", "Production", "GCP", "us-central1", ["net-prod-gcp", "svm-monitor-1"]),
  vm("svm-vault", "hashicorp-vault", "running", "Production", "AWS", "us-east-1", ["net-prod-us"]),
  vm("svm-ansible", "ansible-control", "stopped", "Production", "AWS", "us-east-1", ["net-prod-us"]),
  vm("svm-stg-bastion", "bastion-staging", "running", "Staging", "AWS", "us-east-1", ["net-stg-us"]),
  vm("svm-stg-eu", "staging-eu-runner", "degraded", "Staging", "AWS", "eu-west-1", ["net-stg-eu"]),
  vm("svm-dev-1", "dev-sandbox", "running", "Development", "GCP", "us-central1", ["net-dev"]),
  vm("svm-logging", "centralized-log", "running", "Production", "AWS", "us-east-1", ["net-prod-us"]),
  vm("svm-proxy", "forward-proxy", "running", "Production", "AWS", "us-east-1", ["net-prod-us"]),

  // ═══════════════════════════════════════════════════════════
  // VM CLUSTERS (6)
  // ═══════════════════════════════════════════════════════════
  vmCluster("vmc-elastic", "elasticsearch-prod", "running", "Production", "AWS", "us-east-1", ["net-prod-us", "k8s-svc-p1-api"], 9),
  vmCluster("vmc-mongo", "mongo-replica-set", "running", "Production", "AWS", "us-east-1", ["net-prod-us"], 3),
  vmCluster("vmc-kafka", "kafka-cluster", "running", "Production", "AWS", "eu-west-1", ["net-prod-eu", "k8s-svc-p2-events"], 5),
  vmCluster("vmc-elastic-gcp", "elasticsearch-gcp", "degraded", "Production", "GCP", "us-central1", ["net-prod-gcp"], 6),
  vmCluster("vmc-cassandra", "cassandra-ring", "running", "Production", "AWS", "us-east-1", ["net-prod-us"], 6),
  vmCluster("vmc-rabbitmq", "rabbitmq-cluster", "error", "Production", "AWS", "us-east-1", ["net-prod-us", "k8s-svc-p1-worker"], 3),

  // ═══════════════════════════════════════════════════════════
  // KUBERNETES — gke-platform (Production, GCP) — 22 resources
  // ═══════════════════════════════════════════════════════════
  // Ingress
  k8s("k8s-ing-p1", "nginx-ingress", "k8s-ingress", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-svc-p1-api", "k8s-svc-p1-web", "k8s-svc-p1-ws"]),
  // Services
  k8s("k8s-svc-p1-api", "api-service", "k8s-service", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-dep-p1-api", "k8s-ing-p1"]),
  k8s("k8s-svc-p1-web", "web-frontend-svc", "k8s-service", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-dep-p1-web", "k8s-ing-p1"]),
  k8s("k8s-svc-p1-ws", "websocket-svc", "k8s-service", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-dep-p1-ws", "k8s-ing-p1"]),
  k8s("k8s-svc-p1-worker", "worker-svc", "k8s-service", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-dep-p1-worker"]),
  k8s("k8s-svc-p1-grpc", "grpc-gateway-svc", "k8s-service", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-dep-p1-grpc"]),
  // Deployments
  k8s("k8s-dep-p1-api", "api-server", "k8s-deployment", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-svc-p1-api", "ms-pg-prod", "ms-redis-prod"]),
  k8s("k8s-dep-p1-web", "web-frontend", "k8s-deployment", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-svc-p1-web"]),
  k8s("k8s-dep-p1-ws", "websocket-handler", "k8s-deployment", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-svc-p1-ws", "ms-redis-prod"]),
  k8s("k8s-dep-p1-worker", "worker-processor", "k8s-deployment", "degraded", "Production", "GCP", "us-central1", "gke-platform", ["k8s-svc-p1-worker", "vmc-rabbitmq"]),
  k8s("k8s-dep-p1-grpc", "grpc-gateway", "k8s-deployment", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-svc-p1-grpc"]),
  k8s("k8s-dep-p1-auth", "auth-service", "k8s-deployment", "running", "Production", "GCP", "us-central1", "gke-platform", ["ms-pg-prod"]),
  k8s("k8s-dep-p1-notify", "notification-svc", "k8s-deployment", "running", "Production", "GCP", "us-central1", "gke-platform", ["ms-redis-prod"]),
  // StatefulSets
  k8s("k8s-ss-p1-redis", "redis-cluster", "k8s-statefulset", "running", "Production", "GCP", "us-central1", "gke-platform", []),
  k8s("k8s-ss-p1-zk", "zookeeper", "k8s-statefulset", "running", "Production", "GCP", "us-central1", "gke-platform", []),
  // DaemonSets
  k8s("k8s-ds-p1-fluent", "fluentd-logger", "k8s-daemonset", "running", "Production", "GCP", "us-central1", "gke-platform", []),
  k8s("k8s-ds-p1-prom", "node-exporter", "k8s-daemonset", "running", "Production", "GCP", "us-central1", "gke-platform", []),
  // CronJobs
  k8s("k8s-cron-p1-backup", "db-backup-job", "k8s-cronjob", "running", "Production", "GCP", "us-central1", "gke-platform", []),
  k8s("k8s-cron-p1-cleanup", "log-cleanup", "k8s-cronjob", "running", "Production", "GCP", "us-central1", "gke-platform", []),
  k8s("k8s-cron-p1-report", "daily-report", "k8s-cronjob", "running", "Production", "GCP", "us-central1", "gke-platform", []),
  // Storage / Node Pools
  k8s("k8s-np-p1-default", "default-pool", "k8s-storage", "running", "Production", "GCP", "us-central1", "gke-platform", []),
  k8s("k8s-np-p1-gpu", "gpu-pool", "k8s-storage", "running", "Production", "GCP", "us-central1", "gke-platform", []),

  // ═══════════════════════════════════════════════════════════
  // KUBERNETES — eks-prod-us (Production, AWS) — 18 resources
  // ═══════════════════════════════════════════════════════════
  k8s("k8s-ing-p2", "alb-ingress", "k8s-ingress", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-svc-p2-api", "k8s-svc-p2-admin"]),
  k8s("k8s-svc-p2-api", "api-svc", "k8s-service", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-dep-p2-api", "k8s-ing-p2"]),
  k8s("k8s-svc-p2-admin", "admin-svc", "k8s-service", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-dep-p2-admin", "k8s-ing-p2"]),
  k8s("k8s-svc-p2-events", "events-svc", "k8s-service", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-dep-p2-events"]),
  k8s("k8s-svc-p2-billing", "billing-svc", "k8s-service", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-dep-p2-billing"]),
  k8s("k8s-dep-p2-api", "api-v2", "k8s-deployment", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-svc-p2-api", "ms-pg-prod"]),
  k8s("k8s-dep-p2-admin", "admin-panel", "k8s-deployment", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-svc-p2-admin", "ms-pg-prod"]),
  k8s("k8s-dep-p2-events", "event-processor", "k8s-deployment", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-svc-p2-events", "vmc-kafka"]),
  k8s("k8s-dep-p2-billing", "billing-engine", "k8s-deployment", "error", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-svc-p2-billing", "ms-pg-prod"]),
  k8s("k8s-dep-p2-ml", "ml-inference", "k8s-deployment", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["ms-pg-prod"]),
  k8s("k8s-ss-p2-consul", "consul-cluster", "k8s-statefulset", "running", "Production", "AWS", "us-east-1", "eks-prod-us", []),
  k8s("k8s-ds-p2-datadog", "datadog-agent", "k8s-daemonset", "running", "Production", "AWS", "us-east-1", "eks-prod-us", []),
  k8s("k8s-ds-p2-falco", "falco-security", "k8s-daemonset", "running", "Production", "AWS", "us-east-1", "eks-prod-us", []),
  k8s("k8s-cron-p2-etl", "etl-pipeline", "k8s-cronjob", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["ms-pg-prod"]),
  k8s("k8s-cron-p2-gc", "garbage-collect", "k8s-cronjob", "running", "Production", "AWS", "us-east-1", "eks-prod-us", []),
  k8s("k8s-np-p2-default", "default-pool", "k8s-storage", "running", "Production", "AWS", "us-east-1", "eks-prod-us", []),
  k8s("k8s-np-p2-compute", "compute-pool", "k8s-storage", "running", "Production", "AWS", "us-east-1", "eks-prod-us", []),
  k8s("k8s-np-p2-spot", "spot-pool", "k8s-storage", "running", "Production", "AWS", "us-east-1", "eks-prod-us", []),

  // ═══════════════════════════════════════════════════════════
  // KUBERNETES — eks-prod-eu (Production, AWS EU) — 12 resources
  // ═══════════════════════════════════════════════════════════
  k8s("k8s-ing-p3", "eu-alb-ingress", "k8s-ingress", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", ["k8s-svc-p3-api", "k8s-svc-p3-cdn"]),
  k8s("k8s-svc-p3-api", "eu-api-svc", "k8s-service", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", ["k8s-dep-p3-api", "k8s-ing-p3"]),
  k8s("k8s-svc-p3-cdn", "cdn-origin-svc", "k8s-service", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", ["k8s-dep-p3-cdn", "k8s-ing-p3"]),
  k8s("k8s-dep-p3-api", "eu-api-server", "k8s-deployment", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", ["k8s-svc-p3-api", "ms-pg-eu"]),
  k8s("k8s-dep-p3-cdn", "cdn-origin", "k8s-deployment", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", ["k8s-svc-p3-cdn"]),
  k8s("k8s-dep-p3-sync", "data-sync", "k8s-deployment", "degraded", "Production", "AWS", "eu-west-1", "eks-prod-eu", ["ms-pg-eu", "vmc-kafka"]),
  k8s("k8s-ss-p3-redis", "eu-redis", "k8s-statefulset", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", []),
  k8s("k8s-ds-p3-fluent", "eu-fluentd", "k8s-daemonset", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", []),
  k8s("k8s-cron-p3-backup", "eu-db-backup", "k8s-cronjob", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", ["ms-pg-eu"]),
  k8s("k8s-np-p3-default", "eu-default-pool", "k8s-storage", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", []),
  k8s("k8s-np-p3-mem", "eu-mem-opt-pool", "k8s-storage", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", []),
  k8s("k8s-dep-p3-cache", "eu-cache-warm", "k8s-deployment", "running", "Production", "AWS", "eu-west-1", "eks-prod-eu", ["k8s-ss-p3-redis"]),

  // ═══════════════════════════════════════════════════════════
  // KUBERNETES — eks-staging (Staging, AWS) — 10 resources
  // ═══════════════════════════════════════════════════════════
  k8s("k8s-ing-s1", "stg-alb-ingress", "k8s-ingress", "degraded", "Staging", "AWS", "us-east-1", "eks-staging", ["k8s-svc-s1-api"]),
  k8s("k8s-svc-s1-api", "stg-api-svc", "k8s-service", "running", "Staging", "AWS", "us-east-1", "eks-staging", ["k8s-dep-s1-api", "k8s-ing-s1"]),
  k8s("k8s-svc-s1-web", "stg-web-svc", "k8s-service", "running", "Staging", "AWS", "us-east-1", "eks-staging", ["k8s-dep-s1-web"]),
  k8s("k8s-dep-s1-api", "stg-api-server", "k8s-deployment", "error", "Staging", "AWS", "us-east-1", "eks-staging", ["k8s-svc-s1-api", "ms-pg-stg"]),
  k8s("k8s-dep-s1-web", "stg-web-app", "k8s-deployment", "running", "Staging", "AWS", "us-east-1", "eks-staging", ["k8s-svc-s1-web"]),
  k8s("k8s-dep-s1-worker", "stg-worker", "k8s-deployment", "running", "Staging", "AWS", "us-east-1", "eks-staging", []),
  k8s("k8s-ss-s1-redis", "stg-redis", "k8s-statefulset", "running", "Staging", "AWS", "us-east-1", "eks-staging", []),
  k8s("k8s-ds-s1-fluent", "stg-fluentd", "k8s-daemonset", "running", "Staging", "AWS", "us-east-1", "eks-staging", []),
  k8s("k8s-cron-s1-test", "stg-integration-test", "k8s-cronjob", "running", "Staging", "AWS", "us-east-1", "eks-staging", []),
  k8s("k8s-np-s1-default", "stg-default-pool", "k8s-storage", "running", "Staging", "AWS", "us-east-1", "eks-staging", []),

  // ═══════════════════════════════════════════════════════════
  // KUBERNETES — gke-dev (Development, GCP) — 6 resources
  // ═══════════════════════════════════════════════════════════
  k8s("k8s-ing-d1", "dev-ingress", "k8s-ingress", "running", "Development", "GCP", "us-central1", "gke-dev", ["k8s-svc-d1-api"]),
  k8s("k8s-svc-d1-api", "dev-api-svc", "k8s-service", "running", "Development", "GCP", "us-central1", "gke-dev", ["k8s-dep-d1-api", "k8s-ing-d1"]),
  k8s("k8s-dep-d1-api", "dev-api", "k8s-deployment", "running", "Development", "GCP", "us-central1", "gke-dev", ["k8s-svc-d1-api"]),
  k8s("k8s-dep-d1-test", "dev-test-runner", "k8s-deployment", "running", "Development", "GCP", "us-central1", "gke-dev", []),
  k8s("k8s-ds-d1-log", "dev-log-agent", "k8s-daemonset", "running", "Development", "GCP", "us-central1", "gke-dev", []),
  k8s("k8s-np-d1-default", "dev-node-pool", "k8s-storage", "running", "Development", "GCP", "us-central1", "gke-dev", []),

  // ═══════════════════════════════════════════════════════════
  // MANAGED SERVICES (10)
  // ═══════════════════════════════════════════════════════════
  managed("ms-pg-prod", "postgres-primary", "running", "Production", "AWS", "us-east-1", ["net-prod-us"], "PostgreSQL 15"),
  managed("ms-pg-eu", "postgres-eu-replica", "running", "Production", "AWS", "eu-west-1", ["net-prod-eu"], "PostgreSQL 15"),
  managed("ms-pg-stg", "postgres-staging", "running", "Staging", "AWS", "us-east-1", ["net-stg-us"], "PostgreSQL 15"),
  managed("ms-redis-prod", "redis-elasticache", "running", "Production", "AWS", "us-east-1", ["net-prod-us"], "Redis 7"),
  managed("ms-memstore", "memorystore-redis", "running", "Production", "GCP", "us-central1", ["net-prod-gcp"], "Redis 7"),
  managed("ms-s3-prod", "s3-data-lake", "running", "Production", "AWS", "us-east-1", [], "S3"),
  managed("ms-bq", "bigquery-analytics", "running", "Production", "GCP", "us-central1", [], "BigQuery"),
  managed("ms-sqs", "sqs-queue", "running", "Production", "AWS", "us-east-1", ["net-prod-us"], "SQS"),
  managed("ms-cdn", "cloudfront-cdn", "running", "Production", "AWS", "us-east-1", [], "CloudFront"),
  managed("ms-dns", "route53-dns", "running", "Production", "AWS", "us-east-1", [], "Route53"),
];

// Total: 6 + 12 + 6 + 22 + 18 + 12 + 10 + 6 + 10 = 102 resources
// Add more misc resources to approach ~130

const extraVMs: Resource[] = Array.from({ length: 8 }, (_, i) => 
  vm(`svm-extra-${i+1}`, `worker-node-${i+1}`, i === 3 ? "degraded" : i === 6 ? "stopped" : "running", i < 5 ? "Production" : "Staging", i % 2 === 0 ? "AWS" : "GCP", i % 2 === 0 ? "us-east-1" : "us-central1", [i < 5 ? "net-prod-us" : "net-stg-us"])
);

const extraManaged: Resource[] = [
  managed("ms-dynamo", "dynamodb-sessions", "running", "Production", "AWS", "us-east-1", ["net-prod-us"], "DynamoDB"),
  managed("ms-aurora", "aurora-read-replica", "running", "Production", "AWS", "us-east-1", ["net-prod-us", "ms-pg-prod"], "Aurora MySQL"),
  managed("ms-elastic-cloud", "elastic-cloud-logs", "running", "Production", "AWS", "us-east-1", [], "Elasticsearch"),
  managed("ms-sns", "sns-notifications", "running", "Production", "AWS", "us-east-1", [], "SNS"),
  managed("ms-lambda-gw", "api-gateway", "running", "Production", "AWS", "us-east-1", ["k8s-ing-p2"], "API Gateway"),
  managed("ms-pubsub", "pubsub-events", "running", "Production", "GCP", "us-central1", [], "Pub/Sub"),
  managed("ms-gcs", "gcs-backups", "running", "Production", "GCP", "us-central1", [], "Cloud Storage"),
  managed("ms-cloudsql-stg", "cloudsql-dev", "running", "Development", "GCP", "us-central1", ["net-dev"], "Cloud SQL"),
];

const extraK8s: Resource[] = [
  k8s("k8s-dep-p1-scheduler", "task-scheduler", "k8s-deployment", "running", "Production", "GCP", "us-central1", "gke-platform", ["ms-redis-prod"]),
  k8s("k8s-dep-p1-gateway", "api-gateway-mesh", "k8s-deployment", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-svc-p1-api"]),
  k8s("k8s-dep-p2-scheduler", "job-scheduler", "k8s-deployment", "running", "Production", "AWS", "us-east-1", "eks-prod-us", []),
  k8s("k8s-dep-p2-cache", "cache-warmer", "k8s-deployment", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["ms-redis-prod"]),
  k8s("k8s-svc-p1-scheduler", "scheduler-svc", "k8s-service", "running", "Production", "GCP", "us-central1", "gke-platform", ["k8s-dep-p1-scheduler"]),
  k8s("k8s-svc-p2-cache", "cache-svc", "k8s-service", "running", "Production", "AWS", "us-east-1", "eks-prod-us", ["k8s-dep-p2-cache"]),
];

export const allMockResources: Resource[] = [
  ...extendedMockResources,
  ...extraVMs,
  ...extraManaged,
  ...extraK8s,
];
