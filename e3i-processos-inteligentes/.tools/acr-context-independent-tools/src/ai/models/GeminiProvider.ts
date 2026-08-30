import { GoogleGenAI } from '@google/genai';
import { ModelProvider, ModelGenerationRequest, ModelGenerationResult } from './ModelProvider';
import { AIConfig } from '../config/AIConfig';
import { AIProviderError, AIProviderTimeoutError } from '../errors/AIProviderError';

export class GeminiProvider implements ModelProvider {
  private ai: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new AIProviderError('AI_PROVIDER_ERROR: GEMINI_API_KEY is not configured');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  async generate<T>(request: ModelGenerationRequest<T>): Promise<ModelGenerationResult<T>> {
    const startTime = Date.now();
    const client = this.getClient();

    const timeoutMs = request.timeout || AIConfig.requestTimeoutMs;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new AIProviderTimeoutError('AI_PROVIDER_TIMEOUT')), timeoutMs)
      );

      const config: any = {
        maxOutputTokens: request.maxOutputTokens || AIConfig.defaultMaxOutputTokens,
      };

      if (request.systemInstructions) {
        config.systemInstruction = request.systemInstructions;
      }

      if (request.responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = request.responseSchema;
      }

      const apiCall = client.models.generateContent({
        model: request.model,
        contents: request.userContent,
        config,
      });

      const response: any = await Promise.race([apiCall, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      const rawText = response.text ? (typeof response.text === 'function' ? response.text() : response.text) : JSON.stringify(response);
      let parsedData: T;
      try {
        parsedData = JSON.parse(rawText);
      } catch (e) {
        parsedData = rawText as unknown as T;
      }

      const usageMetadata = response.usageMetadata || {};
      const inputTokens = usageMetadata.promptTokenCount ?? null;
      const outputTokens = usageMetadata.candidatesTokenCount ?? null;
      const cachedTokens = usageMetadata.cachedContentTokenCount ?? null;

      return {
        data: parsedData,
        provider: 'gemini',
        model: request.model,
        usage: {
          inputTokens,
          outputTokens,
          cachedTokens,
        },
        latencyMs,
        finishReason: response.candidates?.[0]?.finishReason,
      };
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('AI_PROVIDER_TIMEOUT') || err instanceof AIProviderTimeoutError) {
        throw new AIProviderTimeoutError('AI_PROVIDER_TIMEOUT');
      }
      if (err instanceof AIProviderError) {
        throw err;
      }
      throw new AIProviderError(`AI_PROVIDER_ERROR: ${errMsg}`);
    }
  }
}
