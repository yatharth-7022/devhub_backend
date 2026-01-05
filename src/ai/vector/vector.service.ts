import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone, type PineconeRecord } from '@pinecone-database/pinecone';

export type DevhubVectorMetadata = {
  spaceId: string;
  resourceId: string;
  chunkIdx: number;
  url?: string;
  title?: string;
};
@Injectable()
export class VectorService {
  private readonly pc: Pinecone;
  private readonly indexName: string;
  private readonly namespace: string;

  constructor(private readonly config: ConfigService) {
    this.pc = new Pinecone({
      apiKey: this.config.getOrThrow<string>('PINECONE_API_KEY'),
    });
    this.indexName = this.config.getOrThrow<string>('PINECONE_INDEX_NAME');
    this.namespace = this.config.getOrThrow<string>('PINECONE_NAMESPACE');
  }

  private index() {
    return this.pc
      .index<DevhubVectorMetadata>(this.indexName)
      .namespace(this.namespace);
  }
  makeVectorId(resourceId: string, chunkIdx: number) {
    return `${resourceId}::${chunkIdx}`;
  }
  async upsertVectors(records: PineconeRecord<DevhubVectorMetadata>[]) {
    await this.index().upsert(records);
  }
}
