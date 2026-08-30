import { AIError } from './AIError';

export class AIOutputValidationError extends AIError {
  constructor(message: string, details?: any) {
    super(message, 'AI_OUTPUT_VALIDATION_ERROR', details);
  }
}
