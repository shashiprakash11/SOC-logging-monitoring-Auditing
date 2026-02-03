import dgram from "dgram";
import net from "net";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config";
import { enqueueLogEvent } from "./services/redisService";
import { indexLogEvent } from "./services/opensearchService";
import { evaluateAlerts } from "./services/alertService";
import { LogEvent } from "./types";

const buildEvent = (message: string): LogEvent => ({
  id: uuidv4(),
  tenantId: "default",
  timestamp: new Date().toISOString(),
  host: "syslog",
  service: "syslog",
  message,
  severity: "info",
  source: "syslog",
  metadata: {}
});

const processMessage = async (message: string): Promise<void> => {
  const event = buildEvent(message);
  await enqueueLogEvent(event);
  await indexLogEvent(event);
  await evaluateAlerts(event);
};

export const startSyslogListeners = (): void => {
  if (!config.enableSyslog) return;
  const udpServer = dgram.createSocket("udp4");
  udpServer.on("message", (msg) => {
    processMessage(msg.toString()).catch((error) => console.error("Syslog UDP error", error));
  });
  udpServer.bind(config.syslogUdpPort);

  const tcpServer = net.createServer((socket) => {
    socket.on("data", (data) => {
      processMessage(data.toString()).catch((error) => console.error("Syslog TCP error", error));
    });
  });
  tcpServer.listen(config.syslogTcpPort);
};
