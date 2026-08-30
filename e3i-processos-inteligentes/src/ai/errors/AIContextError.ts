import { AIError } from './AIError';

export class AIContextError extends AIError {
  constructor(message: string, details?: any) {
    super(message, 'AI_CONTEXT_ERROR', details);
  }
}
