import { RetrievalRequest, RetrievalResult } from '../RetrievalTypes';
import { KnowledgeRetriever, FirestoreVectorKnowledgeRetriever } from '../KnowledgeRetriever';
import { FirestoreLexicalRetriever } from '../lexical/FirestoreLexicalRetriever';
import { RankFusion, FusedCandidate } from './RankFusion';
import { RetrievalProfile, HybridBaselineV1Profile } from './RetrievalProfile';
import { TenantContext } from '../../core/AIHarness';
import { KnowledgeRepository } from '../../knowledge/store/KnowledgeRepository';
import { globalKnowledgeStore } from '../../knowledge/store/KnowledgeStore';
import { KnowledgeAccessPolicy } from '../../knowledge/security/KnowledgeAccessPolicy';
import { EmbeddingProvider } from '../../embeddings/EmbeddingProvider';

export class HybridKnowledgeRetriever implements KnowledgeRetriever {
  private vectorRetriever: FirestoreVectorKnowledgeRetriever;
  private lexicalRetriever: FirestoreLexicalRetriever;
  private accessPolicy = new KnowledgeAccessPolicy();
  private profile: RetrievalProfile;

  constructor(
    store: KnowledgeRepository = globalKnowledgeStore,
    provider?: EmbeddingProvider,
    profile: RetrievalProfile = HybridBaselineV1Profile
  ) {
    this.vectorRetriever = new FirestoreVectorKnowledgeRetriever(store, provider);
    this.lexicalRetriever = new FirestoreLexicalRetriever(store);
    this.profile = profile;
  }

  async retrieve(request: RetrievalRequest, tenantContext: TenantContext): Promise<RetrievalResult[]> {
    if (!tenantContext || !tenantContext.organizationId || request.organizationId !== tenantContext.organizationId) {
      throw new Error('AI_RETRIEVAL_TENANT_MISMATCH: Unauthorized tenant access in hybrid retrieval.');
    }

    const organizationId = tenantContext.organizationId;

    // 1. Independent Vector Retrieval
    const vectorResults = await this.vectorRetriever.retrieve(
      {
        ...request,
        maxResults: this.profile.vectorTopK,
      },
      tenantContext
    );

    // 2. Independent Lexical Retrieval
    const lexicalResults = await this.lexicalRetriever.retrieve(
      {
        organizationId,
        query: request.query,
        maxResults: this.profile.lexicalTopK,
      },
      tenantContext
    );

    // 3. Reciprocal Rank Fusion (RRF)
    const fused = RankFusion.fuse(
      vectorResults,
      lexicalResults,
      this.profile.rrfK,
      this.profile.finalTopK
    );

    // 4. Final Policy Enforcement (Defense in Depth)
    const results: RetrievalResult[] = [];

    for (const item of fused) {
      // Construct a mock chunk representation for security evaluation if needed,
      // or verify sensitivity / evidence requirements via accessPolicy
      if (item.metadata?.sensitivity === 'RESTRICTED') {
        continue; // RESTRICTED is strictly prohibited
      }
      if (!item.metadata?.evidenceIds || item.metadata.evidenceIds.length === 0) {
        continue; // Must have evidence
      }

      results.push({
        organizationId: item.organizationId,
        sourceId: item.sourceId,
        sourceType: item.sourceType,
        content: item.content,
        score: item.fusionScore,
        distance: item.vectorDistance,
        distanceMeasure: 'RRF_FUSION',
        metadata: {
          chunkId: item.chunkId,
          evidenceIds: item.metadata.evidenceIds,
          trustLevel: item.metadata.trustLevel,
          sensitivity: item.metadata.sensitivity,
          inferenceType: item.metadata.inferenceType,
          vectorRank: item.vectorRank,
          vectorDistance: item.vectorDistance,
          lexicalRank: item.lexicalRank,
          lexicalScore: item.lexicalScore,
          fusionRank: item.fusionRank,
          fusionScore: item.fusionScore,
          retrievalMethods: item.retrievalMethods,
          profileId: this.profile.id,
          profileVersion: this.profile.version,
        },
      });
    }

    return results;
  }
}

export const globalHybridRetriever = new HybridKnowledgeRetriever(globalKnowledgeStore);
