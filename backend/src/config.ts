import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  jwtIssuer: process.env.JWT_ISSUER ?? "soc-platform",
  databaseUrl: process.env.DATABASE_URL ?? "",
  opensearchUrl: process.env.OPENSEARCH_URL ?? "http://opensearch:9200",
  opensearchIndex: process.env.OPENSEARCH_INDEX ?? "soc-logs",
  redisUrl: process.env.REDIS_URL ?? "redis://redis:6379",
  retentionDays: Number(process.env.RETENTION_DAYS ?? 30),
  syslogTcpPort: Number(process.env.SYSLOG_TCP_PORT ?? 5514),
  syslogUdpPort: Number(process.env.SYSLOG_UDP_PORT ?? 5514),
  enableSyslog: process.env.SYSLOG_ENABLED === "true",
  smtpHost: process.env.SMTP_HOST ?? "smtp.local",
  smtpPort: Number(process.env.SMTP_PORT ?? 25),
  webhookUrl: process.env.NOTIFY_WEBHOOK_URL ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  httpsEnabled: process.env.HTTPS_ENABLED === "true",
  httpsKeyPath: process.env.HTTPS_KEY_PATH ?? "./certs/key.pem",
  httpsCertPath: process.env.HTTPS_CERT_PATH ?? "./certs/cert.pem"
};
