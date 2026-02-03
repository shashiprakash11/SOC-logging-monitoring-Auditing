import { prisma } from "../db";
import { LogEvent } from "../types";
import { sendAlertNotifications } from "./notificationService";

export const evaluateAlerts = async (event: LogEvent): Promise<void> => {
  const rules = await prisma.alertRule.findMany({
    where: { tenantId: event.tenantId, enabled: true }
  });

  for (const rule of rules) {
    const condition = rule.condition as Record<string, unknown>;
    const match = Object.entries(condition).every(([key, value]) =>
      (event as Record<string, unknown>)[key] === value
    );
    if (match) {
      await sendAlertNotifications(rule.name, rule.severity, event);
    }
  }
};
