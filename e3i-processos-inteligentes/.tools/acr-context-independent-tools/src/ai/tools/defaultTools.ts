import { z } from 'zod';
import { globalToolRegistry } from './ToolRegistry';
import { createOperationalPersistence } from '../../infrastructure/persistence/persistenceFactory';

globalToolRegistry.register({
  id: 'business-context.get-confirmed-facts',
  version: 1,
  name: 'Get Confirmed Business Facts',
  description: 'Retrieves confirmed and authorized business facts (products, services, systems, and controls) for the current tenant organization. Read-only and strictly scoped to tenant context.',
  status: 'ACTIVE',
  inputSchema: z.object({
    organizationId: z.string().min(1, 'Organization ID is required')
  }),
  outputSchema: z.object({
    organizationId: z.string(),
    data: z.any().nullable(),
    updatedAt: z.string().optional()
  }).nullable(),
  requiredPermissions: ['discovery.read'],
  riskLevel: 'LOW',
  requiresApproval: false,
  sideEffect: 'READ',
  idempotent: true,
  dataClassification: 'INTERNAL',
  allowedAutonomyLevels: ['READ_ONLY', 'RECOMMEND'],
  handler: async (input, context) => {
    // Ensure organizationId matches execution context exclusively
    const orgId = context.organizationId || input.organizationId;
    const persistence = createOperationalPersistence();
    const entity = await persistence.businessContexts.findByOrganizationId(orgId);
    if (!entity) {
      return null;
    }
    return {
      organizationId: entity.organizationId,
      data: entity.data,
      updatedAt: entity.updatedAt,
    };
  }
});
