import { RetrievalResult } from '../RetrievalTypes';
import { GoldenCase } from './GoldenDataset';

export interface EvaluationMetricsResult {
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  mrr: number;
  ndcgAt5: number;
  evidenceHitRateAt5: number;
  noAnswerFalsePositiveRate: number;
  crossTenantLeaks: number;
  restrictedLeaks: number;
  supersededLeaks: number;
  resultsWithoutEvidence: number;
  totalQueries: number;
  answerableQueries: number;
  noAnswerQueries: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
}

export class RetrievalMetricsCalculator {
  public static evaluateRun(
    cases: GoldenCase[],
    resultsMap: Map<string, { results: RetrievalResult[]; latencyMs: number }>
  ): EvaluationMetricsResult {
    let recall1Sum = 0;
    let recall3Sum = 0;
    let recall5Sum = 0;
    let precision1Sum = 0;
    let precision3Sum = 0;
    let precision5Sum = 0;
    let mrrSum = 0;
    let ndcg5Sum = 0;
    let evidenceHit5Count = 0;
    let noAnswerFalsePositives = 0;

    let crossTenantLeaks = 0;
    let restrictedLeaks = 0;
    let supersededLeaks = 0;
    let resultsWithoutEvidence = 0;

    const latencies: number[] = [];
    let answerableCount = 0;
    let noAnswerCount = 0;

    for (const c of cases) {
      const run = resultsMap.get(c.id);
      const results = run?.results || [];
      const latency = run?.latencyMs || 0;
      latencies.push(latency);

      const retrievedChunkIds = results.map(r => r.metadata?.chunkId || r.sourceId);

      // Security checks
      for (const r of results) {
        if (r.organizationId !== c.organizationId) {
          crossTenantLeaks++;
        }
        if (r.metadata?.sensitivity === 'RESTRICTED') {
          restrictedLeaks++;
        }
        if (r.metadata?.supersededAt) {
          supersededLeaks++;
        }
        if (!r.metadata?.evidenceIds || r.metadata.evidenceIds.length === 0) {
          resultsWithoutEvidence++;
        }
        if (c.forbiddenChunkIds.includes(r.metadata?.chunkId || r.sourceId)) {
          // If a forbidden chunk (like superseded or cross-tenant) was returned
          if (c.category === 'superseded') supersededLeaks++;
          if (c.category === 'cross_tenant') crossTenantLeaks++;
        }
      }

      if (c.noAnswer) {
        noAnswerCount++;
        if (results.length > 0) {
          noAnswerFalsePositives++;
        }
        // For no-answer, recall/precision are not applicable in standard way
        continue;
      }

      answerableCount++;
      const relevantSet = new Set(c.relevantChunkIds);
      if (relevantSet.size === 0) continue;

      // Recall & Precision @ K
      const top1 = retrievedChunkIds.slice(0, 1);
      const top3 = retrievedChunkIds.slice(0, 3);
      const top5 = retrievedChunkIds.slice(0, 5);

      const hit1 = top1.filter(id => relevantSet.has(id)).length;
      const hit3 = top3.filter(id => relevantSet.has(id)).length;
      const hit5 = top5.filter(id => relevantSet.has(id)).length;

      recall1Sum += hit1 / relevantSet.size;
      recall3Sum += hit3 / relevantSet.size;
      recall5Sum += hit5 / relevantSet.size;

      precision1Sum += top1.length > 0 ? hit1 / top1.length : 0;
      precision3Sum += top3.length > 0 ? hit3 / top3.length : 0;
      precision5Sum += top5.length > 0 ? hit5 / top5.length : 0;

      if (hit5 > 0) {
        evidenceHit5Count++;
      }

      // MRR
      let firstRank = 0;
      for (let i = 0; i < retrievedChunkIds.length; i++) {
        if (relevantSet.has(retrievedChunkIds[i])) {
          firstRank = i + 1;
          break;
        }
      }
      if (firstRank > 0) {
        mrrSum += 1 / firstRank;
      }

      // nDCG@5 (Binary relevance DCG / IDCG)
      let dcg = 0;
      for (let i = 0; i < Math.min(5, retrievedChunkIds.length); i++) {
        if (relevantSet.has(retrievedChunkIds[i])) {
          dcg += 1 / Math.log2(i + 2);
        }
      }
      let idcg = 0;
      for (let i = 0; i < Math.min(5, relevantSet.size); i++) {
        idcg += 1 / Math.log2(i + 2);
      }
      ndcg5Sum += idcg > 0 ? dcg / idcg : 0;
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

    const totalAns = answerableCount || 1;

    return {
      recallAt1: recall1Sum / totalAns,
      recallAt3: recall3Sum / totalAns,
      recallAt5: recall5Sum / totalAns,
      precisionAt1: precision1Sum / totalAns,
      precisionAt3: precision3Sum / totalAns,
      precisionAt5: precision5Sum / totalAns,
      mrr: mrrSum / totalAns,
      ndcgAt5: ndcg5Sum / totalAns,
      evidenceHitRateAt5: evidenceHit5Count / totalAns,
      noAnswerFalsePositiveRate: noAnswerCount > 0 ? noAnswerFalsePositives / noAnswerCount : 0,
      crossTenantLeaks,
      restrictedLeaks,
      supersededLeaks,
      resultsWithoutEvidence,
      totalQueries: cases.length,
      answerableQueries: answerableCount,
      noAnswerQueries: noAnswerCount,
      latencyP50Ms: p50,
      latencyP95Ms: p95,
    };
  }
}
