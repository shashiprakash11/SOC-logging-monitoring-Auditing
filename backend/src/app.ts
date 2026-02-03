import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import client from "prom-client";
import { config } from "./config";
import { prisma } from "./db";
import {
  loginSchema,
  logEventSchema,
  alertRuleSchema,
  webhookSchema,
  savedQuerySchema
} from "./validation";
import { signToken, verifyPassword } from "./auth";
import { requireAuth, requireRole, AuthedRequest } from "./middleware/auth";
import { enforceTenant } from "./middleware/tenant";
import { createAuditEntry } from "./services/auditService";
import { ensureIndexTemplate, indexLogEvent, searchLogs } from "./services/opensearchService";
import { enqueueLogEvent } from "./services/redisService";
import { evaluateAlerts } from "./services/alertService";
import { scheduleRetentionJob } from "./jobs/retentionJob";
import { startSyslogListeners } from "./syslog";
import { LogEvent } from "./types";
import fs from "fs";
import https from "https";

export const createApp = () => {
  const app = express();
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "5mb" }));
  app.use(rateLimit({ windowMs: 60 * 1000, max: 300 }));
  app.use(morgan("combined"));

  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  });

  app.post("/api/v1/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      await createAuditEntry({
        tenantId: "unknown",
        actorId: "unknown",
        actorEmail: String(req.body?.email ?? "unknown"),
        action: "POST /api/v1/auth/login",
        method: "POST",
        path: "/api/v1/auth/login",
        status: 400,
        ip: req.ip,
        metadata: { login: false }
      });
      res.status(400).json({ error: "Invalid login payload" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      await createAuditEntry({
        tenantId: "unknown",
        actorId: "unknown",
        actorEmail: parsed.data.email,
        action: "POST /api/v1/auth/login",
        method: "POST",
        path: "/api/v1/auth/login",
        status: 401,
        ip: req.ip,
        metadata: { login: false }
      });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const validPassword = await verifyPassword(parsed.data.password, user.password);
    if (!validPassword) {
      await createAuditEntry({
        tenantId: user.tenantId,
        actorId: user.id,
        actorEmail: user.email,
        action: "POST /api/v1/auth/login",
        method: "POST",
        path: "/api/v1/auth/login",
        status: 401,
        ip: req.ip,
        metadata: { login: false }
      });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    });
    await createAuditEntry({
      tenantId: user.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      action: "POST /api/v1/auth/login",
      method: "POST",
      path: "/api/v1/auth/login",
      status: 200,
      ip: req.ip,
      metadata: { login: true }
    });
    res.json({ token });
  });

  app.use(requireAuth, enforceTenant);

  app.use((req: AuthedRequest, res, next) => {
    res.on("finish", () => {
      if (!req.user) return;
      createAuditEntry({
        tenantId: req.user.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: `${req.method} ${req.path}`,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ip: req.ip,
        metadata: {
          query: req.query,
          body: req.body
        }
      }).catch((error) => console.error("Audit error", error));
    });
    next();
  });

  app.post("/api/v1/ingest", requireRole(["admin", "analyst"]), async (req: AuthedRequest, res) => {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: "Expected array of events" });
      return;
    }
    const events: LogEvent[] = [];
    for (const raw of req.body) {
      const parsed = logEventSchema.safeParse(raw);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid event payload" });
        return;
      }
      if (parsed.data.tenantId !== req.user?.tenantId) {
        res.status(403).json({ error: "Tenant mismatch" });
        return;
      }
      events.push(parsed.data);
    }

    for (const event of events) {
      await enqueueLogEvent(event);
      await indexLogEvent(event);
      await evaluateAlerts(event);
    }

    res.json({ ingested: events.length });
  });

  app.post("/api/v1/syslog", requireRole(["admin", "analyst"]), async (req: AuthedRequest, res) => {
    const message = req.body?.message as string | undefined;
    if (!message) {
      res.status(400).json({ error: "Missing syslog message" });
      return;
    }
    const event: LogEvent = {
      id: uuidv4(),
      tenantId: req.user?.tenantId ?? "default",
      timestamp: new Date().toISOString(),
      host: req.body?.host ?? "syslog",
      service: req.body?.service ?? "syslog",
      message,
      severity: req.body?.severity ?? "info",
      source: "syslog",
      metadata: req.body?.metadata ?? {}
    };
    await enqueueLogEvent(event);
    await indexLogEvent(event);
    await evaluateAlerts(event);
    res.json({ status: "accepted" });
  });

  app.post("/api/v1/webhook", requireRole(["admin", "analyst"]), async (req: AuthedRequest, res) => {
    const parsed = webhookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid webhook payload" });
      return;
    }
    const event: LogEvent = {
      id: uuidv4(),
      tenantId: req.user?.tenantId ?? "default",
      timestamp: new Date().toISOString(),
      host: "webhook",
      service: parsed.data.source,
      message: parsed.data.message,
      severity: parsed.data.severity ?? "info",
      source: "webhook",
      metadata: req.body
    };
    await enqueueLogEvent(event);
    await indexLogEvent(event);
    await evaluateAlerts(event);
    res.json({ status: "received" });
  });

  app.get(
    "/api/v1/search",
    requireRole(["admin", "analyst", "auditor", "readonly"]),
    async (req: AuthedRequest, res) => {
      const { q, start, end, level, source, page = "1", size = "20" } = req.query as Record<
        string,
        string
      >;
      const tenantId = req.user?.tenantId;

      const must: Array<Record<string, unknown>> = [{ term: { tenantId } }];
      if (q) {
        must.push({ match: { message: q } });
      }
      if (level) {
        must.push({ term: { severity: level } });
      }
      if (source) {
        must.push({ term: { source } });
      }
      if (start || end) {
        must.push({
          range: {
            timestamp: {
              gte: start,
              lte: end
            }
          }
        });
      }

      const body = {
        from: (Number(page) - 1) * Number(size),
        size: Number(size),
        query: { bool: { must } },
        sort: [{ timestamp: "desc" }]
      };

      const response = await searchLogs(body);
      res.json(response.body);
    }
  );

  app.get("/api/v1/alerts", requireRole(["admin", "analyst", "auditor"]), async (req, res) => {
    const alerts = await prisma.alertRule.findMany({
      where: { tenantId: (req as AuthedRequest).user?.tenantId }
    });
    res.json(alerts);
  });

  app.post("/api/v1/alerts", requireRole(["admin", "analyst"]), async (req: AuthedRequest, res) => {
    const parsed = alertRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid alert rule" });
      return;
    }
    const rule = await prisma.alertRule.create({
      data: {
        tenantId: req.user?.tenantId ?? "default",
        name: parsed.data.name,
        condition: parsed.data.condition,
        severity: parsed.data.severity,
        enabled: parsed.data.enabled ?? true
      }
    });
    res.status(201).json(rule);
  });

  app.get(
    "/api/v1/queries",
    requireRole(["admin", "analyst", "auditor", "readonly"]),
    async (req: AuthedRequest, res) => {
      const queries = await prisma.savedQuery.findMany({
        where: { tenantId: req.user?.tenantId }
      });
      res.json(queries);
    }
  );

  app.post(
    "/api/v1/queries",
    requireRole(["admin", "analyst"]),
    async (req: AuthedRequest, res) => {
      const parsed = savedQuerySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid saved query" });
        return;
      }
      const saved = await prisma.savedQuery.create({
        data: {
          tenantId: req.user?.tenantId ?? "default",
          name: parsed.data.name,
          query: parsed.data.query
        }
      });
      res.status(201).json(saved);
    }
  );

  app.get("/api/v1/audit", requireRole(["admin", "auditor"]), async (req: AuthedRequest, res) => {
    const { actor, action } = req.query as Record<string, string>;
    const tenantId = req.user?.tenantId;
    const audits = await prisma.auditEntry.findMany({
      where: {
        tenantId,
        actorEmail: actor,
        action
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.json(audits);
  });

  return app;
};

export const startServer = async (): Promise<void> => {
  const app = createApp();
  await ensureIndexTemplate();
  scheduleRetentionJob();
  startSyslogListeners();
  if (config.httpsEnabled) {
    const key = fs.readFileSync(config.httpsKeyPath);
    const cert = fs.readFileSync(config.httpsCertPath);
    https.createServer({ key, cert }, app).listen(config.port, () => {
      console.log(`Backend HTTPS listening on ${config.port}`);
    });
  } else {
    app.listen(config.port, () => {
      console.log(`Backend listening on ${config.port}`);
    });
  }
};
