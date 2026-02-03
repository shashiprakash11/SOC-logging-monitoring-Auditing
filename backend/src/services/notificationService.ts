import { config } from "../config";
import { LogEvent } from "../types";

export const sendAlertNotifications = async (
  ruleName: string,
  severity: string,
  event: LogEvent
): Promise<void> => {
  // TODO: replace with real SMTP/webhook integrations in production.
  if (config.webhookUrl) {
    await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleName, severity, event })
    });
  }
  // SMTP stub (no-op): log to console for demo purposes.
  console.info("SMTP stub", {
    host: config.smtpHost,
    port: config.smtpPort,
    ruleName,
    severity,
    eventId: event.id
  });
};
