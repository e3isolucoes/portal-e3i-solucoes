import { AIConfig } from '../config/AIConfig';
import { ModelProvider } from '../models/ModelProvider';
import { ModelRouter } from '../models/ModelRouter';
import { PromptRegistry } from '../prompts/PromptRegistry';
import { GeminiProvider } from '../models/GeminiProvider';
import { AIPolicyEngine } from '../security/AIPolicyEngine';
import { ContextCompiler } from '../context/ContextCompiler';
import { AITraceRecorder } from '../observability/AITraceRecorder';
import { globalPromptRegistry } from '../prompts/defaultRegistry';
import { AIRequest, TenantContext } from './AIRequest';
import { AIResponse } from './AIResponse';
import { AIOutputValidationError } from '../errors/AIOutputValidationError';
import { AIProviderError, AIProviderTimeoutError } from '../errors/AIProviderError';

export type { TenantContext, AIRequest, AIResponse };

export class AIHarness {
  constructor(
    private promptRegistry: PromptRegistry = globalPromptRegistry,
    private modelProvider: ModelProvider = new GeminiProvider()
  ) {}

  async execute<T = any>(request: AIRequest): Promise<AIResponse<T>> {
    const startedAt = new Date().toISOString();
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Policy Engine Evaluation (Feature flag, tenant context, autonomy, budget)
    try {
      AIPolicyEngine.evaluate({
        operation: request.operation,
        tenantContext: request.tenantContext,
      });
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('AI_FEATURE_DISABLED')) throw new Error('AI_FEATURE_DISABLED');
      if (msg.includes('AI_TENANT_CONTEXT_REQUIRED')) throw new Error('AI_TENANT_CONTEXT_REQUIRED');
      if (msg.includes('AI_AUTONOMY_NOT_ALLOWED')) throw new Error('AI_AUTONOMY_NOT_ALLOWED');
      if (msg.includes('AI_CONTEXT_BUDGET_EXCEEDED')) throw new Error('AI_CONTEXT_BUDGET_EXCEEDED');
      throw new Error(msg);
    }

    const tc = request.tenantContext!;

    // 2. Resolve Prompt
    let prompt;
    try {
      if (request.promptVersion !== undefined) {
        prompt = this.promptRegistry.getVersion(request.promptId, request.promptVersion, request.allowDraftPrompt);
      } else {
        prompt = this.promptRegistry.getActive(request.promptId, request.allowDraftPrompt);
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('AI_PROMPT_NOT_FOUND')) {
        throw new Error('AI_PROMPT_NOT_FOUND');
      }
      if (msg.includes('AI_PROMPT_NOT_ACTIVE')) {
        throw new Error('AI_PROMPT_NOT_ACTIVE');
      }
      throw new Error('AI_PROMPT_NOT_FOUND');
    }

    // 3. Validate Input
    let validatedInput;
    try {
      validatedInput = prompt.inputSchema.parse(request.input);
    } catch (e: any) {
      throw new Error(`AI_INPUT_VALIDATION_ERROR: ${e.message || 'Invalid input'}`);
    }

    // 4. Context Compilation (Context Compiler + Tenant Isolation + Sanitization + Budget)
    let compiledContext;
    try {
      compiledContext = ContextCompiler.compile({
        tenantContext: tc,
        operation: request.operation,
        input: validatedInput,
        availableSources: request.availableSources,
      });
    } catch (err: any) {
      throw new Error(`AI_CONTEXT_COMPILATION_ERROR: ${err.message}`);
    }

    // 5. Resolve Model Profile & Model
    const model = ModelRouter.resolveModel(prompt.modelProfile);
    if (!model && prompt.modelProfile !== 'NO_MODEL') {
      throw new Error('AI_PROVIDER_NOT_SUPPORTED');
    }

    // 6. Execute Provider with instruction / data separation
    const userContent = JSON.stringify({
      input: validatedInput,
      contextSections: compiledContext.sections,
    });

    let generationResult;
    try {
      generationResult = await this.modelProvider.generate({
        model,
        systemInstructions: prompt.systemInstructions,
        userContent,
        responseSchema: prompt.outputSchema,
      });
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('AI_PROVIDER_TIMEOUT')) {
        throw new AIProviderTimeoutError('AI_PROVIDER_TIMEOUT');
      }
      if (msg.includes('AI_PROVIDER_ERROR')) {
        throw new AIProviderError(msg);
      }
      throw new AIProviderError(`AI_PROVIDER_ERROR: ${msg}`);
    }

    // 7. Validate Output with Zod
    let validatedOutput;
    try {
      validatedOutput = prompt.outputSchema.parse(generationResult.data);
    } catch (e: any) {
      throw new AIOutputValidationError(`AI_OUTPUT_VALIDATION_ERROR: ${e.message || 'Invalid model output structure'}`);
    }

    const completedAt = new Date().toISOString();
    const latencyMs = generationResult.latencyMs;

    const traceRecord = {
      traceId,
      organizationId: tc.organizationId!,
      userId: tc.userId!,
      operation: request.operation,
      promptId: prompt.id,
      promptVersion: prompt.version,
      modelProfile: prompt.modelProfile,
      provider: generationResult.provider,
      model: generationResult.model,
      contextSectionCount: compiledContext.sections.length,
      estimatedContextTokens: compiledContext.estimatedTokens,
      evidenceCount: compiledContext.evidence.length,
      latencyMs,
      inputTokens: generationResult.usage.inputTokens,
      outputTokens: generationResult.usage.outputTokens,
      cachedTokens: generationResult.usage.cachedTokens,
      status: 'SUCCESS' as const,
      startedAt,
      completedAt,
    };

    AITraceRecorder.record(traceRecord);

    return {
      data: validatedOutput as T,
      provider: generationResult.provider,
      model: generationResult.model,
      promptId: prompt.id,
      promptVersion: prompt.version,
      usage: generationResult.usage,
      latencyMs,
      trace: {
        traceId,
        operation: request.operation,
        promptId: prompt.id,
        promptVersion: prompt.version,
        provider: generationResult.provider,
        model: generationResult.model,
        latencyMs,
        status: 'SUCCESS',
        inputTokens: generationResult.usage.inputTokens,
        outputTokens: generationResult.usage.outputTokens,
        cachedTokens: generationResult.usage.cachedTokens,
        cost: null,
        contextSectionCount: compiledContext.sections.length,
        estimatedContextTokens: compiledContext.estimatedTokens,
        evidenceCount: compiledContext.evidence.length,
      },
      evidence: compiledContext.evidence,
      provenance: {
        inferenceType: 'FACT',
        evidenceIds: compiledContext.evidence.map(e => e.id),
      },
    };
  }
}
