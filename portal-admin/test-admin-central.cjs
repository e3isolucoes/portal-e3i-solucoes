const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const adminDir = process.env.E3I_ADMIN_DIR || __dirname;
const patchScript = process.env.E3I_ADMIN_PATCH_SCRIPT || path.join(adminDir, 'patch-admin-central.cjs');
const snippetPath = process.env.E3I_ADMIN_SNIPPET || path.join(adminDir, 'admin-central-server-snippet.txt');
const read = (name) => fs.readFileSync(path.join(adminDir, name), 'utf8');

const html = read('admin-central.html'); const css = read('admin-central.css'); const js = read('admin-central.js'); const snippet = fs.readFileSync(snippetPath, 'utf8');
for (const panel of ['overview', 'users', 'access', 'parameters', 'security', 'audit']) assert.match(html, new RegExp(`id="panel-${panel}"`));
assert.match(html, /id="newUserButton"/); assert.match(html, /id="userDialog"/); assert.match(html, /admin-central\.js/); assert.match(html, /admin-ferramentas\.html/); assert.doesNotMatch(html, /type="password"/i);
assert.match(css, /--brand-navy:\s*#162e50/i); assert.match(css, /--brand-gold:\s*#d0a95e/i); assert.match(css, /@media \(max-width: 560px\)/); assert.match(css, /focus-visible/); assert.match(css, /min-height:\s*44px/);
assert.match(js, /\/api\/client-tools/); assert.match(js, /\/users/); assert.match(js, /revoke-sessions/); assert.match(js, /require-first-login/); assert.match(js, /admin-events/); assert.match(js, /central-settings/); assert.match(js, /inviteDelivery === 'FAILED'/); assert.match(js, /payload\.delivery === 'FAILED'/); assert.match(js, /'x-e3i-admin-request': '1'/); assert.match(js, /credentials: 'same-origin'/); assert.doesNotMatch(js, /localStorage|sessionStorage|eval\(|\.innerHTML\s*=/);
assert.match(snippet, /E3I_ADMIN_CENTRAL_PATCH_V2/); assert.match(snippet, /E3I_ADMIN/); assert.match(snippet, /OPERATOR/); assert.match(snippet, /SELF_LOCKOUT_BLOCKED/); assert.match(snippet, /LAST_ADMIN_REQUIRED/); assert.match(snippet, /EMAIL_ALREADY_REGISTERED/); assert.match(snippet, /ADMIN_USER_SUSPENDED/); assert.match(snippet, /ADMIN_USER_FIRST_LOGIN_REQUIRED/); assert.match(snippet, /e3iAdminCentralSyncMembership/); assert.match(snippet, /organization_memberships/); assert.match(snippet, /usersCount/); assert.match(snippet, /status\(409\)/); assert.match(snippet, /status\(404\)/); assert.match(snippet, /renameSync/); assert.match(snippet, /0o600/); assert.match(snippet, /tables\?\.users\?\.data/); assert.doesNotMatch(snippet, /agentMode[^\n]+WRITE/i);
for (const legacy of ['admin-ferramentas.html', 'admin-ferramentas.css', 'admin-ferramentas.js']) assert.equal(fs.existsSync(path.join(adminDir, legacy)), true, `${legacy} must remain available`);

function response() {
  return { statusCode: 200, payload: undefined, headers: {}, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; }, set(name, value) { this.headers[name] = value; return this; } };
}
function request({ auth, params = {}, body = {}, write = true } = {}) { return { __auth: auth, params, body, get(name) { return name.toLowerCase() === 'x-e3i-admin-request' && write ? '1' : ''; } }; }

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e3i-admin-v2-')); const fixtureServer = path.join(tempDir, 'server.cjs'); const settingsFile = path.join(tempDir, 'settings.json'); const dataFile = path.join(tempDir, 'dataset.json');
fs.writeFileSync(dataFile, JSON.stringify({ tables: { users: { data: [], rowsCount: 0 }, organization_memberships: { data: [], rowsCount: 0 }, tenants: { data: [{ id:'tenant-a', status:'ACTIVE', usersCount:0 }], rowsCount: 1 } } }), 'utf8');
const fixtureSource = `
const users = [
 { id:'admin-1', name:'Admin', email:'admin@example.com', role:'E3I_ADMIN', systemRole:'E3I_ADMIN', tenantId:'tenant-a', status:'ACTIVE', mustChangePassword:false },
 { id:'user-1', name:'Operador', email:'op@example.com', role:'OPERATOR', systemRole:'OPERATOR', tenantId:'tenant-a', status:'ACTIVE', mustChangePassword:false },
 { id:'other-1', name:'Outro', email:'other@example.com', role:'E3I_ADMIN', systemRole:'E3I_ADMIN', tenantId:'tenant-b', status:'ACTIVE', mustChangePassword:false }
];
const sessions = [{ id:'s1', userId:'user-1' }, { id:'s2', userId:'user-1' }];
const auditLogs = [];
let saveCount = 0;
function saveStorage(){ saveCount += 1; }
function validateSession(req,res){ if(!req.__auth){ res.status(401).json({error:'unauthenticated'}); return null; } return req.__auth; }
function e3iClearPasswordSetup(user){ delete user.passwordSetupCodeHash; }
async function e3iIssuePasswordSetupCode(user){ user.passwordSetupCodeHash='hashed'; saveStorage(); return {sent:true}; }
const routes = new Map();
const app = { get(p,h){routes.set('GET '+p,h)}, put(p,h){routes.set('PUT '+p,h)}, post(p,h){routes.set('POST '+p,h)}, patch(p,h){routes.set('PATCH '+p,h)} };
app.post("/api/auth/login", async (req, res) => {
 const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
 const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
 return res.json({ ok: Boolean(user) });
});
module.exports = { app, routes, users, sessions, auditLogs, getSaveCount:()=>saveCount };
`;
fs.writeFileSync(fixtureServer, fixtureSource, 'utf8');
const env = { ...process.env, E3I_PORTAL_SERVER: fixtureServer, E3I_ADMIN_CENTRAL_SNIPPET: snippetPath, E3I_ADMIN_SETTINGS_FILE: settingsFile, E3I_PORTAL_DATA_FILE: dataFile };
const patchResult = spawnSync(process.execPath, [patchScript], { encoding: 'utf8', env }); assert.equal(patchResult.status, 0, `${patchResult.stdout}\n${patchResult.stderr}`); assert.match(patchResult.stdout, /PORTAL_ADMIN_CENTRAL_PATCH_OK/);
const patched = fs.readFileSync(fixtureServer, 'utf8'); assert.equal((patched.match(/E3I_ADMIN_CENTRAL_PATCH_V2/g) || []).length, 1); assert.equal((patched.match(/E3I_ADMIN_USER_STATUS_GUARD_V1/g) || []).length, 1); assert.equal((patched.match(/app\.post\("\/api\/auth\/login"/g) || []).length, 1);
const syntaxResult = spawnSync(process.execPath, ['--check', fixtureServer], { encoding: 'utf8' }); assert.equal(syntaxResult.status, 0, syntaxResult.stderr);
const secondPatch = spawnSync(process.execPath, [patchScript], { encoding: 'utf8', env }); assert.equal(secondPatch.status, 0, secondPatch.stderr); const twice = fs.readFileSync(fixtureServer, 'utf8'); assert.equal((twice.match(/E3I_ADMIN_CENTRAL_PATCH_V2/g) || []).length, 1); assert.equal((twice.match(/E3I_ADMIN_USER_STATUS_GUARD_V1/g) || []).length, 1);

process.env.E3I_ADMIN_SETTINGS_FILE = settingsFile; process.env.E3I_PORTAL_DATA_FILE = dataFile;
const runtime = require(fixtureServer); const adminAuth = { actorId:'admin-1', role:'E3I_ADMIN', tenantId:'tenant-a', email:'admin@example.com' };
function route(method, routePath) { const handler = runtime.routes.get(`${method} ${routePath}`); assert.ok(handler, `missing route ${method} ${routePath}`); return handler; }
async function invoke(method, routePath, { auth = adminAuth, params = { organizationId:'tenant-a' }, body = {}, write = true } = {}) { const req = request({ auth, params, body, write }); const res = response(); await route(method, routePath)(req, res); return res; }

(async () => {
  let res = await invoke('GET', '/api/admin/organizations/:organizationId/users'); assert.equal(res.statusCode, 200); assert.equal(res.payload.users.length, 2); assert.equal(res.payload.users.some((u) => Object.prototype.hasOwnProperty.call(u, 'passwordHash')), false);
  res = await invoke('GET', '/api/admin/organizations/:organizationId/users', { params: { organizationId:'tenant-b' } }); assert.equal(res.statusCode, 404);
  res = await invoke('POST', '/api/admin/organizations/:organizationId/users', { body: { name:'Novo Usuário', email:'novo@example.com', role:'OPERATOR', sendInvite:true } }); assert.equal(res.statusCode, 201); assert.equal(res.payload.user.mustChangePassword, true); assert.equal(res.payload.inviteDelivery, 'SENT');
  let persisted = JSON.parse(fs.readFileSync(dataFile, 'utf8')); const newMembership = persisted.tables.organization_memberships.data.find((entry) => entry.userId === res.payload.user.id); assert.ok(newMembership); assert.equal(newMembership.organizationId, 'tenant-a'); assert.equal(newMembership.role, 'OPERATOR'); assert.equal(newMembership.status, 'ACTIVE'); assert.equal(persisted.tables.organization_memberships.rowsCount, 1); assert.equal(persisted.tables.tenants.data[0].usersCount, 1);
  res = await invoke('POST', '/api/admin/organizations/:organizationId/users', { body: { name:'Duplicado', email:'novo@example.com', role:'OPERATOR' } }); assert.equal(res.statusCode, 409); assert.equal(res.payload.code, 'EMAIL_ALREADY_REGISTERED');
  res = await invoke('POST', '/api/admin/organizations/:organizationId/users/:userId/status', { params: { organizationId:'tenant-a', userId:'admin-1' }, body: { status:'DISABLED' } }); assert.equal(res.statusCode, 409); assert.equal(res.payload.code, 'SELF_LOCKOUT_BLOCKED');
  res = await invoke('PATCH', '/api/admin/organizations/:organizationId/users/:userId', { params: { organizationId:'tenant-a', userId:'admin-1' }, body: { role:'OPERATOR' } }); assert.equal(res.statusCode, 409);
  res = await invoke('POST', '/api/admin/organizations/:organizationId/users/:userId/status', { params: { organizationId:'tenant-a', userId:'user-1' }, body: { status:'DISABLED' } }); assert.equal(res.statusCode, 200); assert.equal(res.payload.user.status, 'DISABLED'); assert.equal(runtime.sessions.every((s) => s.userId !== 'user-1' || Boolean(s.revokedAt)), true);
  persisted = JSON.parse(fs.readFileSync(dataFile, 'utf8')); let operatorMembership = persisted.tables.organization_memberships.data.find((entry) => entry.userId === 'user-1'); assert.equal(operatorMembership.status, 'DISABLED'); assert.equal(persisted.tables.tenants.data[0].usersCount, 1);
  res = await invoke('POST', '/api/admin/organizations/:organizationId/users/:userId/status', { params: { organizationId:'tenant-a', userId:'user-1' }, body: { status:'ACTIVE' } }); assert.equal(res.statusCode, 200);
  persisted = JSON.parse(fs.readFileSync(dataFile, 'utf8')); operatorMembership = persisted.tables.organization_memberships.data.find((entry) => entry.userId === 'user-1'); assert.equal(operatorMembership.status, 'ACTIVE'); assert.equal(persisted.tables.tenants.data[0].usersCount, 2);
  res = await invoke('POST', '/api/admin/organizations/:organizationId/users/:userId/require-first-login', { params: { organizationId:'tenant-a', userId:'user-1' }, body: { sendCode:true } }); assert.equal(res.statusCode, 200); assert.equal(res.payload.user.mustChangePassword, true); assert.equal(res.payload.delivery, 'SENT');
  res = await invoke('POST', '/api/admin/organizations/:organizationId/users/:userId/revoke-sessions', { params: { organizationId:'tenant-a', userId:'admin-1' } }); assert.equal(res.statusCode, 409); assert.equal(res.payload.code, 'SELF_SESSION_REVOKE_BLOCKED');
  res = await invoke('GET', '/api/admin/organizations/:organizationId/admin-events'); assert.equal(res.statusCode, 200); assert.ok(res.payload.events.length >= 3); assert.equal(JSON.stringify(res.payload.events).includes('novo@example.com'), false);
  res = await invoke('POST', '/api/admin/organizations/:organizationId/users', { body: { name:'Sem Header', email:'header@example.com', role:'OPERATOR' }, write:false }); assert.equal(res.statusCode, 403);
  console.log('PORTAL_ADMIN_CENTRAL_VALIDATION_OK');
  fs.rmSync(tempDir, { recursive:true, force:true });
})().catch((error) => { console.error(error); fs.rmSync(tempDir, { recursive:true, force:true }); process.exit(1); });
