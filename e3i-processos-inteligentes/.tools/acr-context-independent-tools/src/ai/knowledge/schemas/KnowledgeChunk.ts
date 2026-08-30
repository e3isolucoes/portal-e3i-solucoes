import { z } from 'zod';
import { KnowledgeSourceType, TrustLevel, SensitivityLevel } from './KnowledgeSource';
import { InferenceType } from '../../evidence/Evidence';

export interface KnowledgeChunk {
  id: string;
  organizationId: string;
  sourceId: string;
  sourceType: KnowledgeSourceType;
  sourceVersion: number;
  content: string;
  contentHash: string;
  chunkIndex: number;
  inferenceType: InferenceType;
  metadata: Record<string, any>;
  trustLevel: TrustLevel;
  sensitivity: SensitivityLevel;
  evidenceIds: string[];
  containsPII?: boolean;
  createdAt: string;
  supersededAt?: string;
  embedding?: number[];
  embeddingModel?: string;
  embeddingDimensions?: number;
  embeddingContentHash?: string;
  embeddingStatus?: 'PENDING' | 'READY' | 'FAILED' | 'STALE';
  embeddedAt?: string;
  aiRetrievalEligible?: boolean;
  lexicalTerms?: string[];
  lexicalIndexVersion?: number;
  lexicalContentHash?: string;
  lexicalIndexedAt?: string;
}

export const KnowledgeChunkSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  sourceId: z.string().min(1),
  sourceType: z.enum([
    'DISCOVERY_ANSWER',
    'BUSINESS_CONTEXT',
    'STRATEGY',
    'ORGANIZATION',
    'SYSTEM',
    'PROCESS',
    'USER_DOCUMENT',
    'EMAIL',
    'MCP_RESOURCE',
    'TOOL_RESULT',
    'EXTERNAL_WEB'
  ]),
  sourceVersion: z.number().int().positive(),
  content: z.string(),
  contentHash: z.string().min(1),
  chunkIndex: z.number().int().nonnegative(),
  inferenceType: z.enum(['FACT', 'INFERENCE', 'HYPOTHESIS', 'RECOMMENDATION']),
  metadata: z.record(z.string(), z.any()),
  trustLevel: z.enum(['USER_PROVIDED', 'BUSINESS_CONFIRMED', 'SYSTEM_TRUSTED']),
  sensitivity: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']),
  evidenceIds: z.array(z.string()),
  containsPII: z.boolean().optional(),
  createdAt: z.string().min(1),
  supersededAt: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  embeddingModel: z.string().optional(),
  embeddingDimensions: z.number().int().optional(),
  embeddingContentHash: z.string().optional(),
  embeddingStatus: z.enum(['PENDING', 'READY', 'FAILED', 'STALE']).optional(),
  embeddedAt: z.string().optional(),
  aiRetrievalEligible: z.boolean().optional(),
  lexicalTerms: z.array(z.string()).optional(),
  lexicalIndexVersion: z.number().int().optional(),
  lexicalContentHash: z.string().optional(),
  lexicalIndexedAt: z.string().optional(),
});
