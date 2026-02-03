import request from "supertest";
import { createApp } from "../backend/src/app";
import { signToken } from "../backend/src/auth";

jest.mock("../backend/src/services/opensearchService", () => ({
  ensureIndexTemplate: jest.fn(),
  indexLogEvent: jest.fn(),
  searchLogs: jest.fn()
}));

jest.mock("../backend/src/services/redisService", () => ({
  enqueueLogEvent: jest.fn()
}));

jest.mock("../backend/src/services/alertService", () => ({
  evaluateAlerts: jest.fn()
}));

jest.mock("../backend/src/services/auditService", () => ({
  createAuditEntry: jest.fn()
}));

jest.mock("../backend/src/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    },
    alertRule: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    auditEntry: {
      findMany: jest.fn()
    }
  }
}));

const app = createApp();

describe("ingest flow", () => {
  it("ingests valid log events", async () => {
    const token = signToken({
      sub: "user-1",
      email: "admin@soc.local",
      role: "admin",
      tenantId: "tenant-1"
    });

    const payload = [
      {
        id: "2d3a2520-8b83-4f66-8fe9-5b8c3b3776d5",
        tenantId: "tenant-1",
        timestamp: new Date().toISOString(),
        host: "app-1",
        service: "api",
        message: "Error detected",
        severity: "error",
        source: "http",
        metadata: { path: "/login" }
      }
    ];

    const response = await request(app)
      .post("/api/v1/ingest")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.ingested).toBe(1);
  });
});
