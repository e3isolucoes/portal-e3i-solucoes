import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('consome o código AWS de uso único do portal antes do fallback por postMessage', async () => {
  const [auth, app] = await Promise.all([
    readFile(new URL('../js/api/auth.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(auth, /portal_sso_code/);
  assert.match(auth, /portal-session\/exchange/);
  assert.match(auth, /history\.replaceState/);
  assert.ok(app.indexOf('const portalSession = await completePortalSso()') < app.indexOf('await bootstrapPortalSession'));
});
