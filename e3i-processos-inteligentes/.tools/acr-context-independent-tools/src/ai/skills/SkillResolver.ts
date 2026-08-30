import { TenantContext } from '../core/AIHarness';
import { SkillDefinition } from './SkillDefinition';
import { SkillRegistry } from './SkillRegistry';
import { hasPermission, PermissionCode } from '../../permissions';

export interface SkillResolverRequest {
  tenantContext: TenantContext;
  operation: string;
  requestedSkillIds: string[];
  userPermissions?: PermissionCode[];
}

export interface SkillResolutionResult {
  resolvedSkills: SkillDefinition[];
  rejectedSkills: { id: string; reason: string }[];
}

export class SkillResolver {
  constructor(private skillRegistry: SkillRegistry) {}

  resolve(request: SkillResolverRequest): SkillResolutionResult {
    const resolvedSkills: SkillDefinition[] = [];
    const rejectedSkills: { id: string; reason: string }[] = [];

    const userRole = request.tenantContext.role || 'OPERATOR';

    for (const skillId of request.requestedSkillIds) {
      try {
        const skill = this.skillRegistry.getActive(skillId);

        if (skill.status !== 'ACTIVE') {
          rejectedSkills.push({ id: skillId, reason: 'AI_SKILL_NOT_ACTIVE' });
          continue;
        }

        const hasAllPerms = skill.requiredPermissions.every(perm => 
          hasPermission(userRole, perm) || (request.userPermissions && request.userPermissions.includes(perm))
        );

        if (!hasAllPerms) {
          rejectedSkills.push({ id: skillId, reason: 'AI_SKILL_PERMISSION_DENIED' });
          continue;
        }

        if (skill.riskLevel === 'CRITICAL') {
          rejectedSkills.push({ id: skillId, reason: 'AI_SKILL_RISK_NOT_ALLOWED' });
          continue;
        }

        resolvedSkills.push(skill);
      } catch (err: any) {
        rejectedSkills.push({ id: skillId, reason: err.message || 'AI_SKILL_NOT_FOUND' });
      }
    }

    return { resolvedSkills, rejectedSkills };
  }
}
