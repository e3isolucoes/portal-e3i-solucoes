const fs = require('fs');
const path = require('path');

const DIST = process.env.E3I_PORTAL_DIST || '/app/dist';
const ASSETS = path.join(DIST, 'assets');
const MARKER = '__E3I_OBLIGATIONS_LAUNCH_FIX_V1';
const CACHE_KEY = 'e3i_obligations_launch_url';
const ENDPOINT = '/api/client-tools/painel-obrigacoes/launch';

function jsFiles(dir) {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(dir, name));
}

const files = jsFiles(ASSETS);
const alreadyPatched = files.find((file) => fs.readFileSync(file, 'utf8').includes(MARKER));
if (alreadyPatched) {
  console.log('PORTAL_OBLIGATIONS_LAUNCH_PATCH_ALREADY_APPLIED');
  process.exit(0);
}

const candidates = files.filter((file) => {
  const source = fs.readFileSync(file, 'utf8');
  return source.includes(CACHE_KEY) && source.includes(ENDPOINT);
});

if (candidates.length !== 1) {
  throw new Error(`expected exactly one obligations launcher bundle, found ${candidates.length}`);
}

const file = candidates[0];
let source = fs.readFileSync(file, 'utf8');

const initialState = 'w.useState(()=>sessionStorage.getItem("e3i_obligations_launch_url")||_S)';
const initialReplacement = 'w.useState("about:blank")';
if (!source.includes(initialState)) {
  throw new Error('obligations launcher initial state marker not found');
}
source = source.replace(initialState, initialReplacement);

const launchTail = 'return sessionStorage.setItem("e3i_obligations_launch_url",b.url),f(b.url),i(g=>g+1),b.url};return s.jsx("section"';
const launchReplacement = 'return f(b.url),i(g=>g+1),b.url};globalThis.__E3I_OBLIGATIONS_LAUNCH_FIX_V1=!0,w.useEffect(()=>{m().catch(()=>o(!1))},[]);return s.jsx("section"';
if (!source.includes(launchTail)) {
  throw new Error('obligations launcher refresh marker not found');
}
source = source.replace(launchTail, launchReplacement);

if (source.includes(CACHE_KEY)) {
  throw new Error('one-time obligations launch URL cache still present after patch');
}
if (!source.includes(MARKER) || !source.includes('w.useEffect(()=>{m().catch(()=>o(!1))},[])')) {
  throw new Error('automatic obligations launch refresh was not injected');
}

fs.writeFileSync(file, source, 'utf8');
console.log(`PORTAL_OBLIGATIONS_LAUNCH_PATCH_OK ${path.basename(file)}`);
