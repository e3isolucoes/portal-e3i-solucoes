import { EmbeddingResult } from './EmbeddingTypes';

export interface EmbeddingProvider {
  embedDocument(content: string): Promise<EmbeddingResult>;
  embedQuery(query: string): Promise<EmbeddingResult>;
}
