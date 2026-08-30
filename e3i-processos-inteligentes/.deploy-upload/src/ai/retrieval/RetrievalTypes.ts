export interface RetrievalRequest {
  organizationId: string;
  query: string;
  maxResults: number;
  filters?: Record<string, any>;
}

export interface RetrievalResult {
  organizationId: string;
  sourceId: string;
  sourceType: string;
  content: unknown;
  score: number;
  distance?: number;
  distanceMeasure?: string;
  metadata?: Record<string, any>;
}
