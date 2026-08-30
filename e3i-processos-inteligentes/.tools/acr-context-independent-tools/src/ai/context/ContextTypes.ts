export type ContextContentType =
  | 'SYSTEM_RULE'
  | 'TENANT_CONTEXT'
  | 'USER_INPUT'
  | 'CONFIRMED_BUSINESS_FACT'
  | 'INFERENCE'
  | 'UNTRUSTED_EXTERNAL_CONTENT';

export type TrustLevel =
  | 'SYSTEM_TRUSTED'
  | 'APPLICATION_TRUSTED'
  | 'BUSINESS_CONFIRMED'
  | 'USER_PROVIDED'
  | 'UNTRUSTED_EXTERNAL';

export type SensitivityLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED';

export interface ContextSection {
  id: string;
  type: ContextContentType;
  sourceId: string | null;
  content: unknown;
  trustLevel: TrustLevel;
  sensitivity: SensitivityLevel;
  estimatedTokens: number;
  organizationId?: string;
}

export interface ContextRequirement {
  type: ContextContentType;
  required: boolean;
  maxItems?: number;
}

export type ContextExclusionReason =
  | 'TENANT_MISMATCH'
  | 'NOT_REQUIRED'
  | 'BUDGET_EXCEEDED'
  | 'SENSITIVE'
  | 'INVALID';

export interface ContextExclusion {
  sourceId: string;
  reason: ContextExclusionReason;
}

export interface EvidenceReference {
  id: string;
  sourceType: string;
  sourceId: string;
}

export interface CompiledContext {
  sections: ContextSection[];
  evidence: EvidenceReference[];
  estimatedTokens: number;
  excludedSources: ContextExclusion[];
}
