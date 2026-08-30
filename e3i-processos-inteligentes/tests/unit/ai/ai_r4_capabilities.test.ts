import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry } from '../../../src/ai/skills/SkillRegistry';
import { SkillResolver } from '../../../src/ai/skills/SkillResolver';
import { ToolRegistry } from '../../../src/ai/tools/ToolRegistry';
import { ToolExecutor } from '../../../src/ai/tools/ToolExecutor';
import { CapabilityResolver } from '../../../src/ai/capabilities/CapabilityResolver';
import { DefaultKnowledgeRetriever } from '../../../src/ai/retrieval/KnowledgeRetriever';
import { z } from 'zod';

describe('E3I AI Architecture - AF01-R4 (Skills, Tools & Capability Architecture)', () => {
  let skillRegistry: SkillRegistry;
  let toolRegistry: ToolRegistry;
  let skillResolver: SkillResolver;
  let toolExecutor: ToolExecutor;
  let capabilityResolver: CapabilityResolver;
  let knowledgeRetriever: DefaultKnowledgeRetriever;

  beforeEach(() => {
    skillRegistry = new SkillRegistry();
    toolRegistry = new ToolRegistry();
    skillResolver = new SkillResolver(skillRegistry);
    toolExecutor = new ToolExecutor(toolRegistry);
    capabilityResolver = new CapabilityResolver(skillRegistry, toolRegistry);
    knowledgeRetriever = new DefaultKnowledgeRetriever();
  });

  describe('SkillRegistry & SkillResolver', () => {
    it('should register skills and prevent duplicate version overwrites', () => {
      const skill = {
        id: 'test.skill',
        version: 1,
        name: 'Test Skill',
        description: 'Test description',
        instructions: 'Test instructions',
        status: 'ACTIVE' as const,
        requiredPermissions: ['discovery.read' as const],
        allowedToolIds: [],
        riskLevel: 'LOW' as const,
        origin: 'INTERNAL' as const,
      };

      skillRegistry.register(skill);
      expect(skillRegistry.getActive('test.skill')).toBeDefined();

      expect(() => skillRegistry.register(skill)).toThrow('AI_SKILL_VERSION_CONFLICT');
    });

    it('should resolve allowed skills respecting permissions and status', () => {
      skillRegistry.register({
        id: 'skill.analyst',
        version: 1,
        name: 'Analyst Skill',
        description: 'Analyst',
        instructions: 'Do analysis',
        status: 'ACTIVE',
        requiredPermissions: ['discovery.read'],
        allowedToolIds: [],
        riskLevel: 'LOW',
        origin: 'INTERNAL',
      });

      skillRegistry.register({
        id: 'skill.admin-only',
        version: 1,
        name: 'Admin Skill',
        description: 'Admin',
        instructions: 'Admin only',
        status: 'ACTIVE',
        requiredPermissions: ['user.manage'],
        allowedToolIds: [],
        riskLevel: 'MEDIUM',
        origin: 'INTERNAL',
      });

      const result = skillResolver.resolve({
        tenantContext: { userId: 'u-1', organizationId: 'org-1', role: 'ANALYST' },
        operation: 'test.op',
        requestedSkillIds: ['skill.analyst', 'skill.admin-only', 'non.existent'],
      });

      expect(result.resolvedSkills.length).toBe(1);
      expect(result.resolvedSkills[0].id).toBe('skill.analyst');
      expect(result.rejectedSkills.length).toBe(2);
      expect(result.rejectedSkills.find(r => r.id === 'skill.admin-only')?.reason).toBe('AI_SKILL_PERMISSION_DENIED');
      expect(result.rejectedSkills.find(r => r.id === 'non.existent')?.reason).toContain('AI_SKILL_NOT_FOUND');
    });
  });

  describe('ToolRegistry & ToolExecutor', () => {
    it('should execute read-only tools successfully when authorized', async () => {
      const readTool = {
        id: 'test.read-tool',
        version: 1,
        name: 'Test Read Tool',
        description: 'Reads test data',
        status: 'ACTIVE' as const,
        inputSchema: z.object({ organizationId: z.string() }),
        outputSchema: z.object({ success: z.boolean(), org: z.string() }),
        requiredPermissions: ['discovery.read' as const],
        riskLevel: 'LOW' as const,
        requiresApproval: false,
        sideEffect: 'READ' as const,
        idempotent: true,
        dataClassification: 'INTERNAL' as const,
        allowedAutonomyLevels: ['RECOMMEND' as const, 'READ_ONLY' as const],
        handler: async (input: any) => ({ success: true, org: input.organizationId }),
      };

      toolRegistry.register(readTool);

      const res = await toolExecutor.execute({
        toolId: 'test.read-tool',
        tenantContext: { userId: 'u-1', organizationId: 'org-123', role: 'ANALYST' },
        input: { organizationId: 'org-123' },
      });

      expect(res.status).toBe('SUCCESS');
      expect(res.data).toEqual({ success: true, org: 'org-123' });
    });

    it('should block WRITE or DESTRUCTIVE tools under autonomous / recommend policy without approval', async () => {
      const writeTool = {
        id: 'test.write-tool',
        version: 1,
        name: 'Test Write Tool',
        description: 'Writes data',
        status: 'ACTIVE' as const,
        inputSchema: z.object({ organizationId: z.string() }),
        outputSchema: z.object({ updated: z.boolean() }),
        requiredPermissions: ['discovery.edit' as const],
        riskLevel: 'HIGH' as const,
        requiresApproval: false,
        sideEffect: 'WRITE' as const,
        idempotent: false,
        dataClassification: 'CONFIDENTIAL' as const,
        allowedAutonomyLevels: ['RECOMMEND' as const],
        handler: async () => ({ updated: true }),
      };

      toolRegistry.register(writeTool);

      const res = await toolExecutor.execute({
        toolId: 'test.write-tool',
        tenantContext: { userId: 'u-1', organizationId: 'org-123', role: 'ADMIN' },
        input: {},
      });

      expect(res.status).toBe('AUTONOMY_DENIED');
      expect(res.error).toBe('AI_TOOL_AUTONOMY_NOT_ALLOWED');
    });

    it('should reject cross-tenant input override attempts', async () => {
      const readTool = {
        id: 'test.read-tool-2',
        version: 1,
        name: 'Test Read 2',
        description: 'Read 2',
        status: 'ACTIVE' as const,
        inputSchema: z.object({ organizationId: z.string() }),
        outputSchema: z.object({ org: z.string() }),
        requiredPermissions: ['discovery.read' as const],
        riskLevel: 'LOW' as const,
        requiresApproval: false,
        sideEffect: 'READ' as const,
        idempotent: true,
        dataClassification: 'INTERNAL' as const,
        allowedAutonomyLevels: ['RECOMMEND' as const],
        handler: async (input: any) => ({ org: input.organizationId }),
      };

      toolRegistry.register(readTool);

      const res = await toolExecutor.execute({
        toolId: 'test.read-tool-2',
        tenantContext: { userId: 'u-1', organizationId: 'org-A', role: 'ADMIN' },
        input: { organizationId: 'org-B' }, // Malicious cross-tenant attempt
      });

      expect(res.status).toBe('PERMISSION_DENIED');
      expect(res.error).toBe('AI_TENANT_MISMATCH');
    });
  });

  describe('CapabilityResolver & Least Capability Principle', () => {
    it('should resolve exact minimum capabilities for discovery.extract-business-context (0 tools)', () => {
      // Register the business-context-extraction skill
      skillRegistry.register({
        id: 'business-context-extraction',
        version: 1,
        name: 'Business Context Extraction',
        description: 'Extraction',
        instructions: 'Extract facts',
        status: 'ACTIVE',
        requiredPermissions: ['discovery.read'],
        allowedToolIds: [],
        riskLevel: 'LOW',
        origin: 'INTERNAL',
      });

      const capabilityResult = capabilityResolver.resolve({
        tenantContext: { userId: 'u-1', organizationId: 'org-1', role: 'ANALYST' },
        operation: 'discovery.extract-business-context',
      });

      expect(capabilityResult.operation).toBe('discovery.extract-business-context');
      expect(capabilityResult.allowedSkills.length).toBe(1);
      expect(capabilityResult.allowedSkills[0].id).toBe('business-context-extraction');
      expect(capabilityResult.allowedTools.length).toBe(0); // Least Capability: Zero tools handed over
    });
  });

  describe('KnowledgeRetriever Tenant Isolation', () => {
    it('should throw error if retrieval organizationId does not match tenantContext', async () => {
      await expect(
        knowledgeRetriever.retrieve(
          { organizationId: 'org-B', query: 'test', maxResults: 5 },
          { userId: 'u-1', organizationId: 'org-A', role: 'ANALYST' }
        )
      ).rejects.toThrow('AI_RETRIEVAL_TENANT_MISMATCH');
    });
  });
});
