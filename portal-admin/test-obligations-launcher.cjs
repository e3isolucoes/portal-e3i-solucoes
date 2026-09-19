const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const patchScript = process.env.E3I_OBLIGATIONS_PATCH_SCRIPT || path.join(__dirname, 'patch-obligations-launcher.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e3i-obligations-launch-'));
const assets = path.join(root, 'assets');
fs.mkdirSync(assets, { recursive: true });

const fixture = '_S="https://obrigacoes.e3isolucoes.com.br/",VS=()=>{const[n,i]=w.useState(0),[r,o]=w.useState(!0),[u,f]=w.useState(()=>sessionStorage.getItem("e3i_obligations_launch_url")||_S),m=async()=>{var p;o(!0);const x=await fetch("/api/client-tools/painel-obrigacoes/launch",{method:"POST",credentials:"include"}),b=await x.json();if(!x.ok)throw o(!1),new Error("Não foi possível renovar o acesso.");return sessionStorage.setItem("e3i_obligations_launch_url",b.url),f(b.url),i(g=>g+1),b.url};return s.jsx("section",{children:s.jsx("iframe",{src:u})})}';
const bundle = path.join(assets, 'app.js');
fs.writeFileSync(bundle, fixture, 'utf8');

function runPatch() {
  return spawnSync(process.execPath, [patchScript], {
    env: { ...process.env, E3I_PORTAL_DIST: root },
    encoding: 'utf8',
  });
}

const first = runPatch();
assert.equal(first.status, 0, first.stderr || first.stdout);
let patched = fs.readFileSync(bundle, 'utf8');
assert.ok(patched.includes('w.useState("about:blank")'));
assert.ok(patched.includes('__E3I_OBLIGATIONS_LAUNCH_FIX_V1'));
assert.ok(patched.includes('w.useEffect(()=>{m().catch(()=>o(!1))},[])'));
assert.ok(!patched.includes('e3i_obligations_launch_url'));

const second = runPatch();
assert.equal(second.status, 0, second.stderr || second.stdout);
assert.match(second.stdout, /ALREADY_APPLIED/);
assert.equal(fs.readFileSync(bundle, 'utf8'), patched);

console.log('PORTAL_OBLIGATIONS_LAUNCH_PATCH_TEST_OK');
