const fs = require('fs');

const SERVER = process.env.E3I_PORTAL_SERVER || '/app/dist/server.cjs';
const SNIPPET = process.env.E3I_ADMIN_CENTRAL_SNIPPET || '/tmp/admin-central-server-snippet.txt';
const MARKER = 'E3I_ADMIN_CENTRAL_PATCH_V2';
const USER_STATUS_GUARD = 'E3I_ADMIN_USER_STATUS_GUARD_V1';
const LOGIN_MARKER = 'app.post("/api/auth/login", async (req, res) => {';
const USER_LOOKUP = /const user = users\.find\(\(u\) => u\.email\.toLowerCase\(\) === normalizedEmail\);/;

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`${label}: marker not found`);
  if (source.indexOf(needle, first + needle.length) >= 0) throw new Error(`${label}: marker is not unique`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let server = fs.readFileSync(SERVER, 'utf8');
if (!server.includes(MARKER)) {
  const snippet = fs.readFileSync(SNIPPET, 'utf8').trimEnd();
  if (!snippet.includes(MARKER)) throw new Error('admin central snippet marker missing');
  if (!server.includes('validateSession')) throw new Error('validateSession marker not found');
  server = replaceOnce(server, LOGIN_MARKER, `${snippet}\n\n${LOGIN_MARKER}`, 'login route');
}

if (!server.includes(USER_STATUS_GUARD)) {
  const loginPosition = server.indexOf(LOGIN_MARKER);
  if (loginPosition < 0) throw new Error('login route not found for status guard');
  const loginWindowEnd = Math.min(server.length, loginPosition + 12000);
  const loginWindow = server.slice(loginPosition, loginWindowEnd);
  const match = loginWindow.match(USER_LOOKUP);
  if (!match) throw new Error('login user lookup marker not found for status guard');
  const guardedLookup = [
    match[0],
    `    // ${USER_STATUS_GUARD}`,
    "    if (user && String(user.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {",
    "      return res.status(401).json({ error: 'Credenciais inválidas.' });",
    '    }',
  ].join('\n');
  const patchedWindow = loginWindow.replace(USER_LOOKUP, guardedLookup);
  server = server.slice(0, loginPosition) + patchedWindow + server.slice(loginWindowEnd);
}

fs.writeFileSync(SERVER, server, 'utf8');
const patched = fs.readFileSync(SERVER, 'utf8');
if (!patched.includes(MARKER)) throw new Error('admin central patch validation failed');
if (!patched.includes(USER_STATUS_GUARD)) throw new Error('disabled-user login guard validation failed');
for (const route of [
  '/api/admin/organizations/:organizationId/central-settings',
  '/api/admin/organizations/:organizationId/users',
  '/api/admin/organizations/:organizationId/admin-events',
]) {
  if (!patched.includes(route)) throw new Error(`admin central route validation failed: ${route}`);
}
if (!patched.includes('x-e3i-admin-request')) throw new Error('admin request header validation failed');
if (!patched.includes('E3I_ADMIN_CENTRAL_SETTINGS_FILE')) throw new Error('settings persistence validation failed');
if (!patched.includes(LOGIN_MARKER)) throw new Error('login route was damaged');
console.log('PORTAL_ADMIN_CENTRAL_PATCH_OK');
