import fs from 'fs';
import path from 'path';
import { createAnalyticalPersistence } from '../src/infrastructure/persistence/persistenceFactory';

async function main() {
  console.log('[E3I Import History to BigQuery] Starting migration of historical audit logs and metrics into BigQuery analytical store...');
  const storagePath = path.join(process.cwd(), 'data', 'e3i_storage.json');
  if (!fs.existsSync(storagePath)) {
    console.error('[E3I Import History to BigQuery] e3i_storage.json not found at:', storagePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(storagePath, 'utf8');
  const data = JSON.parse(raw);

  const analytical = createAnalyticalPersistence();
  const auditLogs = data.auditLogs || [];

  let auditCount = 0;
  for (const log of auditLogs) {
    try {
      await analytical.audit.log({
        id: log.id || `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: log.timestamp || new Date().toISOString(),
        organizationId: log.organizationId || log.tenantId || 'tenant-1',
        actorUserId: log.actorUserId || log.userId || 'usr-1',
        action: log.action || 'SYSTEM_ACTION',
        module: log.module || 'GENERAL',
        status: log.status || 'SUCCESS',
        details: log.details || log.result
      });
      auditCount++;
    } catch (e) {
      console.error('Error logging audit event:', e);
    }
  }

  console.log(`[E3I Import History to BigQuery] Successfully migrated ${auditCount} audit events into BigQuery analytical store.`);
}

main().catch((e) => {
  console.error('[E3I Import History to BigQuery] Fatal error:', e);
  process.exit(1);
});
