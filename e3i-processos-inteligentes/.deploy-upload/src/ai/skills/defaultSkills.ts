import { globalSkillRegistry } from './SkillRegistry';

globalSkillRegistry.register({
  id: 'business-context-extraction',
  version: 1,
  name: 'Business Context Extraction Skill',
  description: 'Competence to analyze raw business user text and extract structured entities (products, services, customer segments, mentioned systems, and manual controls) with strict factual adherence.',
  instructions: 'Extract only information explicitly stated in the source text. Do not complete gaps or invent entities.',
  status: 'ACTIVE',
  requiredPermissions: ['discovery.read', 'discovery.contribute'],
  allowedToolIds: [],
  riskLevel: 'LOW',
  origin: 'INTERNAL',
});
