import { AIContextError } from './AIContextError';

export class AIContextBudgetError extends AIContextError {
  constructor(message: string, details?: any) {
    super(message, details);
    this.name = 'AIContextBudgetError';
    (this as any).code = 'AI_CONTEXT_BUDGET_EXCEEDED';
  }
}
