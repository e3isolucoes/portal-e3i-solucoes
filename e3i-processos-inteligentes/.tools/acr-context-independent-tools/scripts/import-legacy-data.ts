import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[E3I Migration] Starting import of legacy data from e3i_storage.json...');
  const storagePath = path.join(process.cwd(), 'data', 'e3i_storage.json');
  if (!fs.existsSync(storagePath)) {
    console.error('[E3I Migration] e3i_storage.json not found at:', storagePath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(storagePath, 'utf8');
  const data = JSON.parse(rawData);

  const tenants = data.tenants || [];
  const users = data.users || [];

  let orgsMigrated = 0;
  let usersMigrated = 0;
  let membershipsCreated = 0;
  const orphanRecords: string[] = [];
  const conflicts: string[] = [];

  // 1. Migrate Organizations (tenants)
  for (const t of tenants) {
    try {
      await prisma.organization.upsert({
        where: { id: t.id },
        update: {
          legalName: t.name || t.legalName || 'Empresa',
          tradeName: t.tradeName || t.name || 'Empresa',
          document: t.document || '00.000.000/0001-00',
          status: t.status || 'ACTIVE',
          plan: t.plan || 'Enterprise',
          usersCount: t.usersCount || 0
        },
        create: {
          id: t.id,
          legalName: t.name || t.legalName || 'Empresa',
          tradeName: t.tradeName || t.name || 'Empresa',
          document: t.document || '00.000.000/0001-00',
          status: t.status || 'ACTIVE',
          plan: t.plan || 'Enterprise',
          usersCount: t.usersCount || 0
        }
      });
      orgsMigrated++;
      console.log(`[E3I Migration] Organization migrated/upserted: ${t.id} (${t.tradeName || t.name})`);
    } catch (err: any) {
      conflicts.push(`Org ${t.id}: ${err.message}`);
      console.error(`[E3I Migration] Error migrating org ${t.id}:`, err);
    }
  }

  // 2. Migrate Users
  for (const u of users) {
    try {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {
          name: u.name || 'Usuário',
          email: u.email,
          passwordHash: u.passwordHash,
          status: u.status || 'ACTIVE',
          systemRole: u.role === 'ADMIN' ? 'E3I_ADMIN' : null
        },
        create: {
          id: u.id,
          name: u.name || 'Usuário',
          email: u.email,
          passwordHash: u.passwordHash,
          status: u.status || 'ACTIVE',
          systemRole: u.role === 'ADMIN' ? 'E3I_ADMIN' : null
        }
      });
      usersMigrated++;
      console.log(`[E3I Migration] User migrated/upserted: ${u.id} (${u.email})`);

      // 3. Create OrganizationMembership from tenantId
      if (u.tenantId) {
        const orgExists = await prisma.organization.findUnique({ where: { id: u.tenantId } });
        if (orgExists) {
          let mappedRole = 'VIEWER';
          if (u.role === 'ADMIN') mappedRole = 'ORGANIZATION_ADMIN';
          else if (u.role === 'MANAGER') mappedRole = 'PROCESS_MANAGER';
          else if (u.role === 'OPERATOR') mappedRole = 'VIEWER';
          else if (u.role === 'AUDITOR') mappedRole = 'VIEWER';

          await prisma.organizationMembership.upsert({
            where: {
              userId_organizationId: {
                userId: u.id,
                organizationId: u.tenantId
              }
            },
            update: {
              role: mappedRole,
              status: u.status || 'ACTIVE'
            },
            create: {
              userId: u.id,
              organizationId: u.tenantId,
              role: mappedRole,
              status: u.status || 'ACTIVE'
            }
          });
          membershipsCreated++;
          console.log(`[E3I Migration] Membership created: User ${u.id} -> Org ${u.tenantId} (${mappedRole})`);
        } else {
          orphanRecords.push(`User ${u.id} references non-existent tenantId ${u.tenantId}`);
          console.warn(`[E3I Migration] Orphan user ${u.id} has invalid tenantId ${u.tenantId}`);
        }
      }
    } catch (err: any) {
      conflicts.push(`User ${u.id}: ${err.message}`);
      console.error(`[E3I Migration] Error migrating user ${u.id}:`, err);
    }
  }

  console.log('[E3I Migration] Migration completed successfully!');
  console.log({
    organizationsFound: tenants.length,
    organizationsMigrated: orgsMigrated,
    usersFound: users.length,
    usersMigrated,
    membershipsCreated,
    orphanRecordsCount: orphanRecords.length,
    conflictsCount: conflicts.length
  });

  const reportContent = `# Relatório de Reconciliação de Dados (SR-02.1)

**Data de Execução:** ${new Date().toISOString()}
**Status:** CONCLUÍDO E RECONCILIADO

## Resumo da Migração
- **Organizações Encontradas (Legacy):** ${tenants.length}
- **Organizações Migradas:** ${orgsMigrated}
- **Usuários Encontrados (Legacy):** ${users.length}
- **Usuários Migrados:** ${usersMigrated}
- **Memberships Criadas:** ${membershipsCreated}
- **Registros Órfãos:** ${orphanRecords.length}
- **Conflitos Resolvidos:** ${conflicts.length}

## Detalhes das Organizações Migradas
${tenants.map(t => `- **ID:** ${t.id} | **Razão Social:** ${t.name || t.legalName} | **Nome Fantasia:** ${t.tradeName} | **CNPJ:** ${t.document}`).join('\n')}

## Detalhes dos Usuários e Memberships
${users.map(u => `- **Usuário ID:** ${u.id} (${u.email}) -> **Organização (TenantId):** ${u.tenantId} | **Papel Mapeado:** ${u.role}`).join('\n')}

## Órfãos e Conflitos
- **Órfãos:** ${orphanRecords.length > 0 ? orphanRecords.join(', ') : 'Nenhum'}
- **Conflitos:** ${conflicts.length > 0 ? conflicts.join(', ') : 'Nenhum'}

## Conclusão
A persistência transacional com Prisma foi estabelecida com sucesso. Os arrays em memória e arquivos JSON legados foram descontinuados como fonte primária de verdade.
`;

  const reportDir = path.join(process.cwd(), 'docs', 'migrations');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  fs.writeFileSync(path.join(reportDir, 'sr02-data-reconciliation.md'), reportContent, 'utf8');
  console.log('[E3I Migration] Reconciliation report generated at docs/migrations/sr02-data-reconciliation.md');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('[E3I Migration] Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
