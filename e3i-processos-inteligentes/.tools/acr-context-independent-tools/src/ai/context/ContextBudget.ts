export interface ContextBudgetConfig {
  maxContextTokens: number;
  maxContextItems: number;
  maxSingleItemTokens: number;
}

export class ContextBudget {
  static getConfig(): ContextBudgetConfig {
    return {
      maxContextTokens: parseInt(process.env.AI_MAX_CONTEXT_TOKENS || '8000', 10),
      maxContextItems: parseInt(process.env.AI_MAX_CONTEXT_ITEMS || '50', 10),
      maxSingleItemTokens: parseInt(process.env.AI_MAX_SINGLE_CONTEXT_ITEM_TOKENS || '2000', 10),
    };
  }

  static estimateTokens(content: unknown): number {
    if (!content) return 0;
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    // Simple robust estimation: ~4 chars per token
    return Math.ceil(str.length / 4);
  }
}
