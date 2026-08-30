import { TenantContext } from '../core/AIHarness';
import { ToolDefinition } from './ToolDefinition';
import { ToolRegistry } from './ToolRegistry';
import { ToolResult } from './ToolResult';
import { hasPermission } from '../../permissions';

export interface ToolExecutionRequest {
  toolId: string;
  version?: number;
  tenantContext: TenantContext;
  input: any;
}

export class ToolExecutor {
  constructor(private toolRegistry: ToolRegistry) {}

  async execute(request: ToolExecutionRequest): Promise<ToolResult> {
    const startedAt = Date.now();
    const tc = request.tenantContext;

    if (!tc || !tc.organizationId || !tc.userId) {
      return {
        toolId: request.toolId,
        toolVersion: request.version || 1,
        status: 'PERMISSION_DENIED',
        error: 'AI_TENANT_CONTEXT_REQUIRED',
        latencyMs: Date.now() - startedAt,
      };
    }

    let tool: ToolDefinition;
    try {
      tool = this.toolRegistry.get(request.toolId, request.version);
    } catch (e: any) {
      return {
        toolId: request.toolId,
        toolVersion: request.version || 1,
        status: 'VALIDATION_ERROR',
        error: e.message || 'AI_TOOL_NOT_FOUND',
        latencyMs: Date.now() - startedAt,
      };
    }

    const cleanInput = { ...(request.input || {}) };
    if (cleanInput.organizationId && cleanInput.organizationId !== tc.organizationId) {
      return {
        toolId: tool.id,
        toolVersion: tool.version,
        status: 'PERMISSION_DENIED',
        error: 'AI_TENANT_MISMATCH',
        latencyMs: Date.now() - startedAt,
      };
    }
    cleanInput.organizationId = tc.organizationId;

    const userRole = tc.role || 'OPERATOR';
    const hasPerms = tool.requiredPermissions.every(p => hasPermission(userRole, p));
    if (!hasPerms) {
      return {
        toolId: tool.id,
        toolVersion: tool.version,
        status: 'PERMISSION_DENIED',
        error: 'AI_TOOL_PERMISSION_DENIED',
        latencyMs: Date.now() - startedAt,
      };
    }

    if (tool.sideEffect === 'WRITE' || tool.sideEffect === 'EXTERNAL_WRITE' || tool.sideEffect === 'DESTRUCTIVE') {
      return {
        toolId: tool.id,
        toolVersion: tool.version,
        status: 'AUTONOMY_DENIED',
        error: 'AI_TOOL_AUTONOMY_NOT_ALLOWED',
        latencyMs: Date.now() - startedAt,
      };
    }

    if (tool.requiresApproval) {
      return {
        toolId: tool.id,
        toolVersion: tool.version,
        status: 'APPROVAL_REQUIRED',
        error: 'AI_TOOL_APPROVAL_REQUIRED',
        latencyMs: Date.now() - startedAt,
      };
    }

    let validatedInput;
    try {
      validatedInput = tool.inputSchema.parse(cleanInput);
    } catch (err: any) {
      return {
        toolId: tool.id,
        toolVersion: tool.version,
        status: 'VALIDATION_ERROR',
        error: `AI_TOOL_INPUT_VALIDATION_ERROR: ${err.message}`,
        latencyMs: Date.now() - startedAt,
      };
    }

    let rawOutput;
    try {
      rawOutput = await tool.handler(validatedInput, {
        organizationId: tc.organizationId,
        userId: tc.userId,
      });
    } catch (err: any) {
      return {
        toolId: tool.id,
        toolVersion: tool.version,
        status: 'ERROR',
        error: 'AI_TOOL_EXECUTION_ERROR',
        latencyMs: Date.now() - startedAt,
      };
    }

    let validatedOutput;
    try {
      validatedOutput = tool.outputSchema.parse(rawOutput);
    } catch (err: any) {
      return {
        toolId: tool.id,
        toolVersion: tool.version,
        status: 'VALIDATION_ERROR',
        error: `AI_TOOL_OUTPUT_VALIDATION_ERROR: ${err.message}`,
        latencyMs: Date.now() - startedAt,
      };
    }

    return {
      toolId: tool.id,
      toolVersion: tool.version,
      status: 'SUCCESS',
      data: validatedOutput,
      latencyMs: Date.now() - startedAt,
    };
  }
}
