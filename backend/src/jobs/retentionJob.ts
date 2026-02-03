import { config } from "../config";
import { deleteIndex, listIndices } from "../services/opensearchService";

const indexPrefix = `${config.opensearchIndex}-`;

const parseDateFromIndex = (index: string): Date | null => {
  const datePart = index.replace(indexPrefix, "");
  if (!/\d{4}-\d{2}-\d{2}/.test(datePart)) {
    return null;
  }
  return new Date(datePart);
};

export const runRetentionJob = async (): Promise<void> => {
  const indices = await listIndices();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.retentionDays);

  for (const index of indices) {
    if (!index.startsWith(indexPrefix)) continue;
    const date = parseDateFromIndex(index);
    if (date && date < cutoff) {
      await deleteIndex(index);
    }
  }
};

export const scheduleRetentionJob = (): void => {
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runRetentionJob().catch((error) => console.error("Retention job failed", error));
  }, intervalMs);
};
