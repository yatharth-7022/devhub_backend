// src/ai/types/ingest-job.type.ts

export type IngestResourceJob = {
  resourceId: string;
  spaceId: string;
  title?: string;
  url?: string;
  text: string;
};
