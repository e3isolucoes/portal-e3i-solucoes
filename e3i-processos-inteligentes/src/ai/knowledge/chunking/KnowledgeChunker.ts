import crypto from 'crypto';
import { KnowledgeDocument } from '../schemas/KnowledgeDocument';
import { KnowledgeChunk } from '../schemas/KnowledgeChunk';
import { getChunkingConfig } from './ChunkingPolicy';

export class KnowledgeChunker {
  public computeContentHash(content: string): string {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  public chunk(doc: KnowledgeDocument, evidenceIds: string[]): KnowledgeChunk[] {
    const config = getChunkingConfig();
    const content = doc.content.trim();

    if (!content) {
      return [];
    }

    // Small text rule: do not fragment trivial answers / short texts unnecessarily
    if (content.length <= config.maxSize) {
      const hash = this.computeContentHash(content);
      return [
        {
          id: `chk-${doc.id}-0`,
          organizationId: doc.organizationId,
          sourceId: doc.sourceId,
          sourceType: doc.metadata.sourceType || 'USER_DOCUMENT',
          sourceVersion: doc.sourceVersion,
          content,
          contentHash: hash,
          chunkIndex: 0,
          inferenceType: doc.inferenceType,
          metadata: doc.metadata,
          trustLevel: doc.trustLevel,
          sensitivity: doc.sensitivity,
          evidenceIds,
          containsPII: doc.containsPII,
          createdAt: new Date().toISOString(),
        }
      ];
    }

    // Long text splitting with overlap and sentence/paragraph boundary awareness
    const chunks: KnowledgeChunk[] = [];
    let currentIndex = 0;
    let chunkIndex = 0;

    while (currentIndex < content.length) {
      let endIndex = Math.min(currentIndex + config.targetSize, content.length);
      
      // Try to break at a sentence or space boundary if possible within max size
      if (endIndex < content.length) {
        const slice = content.substring(currentIndex, Math.min(currentIndex + config.maxSize, content.length));
        const lastPeriod = slice.lastIndexOf('.');
        const lastNewline = slice.lastIndexOf('\n');
        const lastSpace = slice.lastIndexOf(' ');
        
        const breakPoint = Math.max(lastPeriod, lastNewline, lastSpace);
        if (breakPoint > config.targetSize * 0.5) {
          endIndex = currentIndex + breakPoint + 1;
        }
      }

      const chunkContent = content.substring(currentIndex, endIndex).trim();
      if (chunkContent) {
        const hash = this.computeContentHash(chunkContent);
        chunks.push({
          id: `chk-${doc.id}-${chunkIndex}`,
          organizationId: doc.organizationId,
          sourceId: doc.sourceId,
          sourceType: doc.metadata.sourceType || 'USER_DOCUMENT',
          sourceVersion: doc.sourceVersion,
          content: chunkContent,
          contentHash: hash,
          chunkIndex,
          inferenceType: doc.inferenceType,
          metadata: doc.metadata,
          trustLevel: doc.trustLevel,
          sensitivity: doc.sensitivity,
          evidenceIds,
          containsPII: doc.containsPII,
          createdAt: new Date().toISOString(),
        });
        chunkIndex++;
      }

      if (endIndex >= content.length) {
        break;
      }

      const nextIndex = Math.max(currentIndex + 1, endIndex - config.overlap);
      if (nextIndex <= currentIndex || nextIndex >= content.length) {
        break;
      }
      currentIndex = nextIndex;
    }

    return chunks;
  }
}
