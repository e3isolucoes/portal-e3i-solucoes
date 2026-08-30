export interface LexicalResult {
  chunkId: string;
  organizationId: string;
  sourceId: string;
  sourceType: string;
  content: unknown;
  score: number;
  rank: number;
  matchedTerms: string[];
  metadata?: Record<string, any>;
}

export interface LexicalIndexResult {
  chunkId: string;
  status: 'INDEXED' | 'NO_OP' | 'FAILED';
  termsCount?: number;
  error?: string;
}
