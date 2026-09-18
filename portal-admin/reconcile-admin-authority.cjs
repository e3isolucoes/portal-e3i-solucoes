const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.E3I_PORTAL_DATA_FILE || '/app/data/bigquery_dataset.json';
const ROOT_EMAIL = String(process.env.E3I_ROOT_ADMIN_EMAIL || 'admin@e3isolucoes.com.br').trim().toLowerCase();

function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
function usersOf(dataset) {
  if (Array.isArray(dataset?.tables?.users?.data)) return dataset.tables.users.data;
  if (Array.isArray(dataset?.users)) return dataset.users;
  if (Array.isArray(dataset?.data?.users)) return dataset.data.users;
  return [];
}
function membershipsOf(dataset) {
  const candidates = [dataset?.tables?.organization_memberships?.data, dataset?.memberships, dataset?.organizationMembers, dataset?.tenantMemberships, dataset?.data?.memberships];
  return candidates.find(Array.isArray) || [];
}
function sessionsOf(dataset) {
  const candidates = [dataset?.tables?.sessions?.data, dataset?.sessions, dataset?.data?.sessions];
  return candidates.find(Array.isArray) || [];
}
function hasAdminRole(user) {
  return [user?.role, user?.systemRole, user?.portalRole, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .some((role) => String(role || '').toUpperCase() === 'E3I_ADMIN');
}
function setRole(user, role) {
  user.role = role;
  user.systemRole = role;
  if (String(user.portalRole || '').toUpperCase() === 'E3I_ADMIN' || role === 'E3I_ADMIN') user.portalRole = role;
}
function membershipFor(memberships, user) {
  const id = String(user?.id || user?.userId || '');
  const tenant = String(user?.tenantId || user?.organizationId || '');
  return memberships.find((m) => String(m?.userId || m?.memberId || '') === id && (!tenant || String(m?.organizationId || m?.tenantId || '') === tenant))
    || memberships.find((m) => String(m?.userId || m?.memberId || '') === id)
    || null;
}
function revokeSessions(sessions, userId, now) {
  let count = 0;
  for (const session of sessions) {
    if (String(session?.userId || session?.actorId || '') !== String(userId || '') || session.revokedAt) continue;
    session.revokedAt = now;
    count += 1;
  }
  return count;
}
function writeAtomic(file, dataset) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const backup = `${file}.admin-authority.bak`;
  let fd;
  try {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, backup);
      try { fs.chmodSync(backup, 0o600); } catch (_) {}
    }
    fd = fs.openSync(temp, 'w', 0o600);
    fs.writeFileSync(fd, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temp, file);
    try { fs.chmodSync(file, 0o600); } catch (_) {}
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch (_) {} }
    if (fs.existsSync(temp)) { try { fs.unlinkSync(temp); } catch (_) {} }
  }
}

if (!fs.existsSync(DATA_FILE)) {
  console.log('PORTAL_ADMIN_AUTHORITY_RECONCILE_SKIPPED');
  process.exit(0);
}

const dataset = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const users = usersOf(dataset);
const memberships = membershipsOf(dataset);
const sessions = sessionsOf(dataset);
const now = new Date().toISOString();
let changed = false;
let promotedRoot = 0;
let demotedLegacy = 0;
let preservedDelegated = 0;
let revokedSessions = 0;

for (const user of users) {
  const email = normalizeEmail(user?.email);
  const id = String(user?.id || user?.userId || '');
  const membership = membershipFor(memberships, user);
  const isRoot = email === ROOT_EMAIL;
  const admin = hasAdminRole(user);
  const delegatedByRoot = normalizeEmail(user?.adminCentralGrantedBy) === ROOT_EMAIL;

  if (isRoot) {
    if (!admin) {
      setRole(user, 'E3I_ADMIN');
      promotedRoot += 1;
      changed = true;
      revokedSessions += revokeSessions(sessions, id, now);
    }
    if (membership && String(membership.role || '').toUpperCase() !== 'ADMIN') {
      membership.role = 'ADMIN';
      changed = true;
    }
    if (user.adminCentralGrantedBy || user.adminCentralGrantedAt) {
      delete user.adminCentralGrantedBy;
      delete user.adminCentralGrantedAt;
      changed = true;
    }
    continue;
  }

  if (admin && delegatedByRoot) {
    preservedDelegated += 1;
    if (membership && String(membership.role || '').toUpperCase() !== 'ADMIN') {
      membership.role = 'ADMIN';
      changed = true;
    }
    continue;
  }

  if (admin && !delegatedByRoot) {
    setRole(user, 'OPERATOR');
    if (membership && String(membership.role || '').toUpperCase() === 'ADMIN') membership.role = 'MEMBER';
    delete user.adminCentralGrantedBy;
    delete user.adminCentralGrantedAt;
    demotedLegacy += 1;
    changed = true;
    revokedSessions += revokeSessions(sessions, id, now);
    continue;
  }

  if (!admin && (user.adminCentralGrantedBy || user.adminCentralGrantedAt)) {
    delete user.adminCentralGrantedBy;
    delete user.adminCentralGrantedAt;
    changed = true;
  }
}

if (changed) {
  dataset.lastSyncAt = now;
  writeAtomic(DATA_FILE, dataset);
}

console.log(`PORTAL_ADMIN_AUTHORITY_RECONCILED root_promoted=${promotedRoot} legacy_demoted=${demotedLegacy} delegated_preserved=${preservedDelegated} sessions_revoked=${revokedSessions}`);
