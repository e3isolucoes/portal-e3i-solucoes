export interface AITraceRecord {
  traceId: string;
  organizationId: string;
  userId: string;
  operation: string;
  promptId: string;
  promptVersion: number;
  modelProfile: string;
  provider: string;
  model: string;
  contextSectionCount: number;
  estimatedContextTokens: number;
  evidenceCount: number;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  status: 'SUCCESS' | 'ERROR';
  errorType?: string;
  startedAt: string;
  completedAt: string;
}
