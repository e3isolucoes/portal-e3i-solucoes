export interface RetrievalProfile {
  id: string;
  version: string;
  vectorTopK: number;
  lexicalTopK: number;
  finalTopK: number;
  rrfK: number;
  vectorMaxDistance?: number;
  lexicalMinScore?: number;
  calibratedFrom?: string;
}

export const HybridBaselineV1Profile: RetrievalProfile = {
  id: 'hybrid-baseline',
  version: 'v1',
  vectorTopK: 10,
  lexicalTopK: 10,
  finalTopK: 10,
  rrfK: 60,
  calibratedFrom: 'golden.v1',
};
