import { prisma } from "../db";
import { AuditEntryInput } from "../types";

export const createAuditEntry = async (entry: AuditEntryInput): Promise<void> => {
  await prisma.auditEntry.create({
    data: {
      tenantId: entry.tenantId,
      actorId: entry.actorId,
      actorEmail: entry.actorEmail,
      action: entry.action,
      method: entry.method,
      path: entry.path,
      status: entry.status,
      ip: entry.ip,
      metadata: entry.metadata
    }
  });
};
