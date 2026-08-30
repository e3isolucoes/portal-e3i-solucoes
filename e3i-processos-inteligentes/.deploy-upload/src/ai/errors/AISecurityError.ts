import { AIError } from './AIError';

export class AISecurityError extends AIError {
  constructor(message: string, details?: any) {
    super(message, 'AI_SECURITY_ERROR', details);
    this.name = 'AISecurityError';
  }
}
