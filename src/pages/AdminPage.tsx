import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { GridLogo } from "@/components/GridLogo";
import { useBranding } from "@/contexts/BrandingContext";
import {
  Users, Key, Shield, Lock, UserPlus, Search, X, ChevronDown,
  FileText, ChevronLeft, ChevronRight, Calendar, Palette, Plus,
  Trash2, Copy, Upload, ToggleLeft, ToggleRight, Bell,
  MessageSquare, Phone, Mail, Webhook, GitBranch, RefreshCw,
  Check, Settings2, Box, Download, ExternalLink, Brain, Eye, EyeOff,
  BarChart3, CreditCard, Receipt,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserRecord {
  id: string; name: string; email: string; roles: string[];
  status: "Active" | "Pending" | "Disabled"; loginMethods: string[]; lastActive: string;
}

type AuditAction = "Login" | "Logout" | "Infrastructure change" | "Release triggered" | "Release approved" | "Full plan" | "Full release";

interface AuditEntry {
  id: string; timestamp: string; isoTimestamp: string; user: string; action: AuditAction; details: string;
}

interface ServiceAccount {
  id: string; name: string; description: string; created: string; status: "Active" | "Revoked";
}

interface RoleRecord {
  id: string; name: string; description: string; type: "Built-in" | "Custom"; users: number;
}

interface SamlMapping {
  id: string; idpGroup: string; gridRole: string;
}

interface ApiKeyRecord {
  id: string; name: string; prefix: string; created: string; lastUsed: string; status: "Active" | "Revoked";
}

interface AppKeyRecord {
  id: string; name: string; scopes: string[]; created: string; status: "Active" | "Revoked";
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockUsers: UserRecord[] = [
  { id: "1", name: "Alice Chen", email: "alice@grid.io", roles: ["Admin", "Owner"], status: "Active", loginMethods: ["Google", "Password"], lastActive: "2 min ago" },
  { id: "2", name: "Bob Martinez", email: "bob@grid.io", roles: ["Developer"], status: "Active", loginMethods: ["Google"], lastActive: "1h ago" },
  { id: "3", name: "Carol Singh", email: "carol@grid.io", roles: ["Viewer"], status: "Pending", loginMethods: ["Password"], lastActive: "Never" },
  { id: "4", name: "David Kim", email: "david@grid.io", roles: ["Developer"], status: "Active", loginMethods: ["SAML"], lastActive: "30m ago" },
  { id: "5", name: "Elena Popov", email: "elena@grid.io", roles: ["Admin"], status: "Active", loginMethods: ["Google", "SAML"], lastActive: "5m ago" },
  { id: "6", name: "Frank Li", email: "frank@grid.io", roles: ["Developer"], status: "Disabled", loginMethods: ["Password"], lastActive: "2 weeks ago" },
];

const allAuditActions: AuditAction[] = ["Login", "Logout", "Infrastructure change", "Release triggered", "Release approved", "Full plan", "Full release"];

const mockAuditLog: AuditEntry[] = [
  { id: "a-001", timestamp: "2026-02-25 14:32:10", isoTimestamp: "2026-02-25", user: "alice@grid.io", action: "Release triggered", details: "rel-001 api-gateway v2.4.1 → Production" },
  { id: "a-002", timestamp: "2026-02-25 14:30:55", isoTimestamp: "2026-02-25", user: "admin@grid.io", action: "Release approved", details: "rel-009 worker-service v1.7.2 → Production (requested by bob@grid.io)" },
  { id: "a-003", timestamp: "2026-02-25 14:28:04", isoTimestamp: "2026-02-25", user: "admin@grid.io", action: "Login", details: "—" },
  { id: "a-004", timestamp: "2026-02-25 13:55:41", isoTimestamp: "2026-02-25", user: "bob@grid.io", action: "Infrastructure change", details: "Modified worker-node-01 config in us-east-1" },
  { id: "a-005", timestamp: "2026-02-25 13:40:12", isoTimestamp: "2026-02-25", user: "alice@grid.io", action: "Full plan", details: "Terraform plan on Production (3 resources)" },
  { id: "a-006", timestamp: "2026-02-25 12:10:00", isoTimestamp: "2026-02-25", user: "elena@grid.io", action: "Login", details: "—" },
  { id: "a-007", timestamp: "2026-02-25 11:58:30", isoTimestamp: "2026-02-25", user: "david@grid.io", action: "Release triggered", details: "rel-010 auth-service v3.0.0 → Staging" },
  { id: "a-008", timestamp: "2026-02-25 11:45:22", isoTimestamp: "2026-02-25", user: "bob@grid.io", action: "Login", details: "—" },
  { id: "a-009", timestamp: "2026-02-25 10:30:00", isoTimestamp: "2026-02-25", user: "alice@grid.io", action: "Login", details: "—" },
  { id: "a-010", timestamp: "2026-02-25 10:15:44", isoTimestamp: "2026-02-25", user: "admin@grid.io", action: "Full release", details: "Full Terraform apply on Staging (8 resources)" },
  { id: "a-011", timestamp: "2026-02-24 18:22:10", isoTimestamp: "2026-02-24", user: "frank@grid.io", action: "Logout", details: "—" },
  { id: "a-012", timestamp: "2026-02-24 17:50:33", isoTimestamp: "2026-02-24", user: "admin@grid.io", action: "Infrastructure change", details: "Created db-replica in us-west-2" },
  { id: "a-013", timestamp: "2026-02-24 17:30:00", isoTimestamp: "2026-02-24", user: "admin@grid.io", action: "Release approved", details: "rel-008 cache-layer v1.3.1 → Production (requested by alice@grid.io)" },
  { id: "a-014", timestamp: "2026-02-24 16:45:11", isoTimestamp: "2026-02-24", user: "alice@grid.io", action: "Release triggered", details: "rel-008 cache-layer v1.3.1 → Production" },
  { id: "a-015", timestamp: "2026-02-24 15:10:05", isoTimestamp: "2026-02-24", user: "david@grid.io", action: "Login", details: "—" },
  { id: "a-016", timestamp: "2026-02-24 14:55:22", isoTimestamp: "2026-02-24", user: "bob@grid.io", action: "Infrastructure change", details: "Modified staging-web security groups in eu-west-1" },
  { id: "a-017", timestamp: "2026-02-24 14:20:00", isoTimestamp: "2026-02-24", user: "elena@grid.io", action: "Full plan", details: "Terraform plan on Development (12 resources)" },
  { id: "a-018", timestamp: "2026-02-24 13:00:44", isoTimestamp: "2026-02-24", user: "alice@grid.io", action: "Logout", details: "—" },
  { id: "a-019", timestamp: "2026-02-24 09:30:00", isoTimestamp: "2026-02-24", user: "admin@grid.io", action: "Login", details: "—" },
  { id: "a-020", timestamp: "2026-02-24 09:15:33", isoTimestamp: "2026-02-24", user: "frank@grid.io", action: "Login", details: "—" },
  { id: "a-021", timestamp: "2026-02-23 20:00:10", isoTimestamp: "2026-02-23", user: "admin@grid.io", action: "Full release", details: "Full Terraform apply on Production (15 resources)" },
  { id: "a-022", timestamp: "2026-02-23 19:45:00", isoTimestamp: "2026-02-23", user: "admin@grid.io", action: "Full plan", details: "Terraform plan on Production (15 resources)" },
  { id: "a-023", timestamp: "2026-02-23 18:30:22", isoTimestamp: "2026-02-23", user: "bob@grid.io", action: "Release triggered", details: "rel-007 monitoring-stack v2.0.0 → Sandbox" },
  { id: "a-024", timestamp: "2026-02-23 17:10:05", isoTimestamp: "2026-02-23", user: "alice@grid.io", action: "Infrastructure change", details: "Scaled api-gateway-prod to 4 vCPU in us-east-1" },
  { id: "a-025", timestamp: "2026-02-23 16:00:00", isoTimestamp: "2026-02-23", user: "carol@grid.io", action: "Login", details: "—" },
  { id: "a-026", timestamp: "2026-02-23 15:30:45", isoTimestamp: "2026-02-23", user: "elena@grid.io", action: "Logout", details: "—" },
];

const mockServiceAccounts: ServiceAccount[] = [
  { id: "sa-1", name: "ci-pipeline", description: "CI/CD pipeline automation", created: "2026-01-15", status: "Active" },
  { id: "sa-2", name: "monitoring-agent", description: "Grafana Alloy metrics collector", created: "2026-01-20", status: "Active" },
  { id: "sa-3", name: "backup-service", description: "Nightly database backup runner", created: "2025-12-01", status: "Revoked" },
];

const mockRoles: RoleRecord[] = [
  { id: "r-1", name: "Admin", description: "Full access to all resources and settings", type: "Built-in", users: 2 },
  { id: "r-2", name: "Maintainer", description: "Can approve releases and manage infrastructure", type: "Built-in", users: 3 },
  { id: "r-3", name: "Developer", description: "Can create releases and view infrastructure", type: "Built-in", users: 4 },
  { id: "r-4", name: "Viewer", description: "Read-only access to all resources", type: "Built-in", users: 1 },
  { id: "r-5", name: "Release Manager", description: "Custom role for release approval workflows", type: "Custom", users: 1 },
];

const mockSamlMappings: SamlMapping[] = [
  { id: "sm-1", idpGroup: "engineering-admins", gridRole: "Admin" },
  { id: "sm-2", idpGroup: "engineering-devs", gridRole: "Developer" },
  { id: "sm-3", idpGroup: "engineering-viewers", gridRole: "Viewer" },
];

const mockApiKeys: ApiKeyRecord[] = [
  { id: "ak-1", name: "Production Deploy Key", prefix: "grid_ak_prod_", created: "2026-01-10", lastUsed: "2 min ago", status: "Active" },
  { id: "ak-2", name: "Staging CI Key", prefix: "grid_ak_stg_", created: "2026-02-01", lastUsed: "1h ago", status: "Active" },
  { id: "ak-3", name: "Legacy Key", prefix: "grid_ak_leg_", created: "2025-06-15", lastUsed: "3 months ago", status: "Revoked" },
];

const mockAppKeys: AppKeyRecord[] = [
  { id: "appk-1", name: "Monitoring Dashboard", scopes: ["read:metrics", "read:logs"], created: "2026-01-20", status: "Active" },
  { id: "appk-2", name: "Slack Integration", scopes: ["read:releases", "read:deployments"], created: "2026-02-05", status: "Active" },
];

// ─── Notification Channel Types ──────────────────────────────────────────────

type NotifChannelType = "slack" | "pagerduty" | "email" | "webhook" | "opsgenie";

interface NotifChannel {
  id: string;
  name: string;
  type: NotifChannelType;
  config: string; // display summary
  status: "Active" | "Inactive";
  created: string;
}

const notifChannelIcons: Record<NotifChannelType, React.ElementType> = {
  slack: MessageSquare, pagerduty: Phone, email: Mail, webhook: Webhook, opsgenie: Bell,
};

const notifChannelLabels: Record<NotifChannelType, string> = {
  slack: "Slack", pagerduty: "PagerDuty", email: "Email", webhook: "Webhook", opsgenie: "OpsGenie",
};

const mockNotifChannels: NotifChannel[] = [
  { id: "nc-1", name: "prod-alerts", type: "slack", config: "#prod-alerts via webhook", status: "Active", created: "2026-01-15" },
  { id: "nc-2", name: "oncall-escalation", type: "pagerduty", config: "Service: grid-prod (integration key ****ab12)", status: "Active", created: "2026-01-20" },
  { id: "nc-3", name: "team-email", type: "email", config: "ops-team@grid.io, sre@grid.io", status: "Active", created: "2026-02-01" },
  { id: "nc-4", name: "custom-webhook", type: "webhook", config: "POST https://hooks.internal.io/alerts", status: "Active", created: "2026-02-10" },
  { id: "nc-5", name: "opsgenie-prod", type: "opsgenie", config: "Team: Platform Eng (API key ****cd34)", status: "Inactive", created: "2025-12-01" },
];

// ─── Approval Settings Types ─────────────────────────────────────────────────

type ChangeScope = "infrastructure" | "alerts" | "notifications" | "releases";

interface EnvironmentApproval {
  id: string;
  name: string;
  requiresApproval: boolean;
  scopes: ChangeScope[];
  approverRoles: string[];
}

interface ProjectApproval {
  id: string;
  name: string;
  team: string;
  environments: EnvironmentApproval[];
}

const changeScopeLabels: Record<ChangeScope, string> = {
  infrastructure: "Infrastructure configs",
  alerts: "Alert rules",
  notifications: "Notification channels",
  releases: "Releases & deployments",
};

const mockProjectApprovals: ProjectApproval[] = [
  {
    id: "proj-1", name: "production", team: "Platform Eng",
    environments: [
      { id: "env-1", name: "Production", requiresApproval: true, scopes: ["infrastructure", "alerts", "notifications", "releases"], approverRoles: ["Admin", "Maintainer"] },
      { id: "env-2", name: "Staging", requiresApproval: true, scopes: ["infrastructure", "releases"], approverRoles: ["Admin", "Maintainer", "Release Manager"] },
    ],
  },
  {
    id: "proj-2", name: "staging", team: "Platform Eng",
    environments: [
      { id: "env-3", name: "Staging", requiresApproval: true, scopes: ["releases"], approverRoles: ["Admin", "Maintainer"] },
      { id: "env-4", name: "Development", requiresApproval: false, scopes: [], approverRoles: [] },
    ],
  },
  {
    id: "proj-3", name: "development", team: "Infrastructure Team",
    environments: [
      { id: "env-5", name: "Development", requiresApproval: false, scopes: [], approverRoles: [] },
      { id: "env-6", name: "Sandbox", requiresApproval: false, scopes: [], approverRoles: [] },
    ],
  },
];

// ─── Sidebar Config ──────────────────────────────────────────────────────────

const sidebarSections = [
  {
    title: "ACCOUNTS",
    items: [
      { id: "users", label: "Users", icon: Users },
      { id: "service-accounts", label: "Service Accounts", icon: Key },
    ],
  },
  {
    title: "GROUPS",
    items: [
      { id: "roles", label: "Roles", icon: Shield },
      { id: "saml", label: "SAML Group Mappings", icon: Lock },
    ],
  },
  {
    title: "ACCESS",
    items: [
      { id: "api-keys", label: "API Keys", icon: Key },
      { id: "app-keys", label: "Application Keys", icon: Key },
    ],
  },
  {
    title: "GIT SOURCE",
    items: [
      { id: "git-source", label: "Git Configuration", icon: GitBranch },
      { id: "approval-settings", label: "Approval Settings", icon: Shield },
    ],
  },
  {
    title: "MODULES",
    items: [
      { id: "terraform-modules", label: "Terraform Modules", icon: Box },
    ],
  },
  {
    title: "AI",
    items: [
      { id: "ai-config", label: "AI Configuration", icon: Brain },
    ],
  },
  {
    title: "INTEGRATIONS",
    items: [
      { id: "notification-channels", label: "Notification Channels", icon: Bell },
    ],
  },
  {
    title: "BILLING",
    items: [
      { id: "usage", label: "Usage", icon: BarChart3 },
      { id: "billing", label: "Billing & Invoices", icon: CreditCard },
    ],
  },
  {
    title: "AUDIT",
    items: [
      { id: "audit-log", label: "Audit Log", icon: FileText },
    ],
  },
  {
    title: "SECURITY",
    items: [
      { id: "security", label: "Security Settings", icon: Shield },
    ],
  },
  {
    title: "APPEARANCE",
    items: [
      { id: "branding", label: "Branding", icon: Palette },
    ],
  },
];

const actionColorMap: Record<AuditAction, string> = {
  Login: "bg-primary/10 text-primary",
  Logout: "bg-muted text-muted-foreground",
  "Infrastructure change": "bg-blue-500/10 text-blue-400",
  "Release triggered": "bg-warning/10 text-warning",
  "Release approved": "bg-success/10 text-success",
  "Full plan": "bg-purple-500/10 text-purple-400",
  "Full release": "bg-purple-500/10 text-purple-400",
};

const PAGE_SIZE = 10;

// ─── Component ───────────────────────────────────────────────────────────────

const AdminPage = () => {
  const { customLogoUrl, orgName, setCustomLogoUrl, setOrgName } = useBranding();
  const [activeSection, setActiveSection] = useState("users");

  // User management
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [methodFilter, setMethodFilter] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Audit log
  const [auditActionFilter, setAuditActionFilter] = useState<string[]>([]);
  const [auditUserFilter, setAuditUserFilter] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  // Service Accounts
  const [serviceAccounts, setServiceAccounts] = useState(mockServiceAccounts);
  const [showCreateSA, setShowCreateSA] = useState(false);
  const [newSAName, setNewSAName] = useState("");
  const [newSADesc, setNewSADesc] = useState("");

  // Roles
  const [roles] = useState(mockRoles);

  // SAML
  const [samlMappings, setSamlMappings] = useState(mockSamlMappings);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [newIdpGroup, setNewIdpGroup] = useState("");
  const [newGridRole, setNewGridRole] = useState("Developer");

  // API Keys
  const [apiKeys, setApiKeys] = useState(mockApiKeys);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");

  // App Keys
  const [appKeys, setAppKeys] = useState(mockAppKeys);
  const [showCreateAppKey, setShowCreateAppKey] = useState(false);
  const [newAppKeyName, setNewAppKeyName] = useState("");
  const [newAppKeyScopes, setNewAppKeyScopes] = useState<string[]>([]);

  // Notification Channels
  const [notifChannels, setNotifChannels] = useState(mockNotifChannels);
  const [showCreateNotifChannel, setShowCreateNotifChannel] = useState(false);
  const [newNotifName, setNewNotifName] = useState("");
  const [newNotifType, setNewNotifType] = useState<NotifChannelType>("slack");
  const [newNotifConfig, setNewNotifConfig] = useState("");

  // Git Source
  const [gitProvider, setGitProvider] = useState<"github" | "gitlab">("github");
  const [gitRepoUrl, setGitRepoUrl] = useState("https://github.com/acme-org/infra-config");
  const [gitBranch, setGitBranch] = useState("main");
  const [gitToken, setGitToken] = useState("****••••••••••••ghp_abc");
  const [gitSyncInterval, setGitSyncInterval] = useState("5");
  const [gitSyncStatus, setGitSyncStatus] = useState<"connected" | "syncing" | "error">("connected");
  const [gitLastSync, setGitLastSync] = useState("2026-02-26 14:28:00");
  const [gitConnected, setGitConnected] = useState(true);

  // Approval Settings
  const [projectApprovals, setProjectApprovals] = useState(mockProjectApprovals);
  const [editingEnvApproval, setEditingEnvApproval] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>("proj-1");
  // Terraform Modules
  const [tfModules, setTfModules] = useState([
    { id: "tm-1", name: "grid/compute-engine-instance", source: "grid", repoUrl: "https://github.com/grid-modules/compute-engine-instance", version: "v1.4.0", type: "Built-in" as const, description: "GCP Compute Engine VM instance with networking, disks, and IAM.", usedBy: 5 },
    { id: "tm-2", name: "grid/eks", source: "grid", repoUrl: "https://github.com/grid-modules/eks", version: "v2.1.0", type: "Built-in" as const, description: "AWS EKS cluster with managed node groups and OIDC provider.", usedBy: 2 },
    { id: "tm-3", name: "grid/vpc", source: "grid", repoUrl: "https://github.com/grid-modules/vpc", version: "v1.7.0", type: "Built-in" as const, description: "AWS VPC with subnets, NAT gateway, security groups, and flow logs.", usedBy: 3 },
    { id: "tm-4", name: "grid/rds", source: "grid", repoUrl: "https://github.com/grid-modules/rds", version: "v1.2.0", type: "Built-in" as const, description: "AWS RDS PostgreSQL/MySQL with Multi-AZ, backups, and parameter groups.", usedBy: 2 },
    { id: "tm-5", name: "grid/kubernetes-engine", source: "grid", repoUrl: "https://github.com/grid-modules/kubernetes-engine", version: "v2.0.0", type: "Built-in" as const, description: "GCP GKE cluster with node pools, workload identity, and ingress.", usedBy: 1 },
    { id: "tm-6", name: "acme/custom-ec2-bastion", source: "custom", repoUrl: "https://github.com/acme-org/tf-bastion", version: "v0.3.1", type: "Custom" as const, description: "Hardened bastion host with SSM agent and CloudWatch logging.", usedBy: 1 },
    { id: "tm-7", name: "acme/mongo-replica", source: "custom", repoUrl: "https://github.com/acme-org/tf-mongo-replica", version: "v1.0.0", type: "Custom" as const, description: "Self-managed MongoDB replica set on EC2 with EBS snapshots.", usedBy: 1 },
  ]);
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleRepo, setNewModuleRepo] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"all" | "built-in" | "custom">("all");

  // AI Configuration
  const [aiLicenseKey, setAiLicenseKey] = useState("****••••••••••••GRID-LIC-abc123");
  const [aiKeyVisible, setAiKeyVisible] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiKeyStatus, setAiKeyStatus] = useState<"valid" | "invalid" | "checking">("valid");
  const [aiUsage] = useState({ used: 1247, limit: 5000, period: "Feb 2026" });
  const [aiFeatures, setAiFeatures] = useState({
    infrastructure: true,
    releases: true,
    monitoring: true,
    apm: true,
  });


  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [passwordMinLength, setPasswordMinLength] = useState("12");
  const [allowedDomains, setAllowedDomains] = useState("grid.io");

  // Branding
  const [brandingLogoInput, setBrandingLogoInput] = useState(customLogoUrl || "");
  const [brandingOrgName, setBrandingOrgName] = useState(orgName);

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const filteredUsers = mockUsers.filter((u) => {
    const matchesSearch = !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(u.status);
    const matchesMethod = methodFilter.length === 0 || u.loginMethods.some((m) => methodFilter.includes(m));
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const filteredAudit = useMemo(() => {
    return mockAuditLog.filter((entry) => {
      const matchAction = auditActionFilter.length === 0 || auditActionFilter.includes(entry.action);
      const matchUser = !auditUserFilter || entry.user.toLowerCase().includes(auditUserFilter.toLowerCase());
      const matchFrom = !auditDateFrom || entry.isoTimestamp >= auditDateFrom;
      const matchTo = !auditDateTo || entry.isoTimestamp <= auditDateTo;
      return matchAction && matchUser && matchFrom && matchTo;
    });
  }, [auditActionFilter, auditUserFilter, auditDateFrom, auditDateTo]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAudit.length / PAGE_SIZE));
  const safePage = Math.min(auditPage, totalAuditPages);
  const pagedAudit = filteredAudit.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasAuditFilters = auditActionFilter.length > 0 || auditUserFilter || auditDateFrom || auditDateTo;

  // ─── Section Renderers ──────────────────────────────────────────────

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
          <UserPlus className="w-4 h-4" /> Invite Users
        </button>
      </div>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Filter users by name, email, or role" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <FilterGroup label="Status" options={["Active", "Pending", "Disabled"]} selected={statusFilter} onToggle={(v) => toggleFilter(statusFilter, v, setStatusFilter)} onClear={() => setStatusFilter([])} />
          <FilterGroup label="Login Methods" options={["Password", "Google", "SAML"]} selected={methodFilter} onToggle={(v) => toggleFilter(methodFilter, v, setMethodFilter)} onClear={() => setMethodFilter([])} />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_100px] gap-2 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Name</span><span>Email</span><span>Roles</span><span>Login Methods</span><span>Status</span>
        </div>
        {filteredUsers.map((user) => (
          <div key={user.id} className="grid grid-cols-[1fr_1.2fr_1fr_1fr_100px] gap-2 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs text-foreground font-medium flex-shrink-0">{user.name.split(" ").map((n) => n[0]).join("")}</div>
              <span className="text-sm text-foreground truncate">{user.name}</span>
            </div>
            <span className="text-sm text-muted-foreground truncate">{user.email}</span>
            <div className="flex items-center gap-1 flex-wrap">{user.roles.map((role) => (<span key={role} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground">{role}</span>))}</div>
            <div className="flex items-center gap-1 flex-wrap">{user.loginMethods.map((method) => (<span key={method} className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">{method}</span>))}</div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${user.status === "Active" ? "bg-success/10 text-success" : user.status === "Pending" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>{user.status}</span>
          </div>
        ))}
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">Showing 1–{filteredUsers.length} of {mockUsers.length} Users</div>
      </div>
    </div>
  );

  const renderServiceAccounts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Service Accounts</h1>
        <button onClick={() => setShowCreateSA(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Create Service Account
        </button>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1.5fr_120px_100px_80px] gap-2 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Name</span><span>Description</span><span>Created</span><span>Status</span><span></span>
        </div>
        {serviceAccounts.map((sa) => (
          <div key={sa.id} className="grid grid-cols-[1fr_1.5fr_120px_100px_80px] gap-2 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
            <span className="text-sm text-foreground font-mono">{sa.name}</span>
            <span className="text-sm text-muted-foreground">{sa.description}</span>
            <span className="text-xs text-muted-foreground">{sa.created}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${sa.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{sa.status}</span>
            <button onClick={() => setServiceAccounts(prev => prev.map(s => s.id === sa.id ? { ...s, status: s.status === "Active" ? "Revoked" as const : "Active" as const } : s))} className="text-xs text-destructive hover:underline">
              {sa.status === "Active" ? "Revoke" : "Restore"}
            </button>
          </div>
        ))}
        {serviceAccounts.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No service accounts yet. Create one to get started.</div>}
      </div>
      {showCreateSA && <Modal title="Create Service Account" onClose={() => { setShowCreateSA(false); setNewSAName(""); setNewSADesc(""); }}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-foreground mb-1.5">Name</label><input type="text" value={newSAName} onChange={e => setNewSAName(e.target.value)} placeholder="e.g. ci-pipeline" className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" /></div>
          <div><label className="block text-sm font-medium text-foreground mb-1.5">Description</label><input type="text" value={newSADesc} onChange={e => setNewSADesc(e.target.value)} placeholder="What is this account for?" className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" /></div>
          <button onClick={() => { if (newSAName) { setServiceAccounts(prev => [...prev, { id: `sa-${Date.now()}`, name: newSAName, description: newSADesc, created: "2026-02-25", status: "Active" }]); setShowCreateSA(false); setNewSAName(""); setNewSADesc(""); } }} className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">Create</button>
        </div>
      </Modal>}
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Roles</h1>
      <p className="text-sm text-muted-foreground">Roles define what users can do. Built-in roles cannot be deleted.</p>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[140px_1fr_100px_80px] gap-2 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Role</span><span>Description</span><span>Type</span><span>Users</span>
        </div>
        {roles.map((role) => (
          <div key={role.id} className="grid grid-cols-[140px_1fr_100px_80px] gap-2 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
            <span className="text-sm text-foreground font-medium">{role.name}</span>
            <span className="text-sm text-muted-foreground">{role.description}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${role.type === "Built-in" ? "bg-secondary text-foreground" : "bg-primary/10 text-primary"}`}>{role.type}</span>
            <span className="text-sm text-muted-foreground">{role.users}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSaml = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">SAML Group Mappings</h1>
        <button onClick={() => setShowAddMapping(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Mapping
        </button>
      </div>
      <p className="text-sm text-muted-foreground">Map Identity Provider (SAML) groups to Grid roles. Users in the IdP group will be assigned the corresponding Grid role on login.</p>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_80px] gap-2 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>IdP Group</span><span>Grid Role</span><span></span>
        </div>
        {samlMappings.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_1fr_80px] gap-2 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
            <span className="text-sm text-foreground font-mono">{m.idpGroup}</span>
            <span className="text-sm text-foreground">{m.gridRole}</span>
            <button onClick={() => setSamlMappings(prev => prev.filter(x => x.id !== m.id))} className="text-xs text-destructive hover:underline">Remove</button>
          </div>
        ))}
        {samlMappings.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No SAML mappings configured.</div>}
      </div>
      {showAddMapping && <Modal title="Add SAML Group Mapping" onClose={() => { setShowAddMapping(false); setNewIdpGroup(""); }}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-foreground mb-1.5">IdP Group Name</label><input type="text" value={newIdpGroup} onChange={e => setNewIdpGroup(e.target.value)} placeholder="e.g. engineering-admins" className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" /></div>
          <div><label className="block text-sm font-medium text-foreground mb-1.5">Grid Role</label>
            <select value={newGridRole} onChange={e => setNewGridRole(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <button onClick={() => { if (newIdpGroup) { setSamlMappings(prev => [...prev, { id: `sm-${Date.now()}`, idpGroup: newIdpGroup, gridRole: newGridRole }]); setShowAddMapping(false); setNewIdpGroup(""); } }} className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">Add Mapping</button>
        </div>
      </Modal>}
    </div>
  );

  const renderApiKeys = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">API Keys</h1>
        <button onClick={() => setShowCreateApiKey(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Create API Key
        </button>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_120px_120px_100px_80px] gap-2 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Name</span><span>Key Prefix</span><span>Created</span><span>Last Used</span><span>Status</span><span></span>
        </div>
        {apiKeys.map((k) => (
          <div key={k.id} className="grid grid-cols-[1fr_160px_120px_120px_100px_80px] gap-2 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
            <span className="text-sm text-foreground">{k.name}</span>
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">{k.prefix}•••• <button className="text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button></span>
            <span className="text-xs text-muted-foreground">{k.created}</span>
            <span className="text-xs text-muted-foreground">{k.lastUsed}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${k.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{k.status}</span>
            <button onClick={() => setApiKeys(prev => prev.map(x => x.id === k.id ? { ...x, status: x.status === "Active" ? "Revoked" as const : "Active" as const } : x))} className="text-xs text-destructive hover:underline">
              {k.status === "Active" ? "Revoke" : "Restore"}
            </button>
          </div>
        ))}
      </div>
      {showCreateApiKey && <Modal title="Create API Key" onClose={() => { setShowCreateApiKey(false); setNewApiKeyName(""); }}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-foreground mb-1.5">Key Name</label><input type="text" value={newApiKeyName} onChange={e => setNewApiKeyName(e.target.value)} placeholder="e.g. Production Deploy Key" className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" /></div>
          <button onClick={() => { if (newApiKeyName) { setApiKeys(prev => [...prev, { id: `ak-${Date.now()}`, name: newApiKeyName, prefix: `grid_ak_${Date.now().toString(36)}_`, created: "2026-02-25", lastUsed: "Never", status: "Active" }]); setShowCreateApiKey(false); setNewApiKeyName(""); } }} className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">Create API Key</button>
        </div>
      </Modal>}
    </div>
  );

  const renderAppKeys = () => {
    const availableScopes = ["read:metrics", "read:logs", "read:releases", "read:deployments", "write:releases", "write:deployments", "admin:settings"];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Application Keys</h1>
          <button onClick={() => setShowCreateAppKey(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Create Application Key
          </button>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1.5fr_120px_100px_80px] gap-2 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
            <span>Name</span><span>Scopes</span><span>Created</span><span>Status</span><span></span>
          </div>
          {appKeys.map((k) => (
            <div key={k.id} className="grid grid-cols-[1fr_1.5fr_120px_100px_80px] gap-2 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
              <span className="text-sm text-foreground">{k.name}</span>
              <div className="flex items-center gap-1 flex-wrap">{k.scopes.map(s => <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">{s}</span>)}</div>
              <span className="text-xs text-muted-foreground">{k.created}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${k.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{k.status}</span>
              <button onClick={() => setAppKeys(prev => prev.map(x => x.id === k.id ? { ...x, status: x.status === "Active" ? "Revoked" as const : "Active" as const } : x))} className="text-xs text-destructive hover:underline">
                {k.status === "Active" ? "Revoke" : "Restore"}
              </button>
            </div>
          ))}
        </div>
        {showCreateAppKey && <Modal title="Create Application Key" onClose={() => { setShowCreateAppKey(false); setNewAppKeyName(""); setNewAppKeyScopes([]); }}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Key Name</label><input type="text" value={newAppKeyName} onChange={e => setNewAppKeyName(e.target.value)} placeholder="e.g. Slack Integration" className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Scopes</label>
              <div className="space-y-1">{availableScopes.map(scope => (
                <label key={scope} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer">
                  <input type="checkbox" checked={newAppKeyScopes.includes(scope)} onChange={() => setNewAppKeyScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])} className="rounded border-border" />
                  <span className="text-sm text-foreground font-mono">{scope}</span>
                </label>
              ))}</div>
            </div>
            <button onClick={() => { if (newAppKeyName && newAppKeyScopes.length) { setAppKeys(prev => [...prev, { id: `appk-${Date.now()}`, name: newAppKeyName, scopes: newAppKeyScopes, created: "2026-02-25", status: "Active" }]); setShowCreateAppKey(false); setNewAppKeyName(""); setNewAppKeyScopes([]); } }} className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">Create Application Key</button>
          </div>
        </Modal>}
      </div>
    );
  };

  const renderSecurity = () => (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Security Settings</h1>
      <div className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Session Timeout (minutes)</label>
          <input type="number" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <p className="text-xs text-muted-foreground">Users will be logged out after this period of inactivity.</p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Minimum Password Length</label>
          <input type="number" value={passwordMinLength} onChange={e => setPasswordMinLength(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Two-Factor Authentication (2FA / MFA)</p>
            <p className="text-xs text-muted-foreground mt-0.5">Require all users to set up 2FA on their accounts.</p>
          </div>
          <button onClick={() => setMfaEnabled(!mfaEnabled)} className="text-muted-foreground hover:text-foreground">
            {mfaEnabled ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>
        <div className="space-y-2 border-t border-border pt-4">
          <label className="block text-sm font-medium text-foreground">Allowed Email Domains</label>
          <input type="text" value={allowedDomains} onChange={e => setAllowedDomains(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <p className="text-xs text-muted-foreground">Comma-separated list. Only users with these email domains can sign up.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">Save Settings</button>
      </div>
    </div>
  );

  const renderBranding = () => (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Branding</h1>
      <p className="text-sm text-muted-foreground">Customize the appearance for on-premises deployments. Upload your organization's logo to replace the default Grid logo across the header and login page.</p>
      <div className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Organization Name</label>
          <input type="text" value={brandingOrgName} onChange={e => setBrandingOrgName(e.target.value)} placeholder="Grid" className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Custom Logo URL</label>
          <div className="flex gap-2">
            <input type="text" value={brandingLogoInput} onChange={e => setBrandingLogoInput(e.target.value)} placeholder="https://example.com/logo.png" className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Paste a URL to your logo image (PNG, SVG, or JPG). Recommended size: 64×64px.</p>
        </div>
        {(brandingLogoInput || customLogoUrl) && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Preview</label>
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-secondary">
              {brandingLogoInput ? (
                <img src={brandingLogoInput} alt="Logo preview" className="w-10 h-10 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <GridLogo className="w-10 h-10" alt="Grid" />
              )}
              <span className="text-foreground text-lg font-semibold">{brandingOrgName || "Grid"}</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button onClick={() => { setCustomLogoUrl(brandingLogoInput || null); setOrgName(brandingOrgName || "Grid"); }} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
            Save Branding
          </button>
          {customLogoUrl && (
            <button onClick={() => { setCustomLogoUrl(null); setOrgName("Grid"); setBrandingLogoInput(""); setBrandingOrgName("Grid"); }} className="px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              Reset to Default
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderAuditLog = () => (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Audit Log</h1>
      <div className="flex items-center gap-3 flex-wrap">
        <FilterGroup label="Action" options={allAuditActions} selected={auditActionFilter} onToggle={(v) => { toggleFilter(auditActionFilter, v, setAuditActionFilter); setAuditPage(1); }} onClear={() => { setAuditActionFilter([]); setAuditPage(1); }} />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" placeholder="Filter by user…" value={auditUserFilter} onChange={(e) => { setAuditUserFilter(e.target.value); setAuditPage(1); }} className="pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground w-48" />
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <input type="date" value={auditDateFrom} onChange={(e) => { setAuditDateFrom(e.target.value); setAuditPage(1); }} className="px-2 py-1.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <span className="text-xs text-muted-foreground">–</span>
          <input type="date" value={auditDateTo} onChange={(e) => { setAuditDateTo(e.target.value); setAuditPage(1); }} className="px-2 py-1.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        {hasAuditFilters && <button onClick={() => { setAuditActionFilter([]); setAuditUserFilter(""); setAuditDateFrom(""); setAuditDateTo(""); setAuditPage(1); }} className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"><X className="w-3 h-3" /> Clear</button>}
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[180px_160px_180px_1fr] gap-2 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Timestamp</span><span>User</span><span>Action</span><span>Details</span>
        </div>
        {pagedAudit.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No audit entries match your filters.</div>
        ) : pagedAudit.map((entry) => (
          <div key={entry.id} className="grid grid-cols-[180px_160px_180px_1fr] gap-2 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
            <span className="text-xs text-muted-foreground font-mono">{entry.timestamp}</span>
            <span className="text-sm text-foreground">{entry.user}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${actionColorMap[entry.action]}`}>{entry.action}</span>
            <span className="text-xs text-muted-foreground">{entry.details}</span>
          </div>
        ))}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Showing {filteredAudit.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredAudit.length)} of {filteredAudit.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="p-1 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-muted-foreground px-2">Page {safePage} of {totalAuditPages}</span>
            <button onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))} disabled={safePage >= totalAuditPages} className="p-1 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Notification Channels renderer ──────────────────────────────────────

  const renderNotificationChannels = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notification Channels</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure where monitoring alerts are sent. These channels are referenced in alert rules (Monitoring → Alerts).
            Channel configurations are synced to your git repository.
          </p>
        </div>
        <button
          onClick={() => setShowCreateNotifChannel(true)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Channel
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_1.5fr_80px_100px_60px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Name</span><span>Type</span><span>Configuration</span><span>Status</span><span>Created</span><span></span>
        </div>
        {notifChannels.map((ch) => {
          const Icon = notifChannelIcons[ch.type];
          return (
            <div key={ch.id} className="grid grid-cols-[1fr_100px_1.5fr_80px_100px_60px] gap-3 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{ch.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{notifChannelLabels[ch.type]}</span>
              <span className="text-xs text-muted-foreground font-mono truncate" title={ch.config}>{ch.config}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${ch.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{ch.status}</span>
              <span className="text-xs text-muted-foreground">{ch.created}</span>
              <button
                onClick={() => setNotifChannels(prev => prev.filter(c => c.id !== ch.id))}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
        <GitBranch className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">GitOps:</strong> Channel configurations are stored in your git repository under <code className="font-mono text-[10px] bg-secondary px-1 py-0.5 rounded">notifications/channels.yaml</code>. Changes made here will be committed back to your repository.
        </p>
      </div>

      {showCreateNotifChannel && (
        <Modal title="Add Notification Channel" onClose={() => setShowCreateNotifChannel(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Channel name</label>
              <input type="text" placeholder="e.g. prod-slack-alerts" value={newNotifName} onChange={(e) => setNewNotifName(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
              <select value={newNotifType} onChange={(e) => setNewNotifType(e.target.value as NotifChannelType)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {Object.entries(notifChannelLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Configuration</label>
              <textarea placeholder={
                newNotifType === "slack" ? "Slack webhook URL or channel name" :
                newNotifType === "pagerduty" ? "PagerDuty integration key" :
                newNotifType === "email" ? "Email addresses (comma separated)" :
                newNotifType === "webhook" ? "Webhook URL (POST)" :
                "OpsGenie API key and team name"
              } value={newNotifConfig} onChange={(e) => setNewNotifConfig(e.target.value)}
                className="w-full h-20 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none" />
            </div>
            <button
              onClick={() => {
                if (newNotifName && newNotifConfig) {
                  setNotifChannels(prev => [...prev, {
                    id: `nc-${Date.now()}`, name: newNotifName, type: newNotifType,
                    config: newNotifConfig, status: "Active", created: new Date().toISOString().slice(0, 10),
                  }]);
                  setNewNotifName(""); setNewNotifConfig(""); setShowCreateNotifChannel(false);
                }
              }}
              className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Add Channel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );

  // ─── Git Source renderer ────────────────────────────────────────────────────

  const handleTestConnection = () => {
    setGitSyncStatus("syncing");
    setTimeout(() => {
      setGitSyncStatus("connected");
      setGitLastSync(new Date().toISOString().replace("T", " ").slice(0, 19));
      setGitConnected(true);
    }, 2000);
  };

  const renderGitSource = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Git Configuration</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Connect your configuration repository. Grid uses this repo as the single source of truth for all infrastructure configs, alert rules, and notification channels.
          Changes made in the UI are committed back to this repo. Changes pushed to the repo sync into Grid automatically.
        </p>
      </div>

      {/* Connection status */}
      <div className={`flex items-center justify-between p-4 rounded-lg border ${
        gitConnected ? "border-success/30 bg-success/5" : "border-border bg-card"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            gitSyncStatus === "connected" ? "bg-success" : gitSyncStatus === "syncing" ? "bg-primary animate-pulse" : "bg-destructive"
          }`} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {gitConnected ? "Connected" : "Not configured"}
            </p>
            {gitConnected && (
              <p className="text-[10px] text-muted-foreground">Last sync: {gitLastSync} · Interval: every {gitSyncInterval} min</p>
            )}
          </div>
        </div>
        {gitConnected && (
          <button
            onClick={handleTestConnection}
            disabled={gitSyncStatus === "syncing"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${gitSyncStatus === "syncing" ? "animate-spin" : ""}`} />
            {gitSyncStatus === "syncing" ? "Syncing…" : "Sync now"}
          </button>
        )}
      </div>

      {/* Config form */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Git provider</label>
          <div className="flex gap-2">
            {(["github", "gitlab"] as const).map((p) => (
              <button key={p} onClick={() => setGitProvider(p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm border transition-colors ${
                  gitProvider === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}>
                <GitBranch className="w-4 h-4" />
                {p === "github" ? "GitHub" : "GitLab"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Repository URL</label>
          <input type="text" value={gitRepoUrl} onChange={(e) => setGitRepoUrl(e.target.value)}
            placeholder={gitProvider === "github" ? "https://github.com/org/repo" : "https://gitlab.com/org/repo"}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground font-mono" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Branch</label>
            <input type="text" value={gitBranch} onChange={(e) => setGitBranch(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Sync interval (minutes)</label>
            <select value={gitSyncInterval} onChange={(e) => setGitSyncInterval(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="1">1 min</option>
              <option value="2">2 min</option>
              <option value="5">5 min</option>
              <option value="10">10 min</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Access token / Deploy key</label>
          <div className="relative">
            <input type="password" value={gitToken} onChange={(e) => setGitToken(e.target.value)}
              placeholder={gitProvider === "github" ? "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" : "glpat-xxxxxxxxxxxxxxxxxxxx"}
              className="w-full px-3 py-2 pr-10 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground font-mono" />
            <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {gitProvider === "github"
              ? "Personal access token (classic) or fine-grained token with repo read/write scope."
              : "Project access token with api and read_repository scope."}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleTestConnection}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
            {gitConnected ? "Save & reconnect" : "Connect repository"}
          </button>
          <button className="px-4 py-2 border border-border text-sm text-foreground rounded-md hover:bg-secondary transition-colors">
            Test connection
          </button>
        </div>
      </div>

      {/* Repo structure info */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-medium text-foreground">Expected repository structure</p>
        <pre className="text-[10px] text-muted-foreground font-mono leading-relaxed">{`├── infrastructure/
│   ├── gke-platform/
│   │   ├── api-server.json
│   │   ├── worker-processor.json
│   │   └── ...
│   ├── eks-staging/
│   └── vms/
├── alerts/
│   ├── cpu-high.yaml
│   ├── memory-pressure.yaml
│   └── ...
├── notifications/
│   └── channels.yaml
└── grid.config.yaml`}</pre>
      </div>
    </div>
  );

  // ─── Approval Settings renderer ─────────────────────────────────────────────

  const handleToggleEnvApproval = (projectId: string, envId: string) => {
    setProjectApprovals(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        environments: p.environments.map(e =>
          e.id === envId ? {
            ...e,
            requiresApproval: !e.requiresApproval,
            scopes: !e.requiresApproval ? ["infrastructure", "alerts", "notifications", "releases"] as ChangeScope[] : [],
            approverRoles: !e.requiresApproval ? ["Admin", "Maintainer"] : [],
          } : e
        ),
      } : p
    ));
  };

  const handleToggleScope = (projectId: string, envId: string, scope: ChangeScope) => {
    setProjectApprovals(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        environments: p.environments.map(e => {
          if (e.id !== envId) return e;
          const scopes = e.scopes.includes(scope) ? e.scopes.filter(s => s !== scope) : [...e.scopes, scope];
          return { ...e, scopes };
        }),
      } : p
    ));
  };

  const handleToggleApproverRole = (projectId: string, envId: string, role: string) => {
    setProjectApprovals(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        environments: p.environments.map(e => {
          if (e.id !== envId) return e;
          const approverRoles = e.approverRoles.includes(role) ? e.approverRoles.filter(r => r !== role) : [...e.approverRoles, role];
          return { ...e, approverRoles };
        }),
      } : p
    ));
  };

  const renderApprovalSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Approval Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configure per-project, per-environment whether changes require approval before being committed to the git repository.
        </p>
      </div>

      <div className="space-y-4">
        {projectApprovals.map((project) => {
          const approvalCount = project.environments.filter(e => e.requiresApproval).length;
          const isExpanded = expandedProject === project.id;

          return (
            <div key={project.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Project header */}
              <button
                onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-xs font-bold text-foreground uppercase">
                    {project.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{project.name}</span>
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">{project.team}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {approvalCount} of {project.environments.length} environments require approval
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {approvalCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {approvalCount} protected
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Environments */}
              {isExpanded && (
                <div className="border-t border-border">
                  {project.environments.map((env) => (
                    <div key={env.id} className="border-b border-border last:border-b-0">
                      <div className="flex items-center justify-between px-4 py-3 pl-8">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleEnvApproval(project.id, env.id)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${env.requiresApproval ? "bg-primary" : "bg-muted"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${env.requiresApproval ? "translate-x-4" : "translate-x-0"}`} />
                          </button>
                          <div>
                            <span className="text-sm font-medium text-foreground">{env.name}</span>
                            <p className="text-[10px] text-muted-foreground">
                              {env.requiresApproval
                                ? "Approval required — changes are held until approved, then committed to git"
                                : "No approval — changes commit directly to git on save"}
                            </p>
                          </div>
                        </div>
                        {env.requiresApproval && (
                          <button
                            onClick={() => setEditingEnvApproval(editingEnvApproval === env.id ? null : env.id)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            Configure
                          </button>
                        )}
                      </div>

                      {/* Expanded scope config */}
                      {editingEnvApproval === env.id && env.requiresApproval && (
                        <div className="px-4 py-4 pl-8 border-t border-border bg-muted/20 space-y-4">
                          <div>
                            <p className="text-xs font-medium text-foreground mb-2">Require approval for</p>
                            <div className="flex flex-wrap gap-2">
                              {(Object.keys(changeScopeLabels) as ChangeScope[]).map((scope) => (
                                <button
                                  key={scope}
                                  onClick={() => handleToggleScope(project.id, env.id, scope)}
                                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                                    env.scopes.includes(scope)
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                                  }`}
                                >
                                  {env.scopes.includes(scope) && <Check className="w-3 h-3 inline mr-1" />}
                                  {changeScopeLabels[scope]}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground mb-2">Who can approve</p>
                            <div className="flex flex-wrap gap-2">
                              {roles.map((role) => (
                                <button
                                  key={role.id}
                                  onClick={() => handleToggleApproverRole(project.id, env.id, role.name)}
                                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                                    env.approverRoles.includes(role.name)
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                                  }`}
                                >
                                  {env.approverRoles.includes(role.name) && <Check className="w-3 h-3 inline mr-1" />}
                                  {role.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
        <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">How it works:</strong> When approval is enabled for a project environment, any change — infrastructure config edit, alert rule, release, notification channel — is held until an authorized role approves it. Only then is the change committed and pushed to the git repository.</p>
          <p>When approval is disabled, changes commit directly to git on save. Use this for lower-risk environments like Development or Sandbox.</p>
        </div>
      </div>
    </div>
  );

  // ─── Terraform Modules renderer ────────────────────────────────────────────

  const filteredModules = tfModules.filter(m =>
    moduleFilter === "all" ? true : moduleFilter === "built-in" ? m.type === "Built-in" : m.type === "Custom"
  );

  const renderTerraformModules = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Terraform Modules</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage the Terraform modules available for deployments. Use Grid's built-in modules, or bring your own by cloning and customizing them.
          </p>
        </div>
        <button onClick={() => setShowAddModule(true)} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Module
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg w-fit">
        {(["all", "built-in", "custom"] as const).map((f) => (
          <button key={f} onClick={() => setModuleFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
              moduleFilter === f ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}>
            {f === "all" ? `All (${tfModules.length})` : f === "built-in" ? `Built-in (${tfModules.filter(m => m.type === "Built-in").length})` : `Custom (${tfModules.filter(m => m.type === "Custom").length})`}
          </button>
        ))}
      </div>

      {/* Module list */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[2fr_80px_80px_70px_80px] gap-3 px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Module</span><span>Version</span><span>Type</span><span>Used by</span><span></span>
        </div>
        {filteredModules.map((mod) => (
          <div key={mod.id} className="grid grid-cols-[2fr_80px_80px_70px_80px] gap-3 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{mod.name}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 pl-6 truncate">{mod.description}</p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{mod.version}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${mod.type === "Built-in" ? "bg-primary/10 text-primary" : "bg-info/10 text-info"}`}>{mod.type}</span>
            <span className="text-xs text-muted-foreground">{mod.usedBy} deploys</span>
            <div className="flex items-center gap-1">
              <a href={mod.repoUrl} target="_blank" rel="noopener noreferrer"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="View source">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {mod.type === "Built-in" && (
                <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Fork & customize">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              {mod.type === "Custom" && (
                <button onClick={() => setTfModules(prev => prev.filter(m => m.id !== mod.id))}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-2"><Box className="w-3.5 h-3.5 text-primary" /> Grid Built-in Modules</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Grid ships with production-ready Terraform modules for common infrastructure patterns — VMs, Kubernetes clusters, VPCs, databases.
            These follow the Grid CLI format and are used by default when creating deployments.
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Click <Copy className="w-3 h-3 inline text-muted-foreground" /> to <strong className="text-foreground">fork</strong> a built-in module into your own repository, then customize it to fit your standards.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-2"><Download className="w-3.5 h-3.5 text-info" /> Bring Your Own Module</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Register any Terraform module from your own Git repository. Modules must follow the Grid CLI module interface
            (<code className="font-mono text-[10px] bg-secondary px-1 py-0.5 rounded">variables.tf</code> + <code className="font-mono text-[10px] bg-secondary px-1 py-0.5 rounded">outputs.tf</code>)
            so deployments can pass JSON configs to them.
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            You can also <strong className="text-foreground">clone a Grid module</strong> as a starting point, modify it, and register it as a custom module.
          </p>
        </div>
      </div>

      {/* Add module modal */}
      {showAddModule && (
        <Modal title="Register Terraform Module" onClose={() => setShowAddModule(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Module name</label>
              <input type="text" placeholder="e.g. acme/custom-vpc" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Git repository URL</label>
              <input type="text" placeholder="https://github.com/your-org/tf-module" value={newModuleRepo} onChange={(e) => setNewModuleRepo(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
              <textarea placeholder="What this module provisions…" value={newModuleDesc} onChange={(e) => setNewModuleDesc(e.target.value)}
                className="w-full h-20 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none" />
            </div>
            <div className="p-3 rounded-md bg-info/5 border border-info/20">
              <p className="text-[11px] text-info">
                <strong>Module format:</strong> Your module must include <code className="font-mono text-[10px]">variables.tf</code> and <code className="font-mono text-[10px]">outputs.tf</code> following the Grid CLI module interface. Grid will validate the module structure on registration.
              </p>
            </div>
            <button
              onClick={() => {
                if (newModuleName && newModuleRepo) {
                  setTfModules(prev => [...prev, {
                    id: `tm-${Date.now()}`, name: newModuleName, source: "custom", repoUrl: newModuleRepo,
                    version: "v0.1.0", type: "Custom" as const, description: newModuleDesc || "Custom Terraform module",
                    usedBy: 0,
                  }]);
                  setNewModuleName(""); setNewModuleRepo(""); setNewModuleDesc(""); setShowAddModule(false);
                }
              }}
              className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Register Module
            </button>
          </div>
        </Modal>
      )}
    </div>
  );

  // ─── AI Configuration renderer ──────────────────────────────────────────────

  const handleValidateKey = () => {
    setAiKeyStatus("checking");
    setTimeout(() => setAiKeyStatus("valid"), 1500);
  };

  const renderAiConfig = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI Configuration</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configure your Grid AI license key to enable AI-powered diagnostics across Infrastructure, Releases, Monitoring, and APM.
          Contact your Grid account representative to obtain a license key.
        </p>
      </div>

      {/* License status */}
      <div className={`flex items-center justify-between p-4 rounded-lg border ${
        aiEnabled && aiKeyStatus === "valid" ? "border-success/30 bg-success/5" :
        aiKeyStatus === "invalid" ? "border-destructive/30 bg-destructive/5" :
        "border-border bg-card"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            aiEnabled && aiKeyStatus === "valid" ? "bg-success" :
            aiKeyStatus === "checking" ? "bg-primary animate-pulse" :
            aiKeyStatus === "invalid" ? "bg-destructive" :
            "bg-muted-foreground"
          }`} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {!aiEnabled ? "AI Disabled" :
               aiKeyStatus === "valid" ? "AI Active" :
               aiKeyStatus === "checking" ? "Validating…" : "Invalid License"}
            </p>
            {aiEnabled && aiKeyStatus === "valid" && (
              <p className="text-[10px] text-muted-foreground">{aiUsage.used.toLocaleString()} / {aiUsage.limit.toLocaleString()} analyses used · {aiUsage.period}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setAiEnabled(!aiEnabled)}
          className={`relative w-9 h-5 rounded-full transition-colors ${aiEnabled ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${aiEnabled ? "translate-x-4" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Usage bar */}
      {aiEnabled && aiKeyStatus === "valid" && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Monthly Usage</span>
            <span className="text-[10px] text-muted-foreground">{((aiUsage.used / aiUsage.limit) * 100).toFixed(0)}% used</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                aiUsage.used / aiUsage.limit > 0.9 ? "bg-destructive" :
                aiUsage.used / aiUsage.limit > 0.7 ? "bg-warning" : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, (aiUsage.used / aiUsage.limit) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {(aiUsage.limit - aiUsage.used).toLocaleString()} AI analyses remaining this billing period.
            Contact your Grid representative to increase limits.
          </p>
        </div>
      )}

      {/* License key input */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">License Key</label>
          <div className="relative">
            <input
              type={aiKeyVisible ? "text" : "password"}
              value={aiLicenseKey}
              onChange={(e) => { setAiLicenseKey(e.target.value); setAiKeyStatus("invalid"); }}
              placeholder="GRID-LIC-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 pr-20 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground font-mono"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button onClick={() => setAiKeyVisible(!aiKeyVisible)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                {aiKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(aiLicenseKey); }} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Your Grid AI license key is provided when you purchase the AI add-on. This key unlocks AI diagnostics across all Grid features.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleValidateKey}
            disabled={aiKeyStatus === "checking"}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {aiKeyStatus === "checking" ? "Validating…" : "Save & Validate"}
          </button>
          {aiKeyStatus === "valid" && (
            <span className="flex items-center gap-1 text-xs text-success"><Check className="w-3.5 h-3.5" /> License valid</span>
          )}
          {aiKeyStatus === "invalid" && aiLicenseKey.length > 10 && (
            <span className="flex items-center gap-1 text-xs text-destructive">Unsaved changes</span>
          )}
        </div>
      </div>

      {/* Feature toggles */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">AI Features</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Enable or disable AI diagnostics per area.</p>
        </div>
        {([
          { key: "infrastructure" as const, label: "Infrastructure Diagnostics", desc: "AI root-cause analysis on resource configs and health" },
          { key: "releases" as const, label: "Release Analysis", desc: "AI log analysis on failed or rejected releases" },
          { key: "monitoring" as const, label: "Monitoring Diagnostics", desc: "AI performance analysis and anomaly detection" },
          { key: "apm" as const, label: "APM Trace Analysis", desc: "AI-powered distributed trace diagnosis and latency insights" },
        ]).map((feat) => (
          <div key={feat.key} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
            <div>
              <p className="text-sm text-foreground">{feat.label}</p>
              <p className="text-[10px] text-muted-foreground">{feat.desc}</p>
            </div>
            <button
              onClick={() => setAiFeatures(prev => ({ ...prev, [feat.key]: !prev[feat.key] }))}
              disabled={!aiEnabled}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                aiEnabled && aiFeatures[feat.key] ? "bg-primary" : "bg-muted"
              } ${!aiEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${
                aiEnabled && aiFeatures[feat.key] ? "translate-x-4" : "translate-x-0"
              }`} />
            </button>
          </div>
        ))}
      </div>

      {/* Usage History */}
      {aiEnabled && aiKeyStatus === "valid" && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Recent AI Analyses</h3>
            <span className="text-[10px] text-muted-foreground">Last 30 days</span>
          </div>
          <div className="grid grid-cols-[1.5fr_1fr_80px_80px_60px_100px] gap-2 px-4 py-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
            <span>Resource</span><span>Area</span><span>Result</span><span>Tokens</span><span>By</span><span>Time</span>
          </div>
          <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
            {[
              { id: "ah-1", resource: "api-gateway-prod", area: "APM", result: "3 issues", tokens: 1840, by: "alice", time: "12m ago", status: "issues" as const },
              { id: "ah-2", resource: "worker-node-01", area: "Monitoring", result: "Healthy", tokens: 920, by: "bob", time: "28m ago", status: "ok" as const },
              { id: "ah-3", resource: "rel-001 api-gateway v2.4.1", area: "Releases", result: "2 warnings", tokens: 1560, by: "alice", time: "1h ago", status: "issues" as const },
              { id: "ah-4", resource: "elasticsearch-prod", area: "Infrastructure", result: "1 critical", tokens: 2100, by: "admin", time: "2h ago", status: "critical" as const },
              { id: "ah-5", resource: "auth-service", area: "APM", result: "Timeout root cause", tokens: 2450, by: "david", time: "3h ago", status: "critical" as const },
              { id: "ah-6", resource: "gke-platform", area: "Monitoring", result: "Healthy", tokens: 780, by: "alice", time: "4h ago", status: "ok" as const },
              { id: "ah-7", resource: "staging-vpc", area: "Infrastructure", result: "Healthy", tokens: 650, by: "bob", time: "5h ago", status: "ok" as const },
              { id: "ah-8", resource: "rel-006 eks-staging", area: "Releases", result: "Quota exceeded", tokens: 1980, by: "alice", time: "6h ago", status: "critical" as const },
              { id: "ah-9", resource: "redis-cache", area: "Monitoring", result: "1 warning", tokens: 1120, by: "bob", time: "8h ago", status: "issues" as const },
              { id: "ah-10", resource: "postgres-primary", area: "Infrastructure", result: "Healthy", tokens: 890, by: "admin", time: "1d ago", status: "ok" as const },
              { id: "ah-11", resource: "worker-processor", area: "APM", result: "OOM detected", tokens: 2680, by: "david", time: "1d ago", status: "critical" as const },
              { id: "ah-12", resource: "mongo-replica-set", area: "Infrastructure", result: "Healthy", tokens: 740, by: "admin", time: "2d ago", status: "ok" as const },
            ].map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1.5fr_1fr_80px_80px_60px_100px] gap-2 px-4 py-2.5 items-center hover:bg-secondary/30 transition-colors">
                <span className="text-sm text-foreground font-medium truncate">{entry.resource}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${
                  entry.area === "Infrastructure" ? "bg-info/10 text-info" :
                  entry.area === "Monitoring" ? "bg-primary/10 text-primary" :
                  entry.area === "APM" ? "bg-purple-500/10 text-purple-400" :
                  "bg-warning/10 text-warning"
                }`}>{entry.area}</span>
                <span className={`text-xs truncate ${
                  entry.status === "ok" ? "text-success" :
                  entry.status === "issues" ? "text-warning" :
                  "text-destructive"
                }`}>{entry.result}</span>
                <span className="text-xs text-muted-foreground font-mono">{entry.tokens.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground truncate">{entry.by}</span>
                <span className="text-xs text-muted-foreground text-right">{entry.time}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-border flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Total: {[1840, 920, 1560, 2100, 2450, 780, 650, 1980, 1120, 890, 2680, 740].reduce((a, b) => a + b, 0).toLocaleString()} tokens across 12 analyses
            </span>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
        <Brain className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">How Grid AI works:</strong> Grid AI uses a pluggable LLM backend to analyze logs, metrics, traces, and configurations. When a resource is failing or degraded, the "Diagnose with AI" button triggers a root-cause analysis with suggested remediations.</p>
          <p>Your license key authenticates against Grid's AI service. Usage is metered per analysis. The AI never makes changes automatically — all suggestions require manual approval before being applied.</p>
        </div>
      </div>
    </div>
  );

  // ─── Usage renderer ─────────────────────────────────────────────────────────

  const usageDailyData = [
    { date: "Feb 01", tokens: 42300, cost: 1.27, analyses: 8 },
    { date: "Feb 02", tokens: 38100, cost: 1.14, analyses: 6 },
    { date: "Feb 03", tokens: 55200, cost: 1.66, analyses: 11 },
    { date: "Feb 04", tokens: 29800, cost: 0.89, analyses: 5 },
    { date: "Feb 05", tokens: 61400, cost: 1.84, analyses: 13 },
    { date: "Feb 06", tokens: 33700, cost: 1.01, analyses: 7 },
    { date: "Feb 07", tokens: 48900, cost: 1.47, analyses: 9 },
    { date: "Feb 08", tokens: 52100, cost: 1.56, analyses: 10 },
    { date: "Feb 09", tokens: 67800, cost: 2.03, analyses: 14 },
    { date: "Feb 10", tokens: 44600, cost: 1.34, analyses: 8 },
    { date: "Feb 11", tokens: 39200, cost: 1.18, analyses: 7 },
    { date: "Feb 12", tokens: 71300, cost: 2.14, analyses: 15 },
    { date: "Feb 13", tokens: 58400, cost: 1.75, analyses: 12 },
    { date: "Feb 14", tokens: 46800, cost: 1.40, analyses: 9 },
    { date: "Feb 15", tokens: 35100, cost: 1.05, analyses: 6 },
    { date: "Feb 16", tokens: 62700, cost: 1.88, analyses: 13 },
    { date: "Feb 17", tokens: 41500, cost: 1.25, analyses: 8 },
    { date: "Feb 18", tokens: 53800, cost: 1.61, analyses: 11 },
    { date: "Feb 19", tokens: 47200, cost: 1.42, analyses: 9 },
    { date: "Feb 20", tokens: 69100, cost: 2.07, analyses: 14 },
    { date: "Feb 21", tokens: 38900, cost: 1.17, analyses: 7 },
    { date: "Feb 22", tokens: 55600, cost: 1.67, analyses: 11 },
    { date: "Feb 23", tokens: 43200, cost: 1.30, analyses: 8 },
    { date: "Feb 24", tokens: 61800, cost: 1.85, analyses: 12 },
    { date: "Feb 25", tokens: 72400, cost: 2.17, analyses: 15 },
    { date: "Feb 26", tokens: 18700, cost: 0.56, analyses: 4 },
  ];

  const totalTokens = usageDailyData.reduce((s, d) => s + d.tokens, 0);
  const totalCost = usageDailyData.reduce((s, d) => s + d.cost, 0);
  const totalAnalyses = usageDailyData.reduce((s, d) => s + d.analyses, 0);
  const maxDayTokens = Math.max(...usageDailyData.map(d => d.tokens));
  const cumulativeData = usageDailyData.reduce<{ date: string; cumulative: number }[]>((acc, d) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
    acc.push({ date: d.date, cumulative: prev + d.cost });
    return acc;
  }, []);
  const maxCumulative = cumulativeData[cumulativeData.length - 1]?.cumulative || 1;

  const [usagePeriod, setUsagePeriod] = useState("feb-2026");
  const [usageView, setUsageView] = useState<"daily" | "cumulative">("cumulative");

  const renderUsage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Usage</h1>
          <p className="text-xs text-muted-foreground mt-1">AI analysis token consumption and cost breakdown.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={usageView} onChange={(e) => setUsageView(e.target.value as "daily" | "cumulative")}
            className="px-3 py-1.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="cumulative">Cumulative Cost</option>
            <option value="daily">Daily Tokens</option>
          </select>
          <select value={usagePeriod} onChange={(e) => setUsagePeriod(e.target.value)}
            className="px-3 py-1.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="feb-2026">February 2026</option>
            <option value="jan-2026">January 2026</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {usageView === "cumulative" ? "Cumulative Cost" : "Daily Token Usage"}
            </p>
            <p className="text-[10px] text-muted-foreground">Feb 1, 2026 – Feb 26, 2026</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">
              {usageView === "cumulative" ? `$${totalCost.toFixed(2)}` : `${(totalTokens / 1000).toFixed(1)}K tokens`}
            </p>
            <p className="text-[10px] text-muted-foreground">{totalAnalyses} analyses</p>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative h-40 mt-2">
          <svg viewBox="0 0 520 160" className="w-full h-full" preserveAspectRatio="none">
            {usageView === "cumulative" ? (
              <>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d={`M0,160 ${cumulativeData.map((d, i) => `L${(i / (cumulativeData.length - 1)) * 520},${160 - (d.cumulative / maxCumulative) * 150}`).join(" ")} L520,160 Z`}
                  fill="url(#cumGrad)"
                />
                <path
                  d={cumulativeData.map((d, i) => `${i === 0 ? "M" : "L"}${(i / (cumulativeData.length - 1)) * 520},${160 - (d.cumulative / maxCumulative) * 150}`).join(" ")}
                  fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
                />
              </>
            ) : (
              usageDailyData.map((d, i) => (
                <rect
                  key={i}
                  x={(i / usageDailyData.length) * 520 + 2}
                  y={160 - (d.tokens / maxDayTokens) * 150}
                  width={520 / usageDailyData.length - 4}
                  height={(d.tokens / maxDayTokens) * 150}
                  rx="2"
                  fill="hsl(var(--primary))"
                  opacity={0.6 + (d.tokens / maxDayTokens) * 0.4}
                />
              ))
            )}
          </svg>
          {/* X-axis labels */}
          <div className="flex justify-between mt-1 px-1">
            {["Feb 01", "Feb 07", "Feb 13", "Feb 19", "Feb 26"].map((l) => (
              <span key={l} className="text-[9px] text-muted-foreground">{l}</span>
            ))}
          </div>
        </div>

        {/* Tooltip-style hover info */}
        <div className="flex items-center gap-2 mt-3">
          <span className="w-3 h-0.5 bg-primary rounded" />
          <span className="text-[10px] text-muted-foreground">
            {usageView === "cumulative" ? "Cumulative cost (USD)" : "Daily tokens"}
          </span>
        </div>
      </div>

      {/* Daily breakdown table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Daily Breakdown</h3>
          <span className="text-[10px] text-muted-foreground">{usageDailyData.length} days</span>
        </div>
        <div className="grid grid-cols-[1fr_100px_80px_80px_80px] gap-2 px-4 py-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Date</span><span className="text-right">Tokens</span><span className="text-right">Cost</span><span className="text-right">Analyses</span><span className="text-right">Avg/Analysis</span>
        </div>
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {[...usageDailyData].reverse().map((d) => (
            <div key={d.date} className="grid grid-cols-[1fr_100px_80px_80px_80px] gap-2 px-4 py-2 items-center hover:bg-secondary/30 transition-colors">
              <span className="text-sm text-foreground">{d.date}, 2026</span>
              <span className="text-xs text-muted-foreground text-right font-mono">{d.tokens.toLocaleString()}</span>
              <span className="text-xs text-foreground text-right font-mono">${d.cost.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground text-right">{d.analyses}</span>
              <span className="text-xs text-muted-foreground text-right font-mono">{Math.round(d.tokens / d.analyses).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_100px_80px_80px_80px] gap-2 px-4 py-2.5 border-t border-border bg-muted/30">
          <span className="text-xs font-medium text-foreground">Total</span>
          <span className="text-xs font-medium text-foreground text-right font-mono">{totalTokens.toLocaleString()}</span>
          <span className="text-xs font-medium text-foreground text-right font-mono">${totalCost.toFixed(2)}</span>
          <span className="text-xs font-medium text-foreground text-right">{totalAnalyses}</span>
          <span className="text-xs text-muted-foreground text-right font-mono">{Math.round(totalTokens / totalAnalyses).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  // ─── Billing & Invoices renderer ───────────────────────────────────────────

  const [billingCycle, setBillingCycle] = useState("feb-2026");

  const renderBilling = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Billing & Invoices</h1>
        <button className="px-3 py-1.5 text-xs border border-border text-foreground rounded-md hover:bg-secondary transition-colors">
          Manage subscription
        </button>
      </div>

      {/* Upsell banner */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary">Switch to annual billing and save 20%</span>
        </div>
        <button className="px-3 py-1.5 text-xs border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors">
          Upgrade Now
        </button>
      </div>

      {/* Included Usage */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Included Usage</h3>
          <p className="text-[10px] text-muted-foreground">Feb 1, 2026 – Mar 1, 2026</p>
        </div>
        <div className="grid grid-cols-[2fr_1fr_80px] gap-2 px-4 py-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Item</span><span className="text-right">Tokens</span><span className="text-right">Usage</span>
        </div>
        {[
          { item: "AI Diagnostics", tokens: "1.29M tokens", usage: 24.9, sub: null },
          { item: "Infrastructure Analysis", tokens: "480K tokens", usage: 9.6, sub: "infrastructure" },
          { item: "Release Analysis", tokens: "310K tokens", usage: 6.2, sub: "releases" },
          { item: "Monitoring Diagnostics", tokens: "290K tokens", usage: 5.8, sub: "monitoring" },
          { item: "APM Trace Analysis", tokens: "210K tokens", usage: 4.2, sub: "apm" },
        ].map((row) => (
          <div key={row.item} className={`grid grid-cols-[2fr_1fr_80px] gap-2 px-4 py-2.5 items-center border-b border-border last:border-b-0 ${row.sub ? "pl-8" : ""}`}>
            <span className={`text-sm ${row.sub ? "text-muted-foreground" : "text-foreground font-medium"}`}>{row.item}</span>
            <span className="text-xs text-muted-foreground text-right font-mono">{row.tokens}</span>
            <span className="text-xs text-foreground text-right">{row.usage}%</span>
          </div>
        ))}
        {/* Usage bar */}
        <div className="px-4 py-3 bg-muted/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Plan limit: 5M tokens</span>
            <span className="text-[10px] text-foreground font-medium">24.9% used</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: "24.9%" }} />
          </div>
        </div>
      </div>

      {/* On-Demand Usage */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">On-Demand Usage</h3>
            <p className="text-[10px] text-muted-foreground">Feb 1, 2026 – Mar 1, 2026</p>
          </div>
          <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}
            className="px-3 py-1.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="feb-2026">Cycle Starting Feb 1, 2026</option>
            <option value="jan-2026">Cycle Starting Jan 1, 2026</option>
          </select>
        </div>
        <div className="px-4 py-3">
          <p className="text-2xl font-semibold text-foreground">$0.00</p>
        </div>
        <div className="grid grid-cols-[2fr_1fr_80px_60px_80px] gap-2 px-4 py-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-y border-border">
          <span>Type</span><span className="text-right">Tokens</span><span className="text-right">Cost</span><span className="text-right">Qty</span><span className="text-right">Total</span>
        </div>
        <div className="px-4 py-3 text-xs text-muted-foreground text-center">
          No on-demand usage this billing cycle.
        </div>
        <div className="grid grid-cols-[2fr_1fr_80px_60px_80px] gap-2 px-4 py-2.5 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">Subtotal:</span>
          <span /><span /><span />
          <span className="text-xs font-medium text-foreground text-right">$0.00</span>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Invoices</h3>
          <select className="px-3 py-1.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option>February 2026</option>
            <option>January 2026</option>
            <option>December 2025</option>
          </select>
        </div>
        <div className="grid grid-cols-[100px_2fr_80px_100px_60px] gap-2 px-4 py-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-b border-border">
          <span>Date</span><span>Description</span><span>Status</span><span className="text-right">Amount</span><span></span>
        </div>
        {[
          { date: "Feb 11, 2026", desc: "Grid AI usage for cycle starting Jan 1, 2026", status: "Paid", amount: "$38.42" },
          { date: "Feb 01, 2026", desc: "Grid Platform — Pro Plan (monthly)", status: "Paid", amount: "$299.00" },
          { date: "Jan 11, 2026", desc: "Grid AI usage for cycle starting Dec 1, 2025", status: "Paid", amount: "$41.17" },
          { date: "Jan 01, 2026", desc: "Grid Platform — Pro Plan (monthly)", status: "Paid", amount: "$299.00" },
        ].map((inv, i) => (
          <div key={i} className="grid grid-cols-[100px_2fr_80px_100px_60px] gap-2 px-4 py-2.5 items-center border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
            <span className="text-xs text-foreground">{inv.date}</span>
            <span className="text-xs text-muted-foreground truncate">{inv.desc}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success w-fit">{inv.status}</span>
            <span className="text-xs text-foreground text-right font-mono">{inv.amount}</span>
            <button className="flex items-center gap-1 text-[10px] text-primary hover:underline justify-end">
              <ExternalLink className="w-3 h-3" /> View
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const sectionMap: Record<string, () => JSX.Element> = {
    "users": renderUsers,
    "service-accounts": renderServiceAccounts,
    "roles": renderRoles,
    "saml": renderSaml,
    "api-keys": renderApiKeys,
    "app-keys": renderAppKeys,
    "git-source": renderGitSource,
    "approval-settings": renderApprovalSettings,
    "terraform-modules": renderTerraformModules,
    "ai-config": renderAiConfig,
    "usage": renderUsage,
    "billing": renderBilling,
    "notification-channels": renderNotificationChannels,
    "audit-log": renderAuditLog,
    "security": renderSecurity,
    "branding": renderBranding,
  };

  return (
    <AppShell activeTab="admin">
      <div className="flex min-h-[calc(100vh-7rem)]">
        <aside className="w-56 border-r border-border p-4 flex-shrink-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">Organization Settings</p>
          {sidebarSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 px-2">{section.title}</p>
              {section.items.map((item) => (
                <button key={item.id} onClick={() => { setActiveSection(item.id); setAuditPage(1); }} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeSection === item.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                  <item.icon className="w-4 h-4" /> {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <div className="flex-1 p-6">
          {sectionMap[activeSection]?.() ?? null}
        </div>
      </div>

      {showInviteModal && (
        <Modal title="Invite Users" onClose={() => setShowInviteModal(false)}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Email addresses</label><textarea placeholder="Enter email addresses, separated by commas" className="w-full h-24 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1.5">Role</label><select className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"><option>Viewer</option><option>Developer</option><option>Admin</option></select></div>
            <button onClick={() => setShowInviteModal(false)} className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">Send Invitations</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};

// ─── Reusable Modal ──────────────────────────────────────────────────────────

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <>
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onClose} />
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-lg shadow-2xl animate-fade-in">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </>
);

// ─── FilterGroup ─────────────────────────────────────────────────────────────

const FilterGroup = ({ label, options, selected, onToggle, onClear }: { label: string; options: string[]; selected: string[]; onToggle: (val: string) => void; onClear: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${selected.length > 0 ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground"}`}>
        {label}
        {selected.length > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5">{selected.length}</span>}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-40 w-56 bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-fade-in">
            <div className="p-1 max-h-64 overflow-y-auto">
              {options.map((opt) => (
                <button key={opt} onClick={() => onToggle(opt)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-secondary transition-colors">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${selected.includes(opt) ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>{selected.includes(opt) && "✓"}</div>
                  <span className="text-foreground">{opt}</span>
                </button>
              ))}
            </div>
            {selected.length > 0 && (
              <div className="p-1 border-t border-border">
                <button onClick={() => { onClear(); setOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors">
                  <X className="w-3.5 h-3.5" /> Clear filter
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPage;
