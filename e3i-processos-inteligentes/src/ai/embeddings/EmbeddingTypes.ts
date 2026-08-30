export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export type EmbeddingStatus = 'PENDING' | 'READY' | 'FAILED' | 'STALE';

export interface EmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
  tokenCount: number | null;
  provider: string;
  generatedAt: string;
}

export interface EmbeddingConfig {
  enabled: boolean;
  provider: string;
  model: string;
  dimensions: number;
  distanceMeasure: string;
  maxBatchSize: number;
}
