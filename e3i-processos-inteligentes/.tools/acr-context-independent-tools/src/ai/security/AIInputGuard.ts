import { SecretSanitizer } from './SecretSanitizer';
import { AISecurityError } from '../errors/AISecurityError';
import { TenantContext } from '../core/AIHarness';
import { SensitivityLevel } from '../context/ContextTypes';

export interface AIInputGuardRequest {
  tenantContext: TenantContext;
  operation: string;
  input: any;
  sensitivity?: SensitivityLevel;
}

export class AIInputGuard {
  static validateAndSanitize(request: AIInputGuardRequest): any {
    if (!request.tenantContext?.organizationId) {
      throw new AISecurityError('AI_TENANT_CONTEXT_REQUIRED: TenantContext is mandatory for AI input guard.');
    }
    if (request.sensitivity === 'RESTRICTED') {
      throw new AISecurityError('RESTRICTED_DATA_ACCESS: RESTRICTED data classification cannot be processed by AI.');
    }
    return SecretSanitizer.sanitize(request.input);
  }
}
