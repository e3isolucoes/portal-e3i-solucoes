const fs = require('fs');

const SERVER = process.env.E3I_PORTAL_SERVER || '/app/dist/server.cjs';
const SNIPPET = process.env.E3I_ADMIN_BRAND_SNIPPET || '/tmp/brand-assets-server-snippet.txt';
const MARKER = 'E3I_ADMIN_BRAND_ASSETS_PATCH_V1';
const LOGIN_MARKER = 'app.post("/api/auth/login", async (req, res) => {';

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`${label}: marker not found`);
  if (source.indexOf(needle, first + needle.length) >= 0) throw new Error(`${label}: marker is not unique`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let server = fs.readFileSync(SERVER, 'utf8');
if (!server.includes(MARKER)) {
  const snippet = fs.readFileSync(SNIPPET, 'utf8').trimEnd();
  if (!snippet.includes(MARKER)) throw new Error('brand asset snippet marker missing');
  server = replaceOnce(server, LOGIN_MARKER, `${snippet}\n\n${LOGIN_MARKER}`, 'login route');
  fs.writeFileSync(SERVER, server, 'utf8');
}

const patched = fs.readFileSync(SERVER, 'utf8');
if (!patched.includes(MARKER)) throw new Error('brand asset patch validation failed');
if (!patched.includes("app.get('/e3i-logo.svg'")) throw new Error('brand logo route validation failed');
if (!patched.includes("image/svg+xml; charset=utf-8")) throw new Error('brand logo MIME validation failed');
if (!patched.includes(LOGIN_MARKER)) throw new Error('login route was damaged');
console.log('PORTAL_ADMIN_BRAND_ASSET_PATCH_OK');
