import { ContextContentType, SensitivityLevel } from './ContextTypes';
import { AISecurityError } from '../errors/AISecurityError';

export interface OperationContextPolicy {
  operation: string;
  allowedContentTypes: ContextContentType[];
  maxSensitivity: SensitivityLevel;
  allowExternalContent: boolean;
  maxItems: number;
}

export class ContextPolicy {
  private static policies: Map<string, OperationContextPolicy> = new Map([
    ['discovery.extract-business-context', {
      operation: 'discovery.extract-business-context',
      allowedContentTypes: ['SYSTEM_RULE', 'TENANT_CONTEXT', 'USER_INPUT', 'CONFIRMED_BUSINESS_FACT'],
      maxSensitivity: 'INTERNAL',
      allowExternalContent: false,
      maxItems: 10,
    }],
  ]);

  static getPolicy(operation: string): OperationContextPolicy {
    return this.policies.get(operation) || {
      operation,
      allowedContentTypes: ['SYSTEM_RULE', 'TENANT_CONTEXT', 'USER_INPUT'],
      maxSensitivity: 'INTERNAL',
      allowExternalContent: false,
      maxItems: 5,
    };
  }

  static validateContentType(operation: string, contentType: ContextContentType): boolean {
    return this.getPolicy(operation).allowedContentTypes.includes(contentType);
  }

  static enforce(operation: string, contentType: ContextContentType, sensitivity: SensitivityLevel): void {
    if (!this.validateContentType(operation, contentType)) {
      throw new AISecurityError(`CONTEXT_POLICY_VIOLATION: Context type '${contentType}' is not allowed for operation '${operation}' (Default Deny).`);
    }
    const hierarchy: Record<SensitivityLevel, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };
    const policy = this.getPolicy(operation);
    if (hierarchy[sensitivity] > hierarchy[policy.maxSensitivity]) {
      throw new AISecurityError(`CONTEXT_POLICY_VIOLATION: Sensitivity level '${sensitivity}' exceeds max allowed '${policy.maxSensitivity}' for operation '${operation}'.`);
    }
    if (sensitivity === 'RESTRICTED') {
      throw new AISecurityError('CONTEXT_POLICY_VIOLATION: RESTRICTED data cannot be sent to LLM model.');
    }
  }
}
