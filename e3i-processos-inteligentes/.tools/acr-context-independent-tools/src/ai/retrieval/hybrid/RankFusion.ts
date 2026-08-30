import { RetrievalResult } from '../RetrievalTypes';
import { LexicalResult } from '../lexical/LexicalTypes';

export interface FusedCandidate {
  chunkId: string;
  organizationId: string;
  sourceId: string;
  sourceType: string;
  content: unknown;
  vectorRank?: number;
  vectorDistance?: number;
  lexicalRank?: number;
  lexicalScore?: number;
  fusionRank: number;
  fusionScore: number;
  retrievalMethods: string[];
  metadata?: Record<string, any>;
}

export class RankFusion {
  public static fuse(
    vectorResults: RetrievalResult[],
    lexicalResults: LexicalResult[],
    k: number = 60,
    finalTopK: number = 10
  ): FusedCandidate[] {
    const map = new Map<string, {
      vectorRank?: number;
      vectorDistance?: number;
      lexicalRank?: number;
      lexicalScore?: number;
      chunkId: string;
      organizationId: string;
      sourceId: string;
      sourceType: string;
      content: unknown;
      metadata?: Record<string, any>;
      retrievalMethods: string[];
    }>();

    // Process Vector Results
    vectorResults.forEach((res, idx) => {
      const chunkId = res.metadata?.chunkId || res.sourceId;
      if (!map.has(chunkId)) {
        map.set(chunkId, {
          chunkId,
          organizationId: res.organizationId,
          sourceId: res.sourceId,
          sourceType: res.sourceType,
          content: res.content,
          vectorRank: idx + 1,
          vectorDistance: res.distance ?? res.score,
          metadata: res.metadata,
          retrievalMethods: ['vector'],
        });
      } else {
        const item = map.get(chunkId)!;
        item.vectorRank = idx + 1;
        item.vectorDistance = res.distance ?? res.score;
        if (!item.retrievalMethods.includes('vector')) {
          item.retrievalMethods.push('vector');
        }
      }
    });

    // Process Lexical Results
    lexicalResults.forEach((res, idx) => {
      const chunkId = res.chunkId;
      if (!map.has(chunkId)) {
        map.set(chunkId, {
          chunkId,
          organizationId: res.organizationId,
          sourceId: res.sourceId,
          sourceType: res.sourceType,
          content: res.content,
          lexicalRank: idx + 1,
          lexicalScore: res.score,
          metadata: res.metadata,
          retrievalMethods: ['lexical'],
        });
      } else {
        const item = map.get(chunkId)!;
        item.lexicalRank = res.rank || (idx + 1);
        item.lexicalScore = res.score;
        if (!item.retrievalMethods.includes('lexical')) {
          item.retrievalMethods.push('lexical');
        }
      }
    });

    // Calculate RRF Scores
    const scored: Array<{ candidate: any; rrfScore: number }> = [];

    for (const item of map.values()) {
      let rrfScore = 0;
      if (item.vectorRank !== undefined) {
        rrfScore += 1 / (k + item.vectorRank);
      }
      if (item.lexicalRank !== undefined) {
        rrfScore += 1 / (k + item.lexicalRank);
      }
      scored.push({ candidate: item, rrfScore });
    }

    scored.sort((a, b) => b.rrfScore - a.rrfScore);

    const limited = scored.slice(0, finalTopK);

    return limited.map(({ candidate, rrfScore }, idx) => ({
      chunkId: candidate.chunkId,
      organizationId: candidate.organizationId,
      sourceId: candidate.sourceId,
      sourceType: candidate.sourceType,
      content: candidate.content,
      vectorRank: candidate.vectorRank,
      vectorDistance: candidate.vectorDistance,
      lexicalRank: candidate.lexicalRank,
      lexicalScore: candidate.lexicalScore,
      fusionRank: idx + 1,
      fusionScore: rrfScore,
      retrievalMethods: candidate.retrievalMethods,
      metadata: candidate.metadata,
    }));
  }
}
