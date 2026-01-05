import { Module } from '@nestjs/common';
import { VectorService } from './vector/vector.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { IngestService } from './ingest/ingest.service';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from 'src/common/queue/queue.module';
import { BullModule } from '@nestjs/bullmq';
import { INGEST_QUEUE } from './ai.constant';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [
    ConfigModule,
    QueueModule,
    BullModule.registerQueue({
      name: INGEST_QUEUE,
    }),
  ],
  providers: [
    VectorService,
    EmbeddingsService,
    IngestService,
    PrismaService,
    // IngestProcessor,
  ],
  exports: [BullModule, IngestService],
})
export class AiModule {}
