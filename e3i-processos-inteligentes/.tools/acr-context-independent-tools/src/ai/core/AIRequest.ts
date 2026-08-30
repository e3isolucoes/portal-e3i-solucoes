export interface TenantContext {
  userId?: string;
  organizationId?: string;
  membershipId?: string;
  role?: string;
  sessionId?: string;
}

export interface AIRequest<TInput = any, TOutput = any> {
  operation: string;
  tenantContext: TenantContext;
  promptId: string;
  promptVersion?: number;
  input: TInput;
  outputSchema?: any;
  allowDraftPrompt?: boolean;
  availableSources?: any[];
}
