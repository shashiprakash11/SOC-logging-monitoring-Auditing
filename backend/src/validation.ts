import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const logEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  timestamp: z.string().datetime(),
  host: z.string().min(1),
  service: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["debug", "info", "warn", "error", "critical"]),
  source: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

export const alertRuleSchema = z.object({
  name: z.string().min(1),
  condition: z.record(z.unknown()),
  severity: z.string().min(1),
  enabled: z.boolean().optional()
});

export const webhookSchema = z.object({
  source: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["debug", "info", "warn", "error", "critical"]).optional()
});

export const savedQuerySchema = z.object({
  name: z.string().min(1),
  query: z.record(z.unknown())
});
