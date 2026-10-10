/**
 * Mirror of grid-core resolveResourceType — primary resource wins over SG/subnet helpers.
 */

const SUPPORTING_TYPES = new Set([
  "security-group",
  "security_group",
  "sg",
  "subnet",
  "route-table",
  "route_table",
  "internet-gateway",
  "nat-gateway",
  "elastic-ip",
  "eip",
  "network-acl",
  "nacl",
  "iam-role",
  "iam-policy",
  "instance-profile",
  "key-pair",
  "keypair",
]);

const PRIMARY_RANK: Record<string, number> = {
  vm: 100,
  ec2: 100,
  "ec2-instance": 100,
  instance: 95,
  eks: 90,
  gke: 90,
  aks: 90,
  rds: 85,
  "s3-bucket": 80,
  vpc: 70,
  alb: 65,
  nlb: 65,
};

function rankType(type: string): number {
  if (SUPPORTING_TYPES.has(type)) return -10;
  if (PRIMARY_RANK[type] != null) return PRIMARY_RANK[type];
  if (/^(vm|ec2|instance|eks|gke|aks|rds|aurora)/.test(type)) return 90;
  if (/security-group|subnet|iam-|route-/.test(type)) return -5;
  return 10;
}

export function pickPrimaryResourceType(
  resources: Array<{ type?: string }> | undefined
): string | undefined {
  if (!resources?.length) return undefined;
  let best: { type: string; rank: number; index: number } | undefined;
  for (let i = 0; i < resources.length; i++) {
    const raw = resources[i]?.type;
    if (typeof raw !== "string" || !raw.trim()) continue;
    const type = raw.trim().toLowerCase();
    const rank = rankType(type);
    if (!best || rank > best.rank || (rank === best.rank && i < best.index)) {
      best = { type, rank, index: i };
    }
  }
  return best?.type;
}

export function resolveResourceType(input: {
  configJson?: Record<string, unknown> | null;
  gitPath?: string | null;
  name?: string;
  /** API list item type when already resolved by core */
  apiType?: string | null;
}): string {
  if (input.apiType?.trim() && input.apiType.toLowerCase() !== "unknown") {
    return input.apiType.trim().toLowerCase();
  }

  const cfg = input.configJson;
  const gitPath = input.gitPath?.replace(/\\/g, "/");
  const fromGit = (() => {
    if (!gitPath) return undefined;
    const parts = gitPath.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const parent = parts[parts.length - 2];
      if (parent && parent !== "projects") return parent.toLowerCase();
    }
    return undefined;
  })();

  if (cfg && typeof cfg === "object") {
    const resources = cfg.resources as Array<{ type?: string }> | undefined;
    const primary = pickPrimaryResourceType(resources);
    if (primary) {
      if (fromGit && rankType(fromGit) >= rankType(primary)) return fromGit;
      return primary;
    }
  }

  if (fromGit) return fromGit;
  if (input.name?.trim()) return input.name.trim().toLowerCase();
  return "unknown";
}
