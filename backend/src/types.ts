export type UserRole = "admin" | "analyst" | "auditor" | "readonly";

export interface LogEvent {
  id: string;
  tenantId: string;
  timestamp: string;
  host: string;
  service: string;
  message: string;
  severity: "debug" | "info" | "warn" | "error" | "critical";
  source: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEntryInput {
  tenantId: string;
  actorId: string;
  actorEmail: string;
  action: string;
  method: string;
  path: string;
  status: number;
  ip: string;
  metadata: Record<string, unknown>;
}
