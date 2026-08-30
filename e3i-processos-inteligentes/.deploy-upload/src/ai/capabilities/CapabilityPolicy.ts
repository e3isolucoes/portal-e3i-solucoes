import { PermissionCode } from '../../permissions';

export interface OperationCapabilityRule {
  operation: string;
  requiredSkillIds: string[];
  allowedToolIds: string[];
  requiredPermissions: PermissionCode[];
}

export const OPERATION_CAPABILITY_RULES: Record<string, OperationCapabilityRule> = {
  'discovery.extract-business-context': {
    operation: 'discovery.extract-business-context',
    requiredSkillIds: ['business-context-extraction'],
    allowedToolIds: [], // Zero tools intentionally for pure extraction
    requiredPermissions: ['discovery.read', 'discovery.contribute'],
  },
};
