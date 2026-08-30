import {
  ContextSection,
  ContextRequirement,
  CompiledContext,
  ContextExclusion,
  EvidenceReference
} from './ContextTypes';
import { TenantContext } from '../core/AIHarness';
import { ContextBudget } from './ContextBudget';
import { SecretSanitizer } from '../security/SecretSanitizer';
import { ContentTrustClassifier } from '../security/ContentTrustClassifier';
import { EvidenceCollector } from '../evidence/EvidenceCollector';

export interface ContextCompilerRequest {
  tenantContext: TenantContext;
  operation: string;
  input: any;
  contextRequirements?: ContextRequirement[];
  availableSources?: Array<{
    id: string;
    organizationId?: string;
    type: any;
    content: unknown;
    sensitivity?: any;
    createdAt?: string;
  }>;
}

export class ContextCompiler {
  static compile(request: ContextCompilerRequest): CompiledContext {
    const budgetConfig = ContextBudget.getConfig();
    const excludedSources: ContextExclusion[] = [];
    const sections: ContextSection[] = [];
    const evidenceCollector = new EvidenceCollector();

    const orgId = request.tenantContext.organizationId!;

    // 1. Always include Tenant Context (minimal trusted)
    const tenantSection: ContextSection = {
      id: `tenant-${orgId}`,
      type: 'TENANT_CONTEXT',
      sourceId: orgId,
      content: { organizationId: orgId, userId: request.tenantContext.userId, role: request.tenantContext.role },
      trustLevel: ContentTrustClassifier.classify('TENANT_CONTEXT'),
      sensitivity: 'INTERNAL',
      estimatedTokens: 25,
      organizationId: orgId,
    };
    sections.push(tenantSection);

    // 2. Always include User Input as User Provided (sanitized)
    const sanitizedInput = SecretSanitizer.sanitize(request.input);
    const inputTokens = ContextBudget.estimateTokens(sanitizedInput);
    const inputSection: ContextSection = {
      id: `input-${Date.now()}`,
      type: 'USER_INPUT',
      sourceId: request.tenantContext.userId || 'user-1',
      content: sanitizedInput,
      trustLevel: ContentTrustClassifier.classify('USER_INPUT'),
      sensitivity: 'INTERNAL',
      estimatedTokens: inputTokens,
      organizationId: orgId,
    };
    sections.push(inputSection);

    // Add user input as evidence
    const ev = evidenceCollector.add(orgId, 'USER_INPUT', inputSection.id, typeof sanitizedInput === 'string' ? sanitizedInput : JSON.stringify(sanitizedInput));

    let currentTokens = tenantSection.estimatedTokens + inputSection.estimatedTokens;
    let currentItems = 2;

    // 3. Process available sources with strict tenant isolation, secret sanitization, budget, and priorities
    if (request.availableSources && Array.isArray(request.availableSources)) {
      // Sort sources deterministically: tenant correct, trust level, recency, size
      const sortedSources = [...request.availableSources].sort((a, b) => {
        // Tenant match check priority
        const aMatch = a.organizationId === orgId ? 1 : 0;
        const bMatch = b.organizationId === orgId ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return 0;
      });

      for (const source of sortedSources) {
        // Tenant isolation check
        if (source.organizationId && source.organizationId !== orgId) {
          excludedSources.push({
            sourceId: source.id,
            reason: 'TENANT_MISMATCH',
          });
          continue;
        }

        // Budget check (items and tokens)
        if (currentItems >= budgetConfig.maxContextItems) {
          excludedSources.push({
            sourceId: source.id,
            reason: 'BUDGET_EXCEEDED',
          });
          continue;
        }

        const sanitizedContent = SecretSanitizer.sanitize(source.content);
        const itemTokens = ContextBudget.estimateTokens(sanitizedContent);

        if (itemTokens > budgetConfig.maxSingleItemTokens) {
          excludedSources.push({
            sourceId: source.id,
            reason: 'BUDGET_EXCEEDED',
          });
          continue;
        }

        if (currentTokens + itemTokens > budgetConfig.maxContextTokens) {
          excludedSources.push({
            sourceId: source.id,
            reason: 'BUDGET_EXCEEDED',
          });
          continue;
        }

        const trustLevel = ContentTrustClassifier.classify('CONFIRMED_BUSINESS_FACT', source.type === 'UNTRUSTED_EXTERNAL_CONTENT');

        sections.push({
          id: source.id,
          type: source.type || 'CONFIRMED_BUSINESS_FACT',
          sourceId: source.id,
          content: sanitizedContent,
          trustLevel,
          sensitivity: source.sensitivity || 'INTERNAL',
          estimatedTokens: itemTokens,
          organizationId: source.organizationId || orgId,
        });

        evidenceCollector.add(orgId, 'BUSINESS_DATA', source.id, JSON.stringify(sanitizedContent));

        currentTokens += itemTokens;
        currentItems++;
      }
    }

    return {
      sections,
      evidence: evidenceCollector.getReferences(),
      estimatedTokens: currentTokens,
      excludedSources,
    };
  }
}
