import fs from 'fs';
import path from 'path';
import { createOperationalPersistence } from '../src/infrastructure/persistence/persistenceFactory';

async function main() {
  console.log('[E3I Import to Firestore] Starting migration from legacy storage into Firestore operational store...');
  const storagePath = path.join(process.cwd(), 'data', 'e3i_storage.json');
  if (!fs.existsSync(storagePath)) {
    console.error('[E3I Import to Firestore] e3i_storage.json not found at:', storagePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(storagePath, 'utf8');
  const data = JSON.parse(raw);

  const tenants = data.tenants || [];
  const users = data.users || [];

  const operational = createOperationalPersistence();

  let orgsMigrated = 0;
  let usersMigrated = 0;
  let membershipsCreated = 0;
  const orphanRecords: string[] = [];
  const conflicts: string[] = [];

  // 1. Migrate Tenants -> Organization
  for (const t of tenants) {
    try {
      await operational.organizations.save({
        id: t.id,
        legalName: t.name || t.legalName || 'Empresa',
        tradeName: t.tradeName || t.name || 'Empresa',
        document: t.document || '00.000.000/0001-00',
        status: t.status || 'ACTIVE',
        plan: t.plan || 'Enterprise',
        usersCount: t.usersCount || 0,
        createdAt: t.createdAt || '2024-01-01',
        customLogoUrl: t.customLogoUrl || ''
      });
      orgsMigrated++;
      console.log(`[E3I Import to Firestore] Organization migrated: ${t.id} (${t.tradeName || t.name})`);
    } catch (err: any) {
      conflicts.push(`Org ${t.id}: ${err.message}`);
      console.error(`[E3I Import to Firestore] Error migrating org ${t.id}:`, err);
    }
  }

  // 2. Migrate Users & Memberships
  for (const u of users) {
    try {
      await operational.users.save({
        id: u.id,
        name: u.name || 'Usuário',
        email: u.email,
        passwordHash: u.passwordHash,
        status: u.status || 'ACTIVE',
        systemRole: u.role === 'ADMIN' ? 'E3I_ADMIN' : undefined,
        createdAt: u.createdAt || '2024-01-01',
        lastLogin: u.lastLogin
      });
      usersMigrated++;
      console.log(`[E3I Import to Firestore] User migrated: ${u.id} (${u.email})`);

      if (u.tenantId) {
        const org = await operational.organizations.findById(u.tenantId);
        if (org) {
          let mappedRole = 'VIEWER';
          if (u.role === 'ADMIN') mappedRole = 'ORGANIZATION_ADMIN';
          else if (u.role === 'MANAGER') mappedRole = 'PROCESS_MANAGER';
          else if (u.role === 'OPERATOR') mappedRole = 'VIEWER';
          else if (u.role === 'AUDITOR') mappedRole = 'VIEWER';

          const membershipId = `mem-${u.id}-${u.tenantId}`;
          try {
            await operational.memberships.save({
              id: membershipId,
              userId: u.id,
              organizationId: u.tenantId,
              role: mappedRole as any,
              status: u.status || 'ACTIVE',
              joinedAt: new Date().toISOString()
            });
            membershipsCreated++;
            console.log(`[E3I Import to Firestore] Membership created: User ${u.id} -> Org ${u.tenantId} (${mappedRole})`);
          } catch (memErr: any) {
            conflicts.push(`Membership ${membershipId}: ${memErr.message}`);
          }
        } else {
          orphanRecords.push(`User ${u.id} references non-existent tenantId ${u.tenantId}`);
        }
      }
    } catch (err: any) {
      conflicts.push(`User ${u.id}: ${err.message}`);
      console.error(`[E3I Import to Firestore] Error migrating user ${u.id}:`, err);
    }
  }

  console.log('[E3I Import to Firestore] Migration completed successfully!');
  console.log({
    organizationsFound: tenants.length,
    organizationsMigrated: orgsMigrated,
    usersFound: users.length,
    usersMigrated,
    membershipsCreated,
    orphanRecordsCount: orphanRecords.length,
    conflictsCount: conflicts.length
  });
}

main().catch((e) => {
  console.error('[E3I Import to Firestore] Fatal error:', e);
  process.exit(1);
});
