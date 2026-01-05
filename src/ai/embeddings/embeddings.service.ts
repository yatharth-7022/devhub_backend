import { Injectable } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsService {
  private readonly embeddings: OpenAIEmbeddings;

  constructor(config: ConfigService) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
      modelName: 'text-embedding-3-small',
    });
  }
  embedDocuments(texts: string[]) {
    return this.embeddings.embedDocuments(texts);
  }

  embedQuery(text: string) {
    return this.embeddings.embedQuery(text);
  }
}
