export type ModelProfile =
  | 'NO_MODEL'
  | 'FAST'
  | 'BALANCED'
  | 'REASONING';

export interface ModelGenerationRequest<T = any> {
  model: string;
  systemInstructions?: string;
  userContent: string;
  responseSchema?: any;
  maxOutputTokens?: number;
  timeout?: number;
}

export interface ModelGenerationResult<T = any> {
  data: T;
  provider: string;
  model: string;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    cachedTokens: number | null;
  };
  latencyMs: number;
  finishReason?: string;
}

export interface ModelProvider {
  generate<T>(request: ModelGenerationRequest<T>): Promise<ModelGenerationResult<T>>;
}
