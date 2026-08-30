export type EvidenceSourceType =
  | 'USER_INPUT'
  | 'BUSINESS_DATA'
  | 'SYSTEM_RULE'
  | 'DOCUMENT'
  | 'RAG_CHUNK'
  | 'TOOL_RESULT'
  | 'MCP_RESOURCE';

export interface Evidence {
  id: string;
  organizationId: string;
  sourceType: EvidenceSourceType;
  sourceId: string;
  excerpt?: string;
  createdAt: string;
}

export type InferenceType = 'FACT' | 'INFERENCE' | 'HYPOTHESIS' | 'RECOMMENDATION';

export interface ProvenanceMetadata {
  inferenceType: InferenceType;
  evidenceIds: string[];
}
