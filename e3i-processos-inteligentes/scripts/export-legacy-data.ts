import fs from 'fs';
import path from 'path';

async function main() {
  console.log('[E3I Export Legacy] Starting export of legacy storage data...');
  const storagePath = path.join(process.cwd(), 'data', 'e3i_storage.json');
  if (!fs.existsSync(storagePath)) {
    console.error('[E3I Export Legacy] e3i_storage.json not found at:', storagePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(storagePath, 'utf8');
  const data = JSON.parse(raw);

  const backupDir = path.join(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `e3i_storage_backup_${timestamp}.json`);
  fs.writeFileSync(backupPath, raw, 'utf8');

  console.log(`[E3I Export Legacy] Legacy storage successfully backed up to: ${backupPath}`);
  console.log({
    tenantsCount: data.tenants?.length || 0,
    usersCount: data.users?.length || 0,
    discoverySessionsCount: data.discoverySessions?.length || 0,
    strategyCanvasesCount: data.strategyCanvases?.length || 0,
    organizationMapsCount: data.organizationMaps?.length || 0,
    businessSystemsCount: data.businessSystems?.length || 0
  });
}

main().catch((e) => {
  console.error('[E3I Export Legacy] Fatal error:', e);
  process.exit(1);
});
