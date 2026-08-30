import { GoldenDataset, GoldenCase } from './GoldenDataset';
import { RetrievalMetricsCalculator, EvaluationMetricsResult } from './RetrievalMetrics';
import { FirestoreVectorKnowledgeRetriever } from '../KnowledgeRetriever';
import { FirestoreLexicalRetriever } from '../lexical/FirestoreLexicalRetriever';
import { HybridKnowledgeRetriever } from '../hybrid/HybridKnowledgeRetriever';
import { KnowledgeRepository } from '../../knowledge/store/KnowledgeRepository';
import { EmbeddingProvider } from '../../embeddings/EmbeddingProvider';
import { TenantContext } from '../../core/AIHarness';

export interface EvaluatorReport {
  datasetId: string;
  version: string;
  vectorOnly: EvaluationMetricsResult;
  lexicalOnly: EvaluationMetricsResult;
  hybridRrf: EvaluationMetricsResult;
}

export class RetrievalEvaluator {
  private vectorRetriever: FirestoreVectorKnowledgeRetriever;
  private lexicalRetriever: FirestoreLexicalRetriever;
  private hybridRetriever: HybridKnowledgeRetriever;

  constructor(store: KnowledgeRepository, provider?: EmbeddingProvider) {
    this.vectorRetriever = new FirestoreVectorKnowledgeRetriever(store, provider);
    this.lexicalRetriever = new FirestoreLexicalRetriever(store);
    this.hybridRetriever = new HybridKnowledgeRetriever(store, provider);
  }

  public async evaluateDataset(dataset: GoldenDataset): Promise<EvaluatorReport> {
    const vectorMap = new Map<string, { results: any[]; latencyMs: number }>();
    const lexicalMap = new Map<string, { results: any[]; latencyMs: number }>();
    const hybridMap = new Map<string, { results: any[]; latencyMs: number }>();

    for (const c of dataset.cases) {
      const tenantContext: TenantContext = {
        organizationId: c.organizationId,
        userId: 'eval-user',
        role: 'ADMIN',
      };

      // 1. Vector Only
      const startVec = performance.now();
      let vecResults: any[] = [];
      try {
        vecResults = await this.vectorRetriever.retrieve(
          { organizationId: c.organizationId, query: c.query, maxResults: 10 },
          tenantContext
        );
      } catch (e) {
        vecResults = [];
      }
      const endVec = performance.now();
      vectorMap.set(c.id, { results: vecResults, latencyMs: endVec - startVec });

      // 2. Lexical Only
      const startLex = performance.now();
      let lexResults: any[] = [];
      try {
        const rawLex = await this.lexicalRetriever.retrieve(
          { organizationId: c.organizationId, query: c.query, maxResults: 10 },
          tenantContext
        );
        lexResults = rawLex.map(l => ({
          organizationId: l.organizationId,
          sourceId: l.sourceId,
          sourceType: l.sourceType,
          content: l.content,
          score: l.score,
          distance: 1 - l.score,
          metadata: { chunkId: l.chunkId, ...l.metadata }
        }));
      } catch (e) {
        lexResults = [];
      }
      const endLex = performance.now();
      lexicalMap.set(c.id, { results: lexResults, latencyMs: endLex - startLex });

      // 3. Hybrid RRF
      const startHyb = performance.now();
      let hybResults: any[] = [];
      try {
        hybResults = await this.hybridRetriever.retrieve(
          { organizationId: c.organizationId, query: c.query, maxResults: 10 },
          tenantContext
        );
      } catch (e) {
        hybResults = [];
      }
      const endHyb = performance.now();
      hybridMap.set(c.id, { results: hybResults, latencyMs: endHyb - startHyb });
    }

    const vectorOnly = RetrievalMetricsCalculator.evaluateRun(dataset.cases, vectorMap);
    const lexicalOnly = RetrievalMetricsCalculator.evaluateRun(dataset.cases, lexicalMap);
    const hybridRrf = RetrievalMetricsCalculator.evaluateRun(dataset.cases, hybridMap);

    return {
      datasetId: dataset.datasetId,
      version: dataset.version,
      vectorOnly,
      lexicalOnly,
      hybridRrf,
    };
  }
}
