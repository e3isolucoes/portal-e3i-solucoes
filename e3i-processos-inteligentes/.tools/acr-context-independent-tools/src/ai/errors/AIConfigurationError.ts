import { AIError } from './AIError';

export class AIConfigurationError extends AIError {
  constructor(message: string, details?: any) {
    super(message, 'AI_CONFIGURATION_ERROR', details);
  }
}
