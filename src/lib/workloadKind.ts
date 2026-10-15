import type { KubernetesWorkloadKind } from "@/lib/deployContract";

/** Maps a subtype string to a Kubernetes workload kind for UI grouping. */
export function workloadKindForSubtype(subtype: string): KubernetesWorkloadKind {
  const t = subtype.toLowerCase();
  if (/helm/.test(t)) return "helm-release";
  if (/kustomize/.test(t)) return "kustomize";
  if (/cronjob|k8s-cronjob/.test(t)) return "cronjob";
  if (/^job$|batch-job|k8s-job/.test(t)) return "job";
  if (/^(config|configmap|secret)$|k8s-config/.test(t)) return "config";
  return "workload";
}

/**
 * True for in-cluster workload subtypes.
 * Managed clusters and node pools stay on the Terraform side.
 */
export function isKubernetesWorkloadSubtype(subtype: string): boolean {
  const t = subtype.toLowerCase();
  if (
    /node-pool|node-group|karpenter|machine-pool|machine-set/.test(t) ||
    /^(eks|gke|aks|oke|ack|tke|cce|roks|rosa|openshift|kubernetes-engine)(-|$)/.test(t)
  ) {
    return false;
  }
  return (
    /^(workload|helm-release|kustomize|cronjob|job|config)$/.test(t) ||
    /^k8s-(deployment|service|ingress|cronjob|statefulset|daemonset|storage)/.test(t)
  );
}
