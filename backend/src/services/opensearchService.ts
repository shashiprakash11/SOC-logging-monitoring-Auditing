import { Client } from "@opensearch-project/opensearch";
import { config } from "../config";
import { LogEvent } from "../types";

export const opensearchClient = new Client({
  node: config.opensearchUrl
});

export const ensureIndexTemplate = async (): Promise<void> => {
  await opensearchClient.indices.putIndexTemplate({
    name: "soc-logs-template",
    body: {
      index_patterns: [`${config.opensearchIndex}-*`],
      template: {
        settings: {
          number_of_shards: 1
        },
        mappings: {
          properties: {
            timestamp: { type: "date" },
            tenantId: { type: "keyword" },
            host: { type: "keyword" },
            service: { type: "keyword" },
            message: { type: "text" },
            severity: { type: "keyword" },
            source: { type: "keyword" },
            metadata: { type: "object", enabled: true }
          }
        }
      }
    }
  });
};

export const indexLogEvent = async (event: LogEvent): Promise<void> => {
  const dateSuffix = event.timestamp.split("T")[0];
  const indexName = `${config.opensearchIndex}-${dateSuffix}`;
  await opensearchClient.index({
    index: indexName,
    body: event,
    refresh: true
  });
};

export const searchLogs = async (query: Record<string, unknown>) =>
  opensearchClient.search({
    index: `${config.opensearchIndex}-*`,
    body: query
  });

export const deleteIndex = async (index: string): Promise<void> => {
  await opensearchClient.indices.delete({ index });
};

export const listIndices = async (): Promise<string[]> => {
  const response = await opensearchClient.cat.indices({
    format: "json",
    h: "index"
  });
  return (response.body as Array<{ index: string }>).map((item) => item.index);
};
