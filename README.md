# Grid Console — Frontend

A thin-client infrastructure management console for Grid, built with React + TypeScript. Every UI action maps to a Grid backend API/CLI operation. The frontend renders state; the backend owns it.

**Product:** Grid - Self-hosted Infrastructure Management Tool  
**Documentation:** [doc.greatplatform.org](https://doc.greatplatform.org)

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Grid Integration](#grid-integration)
- [Tech Stack](#tech-stack)
- [Pages & Features](#pages--features)
- [Topology Map — VPC-Centric Visualization](#topology-map--vpc-centric-visualization)
- [Observability Architecture](#observability-architecture)
- [APM — Service-Centric Monitoring](#apm--service-centric-monitoring)
- [Backend API Contract](#backend-api-contract)
- [Data Models](#data-models)
- [Stress Testing](#stress-testing)
- [Development](#development)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Grid Console (this repo)            │
│  React + TypeScript + Tailwind + React Flow          │
│  Pure presentation — NO business logic               │
│  All state comes from Grid backend APIs              │
└──────────────────────┬──────────────────────────────┘
                       │ REST API (v1)
┌──────────────────────▼──────────────────────────────┐
│                  Grid Backend (API)                   │
│  • Infrastructure CRUD & discovery                   │
│  • Deployment orchestration (CLI-invokable)          │
│  • Health aggregation & status propagation           │
│  • Topology graph building (VPCs, resources)         │
│  • GitOps integration (webhook triggers)             │
│  • Monitoring (Prometheus/Alloy integration)         │
│  • AI recommendations (V2: cost, scaling, security)  │
│  • Auth & RBAC                                       │
└──────────────────────┬──────────────────────────────┘
                       │ Orchestrates
┌──────────────────────▼──────────────────────────────┐
│                  Infrastructure Tools                 │
│  • OpenTofu / Terraform → provisions cloud resources │
│  • Ansible → configures VMs and services             │
│  • Kubernetes → deploys containers and workloads     │
│  • Prometheus/Alloy → collects metrics               │
└─────────────────────────────────────────────────────┘
```

**Key principle:** The UI is a mirror. The "Deployments" tab initiates operations (create cluster, release, etc.), while "Infrastructure" and "Topology" tabs monitor the resulting resources. Every button click maps to a Grid API call.

---

## Grid Integration

### What Grid Console Does

| Console Action | Grid Backend API | Grid CLI Equivalent |
|----------------|------------------|---------------------|
| Create VM | `POST /api/v1/infrastructures` | `grid vms --create` |
| Deploy Cluster | `POST /api/v1/clusters` | `grid clusters --create` |
| Scale Cluster | `POST /api/v1/clusters/:id/scale` | `grid clusters --scale` |
| Approve Release | `POST /api/v1/approvals/:id/approve` | `grid releases --approve` |
| View Topology | `GET /api/v1/topology/providers` | `grid topology --list` |
| Check Drift | `POST /api/v1/infrastructures/:id/drift-check` | `grid drift --check` |
| Setup Monitoring | `POST /api/v1/monitoring/setup/:infra` | `grid monitoring --setup` |

### Grid-Generated Files (Always Available in Git)

The Grid backend generates standard IaC files that work independently:

```
infrastructure/
├── terraform/
│   ├── main.tf              # Standard Terraform - works without Grid
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
├── ansible/
│   ├── playbooks/           # Standard Ansible playbooks
│   ├── roles/
│   └── inventory/
├── kubernetes/
│   ├── manifests/           # Standard Kubernetes YAML
│   ├── helm-charts/
│   └── operators/
└── scripts/
    ├── deploy.sh
    ├── backup.sh
    └── monitoring.sh
```

**Zero Lock-in:** Remove Grid → Continue using standard tools directly (`terraform apply`, `ansible-playbook`, `kubectl apply`).

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | React 18 + TypeScript | Industry standard, strong typing |
| Routing | react-router-dom v6 | Declarative routing with nested layouts |
| Styling | Tailwind CSS + shadcn/ui | Utility-first with accessible components |
| Topology | @xyflow/react (React Flow) v12 | High-performance node/edge rendering for 3,000+ resources |
| Graph layout | @dagrejs/dagre | Hierarchical layouts for VPC/provider views |
| Charts | Recharts | React-native charting for metrics |
| State | React Query (@tanstack/react-query) | Server-state caching with polling |
| Build | Vite | Fast HMR, optimized production builds |

---

## Pages & Features

| Route | Page | Purpose | Grid API |
|-------|------|---------|----------|
| `/` | Login | Authentication | `POST /api/v1/auth/login` |
| `/dashboard` | Dashboard | Overview metrics | `GET /api/v1/monitoring/dashboards` |
| `/deployments` | Deployments | Initiate & track deploys | `GET/POST /api/v1/deployments` |
| `/releases` | Releases | Release management & approvals | `GET /api/v1/releases`, `POST /api/v1/approvals/:id/approve` |
| `/infrastructure` | Infrastructure | 3,000 resource list | `GET /api/v1/infrastructures`, `GET /api/v1/inventory/vms` |
| `/infrastructure/:id` | Resource Detail | Config, AI diagnosis | `GET /api/v1/infrastructures/:id` |
| `/topology` | Topology Map | VPCs, connections, resource flow | `GET /api/v1/topology/providers` |
| `/monitoring` | Monitoring | Infra metrics | `GET /api/v1/monitoring/metrics/:infra` |
| `/monitoring/:id` | Monitoring Detail | Per-resource drill-down | `GET /api/v1/monitoring/health/:infra` |
| `/alerts` | Alerts | 200 alerts, 40 rules | `GET /api/v1/monitoring/alerts` |
| `/apm` | APM | Services, operations, traces | `GET /api/v1/apm/services` |
| `/logging` | Logging | Centralized log search | `GET /api/v1/logs` |
| `/admin` | Admin | Platform settings | `GET/PUT /api/v1/settings` |

---

## Topology Map — VPC-Centric Visualization

### Scale

The topology renders **3,000+ resources** across **30 VPCs** in **3 providers** (AWS, GCP, Azure):

```
Level 1: 3 Providers      →  AWS (12 VPCs), GCP (10 VPCs), Azure (8 VPCs)
Level 2: 30 VPCs           →  Collapsible circular bubbles with cross-VPC edges
Level 3: ~100 resources/VPC →  Concentric ring layout inside expanded VPC
```

### Interaction Model

| Action | Result |
|--------|--------|
| Click collapsed VPC | Expand to show internal resources in concentric rings |
| Hover resource | Highlight connected resources + show cross-VPC connection arrows |
| Toggle entity filter | Show/hide resource layers (WAF, Network, LB, App, Data) |
| Toggle provider filter | Show/hide entire cloud provider's VPCs |

### Concentric Ring Layers

| Ring | Layer | Radius | Resource Types |
|------|-------|--------|----------------|
| 1 | WAF / Security | 80px | WAF, Cloud Armor, Shield |
| 2 | Network | 160px | DNS, NAT GW, IGW, Transit GW, VPN GW |
| 3 | Load Balancers | 240px | ALB, NLB, GCLB, API Gateway |
| 4 | Application | 320px | EKS/GKE, K8s deployments, ML, GPU pools |
| 5 | Data | 400px | RDS, S3, DynamoDB, ElastiCache, Redis |

### Connection Visualization

- **Cross-VPC edges:** Shown as bright green animated arrows when hovering a resource
- **Intra-VPC edges:** Visible inside expanded VPC as connecting lines between resource nodes
- **Dimming:** Non-connected VPCs dim to 30% opacity when hovering a resource

### Data Model (Backend MUST provide)

```typescript
interface TopologyProvider {
  id: string;
  name: string;                          // "Amazon Web Services"
  type: "AWS" | "GCP" | "Azure" | "On-Prem";
  vpcs: TopologyVpc[];
  totalResources: number;
  healthCounts: { healthy: number; warning: number; critical: number };
}

interface TopologyVpc {
  id: string;
  name: string;                          // "Prod US-East"
  region: string;                        // "us-east-1"
  cidr: string;                          // "10.0.0.0/16"
  providerId: string;
  resources: TopologyResource[];
  vpcConnections: VpcConnection[];       // Cross-VPC peering/VPN/transit
  totalResources: number;
  healthCounts: { healthy: number; warning: number; critical: number };
  status: "healthy" | "warning" | "critical" | "unknown";
}

interface TopologyResource {
  id: string;
  name: string;                          // "api-gateway-prod"
  type: string;                          // "alb", "eks-cluster", "rds", etc.
  layer: "waf" | "network" | "loadbalancer" | "application" | "data";
  status: "healthy" | "warning" | "critical" | "unknown";
  connections: string[];                 // IDs of connected resources (within or across VPCs)
  meta?: Record<string, string>;         // Additional metadata
}

interface VpcConnection {
  targetVpcId: string;
  type: "peering" | "vpn" | "transit-gateway" | "internet";
  label?: string;                        // "VPC Peering", "Site-to-Site VPN"
}
```

### Backend API for Topology

```
GET /api/v1/topology/providers              → TopologyProvider[] (summary, no resources)
GET /api/v1/topology/providers/:id/vpcs     → TopologyVpc[] (with connections, no resources)
GET /api/v1/topology/vpcs/:id/resources     → TopologyResource[]
GET /api/v1/topology/vpcs/:id/connections   → VpcConnection[]
```

---

## Observability Architecture

Four dedicated tabs, each backed by a specialized pipeline:

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Monitoring  │   │   Alerts    │   │     APM     │   │   Logging   │
│ /monitoring  │   │ /alerts     │   │ /apm        │   │ /logging    │
│ Infra metrics│   │ 200 alerts  │   │ 10 services │   │ Centralized │
│ CPU/mem/disk │   │ 40 rules    │   │ 45 operations│  │ log search  │
└──────┬───────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
   Prometheus/       Alertmanager/      Jaeger/Tempo/       Grafana Loki
   Grafana Alloy     Grid Alert Engine  OpenTelemetry       + Alloy
```

### Monitoring (`/monitoring`)

**Grid API:** 
- `GET /api/v1/monitoring/metrics/:infra` → TimeSeriesData
- `GET /api/v1/monitoring/health/:infra` → HealthStatus
- `POST /api/v1/monitoring/setup/:infra` → Setup monitoring for infrastructure

### Alerts (`/alerts`)

**Grid API:**
- `GET /api/v1/monitoring/alerts` → Alert[]
- `POST /api/v1/monitoring/alerts` → Create alert rule
- `POST /api/v1/logs/alerts` → Create log-based alert

### Logging (`/logging`)

**Grid API:**
- `GET /api/v1/logs?query=&labels=` → LogEntry[]
- `GET /api/v1/logs/stream` → Real-time log stream (WebSocket)
- `GET /api/v1/logs/analytics` → Log analytics

---

## APM — Service-Centric Monitoring

### Navigation Flow

```
Services List (10 services)
  └─→ Click service → Service Detail
        ├── KPIs: requests, error rate, p50/p95/p99
        └── Operations Table (5-7 endpoints per service)
              └─→ Click operation → Traces List
                    └─→ Click trace → Waterfall span view
```

### Data Model

```typescript
interface APMService {
  id: string;
  name: string;                    // "api-gateway"
  language: string;                // "Go", "Node.js", "Java", "Python"
  framework: string;               // "Gin", "Express", "Spring Boot"
  type: "web" | "worker" | "gateway" | "ml" | "queue";
  requests: number;                // 5-minute window
  errorRate: number;               // percentage
  p50: number; p95: number; p99: number;  // milliseconds
  instances: number;
  env: string;
  operations: APMOperation[];
}

interface APMOperation {
  id: string;
  name: string;                    // "POST /api/users"
  method?: string;
  type: "http" | "grpc" | "queue" | "cron" | "internal";
  requests: number;
  errorRate: number;
  p50: number; p95: number; p99: number;
}

interface APMTrace {
  id: string;
  traceId: string;
  operationId: string;
  duration: number;
  status: "ok" | "error";
  spans: number;
  statusCode?: number;
  tags: Record<string, string>;
}
```

### Backend API

```
GET /api/v1/apm/services                           → APMService[]
GET /api/v1/apm/services/:id                       → APMService (with operations)
GET /api/v1/apm/services/:id/operations            → APMOperation[]
GET /api/v1/apm/services/:id/operations/:opId/traces  → APMTrace[]
GET /api/v1/apm/traces/:traceId                    → APMTrace (full span tree)
```

---

## Backend API Contract

### Core Infrastructure APIs

```bash
# Auth
POST   /api/v1/auth/login                    { email, password } → { token, user }
GET    /api/v1/auth/me                       → User

# Infrastructure Management
GET    /api/v1/infrastructures               → Infrastructure[]
POST   /api/v1/infrastructures               { config } → Infrastructure
GET    /api/v1/infrastructures/:id           → Infrastructure
PUT    /api/v1/infrastructures/:id           { config } → Infrastructure
DELETE /api/v1/infrastructures/:id           → 204
POST   /api/v1/infrastructures/:id/deploy    → Deployment
POST   /api/v1/infrastructures/:id/destroy   → 204
POST   /api/v1/infrastructures/:id/drift-check → DriftResult
POST   /api/v1/infrastructures/:id/clone     → Infrastructure

# Deployments
GET    /api/v1/deployments                   → Deployment[]
GET    /api/v1/deployments/:id               → Deployment
GET    /api/v1/deployments/:id/logs          → LogStream
POST   /api/v1/deployments/:id/cancel        → 204
POST   /api/v1/deployments/:id/retry         → Deployment

# Approvals
GET    /api/v1/approvals                     → Approval[] (pending)
POST   /api/v1/approvals/:id/approve         → Approval
POST   /api/v1/approvals/:id/reject          → Approval

# Clusters
GET    /api/v1/clusters                      → Cluster[]
POST   /api/v1/clusters                      { config } → Cluster
GET    /api/v1/clusters/:id                  → Cluster
POST   /api/v1/clusters/:id/scale            { nodes } → Cluster
POST   /api/v1/clusters/:id/nodes            { nodeConfig } → Node
DELETE /api/v1/clusters/:id/nodes/:nodeId    → 204
GET    /api/v1/clusters/:id/health           → HealthStatus

# Topology
GET    /api/v1/topology/providers            → TopologyProvider[]
GET    /api/v1/topology/providers/:id/vpcs   → TopologyVpc[]
GET    /api/v1/topology/vpcs/:id/resources   → TopologyResource[]

# Monitoring
GET    /api/v1/monitoring/metrics/:infra     ?range=1h|6h|24h|7d → TimeSeriesData
GET    /api/v1/monitoring/health/:infra      → HealthStatus
POST   /api/v1/monitoring/setup/:infra       → 204
GET    /api/v1/monitoring/alerts             → Alert[]
POST   /api/v1/monitoring/alerts             { rule } → AlertRule

# Logging
GET    /api/v1/logs                          ?query=&labels=&limit= → LogEntry[]
GET    /api/v1/logs/stream                   → WebSocket stream
GET    /api/v1/logs/analytics                → LogAnalytics

# Releases
GET    /api/v1/releases                      → Release[]
POST   /api/v1/releases                      { spec } → Release
GET    /api/v1/releases/:id/status           → ReleaseStatus
POST   /api/v1/releases/:id/rollback         → Release
GET    /api/v1/releases/queue/:env           → ReleaseQueue

# Environments
GET    /api/v1/environments                  → Environment[]
POST   /api/v1/environments                  { config } → Environment
POST   /api/v1/environments/:id/clone        → Environment
POST   /api/v1/environments/:id/promote      → Environment

# Scaling
GET    /api/v1/scaling/schedules             → ScalingSchedule[]
POST   /api/v1/scaling/schedules             { schedule } → ScalingSchedule
GET    /api/v1/scaling/policies              → ScalingPolicy[]
POST   /api/v1/scaling/policies              { policy } → ScalingPolicy

# AI/ML (V2 Features)
GET    /api/v1/ml/recommendations            → Recommendation[]
GET    /api/v1/ml/cost-optimization          → CostOptimization
GET    /api/v1/ml/scaling-predictions        → ScalingPrediction
GET    /api/v1/ml/anomalies                  → Anomaly[]
POST   /api/v1/ml/nlp-to-infra               { prompt } → InfraConfig
```

### Health Aggregation (Backend MUST implement)

```
Resource → VPC: any critical → VPC critical; else any warning → warning; else healthy
VPC → Provider: same rollup logic
Return healthCounts: { healthy, warning, critical } at every level
```

### WebSocket / Real-time

- **Logs:** `WS /api/v1/logs/stream?query=`
- **Alerts:** Poll 10s via React Query
- **Topology:** WebSocket for health status changes → invalidate cache
- **Deployments:** WebSocket for deployment progress

---

## Data Models

### Infrastructure Resource

```typescript
interface Infrastructure {
  id: string;
  name: string;
  type: string;                    // "vm", "cluster", "database", etc.
  provider: "AWS" | "GCP" | "Azure";
  region: string;
  environment: string;             // "Production", "Staging", "Development"
  status: "running" | "stopped" | "error" | "deploying";
  config: Record<string, unknown>; // Grid JSON config
  terraformState?: string;         // Reference to state file
  createdAt: string;
  updatedAt: string;
}
```

### Deployment

```typescript
interface Deployment {
  id: string;
  infrastructureId: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  triggeredBy: "manual" | "git" | "schedule" | "api";
  commitSha?: string;
  logs: string[];
  startedAt: string;
  completedAt?: string;
  approvals?: Approval[];
}
```

### Release

```typescript
interface Release {
  id: string;
  name: string;
  version: string;
  environment: string;
  status: "queued" | "pending_approval" | "deploying" | "deployed" | "failed" | "rolled_back";
  deployments: Deployment[];
  approvals: Approval[];
  createdAt: string;
}
```

---

## Stress Testing

The console includes procedurally generated stress-test data for UI performance validation:

| Component | Count | Generator |
|-----------|-------|-----------|
| Infrastructure resources | 3,000 | `generateStressResources()` |
| Topology VPCs | 30 (across 3 providers) | `buildStressTopologyData()` |
| Topology resources | ~3,000 (distributed) | Per-VPC procedural generation |
| Active alerts | 200 | `generateStressActiveAlerts()` |
| Alert rules | 40 | `generateStressAlertRules()` |
| APM services | 10 | `mockServices` |
| APM operations | 45 | Per-service operations |
| APM traces | 300-600 | Per-service procedural generation |

All generators use seeded randomness for deterministic, reproducible data.

**Files:** `src/data/stressTestData.ts`, `src/data/apmMockData.ts`

---

## Development

```sh
npm install
npm run dev        # Start dev server at localhost:5173
npm run build      # Production build
npm run test       # Run Vitest tests
```

### Project Structure

```
src/
├── components/
│   ├── topology/          # Topology node components + layout engine
│   │   ├── VpcBubbleNode.tsx     # Collapsible VPC visualization
│   │   ├── useBubbleLayout.ts    # Horizontal grid layout
│   │   └── ProviderLabelNode.tsx # Provider section headers
│   ├── ui/                # shadcn/ui primitives
│   ├── AppShell.tsx       # Shared layout
│   └── TopologyDiagram.tsx # Main topology orchestrator
├── data/
│   ├── topologyTypes.ts         # Topology type definitions
│   ├── stressTestData.ts        # 3,000 resources + 200 alerts generators
│   └── apmMockData.ts           # APM mock data
├── pages/
│   ├── TopologyPage.tsx         # VPC topology with filters
│   ├── InfrastructurePage.tsx   # Resource list
│   ├── DeploymentsPage.tsx      # Deployment management
│   ├── ReleasesPage.tsx         # Release management with approvals
│   ├── AlertsPage.tsx           # Alert rules and active alerts
│   ├── APMPage.tsx              # Service → Operations → Traces
│   ├── LoggingPage.tsx          # Log search
│   └── MonitoringPage.tsx       # Infrastructure metrics
└── hooks/
```

### Replacing Mock Data

To connect to real Grid backend:

1. **Infrastructure:** Replace `generateStressResources()` with `GET /api/v1/infrastructures`
2. **Topology:** Replace `buildStressTopologyData()` with lazy-loading:
   - `GET /api/v1/topology/providers`
   - `GET /api/v1/topology/providers/:id/vpcs`
   - `GET /api/v1/topology/vpcs/:id/resources`
3. **Alerts:** Replace generators with `GET /api/v1/monitoring/alerts`
4. **APM:** Replace `mockServices` with `GET /api/v1/apm/services`
5. **Logging:** Replace with `GET /api/v1/logs`
