export interface AIUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
}

export interface AIResponse<T = any> {
  data: T;
  provider: string;
  model: string;
  promptId: string;
  promptVersion: number;
  usage: AIUsage;
  latencyMs: number;
  trace?: {
    traceId: string;
    operation: string;
    promptId: string;
    promptVersion: number;
    provider: string;
    model: string;
    latencyMs: number;
    status: 'SUCCESS' | 'ERROR';
    inputTokens: number | null;
    outputTokens: number | null;
    cachedTokens: number | null;
    cost: null;
    contextSectionCount?: number;
    estimatedContextTokens?: number;
    evidenceCount?: number;
  };
  evidence?: any[];
  provenance?: {
    inferenceType: 'FACT' | 'INFERENCE' | 'HYPOTHESIS' | 'RECOMMENDATION';
    evidenceIds: string[];
  };
}
