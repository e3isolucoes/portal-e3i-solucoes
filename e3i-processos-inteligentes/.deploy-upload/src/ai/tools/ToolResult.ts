export type ToolExecutionStatus = 'SUCCESS' | 'ERROR' | 'PERMISSION_DENIED' | 'APPROVAL_REQUIRED' | 'AUTONOMY_DENIED' | 'VALIDATION_ERROR';

export interface ToolResult<T = any> {
  toolId: string;
  toolVersion: number;
  status: ToolExecutionStatus;
  data?: T;
  error?: string;
  latencyMs: number;
}
