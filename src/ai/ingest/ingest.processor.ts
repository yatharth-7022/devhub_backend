// src/ai/ingest.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IngestService } from './ingest.service';
import { PrismaService } from 'prisma/prisma.service';
import { INGEST_QUEUE, INGEST_RESOURCE_JOB } from '../ai.constant';
import { IngestResourceJob } from '../types/ingest-job.type';

@Processor(INGEST_QUEUE)
export class IngestProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestService: IngestService,
  ) {
    super();
  }

  async process(job: Job<IngestResourceJob, any, string>) {
    if (job.name !== INGEST_RESOURCE_JOB) return;

    const { resourceId, spaceId, text, title, url } = job.data;
    if (!text?.trim()) return;

    const result = await this.ingestService.ingestResource({
      spaceId,
      resourceId,
      text,
      title,
      url,
    });

    // Mark resource as indexed (simple MVP marker)
    await this.prisma.resource.update({
      where: { id: resourceId },
      data: { pineconeId: 'indexed' },
    });

    return result;
  }
}
