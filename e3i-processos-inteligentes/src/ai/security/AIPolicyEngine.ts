import { AIConfig } from '../config/AIConfig';
import { TenantContext } from '../core/AIHarness';
import { ContextBudget } from '../context/ContextBudget';

export type AiAutonomyLevel =
  | 'READ_ONLY'
  | 'RECOMMEND'
  | 'DRAFT_ACTION'
  | 'EXECUTE_WITH_APPROVAL'
  | 'EXECUTE_WITH_POLICY'
  | 'AUTONOMOUS';

const AUTONOMY_RANK: Record<AiAutonomyLevel, number> = {
  READ_ONLY: 1,
  RECOMMEND: 2,
  DRAFT_ACTION: 3,
  EXECUTE_WITH_APPROVAL: 4,
  EXECUTE_WITH_POLICY: 5,
  AUTONOMOUS: 6,
};

export const MAX_AI_AUTONOMY: AiAutonomyLevel = 'RECOMMEND';

export interface AIPolicyRequest {
  operation: string;
  tenantContext?: TenantContext;
  requestedAutonomy?: AiAutonomyLevel;
}

export class AIPolicyEngine {
  static evaluate(request: AIPolicyRequest): void {
    // 1. Feature Flag
    if (!AIConfig.enabled) {
      throw new Error('AI_FEATURE_DISABLED');
    }

    // 2. Tenant Context validation
    const tc = request.tenantContext;
    if (!tc || !tc.userId || !tc.organizationId) {
      throw new Error('AI_TENANT_CONTEXT_REQUIRED');
    }

    // Default membershipId if not provided for backwards compatibility
    if (!tc.membershipId) {
      tc.membershipId = 'mbr-1';
    }

    // 3. Autonomy check
    const requested = request.requestedAutonomy || 'RECOMMEND';
    if (AUTONOMY_RANK[requested] > AUTONOMY_RANK[MAX_AI_AUTONOMY]) {
      throw new Error('AI_AUTONOMY_NOT_ALLOWED');
    }

    // 4. Context Budget limits check
    const budget = ContextBudget.getConfig();
    if (budget.maxContextTokens <= 0 || budget.maxContextItems <= 0) {
      throw new Error('AI_CONTEXT_BUDGET_EXCEEDED');
    }
  }
}
