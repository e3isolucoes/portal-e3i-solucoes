import { KnowledgeChunk } from '../../knowledge/schemas/KnowledgeChunk';
import { KnowledgeRepository } from '../../knowledge/store/KnowledgeRepository';
import { LexicalNormalizer, globalLexicalNormalizer } from './LexicalNormalizer';
import { AIConfig } from '../../config/AIConfig';
import { KnowledgeAccessPolicy } from '../../knowledge/security/KnowledgeAccessPolicy';
import { LexicalIndexResult } from './LexicalTypes';

export class LexicalIndexer {
  private normalizer: LexicalNormalizer;
  private accessPolicy = new KnowledgeAccessPolicy();
  private indexVersion: number;

  constructor(normalizer?: LexicalNormalizer, indexVersion?: number) {
    this.normalizer = normalizer || globalLexicalNormalizer;
    this.indexVersion = indexVersion || AIConfig.lexical.indexVersion;
  }

  public async indexOrganizationChunks(organizationId: string, store: KnowledgeRepository, maxChunks: number = 100): Promise<LexicalIndexResult[]> {
    const results: LexicalIndexResult[] = [];
    const chunks = await store.listCurrentChunks(organizationId, false);

    let processed = 0;
    for (const chunk of chunks) {
      if (processed >= maxChunks) break;

      const isEligible = this.accessPolicy.isChunkEligible(chunk, organizationId, false) && chunk.evidenceIds && chunk.evidenceIds.length > 0;

      if (!isEligible) {
        continue;
      }

      const sameHash = chunk.lexicalContentHash === chunk.contentHash;
      const sameVersion = chunk.lexicalIndexVersion === this.indexVersion;
      const hasTerms = chunk.lexicalTerms && Array.isArray(chunk.lexicalTerms) && chunk.lexicalTerms.length > 0;

      if (sameHash && sameVersion && hasTerms) {
        results.push({ chunkId: chunk.id, status: 'NO_OP', termsCount: chunk.lexicalTerms!.length });
        continue;
      }

      try {
        const terms = this.normalizer.normalizeText(chunk.content, true);

        chunk.lexicalTerms = terms;
        chunk.lexicalIndexVersion = this.indexVersion;
        chunk.lexicalContentHash = chunk.contentHash;
        chunk.lexicalIndexedAt = new Date().toISOString();

        await store.upsertChunks([chunk]);
        results.push({ chunkId: chunk.id, status: 'INDEXED', termsCount: terms.length });
        processed++;
      } catch (err: any) {
        results.push({ chunkId: chunk.id, status: 'FAILED', error: err.message });
        processed++;
      }
    }

    return results;
  }
}

export class BuildCurrentLexicalIndexUseCase {
  private indexer = new LexicalIndexer();

  async execute(organizationId: string, store: KnowledgeRepository): Promise<LexicalIndexResult[]> {
    return this.indexer.indexOrganizationChunks(organizationId, store, 500);
  }
}
