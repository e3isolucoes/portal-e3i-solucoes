const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const adminDir = process.env.E3I_ADMIN_DIR || __dirname;
const patchScript = process.env.E3I_ADMIN_PATCH_SCRIPT || path.join(adminDir, 'patch-admin-central.cjs');
const snippetPath = process.env.E3I_ADMIN_SNIPPET || path.join(adminDir, 'admin-central-server-snippet.txt');

function read(name) {
  return fs.readFileSync(path.join(adminDir, name), 'utf8');
}

const html = read('admin-central.html');
const css = read('admin-central.css');
const js = read('admin-central.js');
const snippet = fs.readFileSync(snippetPath, 'utf8');

assert.match(html, /id="panel-access"/);
assert.match(html, /id="panel-parameters"/);
assert.match(html, /id="panel-governance"/);
assert.match(html, /admin-central\.js/);
assert.match(html, /admin-ferramentas\.html/);
assert.doesNotMatch(html, /type="password"/i);

assert.match(css, /@media \(max-width: 560px\)/);
assert.match(css, /grid-template-columns: repeat\(4/);
assert.match(css, /focus-visible/);

assert.match(js, /\/api\/client-tools/);
assert.match(js, /\/api\/admin\/organizations\//);
assert.match(js, /central-settings/);
assert.match(js, /'x-e3i-admin-request': '1'/);
assert.match(js, /credentials: 'same-origin'/);
assert.match(js, /enabled: false/);
assert.match(js, /ingestionEnabled: false/);
assert.match(js, /agentMode: 'DISABLED'/);
assert.match(js, /requireHumanApproval: true/);
assert.match(js, /allowSensitivePersonalData: false/);
assert.doesNotMatch(js, /localStorage|sessionStorage|eval\(|\.innerHTML\s*=/);

assert.match(snippet, /E3I_ADMIN_CENTRAL_PATCH_V1/);
assert.match(snippet, /enabled: false/);
assert.match(snippet, /ingestionEnabled: false/);
assert.match(snippet, /agentMode: 'DISABLED'/);
assert.match(snippet, /requireHumanApproval: true/);
assert.match(snippet, /allowSensitivePersonalData: false/);
assert.match(snippet, /E3I_ADMIN/);
assert.match(snippet, /x-e3i-admin-request/);
assert.match(snippet, /status\(409\)/);
assert.match(snippet, /status\(404\)/);
assert.match(snippet, /renameSync/);
assert.match(snippet, /0o600/);
assert.match(snippet, /e3i_admin_settings\.json/);
assert.match(snippet, /bigquery_dataset\.json/);
assert.doesNotMatch(snippet, /agentMode[^\n]+WRITE/i);

for (const legacy of ['admin-ferramentas.html', 'admin-ferramentas.css', 'admin-ferramentas.js']) {
  assert.equal(fs.existsSync(path.join(adminDir, legacy)), true, `${legacy} must remain available`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e3i-admin-central-'));
const fixtureServer = path.join(tempDir, 'server.cjs');
const fixtureSource = [
  "function validateSession(req, res) { return req && req.__auth ? req.__auth : null; }",
  "const app = { get() {}, put() {}, post() {} };",
  'app.post("/api/auth/login", async (req, res) => { return res; });',
  'module.exports = app;',
  '',
].join('\n');
fs.writeFileSync(fixtureServer, fixtureSource, 'utf8');

const patchResult = spawnSync(process.execPath, [patchScript], {
  encoding: 'utf8',
  env: {
    ...process.env,
    E3I_PORTAL_SERVER: fixtureServer,
    E3I_ADMIN_CENTRAL_SNIPPET: snippetPath,
  },
});
assert.equal(patchResult.status, 0, `${patchResult.stdout}\n${patchResult.stderr}`);
assert.match(patchResult.stdout, /PORTAL_ADMIN_CENTRAL_PATCH_OK/);

const patched = fs.readFileSync(fixtureServer, 'utf8');
assert.equal((patched.match(/E3I_ADMIN_CENTRAL_PATCH_V1/g) || []).length, 1);
assert.equal((patched.match(/app\.post\("\/api\/auth\/login"/g) || []).length, 1);

const syntaxResult = spawnSync(process.execPath, ['--check', fixtureServer], { encoding: 'utf8' });
assert.equal(syntaxResult.status, 0, syntaxResult.stderr);

const secondPatch = spawnSync(process.execPath, [patchScript], {
  encoding: 'utf8',
  env: {
    ...process.env,
    E3I_PORTAL_SERVER: fixtureServer,
    E3I_ADMIN_CENTRAL_SNIPPET: snippetPath,
  },
});
assert.equal(secondPatch.status, 0, secondPatch.stderr);
const patchedTwice = fs.readFileSync(fixtureServer, 'utf8');
assert.equal((patchedTwice.match(/E3I_ADMIN_CENTRAL_PATCH_V1/g) || []).length, 1, 'patch must be idempotent');

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('PORTAL_ADMIN_CENTRAL_VALIDATION_OK');
