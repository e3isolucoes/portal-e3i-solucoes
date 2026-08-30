import { RetrievalRequest, RetrievalResult } from './RetrievalTypes';
import { TenantContext } from '../core/AIHarness';
import { KnowledgeRepository } from '../knowledge/store/KnowledgeRepository';
import { globalKnowledgeStore } from '../knowledge/store/KnowledgeStore';
import { EmbeddingProvider } from '../embeddings/EmbeddingProvider';
import { VertexEmbeddingProvider } from '../embeddings/VertexEmbeddingProvider';
import { TestEmbeddingProvider } from '../embeddings/TestEmbeddingProvider';
import { AIConfig } from '../config/AIConfig';
import { KnowledgeAccessPolicy } from '../knowledge/security/KnowledgeAccessPolicy';
import { z } from 'zod';

export interface KnowledgeRetriever {
  retrieve(request: RetrievalRequest, tenantContext: TenantContext): Promise<RetrievalResult[]>;
}

const RetrievalRequestSchema = z.object({
  organizationId: z.string().min(1),
  query: z.string().min(1, 'Query cannot be empty').max(1000, 'Query exceeds maximum length'),
  maxResults: z.number().int().positive().max(100).default(10),
  filters: z.record(z.string(), z.any()).optional(),
});

export class FirestoreVectorKnowledgeRetriever implements KnowledgeRetriever {
  private provider: EmbeddingProvider;
  private accessPolicy = new KnowledgeAccessPolicy();

  constructor(private store: KnowledgeRepository, provider?: EmbeddingProvider) {
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

  private cosineDistance(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 1.0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 1.0;
    const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(2, 1 - similarity));
  }

  async retrieve(request: RetrievalRequest, tenantContext: TenantContext): Promise<RetrievalResult[]> {
    if (!tenantContext || !tenantContext.organizationId || request.organizationId !== tenantContext.organizationId) {
      throw new Error('AI_RETRIEVAL_TENANT_MISMATCH: Unauthorized tenant access in retrieval.');
    }

    const validation = RetrievalRequestSchema.safeParse(request);
    if (!validation.success) {
      throw new Error(`KNOWLEDGE_RETRIEVAL_VALIDATION_ERROR: ${validation.error.message}`);
    }

    const { query, maxResults } = validation.data;
    const organizationId = tenantContext.organizationId;

    let queryEmbeddingRes;
    try {
      queryEmbeddingRes = await this.provider.embedQuery(query);
    } catch (err: any) {
      throw new Error(`EMBEDDING_PROVIDER_FAILED: ${err.message}`);
    }

    const queryVector = queryEmbeddingRes.vector;

    // Pre-filtered server-side by organizationId
    const allChunks = await this.store.listCurrentChunks(organizationId, false);

    const candidates = allChunks.filter(chunk => {
      if (chunk.organizationId !== organizationId) return false;
      if (chunk.embeddingStatus !== 'READY' || !chunk.embedding || chunk.embedding.length !== AIConfig.embedding.dimensions) {
        return false;
      }
      if (!this.accessPolicy.isChunkEligible(chunk, organizationId, false)) {
        return false;
      }
      return true;
    });

    const scoredChunks = candidates.map(chunk => {
      const distance = this.cosineDistance(queryVector, chunk.embedding!);
      return { chunk, distance };
    });

    scoredChunks.sort((a, b) => a.distance - b.distance);

    const limitedResults = scoredChunks.slice(0, Math.min(maxResults, AIConfig.retrieval.maxResults));

    return limitedResults.map(({ chunk, distance }) => ({
      organizationId: chunk.organizationId,
      sourceId: chunk.sourceId,
      sourceType: chunk.sourceType,
      content: chunk.content,
      score: distance,
      distance,
      distanceMeasure: AIConfig.embedding.distanceMeasure,
      metadata: {
        chunkId: chunk.id,
        evidenceIds: chunk.evidenceIds,
        trustLevel: chunk.trustLevel,
        sensitivity: chunk.sensitivity,
        inferenceType: chunk.inferenceType,
      },
    }));
  }
}

export class DefaultKnowledgeRetriever extends FirestoreVectorKnowledgeRetriever {
  constructor(store: KnowledgeRepository = globalKnowledgeStore, provider?: EmbeddingProvider) {
    super(store, provider);
  }
}

export const globalKnowledgeRetriever = new FirestoreVectorKnowledgeRetriever(globalKnowledgeStore);

