import "dotenv/config";
import { prisma } from "../backend/src/db";
import { hashPassword } from "../backend/src/auth";
import { indexLogEvent } from "../backend/src/services/opensearchService";
import { LogEvent } from "../backend/src/types";
import { v4 as uuidv4 } from "uuid";

const run = async () => {
  const password = await hashPassword("ChangeMe123!");
  await prisma.user.upsert({
    where: { email: "admin@soc.local" },
    update: {},
    create: {
      email: "admin@soc.local",
      password,
      role: "admin",
      tenantId: "tenant-1"
    }
  });

  const event: LogEvent = {
    id: uuidv4(),
    tenantId: "tenant-1",
    timestamp: new Date().toISOString(),
    host: "demo-host",
    service: "auth-service",
    message: "Demo log event",
    severity: "info",
    source: "seed",
    metadata: { demo: true }
  };

  await indexLogEvent(event);
  console.log("Seeded demo user and log event");
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
