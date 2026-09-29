/**
 * Map catalog resource types into the same Terraform categories used on Deployments.
 * Exact matches from TERRAFORM_CATEGORIES win; everything else uses name heuristics.
 */

import {
  TERRAFORM_CATEGORIES,
  type TerraformCategory,
} from "@/lib/deployContract";

/** resourceType → category from the curated Deployments catalog. */
const CATALOG_TYPE_TO_CATEGORY: Map<string, TerraformCategory> = (() => {
  const map = new Map<string, TerraformCategory>();
  for (const cat of TERRAFORM_CATEGORIES) {
    for (const t of cat.targets) {
      const key = t.resourceType.trim().toLowerCase();
      if (!map.has(key)) map.set(key, cat.id);
    }
  }
  return map;
})();

/**
 * Assign a resource type (alb, vpc, rds, …) to a Terraform category.
 * Cluster and node-pool units always stay under kubernetes-cluster (Infrastructure),
 * never under Workloads.
 */
export function categoryForResourceType(resourceType?: string | null): TerraformCategory {
  if (!resourceType) return "other";
  const t = resourceType.trim().toLowerCase();
  if (!t || t === "unknown" || t === "—") return "other";

  // Node pools / groups are first-class Infrastructure units (one YAML each).
  if (
    /node-pool|node-group|karpenter|machine-pool|machine-set/.test(t) ||
    /^(eks|gke|aks|oke|ack|tke|cce|roks|rosa)(-|$)/.test(t) ||
    /^(rosa-cluster|roks-cluster|openshift)/.test(t)
  ) {
    return "kubernetes-cluster";
  }

  const fromCatalog = CATALOG_TYPE_TO_CATEGORY.get(t);
  if (fromCatalog) return fromCatalog;

  // Heuristics cover catalog units not listed as Deployments "targets".
  if (/kubernetes|k8s-/.test(t)) {
    return "kubernetes-cluster";
  }
  if (
    /vpc|subnet|vnet|vswitch|cen|ccn|vpn|nat|gateway|route53|dns|firewall|nsg|security-group|alb|nlb|elb|slb|clb|load-balancer|direct-connect|peering|privatelink|endpoint|cdn(?!$)|cloudwan|network-manager|verified-access|client-vpn|transit|express-connect|eip(?!-)/.test(
      t
    )
  ) {
    return "network";
  }
  if (
    /ec2|instance|vm$|virtual-machine|compute-engine|autoscaling|asg|lightsail|bare-metal|gpu-instance|single-vm|vm-scale|spot|batch(?!-)/.test(
      t
    )
  ) {
    return "compute";
  }
  if (
    /rds|aurora|dynamo|sql|postgres|mysql|mariadb|mongo|redis|elasticache|memorydb|memorystore|spanner|firestore|bigtable|alloydb|cosmos|documentdb|neptune|keyspaces|cassandra|opensearch(?!-)|elasticsearch|heatwave|polar-db|cynosdb|gaussdb/.test(
      t
    )
  ) {
    return "database";
  }
  if (
    /s3|gcs|bucket|efs|fsx|filestore|ebs|disk|volume|storage|glacier|nas|oss|obs|cos-bucket|backup|snapshot/.test(
      t
    )
  ) {
    return "storage";
  }
  if (
    /sagemaker|bedrock|vertex|openai|ai-|mlflow|kserve|kuberay|vllm|ollama|nim|tensorrt|huggingface|comprehend|rekognition|textract|polly|transcribe|translate|forecast|personalize|q-business|machine-learning|cognitive|document-ai|vision-ai|dialogflow|modelarts|pai|eas/.test(
      t
    )
  ) {
    return "ai-ml";
  }
  if (
    /iam|cognito|identity|directory|service-account|managed-identity|entra|sso|organizations|ram$|cam$|appid|oauth/.test(
      t
    )
  ) {
    return "identity";
  }
  if (
    /kms|secret|vault|waf|guardduty|security-hub|inspector|macie|shield|acm|certificate|cloud-armor|access-analyzer|detective|firewall-manager|private-ca|security-list|cloud-guard|key-protect|key-vault|ssl/.test(
      t
    )
  ) {
    return "security";
  }
  if (
    /sns|sqs|eventbridge|msk|kinesis|kafka|mq|pubsub|service-bus|event-grid|eventhub|event-hubs|rocketmq|tdmq|smn|notification/.test(
      t
    )
  ) {
    return "messaging";
  }
  if (
    /lambda|apigateway|api-gateway|appsync|step-functions|cloud-function|function-app|functiongraph|scf|fc$|sae|logic-app|workflow|pipes|scheduler/.test(
      t
    )
  ) {
    return "serverless";
  }
  if (
    /ecs|fargate|ecr|apprunner|cloud-run|container-app|container-instance|container-registry|batch|code-engine|tem/.test(
      t
    )
  ) {
    return "containers";
  }
  if (/cloudfront|cdn|global-accelerator|front-door|media-cdn|ga$|edge/.test(t)) {
    return "edge";
  }
  if (
    /glue|athena|redshift|emr|bigquery|dataproc|dataflow|synapse|databricks|data-factory|dataworks|flink|maxcompute|holo|analytics|quicksight|looker|lakeformation|datazone/.test(
      t
    )
  ) {
    return "analytics";
  }
  if (
    /codepipeline|codebuild|codecommit|codedeploy|cloud-build|cloud-deploy|devops|cicd|toolchain|amplify|github|gitlab/.test(
      t
    )
  ) {
    return "cicd";
  }
  if (
    /cloudwatch|monitoring|logging|xray|prometheus|grafana|trace|apm|ops|sysdig|cls|lts|arms|cms|alert/.test(
      t
    )
  ) {
    return "observability-infra";
  }

  return "other";
}

/** Categories that currently have at least one unit in `types`. */
export function categoriesPresentIn(
  resourceTypes: Iterable<string>
): TerraformCategory[] {
  const present = new Set<TerraformCategory>();
  for (const t of resourceTypes) {
    present.add(categoryForResourceType(t));
  }
  return TERRAFORM_CATEGORIES.map((c) => c.id).filter((id) => present.has(id));
}

/** Human label for a Terraform category (Type column). */
export function categoryLabel(category: TerraformCategory): string {
  return TERRAFORM_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}
