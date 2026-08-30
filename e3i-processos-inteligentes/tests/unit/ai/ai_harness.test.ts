import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRegistry } from '../../../src/ai/prompts/PromptRegistry';
import { ModelRouter } from '../../../src/ai/models/ModelRouter';
import { AIHarness } from '../../../src/ai/core/AIHarness';
import { TestModelProvider } from '../../../src/ai/models/TestModelProvider';
import { AIConfig, validateAIConfig } from '../../../src/ai/config/AIConfig';
import { DiscoveryBusinessContextSchema } from '../../../src/ai/schemas/DiscoveryBusinessContextSchema';
import { AIConfigurationError } from '../../../src/ai/errors/AIConfigurationError';
import { AIOutputValidationError } from '../../../src/ai/errors/AIOutputValidationError';
import { AIProviderTimeoutError } from '../../../src/ai/errors/AIProviderError';
import { z } from 'zod';

describe('E3I AI Architecture & Harness (AF01-R2)', () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
    registry.register({
      id: 'discovery.extract-business-context',
      version: 1,
      purpose: 'Extraction of business context',
      status: 'ACTIVE',
      modelProfile: 'FAST',
      systemInstructions: 'Extraia somente informações explicitamente presentes.',
      inputSchema: z.object({ text: z.string().trim().min(1) }),
      outputSchema: DiscoveryBusinessContextSchema
    });
  });

  describe('ModelRouter (Section 22)', () => {
    it('should route FAST profile to fast model from AIConfig', () => {
      const model = ModelRouter.resolveModel('FAST');
      expect(model).toBe(AIConfig.models.fast);
    });

    it('should route BALANCED profile to balanced model from AIConfig', () => {
      const model = ModelRouter.resolveModel('BALANCED');
      expect(model).toBe(AIConfig.models.balanced);
    });

    it('should route NO_MODEL to empty string without calling provider', () => {
      const model = ModelRouter.resolveModel('NO_MODEL');
      expect(model).toBe('');
    });
  });

  describe('PromptRegistry (Section 23)', () => {
    it('should register and retrieve active prompt successfully', () => {
      const p = registry.getActive('discovery.extract-business-context');
      expect(p.id).toBe('discovery.extract-business-context');
      expect(p.version).toBe(1);
      expect(p.status).toBe('ACTIVE');
    });

    it('should throw AI_PROMPT_NOT_FOUND for non-existent prompt', () => {
      expect(() => registry.getActive('unknown.prompt')).toThrow('AI_PROMPT_NOT_FOUND');
    });

    it('should throw AI_PROMPT_NOT_ACTIVE when prompt is DEPRECATED', () => {
      registry.register({
        id: 'deprecated.prompt',
        version: 1,
        purpose: 'Old prompt',
        status: 'DEPRECATED',
        modelProfile: 'FAST',
        systemInstructions: '',
        inputSchema: z.object({}),
        outputSchema: z.object({})
      });

      expect(() => registry.getActive('deprecated.prompt')).toThrow('AI_PROMPT_NOT_ACTIVE');
    });

    it('should throw AI_PROMPT_NOT_ACTIVE for draft prompt when allowDraft is false', () => {
      registry.register({
        id: 'test.draft',
        version: 1,
        purpose: 'Draft prompt',
        status: 'DRAFT',
        modelProfile: 'FAST',
        systemInstructions: '',
        inputSchema: z.object({}),
        outputSchema: z.object({})
      });

      expect(() => registry.getActive('test.draft', false)).toThrow('AI_PROMPT_NOT_ACTIVE');
      const draftPrompt = registry.getActive('test.draft', true);
      expect(draftPrompt.status).toBe('DRAFT');
    });
  });

  describe('Structured Output & Zod Validation (Section 24)', () => {
    it('should accept valid structured output from provider', async () => {
      const validData = {
        productsServices: ['Peças Industriais'],
        customerSegments: ['Pequenas Fábricas'],
        mentionedSystems: [],
        manualControls: ['Excel']
      };

      const mockProvider = new TestModelProvider(() => validData);
      const harness = new AIHarness(registry, mockProvider);

      const result = await harness.execute({
        operation: 'discovery.extract-business-context',
        promptId: 'discovery.extract-business-context',
        tenantContext: { userId: 'u-1', organizationId: 'org-1' },
        input: { text: 'Vendemos peças industriais para pequenas fábricas e controlamos em Excel.' }
      });

      expect(result.data).toEqual(validData);
      expect(result.usage.inputTokens).toBe(120);
      expect(result.usage.outputTokens).toBe(45);
      expect(result.trace?.cost).toBeNull();
    });

    it('should reject output with missing critical fields', async () => {
      const incompleteData = {
        productsServices: ['Peças Industriais'],
        // missing customerSegments, mentionedSystems, manualControls
      };

      const mockProvider = new TestModelProvider(() => incompleteData);
      const harness = new AIHarness(registry, mockProvider);

      await expect(
        harness.execute({
          operation: 'discovery.extract-business-context',
          promptId: 'discovery.extract-business-context',
          tenantContext: { userId: 'u-1', organizationId: 'org-1' },
          input: { text: 'Vendemos peças industriais.' }
        })
      ).rejects.toThrow(AIOutputValidationError);
    });

    it('should reject output with incorrect field types', async () => {
      const invalidTypeData = {
        productsServices: 'Peças Industriais', // string instead of array
        customerSegments: [],
        mentionedSystems: [],
        manualControls: []
      };

      const mockProvider = new TestModelProvider(() => invalidTypeData);
      const harness = new AIHarness(registry, mockProvider);

      await expect(
        harness.execute({
          operation: 'discovery.extract-business-context',
          promptId: 'discovery.extract-business-context',
          tenantContext: { userId: 'u-1', organizationId: 'org-1' },
          input: { text: 'Vendemos peças industriais.' }
        })
      ).rejects.toThrow(AIOutputValidationError);
    });
  });

  describe('Anti-Hallucination Extractive Test (Section 25)', () => {
    it('should strictly extract only present facts and not hallucinate unmentioned entities', async () => {
      const strictlyExtracted = {
        productsServices: [],
        customerSegments: [],
        mentionedSystems: [],
        manualControls: ['Excel']
      };

      const mockProvider = new TestModelProvider(() => strictlyExtracted);
      const harness = new AIHarness(registry, mockProvider);

      const result = await harness.execute({
        operation: 'discovery.extract-business-context',
        promptId: 'discovery.extract-business-context',
        tenantContext: { userId: 'u-1', organizationId: 'org-1' },
        input: { text: 'Usamos Excel.' }
      });

      expect(result.data.manualControls).toEqual(['Excel']);
      expect(result.data.mentionedSystems).toEqual([]);
      expect(result.data.productsServices).toEqual([]);
      expect(result.data.customerSegments).toEqual([]);

      // Ensure no hallucinated systems were added
      const bannedHallucinations = ['Omie', 'SAP', 'HubSpot', 'ERP', 'CRM', 'API', 'ROI'];
      for (const banned of bannedHallucinations) {
        expect(result.data.mentionedSystems).not.toContain(banned);
        expect(result.data.productsServices).not.toContain(banned);
      }
    });
  });

  describe('AIHarness Execution & Error Handling', () => {
    it('should throw AI_FEATURE_DISABLED when AIConfig.enabled is false', async () => {
      const origEnabled = AIConfig.enabled;
      AIConfig.enabled = false;

      const harness = new AIHarness(registry, new TestModelProvider(() => ({})));
      await expect(
        harness.execute({
          operation: 'discovery.extract-business-context',
          promptId: 'discovery.extract-business-context',
          tenantContext: { userId: 'u-1', organizationId: 'org-1' },
          input: { text: 'Hello' }
        })
      ).rejects.toThrow('AI_FEATURE_DISABLED');

      AIConfig.enabled = origEnabled;
    });

    it('should throw AI_TENANT_CONTEXT_REQUIRED when tenantContext is missing organizationId', async () => {
      const harness = new AIHarness(registry, new TestModelProvider(() => ({})));
      await expect(
        harness.execute({
          operation: 'discovery.extract-business-context',
          promptId: 'discovery.extract-business-context',
          tenantContext: { userId: 'u-1' },
          input: { text: 'Hello' }
        })
      ).rejects.toThrow('AI_TENANT_CONTEXT_REQUIRED');
    });

    it('should throw AI_PROVIDER_TIMEOUT on timeout', async () => {
      const timeoutProvider = {
        async generate() {
          throw new AIProviderTimeoutError('AI_PROVIDER_TIMEOUT');
        }
      };
      const harness = new AIHarness(registry, timeoutProvider as any);

      await expect(
        harness.execute({
          operation: 'discovery.extract-business-context',
          promptId: 'discovery.extract-business-context',
          tenantContext: { userId: 'u-1', organizationId: 'org-1' },
          input: { text: 'Test text' }
        })
      ).rejects.toThrow(AIProviderTimeoutError);
    });

    it('should validate AIConfig throws on missing required gemini models', () => {
      expect(() => {
        validateAIConfig({
          ...AIConfig,
          enabled: true,
          provider: 'gemini',
          models: { fast: '', balanced: '' }
        });
      }).toThrow(AIConfigurationError);
    });
  });
});
