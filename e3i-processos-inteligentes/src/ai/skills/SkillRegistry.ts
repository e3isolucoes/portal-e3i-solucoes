import { SkillDefinition } from './SkillDefinition';
import { PermissionCode, hasPermission } from '../../permissions';

export class SkillRegistry {
  private skills: Map<string, SkillDefinition[]> = new Map();

  register(skill: SkillDefinition): void {
    this.validate(skill);
    const existingVersions = this.skills.get(skill.id) || [];
    
    const duplicate = existingVersions.find(v => v.version === skill.version);
    if (duplicate) {
      throw new Error(`AI_SKILL_VERSION_CONFLICT: Skill '${skill.id}' version ${skill.version} already exists and cannot be silently overwritten.`);
    }

    existingVersions.push(skill);
    existingVersions.sort((a, b) => b.version - a.version);
    this.skills.set(skill.id, existingVersions);
  }

  get(id: string, version?: number): SkillDefinition {
    const versions = this.skills.get(id);
    if (!versions || versions.length === 0) {
      throw new Error(`AI_SKILL_NOT_FOUND: Skill '${id}' not found.`);
    }

    if (version !== undefined) {
      const found = versions.find(v => v.version === version);
      if (!found) {
        throw new Error(`AI_SKILL_NOT_FOUND: Skill '${id}' version ${version} not found.`);
      }
      if (found.status === 'DISABLED' || found.status === 'DEPRECATED') {
        throw new Error(`AI_SKILL_NOT_ACTIVE: Skill '${id}' version ${version} is ${found.status}.`);
      }
      return found;
    }

    const active = versions.find(v => v.status === 'ACTIVE');
    if (!active) {
      throw new Error(`AI_SKILL_NOT_ACTIVE: No active version found for skill '${id}'.`);
    }
    return active;
  }

  getActive(id: string): SkillDefinition {
    return this.get(id);
  }

  listAllowed(permissionCodes: PermissionCode[]): SkillDefinition[] {
    const allowed: SkillDefinition[] = [];
    for (const versions of this.skills.values()) {
      const active = versions.find(v => v.status === 'ACTIVE');
      if (active) {
        const hasAllPerms = active.requiredPermissions.every(p => permissionCodes.includes(p));
        if (hasAllPerms) {
          allowed.push(active);
        }
      }
    }
    return allowed;
  }

  validate(skill: SkillDefinition): void {
    if (!skill.id || typeof skill.id !== 'string') {
      throw new Error('AI_SKILL_VALIDATION_ERROR: Skill ID is required.');
    }
    if (skill.version === undefined || skill.version <= 0) {
      throw new Error('AI_SKILL_VALIDATION_ERROR: Skill version must be a positive integer.');
    }
    if (!skill.status) {
      throw new Error('AI_SKILL_VALIDATION_ERROR: Skill status is required.');
    }
    if (!skill.origin) {
      skill.origin = 'INTERNAL';
    }
  }
}

export const globalSkillRegistry = new SkillRegistry();
