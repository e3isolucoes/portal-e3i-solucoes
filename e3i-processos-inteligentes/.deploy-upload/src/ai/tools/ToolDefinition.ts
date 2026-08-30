import { z } from 'zod';
import { PermissionCode } from '../../permissions';
import { AiAutonomyLevel } from '../security/AIPolicyEngine';

export type ToolStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'DISABLED';
export type ToolRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ToolSideEffect = 'NONE' | 'READ' | 'WRITE' | 'EXTERNAL_WRITE' | 'DESTRUCTIVE';
export type DataClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface ToolDefinition<TInput = any, TOutput = any> {
  id: string;
  version: number;
  name: string;
  description: string;
  status: ToolStatus;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  requiredPermissions: PermissionCode[];
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
  sideEffect: ToolSideEffect;
  idempotent: boolean;
  dataClassification: DataClassification;
  allowedAutonomyLevels: AiAutonomyLevel[];
  handler: (input: TInput, context: { organizationId: string; userId: string }) => Promise<TOutput>;
}
