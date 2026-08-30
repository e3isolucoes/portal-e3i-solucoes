import { KnowledgeSource, KnowledgeSourceType, TrustLevel, SensitivityLevel } from '../schemas/KnowledgeSource';
import { InferenceType } from '../../evidence/Evidence';

export interface RawDiscoveryAnswerInput {
  organizationId: string;
  answerId: string;
  discoverySessionId: string;
  questionKey: string;
  answerText: string;
  trustLevel?: TrustLevel;
  sensitivity?: SensitivityLevel;
}

export interface RawBusinessContextInput {
  organizationId: string;
  contextId: string;
  title: string;
  content: string;
  inferenceType?: InferenceType;
  trustLevel?: TrustLevel;
  sensitivity?: SensitivityLevel;
}

export class KnowledgeSourceAdapter {
  public adaptDiscoveryAnswer(input: RawDiscoveryAnswerInput, version: number = 1): { source: KnowledgeSource; rawContent: string; inferenceType: InferenceType; evidenceId: string } {
    if (!input.organizationId || !input.answerId) {
      throw new Error('KNOWLEDGE_SOURCE_VALIDATION_ERROR: organizationId and answerId are required for Discovery Answer source.');
    }

    const source: KnowledgeSource = {
      id: `src-disc-${input.answerId}`,
      organizationId: input.organizationId,
      sourceType: 'DISCOVERY_ANSWER',
      sourceReference: input.answerId,
      title: `Discovery Answer: ${input.questionKey}`,
      version,
      status: 'ACTIVE',
      trustLevel: input.trustLevel || 'USER_PROVIDED',
      sensitivity: input.sensitivity || 'INTERNAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      source,
      rawContent: input.answerText,
      inferenceType: 'FACT', // Discovery answers provided by user are treated as factual input
      evidenceId: input.answerId,
    };
  }

  public adaptBusinessContext(input: RawBusinessContextInput, version: number = 1): { source: KnowledgeSource; rawContent: string; inferenceType: InferenceType; evidenceId: string } {
    if (!input.organizationId || !input.contextId) {
      throw new Error('KNOWLEDGE_SOURCE_VALIDATION_ERROR: organizationId and contextId are required for Business Context source.');
    }

    const inferenceType = input.inferenceType || 'FACT';

    const source: KnowledgeSource = {
      id: `src-bc-${input.contextId}`,
      organizationId: input.organizationId,
      sourceType: 'BUSINESS_CONTEXT',
      sourceReference: input.contextId,
      title: input.title,
      version,
      status: 'ACTIVE',
      trustLevel: input.trustLevel || 'BUSINESS_CONFIRMED',
      sensitivity: input.sensitivity || 'INTERNAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      source,
      rawContent: input.content,
      inferenceType,
      evidenceId: input.contextId,
    };
  }
}
