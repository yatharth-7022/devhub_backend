import { Module } from '@nestjs/common';
import { VectorService } from './vector/vector.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { IngestService } from './ingest/ingest.service';

@Module({
  providers: [VectorService, EmbeddingsService, IngestService]
})
export class AiModule {}
