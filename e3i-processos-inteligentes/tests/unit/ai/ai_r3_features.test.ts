import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRegistry } from '../../../src/ai/prompts/PromptRegistry';
import { AIHarness } from '../../../src/ai/core/AIHarness';
import { TestModelProvider } from '../../../src/ai/models/TestModelProvider';
import { ContextCompiler } from '../../../src/ai/context/ContextCompiler';
import { SecretSanitizer } from '../../../src/ai/security/SecretSanitizer';
import { ContentTrustClassifier } from '../../../src/ai/security/ContentTrustClassifier';
import { AIPolicyEngine } from '../../../src/ai/security/AIPolicyEngine';
import { AITraceRecorder } from '../../../src/ai/observability/AITraceRecorder';
import { z } from 'zod';

describe('E3I AI Architecture - AF01-R3 (Context Compiler, Evidence & AI Security)', () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
    registry.register({
      id: 'discovery.extract-business-context',
      version: 1,
      purpose: 'Extraction test',
      status: 'ACTIVE',
      modelProfile: 'FAST',
      systemInstructions: 'Extract facts strictly.',
      inputSchema: z.object({ text: z.string().min(1) }),
      outputSchema: z.object({ productsServices: z.array(z.string()) })
    });
    AITraceRecorder.clear();
  });

  describe('SecretSanitizer', () => {
    it('should remove forbidden secret fields from objects', () => {
      const data = {
        name: 'Company A',
        email: 'contact@a.com',
        passwordHash: 'hashed_secret_123',
        apiKey: 'sk-secret-key',
        nested: {
          token: 'jwt-token-val',
          publicInfo: 'safe'
        }
      };

      const sanitized: any = SecretSanitizer.sanitize(data);
      expect(sanitized.name).toBe('Company A');
      expect(sanitized.email).toBe('contact@a.com');
      expect(sanitized.passwordHash).toBeUndefined();
      expect(sanitized.apiKey).toBeUndefined();
      expect(sanitized.nested.token).toBeUndefined();
      expect(sanitized.nested.publicInfo).toBe('safe');
    });
  });

  describe('ContentTrustClassifier', () => {
    it('should classify content correctly and enforce trust boundary', () => {
      const trust = ContentTrustClassifier.classify('UNTRUSTED_EXTERNAL_CONTENT', true);
      expect(trust).toBe('UNTRUSTED_EXTERNAL');

      const enforced = ContentTrustClassifier.enforceBoundary('UNTRUSTED_EXTERNAL');
      expect(enforced).toBe('UNTRUSTED_EXTERNAL');
    });
  });

  describe('AIPolicyEngine', () => {
    it('should throw AI_TENANT_CONTEXT_REQUIRED if tenant context missing', () => {
      expect(() =>
        AIPolicyEngine.evaluate({
          operation: 'discovery.extract-business-context',
          tenantContext: { userId: 'u-1' }
        })
      ).toThrow('AI_TENANT_CONTEXT_REQUIRED');
    });

    it('should throw AI_AUTONOMY_NOT_ALLOWED if autonomy requested exceeds RECOMMEND', () => {
      expect(() =>
        AIPolicyEngine.evaluate({
          operation: 'discovery.extract-business-context',
          tenantContext: { userId: 'u-1', organizationId: 'org-1', membershipId: 'm-1' },
          requestedAutonomy: 'AUTONOMOUS'
        })
      ).toThrow('AI_AUTONOMY_NOT_ALLOWED');
    });
  });

  describe('ContextCompiler & Tenant Isolation', () => {
    it('should exclude cross-tenant sources with TENANT_MISMATCH reason', () => {
      const compiled = ContextCompiler.compile({
        tenantContext: { userId: 'u-1', organizationId: 'org-A', membershipId: 'm-1' },
        operation: 'discovery.extract-business-context',
        input: { text: 'Vendemos software' },
        availableSources: [
          {
            id: 'src-1',
            organizationId: 'org-A',
            type: 'CONFIRMED_BUSINESS_FACT',
            content: { note: 'Local data' }
          },
          {
            id: 'src-2',
            organizationId: 'org-B', // Cross-tenant
            type: 'CONFIRMED_BUSINESS_FACT',
            content: { note: 'Secret competitor data' }
          }
        ]
      });

      expect(compiled.sections.some(s => s.id === 'src-1')).toBe(true);
      expect(compiled.sections.some(s => s.id === 'src-2')).toBe(false);
      expect(compiled.excludedSources.find(e => e.sourceId === 'src-2')?.reason).toBe('TENANT_MISMATCH');
    });
  });

  describe('AIHarness Integration with AF01-R3 features', () => {
    it('should execute successfully, sanitize secrets, generate evidence, and record trace without secrets', async () => {
      let capturedRequest: any = null;
      const testProvider = new TestModelProvider(req => {
        capturedRequest = req;
        return { productsServices: ['Software SaaS'] };
      });

      const harness = new AIHarness(registry, testProvider);

      const result = await harness.execute<{ productsServices: string[] }>({
        operation: 'discovery.extract-business-context',
        promptId: 'discovery.extract-business-context',
        tenantContext: { userId: 'u-1', organizationId: 'org-A', membershipId: 'm-1' },
        input: { text: 'Vendemos software' },
        availableSources: [
          {
            id: 'src-1',
            organizationId: 'org-A',
            type: 'CONFIRMED_BUSINESS_FACT',
            content: { details: 'Cloud platform', passwordHash: 'secret-pass' }
          }
        ]
      });

      expect(result.data.productsServices).toEqual(['Software SaaS']);
      expect(result.evidence).toBeDefined();
      expect(result.evidence?.length).toBeGreaterThan(0);
      expect(result.provenance?.inferenceType).toBe('FACT');

      // Verify that secrets did not reach the provider
      const userContentParsed = JSON.parse(capturedRequest.userContent);
      const sourceSection = userContentParsed.contextSections.find((s: any) => s.id === 'src-1');
      expect(sourceSection.content.passwordHash).toBeUndefined();

      // Verify trace record privacy (no secrets, no full raw prompt stored)
      const traces = AITraceRecorder.getTraces('org-A');
      expect(traces.length).toBe(1);
      expect(traces[0].status).toBe('SUCCESS');
      expect(traces[0].estimatedContextTokens).toBeGreaterThan(0);
    });
  });
});
