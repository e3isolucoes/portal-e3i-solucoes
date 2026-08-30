import { ModelProfile } from '../models/ModelProvider';
import { z } from 'zod';

export type PromptStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED';

export interface PromptDefinition {
  id: string;
  version: number;
  purpose: string;
  status: PromptStatus;
  modelProfile: ModelProfile;
  systemInstructions: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
}
