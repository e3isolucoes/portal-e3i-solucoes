import { KnowledgeChunk } from '../knowledge/schemas/KnowledgeChunk';
import { KnowledgeRepository } from '../knowledge/store/KnowledgeRepository';
import { EmbeddingProvider } from './EmbeddingProvider';
import { VertexEmbeddingProvider } from './VertexEmbeddingProvider';
import { TestEmbeddingProvider } from './TestEmbeddingProvider';
import { AIConfig } from '../config/AIConfig';
import { KnowledgeAccessPolicy } from '../knowledge/security/KnowledgeAccessPolicy';

export interface EmbeddingJobResult {
  chunkId: string;
  status: 'READY' | 'FAILED' | 'NO_OP' | 'STALE';
  error?: string;
}

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private accessPolicy = new KnowledgeAccessPolicy();

  constructor(provider?: EmbeddingProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      if (process.env.NODE_ENV === 'test' || AIConfig.provider === 'mock') {
        this.provider = new TestEmbeddingProvider(AIConfig.embedding.dimensions, AIConfig.embedding.model);
      } else {
        this.provider = new VertexEmbeddingProvider(AIConfig.embedding.model, AIConfig.embedding.dimensions);
      }
    }
  }

  public async processChunkEmbeddings(organizationId: string, store: KnowledgeRepository, maxChunks: number = 50): Promise<EmbeddingJobResult[]> {
    const results: EmbeddingJobResult[] = [];
    const chunks = await store.listCurrentChunks(organizationId, false);

    let processedCount = 0;
    for (const chunk of chunks) {
      if (processedCount >= maxChunks) break;

      const isEligible = this.accessPolicy.isChunkEligible(chunk, organizationId, false) && chunk.evidenceIds && chunk.evidenceIds.length > 0;
      chunk.aiRetrievalEligible = isEligible;

      if (!isEligible) {
        continue;
      }

      const isReady = chunk.embeddingStatus === 'READY';
      const sameHash = chunk.embeddingContentHash === chunk.contentHash;
      const sameModel = chunk.embeddingModel === AIConfig.embedding.model;
      const sameDimensions = chunk.embeddingDimensions === AIConfig.embedding.dimensions;
      const hasVector = chunk.embedding && chunk.embedding.length === AIConfig.embedding.dimensions;

      if (isReady && sameHash && sameModel && sameDimensions && hasVector) {
        results.push({ chunkId: chunk.id, status: 'NO_OP' });
        continue;
      }

      try {
        const embeddingResult = await this.provider.embedDocument(chunk.content);

        chunk.embedding = embeddingResult.vector;
        chunk.embeddingModel = embeddingResult.model;
        chunk.embeddingDimensions = embeddingResult.dimensions;
        chunk.embeddingContentHash = chunk.contentHash;
        chunk.embeddingStatus = 'READY';
        chunk.embeddedAt = embeddingResult.generatedAt;
        chunk.aiRetrievalEligible = true;

        await store.upsertChunks([chunk]);
        results.push({ chunkId: chunk.id, status: 'READY' });
        processedCount++;
      } catch (err: any) {
        chunk.embeddingStatus = 'FAILED';
        await store.upsertChunks([chunk]);
        results.push({ chunkId: chunk.id, status: 'FAILED', error: err.message });
        processedCount++;
      }
    }

    return results;
  }
}
