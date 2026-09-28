/**
 * APM Mock Data — Datadog-style service-centric model.
 * Services → Operations (endpoints/methods) → Traces
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface APMOperation {
  id: string;
  name: string;            // e.g. "POST /api/users", "ProcessPayment"
  method?: string;         // HTTP method or gRPC
  type: "http" | "grpc" | "queue" | "cron" | "internal";
  requests: number;
  errorRate: number;       // percentage
  p50: number;             // ms
  p95: number;
  p99: number;
  trend: "up" | "down" | "stable";
}

export interface APMTrace {
  id: string;
  traceId: string;
  operationId: string;
  operation: string;
  duration: number;        // ms
  status: "ok" | "error";
  spans: number;
  timestamp: string;
  statusCode?: number;
  tags: Record<string, string>;
}

export interface APMService {
  id: string;
  name: string;
  language: string;
  framework: string;
  type: "web" | "worker" | "database" | "cache" | "queue" | "gateway" | "ml";
  requests: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  trend: "up" | "down" | "stable";
  instances: number;
  env: string;
  operations: APMOperation[];
  traces: APMTrace[];
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const rand = seededRandom(7777);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

const traceTimestamps = [
  "2s ago", "5s ago", "8s ago", "12s ago", "18s ago", "25s ago", "34s ago",
  "45s ago", "1m ago", "1.5m ago", "2m ago", "3m ago", "4m ago", "5m ago",
  "7m ago", "10m ago", "12m ago", "15m ago", "20m ago",
];

function generateTraces(serviceId: string, ops: APMOperation[], count: number): APMTrace[] {
  const traces: APMTrace[] = [];
  for (let i = 0; i < count; i++) {
    const op = ops[Math.floor(rand() * ops.length)];
    const isError = rand() < op.errorRate / 100;
    const duration = Math.round(op.p50 * (0.3 + rand() * 3));
    traces.push({
      id: `${serviceId}-trace-${i}`,
      traceId: Array.from({ length: 16 }, () => Math.floor(rand() * 16).toString(16)).join(""),
      operationId: op.id,
      operation: op.name,
      duration,
      status: isError ? "error" : "ok",
      spans: 2 + Math.floor(rand() * 20),
      timestamp: pick(traceTimestamps),
      statusCode: op.type === "http" ? (isError ? pick([500, 502, 503, 504, 429]) : pick([200, 201, 204])) : undefined,
      tags: {
        env: "production",
        service: serviceId,
        ...(isError ? { error: pick(["timeout", "connection_refused", "OOMKilled", "rate_limited", "invalid_request"]) } : {}),
      },
    });
  }
  return traces.sort((a, b) => {
    const parseTime = (t: string) => {
      const num = parseFloat(t);
      if (t.includes("m")) return num * 60;
      return num;
    };
    return parseTime(a.timestamp) - parseTime(b.timestamp);
  });
}

export const mockServices: APMService[] = [
  {
    id: "api-gateway",
    name: "api-gateway",
    language: "Go",
    framework: "Gin",
    type: "gateway",
    requests: 128400,
    errorRate: 0.3,
    p50: 12,
    p95: 85,
    p99: 245,
    trend: "stable",
    instances: 6,
    env: "production",
    operations: [
      { id: "ag-op-1", name: "POST /api/users", method: "POST", type: "http", requests: 18200, errorRate: 0.2, p50: 45, p95: 120, p99: 320, trend: "stable" },
      { id: "ag-op-2", name: "GET /api/users/:id", method: "GET", type: "http", requests: 42100, errorRate: 0.1, p50: 8, p95: 25, p99: 89, trend: "down" },
      { id: "ag-op-3", name: "PUT /api/users/:id", method: "PUT", type: "http", requests: 8600, errorRate: 0.4, p50: 52, p95: 180, p99: 450, trend: "up" },
      { id: "ag-op-4", name: "DELETE /api/users/:id", method: "DELETE", type: "http", requests: 2100, errorRate: 0.1, p50: 35, p95: 90, p99: 156, trend: "stable" },
      { id: "ag-op-5", name: "GET /api/resources", method: "GET", type: "http", requests: 31200, errorRate: 0.2, p50: 15, p95: 65, p99: 190, trend: "stable" },
      { id: "ag-op-6", name: "POST /api/deployments", method: "POST", type: "http", requests: 4500, errorRate: 1.2, p50: 120, p95: 450, p99: 1200, trend: "up" },
      { id: "ag-op-7", name: "GET /api/health", method: "GET", type: "http", requests: 21700, errorRate: 0.0, p50: 2, p95: 5, p99: 12, trend: "stable" },
    ],
    traces: [],
  },
  {
    id: "auth-service",
    name: "auth-service",
    language: "Node.js",
    framework: "Express",
    type: "web",
    requests: 45200,
    errorRate: 2.8,
    p50: 65,
    p95: 320,
    p99: 1823,
    trend: "up",
    instances: 4,
    env: "production",
    operations: [
      { id: "as-op-1", name: "POST /auth/login", method: "POST", type: "http", requests: 18400, errorRate: 3.2, p50: 120, p95: 450, p99: 1823, trend: "up" },
      { id: "as-op-2", name: "POST /auth/register", method: "POST", type: "http", requests: 4200, errorRate: 1.5, p50: 200, p95: 600, p99: 2100, trend: "stable" },
      { id: "as-op-3", name: "POST /auth/refresh", method: "POST", type: "http", requests: 12800, errorRate: 0.8, p50: 25, p95: 80, p99: 250, trend: "down" },
      { id: "as-op-4", name: "GET /auth/verify", method: "GET", type: "http", requests: 8900, errorRate: 4.5, p50: 15, p95: 45, p99: 120, trend: "up" },
      { id: "as-op-5", name: "POST /auth/logout", method: "POST", type: "http", requests: 900, errorRate: 0.1, p50: 8, p95: 20, p99: 45, trend: "stable" },
    ],
    traces: [],
  },
  {
    id: "payment-service",
    name: "payment-service",
    language: "Java",
    framework: "Spring Boot",
    type: "web",
    requests: 22800,
    errorRate: 1.2,
    p50: 89,
    p95: 340,
    p99: 980,
    trend: "stable",
    instances: 3,
    env: "production",
    operations: [
      { id: "ps-op-1", name: "POST /payments/charge", method: "POST", type: "http", requests: 8200, errorRate: 1.8, p50: 180, p95: 520, p99: 1200, trend: "up" },
      { id: "ps-op-2", name: "POST /payments/refund", method: "POST", type: "http", requests: 1200, errorRate: 0.5, p50: 220, p95: 600, p99: 1500, trend: "stable" },
      { id: "ps-op-3", name: "GET /payments/:id", method: "GET", type: "http", requests: 6400, errorRate: 0.2, p50: 25, p95: 80, p99: 200, trend: "down" },
      { id: "ps-op-4", name: "POST /payments/webhook", method: "POST", type: "http", requests: 4800, errorRate: 2.1, p50: 45, p95: 150, p99: 450, trend: "up" },
      { id: "ps-op-5", name: "GET /payments/status", method: "GET", type: "http", requests: 2200, errorRate: 0.3, p50: 12, p95: 35, p99: 90, trend: "stable" },
    ],
    traces: [],
  },
  {
    id: "order-service",
    name: "order-service",
    language: "Python",
    framework: "FastAPI",
    type: "web",
    requests: 34500,
    errorRate: 0.8,
    p50: 42,
    p95: 180,
    p99: 520,
    trend: "stable",
    instances: 5,
    env: "production",
    operations: [
      { id: "os-op-1", name: "POST /orders", method: "POST", type: "http", requests: 12200, errorRate: 1.2, p50: 85, p95: 280, p99: 780, trend: "stable" },
      { id: "os-op-2", name: "GET /orders/:id", method: "GET", type: "http", requests: 14800, errorRate: 0.1, p50: 18, p95: 55, p99: 120, trend: "down" },
      { id: "os-op-3", name: "PUT /orders/:id/status", method: "PUT", type: "http", requests: 5600, errorRate: 0.5, p50: 45, p95: 150, p99: 420, trend: "stable" },
      { id: "os-op-4", name: "GET /orders", method: "GET", type: "http", requests: 1900, errorRate: 2.5, p50: 120, p95: 450, p99: 1200, trend: "up" },
    ],
    traces: [],
  },
  {
    id: "worker-processor",
    name: "worker-processor",
    language: "Go",
    framework: "Custom",
    type: "worker",
    requests: 8900,
    errorRate: 3.5,
    p50: 3400,
    p95: 8200,
    p99: 12500,
    trend: "up",
    instances: 8,
    env: "production",
    operations: [
      { id: "wp-op-1", name: "ProcessExportJob", type: "queue", requests: 3200, errorRate: 2.8, p50: 4500, p95: 9000, p99: 15000, trend: "up" },
      { id: "wp-op-2", name: "ProcessImportJob", type: "queue", requests: 2100, errorRate: 4.2, p50: 6200, p95: 12000, p99: 18000, trend: "up" },
      { id: "wp-op-3", name: "SendNotification", type: "queue", requests: 2400, errorRate: 1.5, p50: 120, p95: 350, p99: 800, trend: "stable" },
      { id: "wp-op-4", name: "GenerateReport", type: "cron", requests: 1200, errorRate: 5.8, p50: 8900, p95: 22000, p99: 45000, trend: "up" },
    ],
    traces: [],
  },
  {
    id: "notification-service",
    name: "notification-service",
    language: "Node.js",
    framework: "NestJS",
    type: "web",
    requests: 52000,
    errorRate: 0.5,
    p50: 25,
    p95: 120,
    p99: 380,
    trend: "down",
    instances: 3,
    env: "production",
    operations: [
      { id: "ns-op-1", name: "POST /notify/email", method: "POST", type: "http", requests: 22000, errorRate: 0.3, p50: 35, p95: 150, p99: 450, trend: "stable" },
      { id: "ns-op-2", name: "POST /notify/push", method: "POST", type: "http", requests: 18000, errorRate: 0.8, p50: 18, p95: 60, p99: 180, trend: "down" },
      { id: "ns-op-3", name: "POST /notify/sms", method: "POST", type: "http", requests: 8000, errorRate: 0.4, p50: 45, p95: 200, p99: 600, trend: "stable" },
      { id: "ns-op-4", name: "POST /notify/slack", method: "POST", type: "http", requests: 4000, errorRate: 0.2, p50: 12, p95: 40, p99: 120, trend: "down" },
    ],
    traces: [],
  },
  {
    id: "search-service",
    name: "search-service",
    language: "Java",
    framework: "Quarkus",
    type: "web",
    requests: 67000,
    errorRate: 0.2,
    p50: 18,
    p95: 65,
    p99: 180,
    trend: "stable",
    instances: 4,
    env: "production",
    operations: [
      { id: "ss-op-1", name: "GET /search", method: "GET", type: "http", requests: 45000, errorRate: 0.1, p50: 15, p95: 55, p99: 150, trend: "stable" },
      { id: "ss-op-2", name: "POST /search/index", method: "POST", type: "http", requests: 12000, errorRate: 0.5, p50: 35, p95: 120, p99: 350, trend: "up" },
      { id: "ss-op-3", name: "DELETE /search/index/:id", method: "DELETE", type: "http", requests: 4000, errorRate: 0.1, p50: 8, p95: 25, p99: 60, trend: "stable" },
      { id: "ss-op-4", name: "GET /search/suggest", method: "GET", type: "http", requests: 6000, errorRate: 0.1, p50: 5, p95: 15, p99: 45, trend: "down" },
    ],
    traces: [],
  },
  {
    id: "ml-inference",
    name: "ml-inference",
    language: "Python",
    framework: "FastAPI + PyTorch",
    type: "ml",
    requests: 15600,
    errorRate: 1.8,
    p50: 120,
    p95: 450,
    p99: 1200,
    trend: "stable",
    instances: 6,
    env: "production",
    operations: [
      { id: "mi-op-1", name: "POST /predict", method: "POST", type: "http", requests: 8200, errorRate: 1.5, p50: 150, p95: 500, p99: 1500, trend: "stable" },
      { id: "mi-op-2", name: "POST /batch-predict", method: "POST", type: "http", requests: 2400, errorRate: 3.2, p50: 800, p95: 2500, p99: 5000, trend: "up" },
      { id: "mi-op-3", name: "GET /models", method: "GET", type: "http", requests: 3200, errorRate: 0.1, p50: 8, p95: 25, p99: 60, trend: "stable" },
      { id: "mi-op-4", name: "POST /models/reload", method: "POST", type: "http", requests: 800, errorRate: 5.0, p50: 2500, p95: 8000, p99: 15000, trend: "up" },
      { id: "mi-op-5", name: "GET /health", method: "GET", type: "http", requests: 1000, errorRate: 0.0, p50: 2, p95: 5, p99: 10, trend: "stable" },
    ],
    traces: [],
  },
  {
    id: "websocket-service",
    name: "websocket-service",
    language: "Rust",
    framework: "Actix-web",
    type: "web",
    requests: 89000,
    errorRate: 0.1,
    p50: 3,
    p95: 12,
    p99: 45,
    trend: "stable",
    instances: 4,
    env: "production",
    operations: [
      { id: "ws-op-1", name: "WS /connect", type: "internal", requests: 45000, errorRate: 0.1, p50: 2, p95: 8, p99: 25, trend: "stable" },
      { id: "ws-op-2", name: "WS /subscribe", type: "internal", requests: 32000, errorRate: 0.05, p50: 1, p95: 5, p99: 15, trend: "down" },
      { id: "ws-op-3", name: "WS /publish", type: "internal", requests: 12000, errorRate: 0.2, p50: 5, p95: 20, p99: 65, trend: "stable" },
    ],
    traces: [],
  },
  {
    id: "data-ingestion",
    name: "data-ingestion",
    language: "Scala",
    framework: "Spark Streaming",
    type: "worker",
    requests: 124000,
    errorRate: 0.4,
    p50: 45,
    p95: 200,
    p99: 650,
    trend: "stable",
    instances: 12,
    env: "production",
    operations: [
      { id: "di-op-1", name: "IngestKafkaEvent", type: "queue", requests: 85000, errorRate: 0.3, p50: 25, p95: 120, p99: 400, trend: "stable" },
      { id: "di-op-2", name: "TransformRecord", type: "internal", requests: 85000, errorRate: 0.2, p50: 15, p95: 60, p99: 200, trend: "down" },
      { id: "di-op-3", name: "WriteToDataLake", type: "internal", requests: 28000, errorRate: 0.8, p50: 120, p95: 450, p99: 1200, trend: "up" },
      { id: "di-op-4", name: "RunQualityCheck", type: "cron", requests: 6000, errorRate: 1.5, p50: 350, p95: 900, p99: 2500, trend: "stable" },
    ],
    traces: [],
  },
];

// Generate traces for each service
mockServices.forEach(svc => {
  svc.traces = generateTraces(svc.id, svc.operations, 30 + Math.floor(rand() * 30));
});
