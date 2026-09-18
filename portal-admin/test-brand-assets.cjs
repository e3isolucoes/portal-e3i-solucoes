const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = process.env.E3I_ADMIN_DIR || __dirname;
const patchScript = process.env.E3I_ADMIN_BRAND_PATCH_SCRIPT || path.join(dir, 'patch-brand-assets.cjs');
const snippetPath = process.env.E3I_ADMIN_BRAND_SNIPPET || path.join(dir, 'brand-assets-server-snippet.txt');
const logoPath = process.env.E3I_ADMIN_BRAND_LOGO_FILE || path.join(dir, 'e3i-logo.svg');

assert.equal(fs.existsSync(logoPath), true, 'brand logo must exist');
assert.ok(fs.statSync(logoPath).size > 0, 'brand logo must not be empty');
const snippet = fs.readFileSync(snippetPath, 'utf8');
assert.match(snippet, /E3I_ADMIN_BRAND_ASSETS_PATCH_V2/);
assert.match(snippet, /app\.get\('\/e3i-logo\.svg'/);
assert.match(snippet, /image\/svg\+xml/);
assert.match(snippet, /X-Content-Type-Options/);\nassert.match(snippet, /res\.status\(200\)\.end\(E3I_ADMIN_BRAND_LOGO_SVG\)/);\nassert.doesNotMatch(snippet, /readFileSync/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'e3i-admin-brand-'));
const server = path.join(temp, 'server.cjs');
fs.writeFileSync(server, [
  "const app={get(){},post(){}};",
  'app.post("/api/auth/login", async (req, res) => { return res; });',
  'module.exports=app;',
  '',
].join('\n'), 'utf8');

const run = () => spawnSync(process.execPath, [patchScript], {
  encoding: 'utf8',
  env: {
    ...process.env,
    E3I_PORTAL_SERVER: server,
    E3I_ADMIN_BRAND_SNIPPET: snippetPath,
  },
});

let result = run();
assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
assert.match(result.stdout, /PORTAL_ADMIN_BRAND_ASSET_PATCH_OK/);
let patched = fs.readFileSync(server, 'utf8');
assert.equal((patched.match(/E3I_ADMIN_BRAND_ASSETS_PATCH_V2/g) || []).length, 1);
assert.match(patched, /app\.get\('\/e3i-logo\.svg'/);
assert.equal(spawnSync(process.execPath, ['--check', server], { encoding: 'utf8' }).status, 0);

result = run();
assert.equal(result.status, 0, result.stderr);
patched = fs.readFileSync(server, 'utf8');
assert.equal((patched.match(/E3I_ADMIN_BRAND_ASSETS_PATCH_V2/g) || []).length, 1, 'patch must be idempotent');

fs.rmSync(temp, { recursive: true, force: true });
console.log('PORTAL_ADMIN_BRAND_ASSET_VALIDATION_OK');
