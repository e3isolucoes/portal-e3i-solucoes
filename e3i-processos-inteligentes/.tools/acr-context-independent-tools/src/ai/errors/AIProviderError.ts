import { AIError } from './AIError';

export class AIProviderError extends AIError {
  constructor(message: string, code: string = 'AI_PROVIDER_ERROR', details?: any) {
    super(message, code, details);
  }
}

export class AIProviderTimeoutError extends AIProviderError {
  constructor(message: string = 'AI_PROVIDER_TIMEOUT', details?: any) {
    super(message, 'AI_PROVIDER_TIMEOUT', details);
  }
}
