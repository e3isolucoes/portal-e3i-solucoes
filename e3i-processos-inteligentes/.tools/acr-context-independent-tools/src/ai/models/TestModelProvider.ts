import { ModelProvider, ModelGenerationRequest, ModelGenerationResult } from './ModelProvider';

export class TestModelProvider implements ModelProvider {
  constructor(private mockResponseHandler: (request: ModelGenerationRequest) => any) {}

  async generate<T>(request: ModelGenerationRequest<T>): Promise<ModelGenerationResult<T>> {
    const startTime = Date.now();
    const data = this.mockResponseHandler(request);
    const latencyMs = Date.now() - startTime;
    return {
      data,
      provider: 'test-mock',
      model: request.model,
      usage: {
        inputTokens: 120,
        outputTokens: 45,
        cachedTokens: null,
      },
      latencyMs,
      finishReason: 'STOP',
    };
  }
}
