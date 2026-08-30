import { KnowledgeSource, KnowledgeSourceSchema } from '../schemas/KnowledgeSource';
import { KnowledgeChunk, KnowledgeChunkSchema } from '../schemas/KnowledgeChunk';
import { KnowledgeNormalizer } from './KnowledgeNormalizer';
import { KnowledgeChunker } from '../chunking/KnowledgeChunker';
import { KnowledgeRepository } from '../store/KnowledgeRepository';
import { InferenceType } from '../../evidence/Evidence';

export interface IngestionResult {
  ingestionId: string;
  organizationId: string;
  sourceId: string;
  sourceType: string;
  sourceVersion: number;
  inputSize: number;
  chunkCount: number;
  durationMs: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorType?: string;
}

export class KnowledgeIngestionService {
  private normalizer = new KnowledgeNormalizer();
  private chunker = new KnowledgeChunker();

  constructor(private store: KnowledgeRepository) {}

  public async ingest(
    source: KnowledgeSource,
    rawContent: string,
    evidenceId: string,
    inferenceType: InferenceType = 'FACT',
    customMetadata?: Record<string, any>
  ): Promise<IngestionResult> {
    const startTime = Date.now();
    const ingestionId = `ing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      // 1. Validate Source schema
      const sourceValidation = KnowledgeSourceSchema.safeParse(source);
      if (!sourceValidation.success) {
        throw new Error(`KNOWLEDGE_SOURCE_VALIDATION_ERROR: ${sourceValidation.error.message}`);
      }

      // 2. Normalize and check secrets
      let doc;
      try {
        doc = this.normalizer.normalize(source, rawContent, inferenceType, customMetadata);
      } catch (err: any) {
        if (err.message && err.message.startsWith('KNOWLEDGE_SENSITIVE_DATA_BLOCKED')) {
          throw err;
        }
        throw new Error(`KNOWLEDGE_SOURCE_VALIDATION_ERROR: ${err.message}`);
      }

      // 3. Check existing source for idempotency or version change
      const existing = await this.store.findBySource(source.organizationId, source.id);
      
      // Compute chunks
      const evidenceIds = [evidenceId];
      const chunks = this.chunker.chunk(doc, evidenceIds);

      for (const chunk of chunks) {
        const chunkVal = KnowledgeChunkSchema.safeParse(chunk);
        if (!chunkVal.success) {
          throw new Error(`KNOWLEDGE_CHUNK_VALIDATION_ERROR: ${chunkVal.error.message}`);
        }
      }

      // 4. Idempotency check: if source exists with same version and content hash matches
      if (existing.source && existing.source.version === source.version) {
        const existingHashes = new Set(existing.chunks.filter(c => !c.supersededAt).map(c => c.contentHash));
        const newHashes = new Set(chunks.map(c => c.contentHash));
        
        let identical = existingHashes.size === newHashes.size;
        if (identical) {
          for (const h of newHashes) {
            if (!existingHashes.has(h)) {
              identical = false;
              break;
            }
          }
        }

        if (identical) {
          const durationMs = Date.now() - startTime;
          return {
            ingestionId,
            organizationId: source.organizationId,
            sourceId: source.id,
            sourceType: source.sourceType,
            sourceVersion: source.version,
            inputSize: rawContent.length,
            chunkCount: existing.chunks.length,
            durationMs,
            status: 'COMPLETED',
          };
        }
      }

      // 5. If version is higher or content updated, supersede old version
      if (existing.source && existing.source.version < source.version) {
        await this.store.supersedeSourceVersion(source.organizationId, source.id, source.version);
      }

      // 6. Save new source and chunks
      source.status = 'ACTIVE';
      source.updatedAt = new Date().toISOString();
      await this.store.upsertSource(source);
      await this.store.upsertChunks(chunks);

      const durationMs = Date.now() - startTime;
      return {
        ingestionId,
        organizationId: source.organizationId,
        sourceId: source.id,
        sourceType: source.sourceType,
        sourceVersion: source.version,
        inputSize: rawContent.length,
        chunkCount: chunks.length,
        durationMs,
        status: 'COMPLETED',
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const errorType = error.message?.includes(':') ? error.message.split(':')[0] : 'KNOWLEDGE_INGESTION_FAILED';
      return {
        ingestionId,
        organizationId: source.organizationId,
        sourceId: source.id,
        sourceType: source.sourceType,
        sourceVersion: source.version,
        inputSize: rawContent.length,
        chunkCount: 0,
        durationMs,
        status: 'FAILED',
        errorType,
      };
    }
  }
}
