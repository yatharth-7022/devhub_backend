import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorService } from '../vector/vector.service';

@Injectable()
export class IngestService {
  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly vectorService: VectorService,
  ) {}
  async chunkText(text: string) {
    return this.splitter.splitText(text);
  }
  async ingestResource(params: {
    spaceId: string;
    resourceId: string;
    url?: string;
    title?: string;
    text: string;
  }) {
    const chunks = await this.chunkText(params.text);
    const vectors = await this.embeddings.embedDocuments(chunks);

    const records = vectors.map((values, chunkIdx) => ({
      id: this.vectorService.makeVectorId(params.resourceId, chunkIdx),
      values,
      metadata: {
        spaceId: params.spaceId,
        resourceId: params.resourceId,
        chunkIdx,
        url: params.url,
        title: params.title,
      },
    }));

    await this.vectorService.upsertVectors(records);
    return { chunkCount: chunks.length };
  }
}
