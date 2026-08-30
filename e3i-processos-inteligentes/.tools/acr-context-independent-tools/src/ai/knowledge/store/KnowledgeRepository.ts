import { KnowledgeSource } from '../schemas/KnowledgeSource';
import { KnowledgeChunk } from '../schemas/KnowledgeChunk';

export interface KnowledgeRepository {
  upsertSource(source: KnowledgeSource): Promise<void>;
  upsertChunks(chunks: KnowledgeChunk[]): Promise<void>;
  getSource(organizationId: string, sourceId: string): Promise<KnowledgeSource | null>;
  listCurrentChunks(organizationId: string, includeHistorical?: boolean): Promise<KnowledgeChunk[]>;
  supersedeSourceVersion(organizationId: string, sourceId: string, newVersion: number): Promise<void>;
  findBySource(organizationId: string, sourceId: string): Promise<{ source: KnowledgeSource | null; chunks: KnowledgeChunk[] }>;
}
