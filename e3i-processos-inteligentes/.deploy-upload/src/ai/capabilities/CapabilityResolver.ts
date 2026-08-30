import { TenantContext } from '../core/AIHarness';
import { SkillDefinition } from '../skills/SkillDefinition';
import { SkillRegistry, globalSkillRegistry } from '../skills/SkillRegistry';
import { SkillResolver } from '../skills/SkillResolver';
import { ToolDefinition } from '../tools/ToolDefinition';
import { ToolRegistry, globalToolRegistry } from '../tools/ToolRegistry';
import { OPERATION_CAPABILITY_RULES } from './CapabilityPolicy';
import { PermissionCode } from '../../permissions';

export interface CapabilityResolutionRequest {
  tenantContext: TenantContext;
  operation: string;
  userPermissions?: PermissionCode[];
}

export interface CapabilityResolutionResult {
  operation: string;
  allowedSkills: SkillDefinition[];
  allowedTools: ToolDefinition[];
  rejectedSkills: { id: string; reason: string }[];
}

export class CapabilityResolver {
  private skillResolver: SkillResolver;

  constructor(
    private skillRegistry: SkillRegistry = globalSkillRegistry,
    private toolRegistry: ToolRegistry = globalToolRegistry
  ) {
    this.skillResolver = new SkillResolver(this.skillRegistry);
  }

  resolve(request: CapabilityResolutionRequest): CapabilityResolutionResult {
    const rule = OPERATION_CAPABILITY_RULES[request.operation];
    if (!rule) {
      return {
        operation: request.operation,
        allowedSkills: [],
        allowedTools: [],
        rejectedSkills: [],
      };
    }

    const skillResolution = this.skillResolver.resolve({
      tenantContext: request.tenantContext,
      operation: request.operation,
      requestedSkillIds: rule.requiredSkillIds,
      userPermissions: request.userPermissions,
    });

    const allowedTools = this.toolRegistry.resolveAllowedTools(rule.allowedToolIds);

    return {
      operation: request.operation,
      allowedSkills: skillResolution.resolvedSkills,
      allowedTools,
      rejectedSkills: skillResolution.rejectedSkills,
    };
  }
}

export const globalCapabilityResolver = new CapabilityResolver();
