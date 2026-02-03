import Redis from "ioredis";
import { config } from "../config";
import { LogEvent } from "../types";

export const redis = new Redis(config.redisUrl);

export const enqueueLogEvent = async (event: LogEvent): Promise<void> => {
  await redis.xadd("soc-log-stream", "*", "payload", JSON.stringify(event));
};

export const consumeLogEvents = async (
  handler: (event: LogEvent) => Promise<void>
): Promise<void> => {
  let lastId = "0";
  while (true) {
    const response = await redis.xread("BLOCK", 2000, "STREAMS", "soc-log-stream", lastId);
    if (!response) continue;
    const [[, entries]] = response as [string, [string, string[]][]][];
    for (const [entryId, fields] of entries) {
      const payloadIndex = fields.findIndex((item) => item === "payload");
      if (payloadIndex !== -1) {
        const payload = fields[payloadIndex + 1];
        const event = JSON.parse(payload) as LogEvent;
        await handler(event);
      }
      lastId = entryId;
    }
  }
};
