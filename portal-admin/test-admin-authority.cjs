const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = process.env.E3I_ADMIN_AUTHORITY_SCRIPT || path.join(__dirname, 'reconcile-admin-authority.cjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'e3i-admin-authority-'));
const dataFile = path.join(temp, 'dataset.json');
const root = 'admin@e3isolucoes.com.br';
const dataset = {
  tables: {
    users: { data: [
      { id: 'root', email: root, role: 'OPERATOR', systemRole: 'OPERATOR', status: 'ACTIVE', tenantId: 'tenant-a' },
      { id: 'legacy', email: 'legacy@example.com', role: 'E3I_ADMIN', systemRole: 'E3I_ADMIN', status: 'ACTIVE', tenantId: 'tenant-a' },
      { id: 'delegated', email: 'delegated@example.com', role: 'E3I_ADMIN', systemRole: 'E3I_ADMIN', adminCentralGrantedBy: root, adminCentralGrantedAt: '2026-09-17T12:00:00.000Z', status: 'ACTIVE', tenantId: 'tenant-a' }
    ] },
    organization_memberships: { data: [
      { id: 'm-root', userId: 'root', organizationId: 'tenant-a', role: 'MEMBER', status: 'ACTIVE' },
      { id: 'm-legacy', userId: 'legacy', organizationId: 'tenant-a', role: 'ADMIN', status: 'ACTIVE' },
      { id: 'm-delegated', userId: 'delegated', organizationId: 'tenant-a', role: 'ADMIN', status: 'ACTIVE' }
    ] },
    sessions: { data: [
      { id: 's-root', userId: 'root' },
      { id: 's-legacy', userId: 'legacy' },
      { id: 's-delegated', userId: 'delegated' }
    ] }
  }
};
fs.writeFileSync(dataFile, JSON.stringify(dataset));

const run = spawnSync(process.execPath, [script], {
  encoding: 'utf8',
  env: { ...process.env, E3I_PORTAL_DATA_FILE: dataFile, E3I_ROOT_ADMIN_EMAIL: root }
});
assert.equal(run.status, 0, run.stderr);
assert.match(run.stdout, /PORTAL_ADMIN_AUTHORITY_RECONCILED/);

const out = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const users = out.tables.users.data;
const memberships = out.tables.organization_memberships.data;
const sessions = out.tables.sessions.data;

const rootUser = users.find((u) => u.id === 'root');
const legacy = users.find((u) => u.id === 'legacy');
const delegated = users.find((u) => u.id === 'delegated');
assert.equal(rootUser.role, 'E3I_ADMIN');
assert.equal(rootUser.systemRole, 'E3I_ADMIN');
assert.equal('adminCentralGrantedBy' in rootUser, false);
assert.equal(legacy.role, 'OPERATOR');
assert.equal(legacy.systemRole, 'OPERATOR');
assert.equal(delegated.role, 'E3I_ADMIN');
assert.equal(delegated.adminCentralGrantedBy, root);
assert.equal(memberships.find((m) => m.userId === 'root').role, 'ADMIN');
assert.equal(memberships.find((m) => m.userId === 'legacy').role, 'MEMBER');
assert.equal(memberships.find((m) => m.userId === 'delegated').role, 'ADMIN');
assert.ok(sessions.find((s) => s.userId === 'root').revokedAt);
assert.ok(sessions.find((s) => s.userId === 'legacy').revokedAt);
assert.equal(Boolean(sessions.find((s) => s.userId === 'delegated').revokedAt), false);

fs.rmSync(temp, { recursive: true, force: true });
console.log('PORTAL_ADMIN_AUTHORITY_VALIDATION_OK');
