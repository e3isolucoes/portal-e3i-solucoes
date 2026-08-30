import { z } from 'zod';
import { TrustLevel, SensitivityLevel } from './KnowledgeSource';
import { InferenceType } from '../../evidence/Evidence';

export interface KnowledgeDocument {
  id: string;
  organizationId: string;
  sourceId: string;
  sourceVersion: number;
  title: string;
  content: string;
  inferenceType: InferenceType;
  metadata: Record<string, any>;
  trustLevel: TrustLevel;
  sensitivity: SensitivityLevel;
  containsPII?: boolean;
  createdAt: string;
}

export const KnowledgeDocumentSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  sourceId: z.string().min(1),
  sourceVersion: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string(),
  inferenceType: z.enum(['FACT', 'INFERENCE', 'HYPOTHESIS', 'RECOMMENDATION']),
  metadata: z.record(z.string(), z.any()),
  trustLevel: z.enum(['USER_PROVIDED', 'BUSINESS_CONFIRMED', 'SYSTEM_TRUSTED']),
  sensitivity: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']),
  containsPII: z.boolean().optional(),
  createdAt: z.string().min(1),
});
