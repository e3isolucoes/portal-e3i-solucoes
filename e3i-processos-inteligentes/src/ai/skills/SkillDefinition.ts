import { PermissionCode } from '../../permissions';

export type SkillStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'DISABLED';
export type SkillRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SkillOrigin = 'INTERNAL' | 'EXTERNAL';

export interface SkillDefinition {
  id: string;
  version: number;
  name: string;
  description: string;
  instructions: string;
  status: SkillStatus;
  requiredPermissions: PermissionCode[];
  allowedToolIds: string[];
  modelProfiles?: string[];
  riskLevel: SkillRiskLevel;
  origin: SkillOrigin;
  checksum?: string;
  installedAt?: string;
}

export interface AgentSkillAdapter {
  parseMarkdown(markdownContent: string): SkillDefinition;
}
