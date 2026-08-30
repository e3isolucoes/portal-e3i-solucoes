import { z } from 'zod';

export type KnowledgeSourceType =
  | 'DISCOVERY_ANSWER'
  | 'BUSINESS_CONTEXT'
  | 'STRATEGY'
  | 'ORGANIZATION'
  | 'SYSTEM'
  | 'PROCESS'
  | 'USER_DOCUMENT'
  | 'EMAIL'
  | 'MCP_RESOURCE'
  | 'TOOL_RESULT'
  | 'EXTERNAL_WEB';

export type KnowledgeSourceStatus =
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'DELETED'
  | 'REQUIRES_REVIEW';

export type TrustLevel =
  | 'USER_PROVIDED'
  | 'BUSINESS_CONFIRMED'
  | 'SYSTEM_TRUSTED';

export type SensitivityLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED';

export interface KnowledgeSource {
  id: string;
  organizationId: string;
  sourceType: KnowledgeSourceType;
  sourceReference: string;
  title: string;
  version: number;
  status: KnowledgeSourceStatus;
  trustLevel: TrustLevel;
  sensitivity: SensitivityLevel;
  createdAt: string;
  updatedAt: string;
}

export const KnowledgeSourceSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
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
  sourceReference: z.string().min(1),
  title: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['ACTIVE', 'SUPERSEDED', 'DELETED', 'REQUIRES_REVIEW']),
  trustLevel: z.enum(['USER_PROVIDED', 'BUSINESS_CONFIRMED', 'SYSTEM_TRUSTED']),
  sensitivity: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
