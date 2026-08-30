import { KnowledgeSource } from '../schemas/KnowledgeSource';
import { KnowledgeChunk } from '../schemas/KnowledgeChunk';
import { KnowledgeRepository } from './KnowledgeRepository';

export class InMemoryKnowledgeStore implements KnowledgeRepository {
  private sources: Map<string, KnowledgeSource> = new Map(); // key: `${orgId}:${sourceId}`
  private chunks: Map<string, KnowledgeChunk> = new Map(); // key: chunk.id

  async upsertSource(source: KnowledgeSource): Promise<void> {
    if (!source.organizationId || !source.id) {
      throw new Error('KNOWLEDGE_SOURCE_VALIDATION_ERROR: organizationId and id are required.');
    }
    const key = `${source.organizationId}:${source.id}`;
    this.sources.set(key, { ...source });
  }

  async upsertChunks(chunks: KnowledgeChunk[]): Promise<void> {
    for (const chunk of chunks) {
      if (!chunk.organizationId || !chunk.id) {
        throw new Error('KNOWLEDGE_CHUNK_VALIDATION_ERROR: organizationId and id are required.');
      }
      this.chunks.set(chunk.id, { ...chunk });
    }
  }

  async getSource(organizationId: string, sourceId: string): Promise<KnowledgeSource | null> {
    const key = `${organizationId}:${sourceId}`;
    const source = this.sources.get(key);
    if (!source) {
      for (const s of this.sources.values()) {
        if (s.id === sourceId && s.organizationId !== organizationId) {
          throw new Error('KNOWLEDGE_TENANT_MISMATCH: Unauthorized cross-tenant knowledge access.');
        }
      }
      return null;
    }
    if (source.organizationId !== organizationId) {
      throw new Error('KNOWLEDGE_TENANT_MISMATCH: Unauthorized cross-tenant knowledge access.');
    }
    return source;
  }

  async listCurrentChunks(organizationId: string, includeHistorical: boolean = false): Promise<KnowledgeChunk[]> {
    const results: KnowledgeChunk[] = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.organizationId !== organizationId) {
        continue;
      }
      if (!includeHistorical && chunk.supersededAt) {
        continue;
      }
      results.push(chunk);
    }
    return results;
  }

  async supersedeSourceVersion(organizationId: string, sourceId: string, newVersion: number): Promise<void> {
    const key = `${organizationId}:${sourceId}`;
    const source = this.sources.get(key);
    if (source) {
      source.status = 'SUPERSEDED';
      source.updatedAt = new Date().toISOString();
      this.sources.set(key, source);
    }

    const now = new Date().toISOString();
    for (const [id, chunk] of this.chunks.entries()) {
      if (chunk.organizationId === organizationId && chunk.sourceId === sourceId && !chunk.supersededAt) {
        chunk.supersededAt = now;
        this.chunks.set(id, chunk);
      }
    }
  }

  async findBySource(organizationId: string, sourceId: string): Promise<{ source: KnowledgeSource | null; chunks: KnowledgeChunk[] }> {
    const source = await this.getSource(organizationId, sourceId);
    const chunks: KnowledgeChunk[] = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.organizationId === organizationId && chunk.sourceId === sourceId) {
        chunks.push(chunk);
      }
    }
    return { source, chunks };
  }
}

export class KnowledgeStore implements KnowledgeRepository {
  private memStore = new InMemoryKnowledgeStore();

  async upsertSource(source: KnowledgeSource): Promise<void> {
    return this.memStore.upsertSource(source);
  }

  async upsertChunks(chunks: KnowledgeChunk[]): Promise<void> {
    return this.memStore.upsertChunks(chunks);
  }

  async getSource(organizationId: string, sourceId: string): Promise<KnowledgeSource | null> {
    return this.memStore.getSource(organizationId, sourceId);
  }

  async listCurrentChunks(organizationId: string, includeHistorical: boolean = false): Promise<KnowledgeChunk[]> {
    return this.memStore.listCurrentChunks(organizationId, includeHistorical);
  }

  async supersedeSourceVersion(organizationId: string, sourceId: string, newVersion: number): Promise<void> {
    return this.memStore.supersedeSourceVersion(organizationId, sourceId, newVersion);
  }

  async findBySource(organizationId: string, sourceId: string): Promise<{ source: KnowledgeSource | null; chunks: KnowledgeChunk[] }> {
    return this.memStore.findBySource(organizationId, sourceId);
  }
}

export const globalKnowledgeStore = new KnowledgeStore();
