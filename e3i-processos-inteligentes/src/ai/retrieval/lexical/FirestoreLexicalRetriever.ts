import { KnowledgeRepository } from '../../knowledge/store/KnowledgeRepository';
import { LexicalNormalizer, globalLexicalNormalizer } from './LexicalNormalizer';
import { LexicalResult } from './LexicalTypes';
import { AIConfig } from '../../config/AIConfig';
import { KnowledgeAccessPolicy } from '../../knowledge/security/KnowledgeAccessPolicy';
import { TenantContext } from '../../core/AIHarness';
import { z } from 'zod';

const LexicalRequestSchema = z.object({
  organizationId: z.string().min(1),
  query: z.string().min(1).max(1000),
  maxResults: z.number().int().positive().max(100).default(10),
});

export class FirestoreLexicalRetriever {
  private normalizer: LexicalNormalizer;
  private accessPolicy = new KnowledgeAccessPolicy();

  constructor(private store: KnowledgeRepository, normalizer?: LexicalNormalizer) {
    this.normalizer = normalizer || globalLexicalNormalizer;
  }

  public async retrieve(request: { organizationId: string; query: string; maxResults?: number }, tenantContext: TenantContext): Promise<LexicalResult[]> {
    if (!tenantContext || !tenantContext.organizationId || request.organizationId !== tenantContext.organizationId) {
      throw new Error('AI_RETRIEVAL_TENANT_MISMATCH: Unauthorized tenant access in lexical retrieval.');
    }

    const validation = LexicalRequestSchema.safeParse({
      organizationId: request.organizationId,
      query: request.query,
      maxResults: request.maxResults || 10,
    });

    if (!validation.success) {
      throw new Error(`KNOWLEDGE_LEXICAL_RETRIEVAL_VALIDATION_ERROR: ${validation.error.message}`);
    }

    const { query, maxResults } = validation.data;
    const organizationId = tenantContext.organizationId;

    const queryTerms = this.normalizer.normalizeQuery(query, AIConfig.lexical.maxQueryTerms);
    if (queryTerms.length === 0) {
      return [];
    }

    // Server-side tenant-isolated retrieval of current chunks
    const allChunks = await this.store.listCurrentChunks(organizationId, false);

    const candidates: Array<{ chunk: any; matchedTerms: string[]; score: number }> = [];

    for (const chunk of allChunks) {
      if (chunk.organizationId !== organizationId) continue;
      if (!this.accessPolicy.isChunkEligible(chunk, organizationId, false)) continue;
      if (!chunk.lexicalTerms || !Array.isArray(chunk.lexicalTerms) || chunk.lexicalTerms.length === 0) {
        continue;
      }

      const chunkTermsSet = new Set(chunk.lexicalTerms);
      const matchedTerms: string[] = [];

      for (const qTerm of queryTerms) {
        if (chunkTermsSet.has(qTerm)) {
          matchedTerms.push(qTerm);
        }
      }

      if (matchedTerms.length === 0) {
        continue;
      }

      // Deterministic lexical score calculation ∈ [0, 1]
      // ratio of matched query terms to total query terms, with exact match bonus
      const ratio = matchedTerms.length / queryTerms.length;
      const exactMatchBonus = chunk.content.toLowerCase().includes(query.toLowerCase()) ? 0.2 : 0.0;
      const score = Math.min(1.0, ratio + exactMatchBonus);

      candidates.push({
        chunk,
        matchedTerms,
        score,
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    const limited = candidates.slice(0, Math.min(maxResults, AIConfig.retrieval.maxResults));

    return limited.map((item, idx) => ({
      chunkId: item.chunk.id,
      organizationId: item.chunk.organizationId,
      sourceId: item.chunk.sourceId,
      sourceType: item.chunk.sourceType,
      content: item.chunk.content,
      score: item.score,
      rank: idx + 1,
      matchedTerms: item.matchedTerms,
      metadata: {
        evidenceIds: item.chunk.evidenceIds,
        trustLevel: item.chunk.trustLevel,
        sensitivity: item.chunk.sensitivity,
        inferenceType: item.chunk.inferenceType,
      },
    }));
  }
}
