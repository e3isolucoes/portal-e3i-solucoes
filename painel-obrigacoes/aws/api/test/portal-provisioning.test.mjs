import assert from 'node:assert/strict';
import test from 'node:test';
import { claimPortalProvisioningNonce, provisionPortalAccess, signLegacyPortalProvisioning, signPortalProvisioning, verifyPortalProvisioning } from '../src/portal-provisioning.mjs';

const secret = '0123456789abcdef0123456789abcdef';

test('aceita somente provisionamento recente e assinado pelo Portal E3I', () => {
  const now = 1_800_000_000_000;
  const body = JSON.stringify({ userId: 'user-1' });
  const timestamp = String(now);
  const nonce = 'N'.repeat(43);
  const signature = signPortalProvisioning(secret, timestamp, nonce, body);
  assert.deepEqual(verifyPortalProvisioning({ body, headers: { 'x-e3i-timestamp': timestamp, 'x-e3i-nonce': nonce, 'x-e3i-signature': signature } }, secret, now), { nonce, timestampMs: now });
  assert.throws(() => verifyPortalProvisioning({ body, headers: { 'x-e3i-timestamp': timestamp, 'x-e3i-signature': signature } }, secret, now), /Nonce/);
  assert.throws(() => verifyPortalProvisioning({ body, headers: { 'x-e3i-timestamp': timestamp, 'x-e3i-nonce': nonce, 'x-e3i-signature': '0'.repeat(64) } }, secret, now), /Assinatura/);
  assert.throws(() => verifyPortalProvisioning({ body, headers: { 'x-e3i-timestamp': String(now - 180_000), 'x-e3i-nonce': nonce, 'x-e3i-signature': signature } }, secret, now), /expirada/);
});

test('aceita temporariamente a assinatura legada sem nonce e deriva chave de replay estável', () => {
  const now = 1_800_000_000_000;
  const body = JSON.stringify({ userId: 'user-1', workspaceId: 'workspace-1' });
  const timestamp = String(now);
  const signature = signLegacyPortalProvisioning(secret, timestamp, body);

  const first = verifyPortalProvisioning({
    body,
    headers: { 'x-e3i-timestamp': timestamp, 'x-e3i-signature': signature },
  }, secret, now);
  const second = verifyPortalProvisioning({
    body,
    headers: { 'x-e3i-timestamp': timestamp, 'x-e3i-signature': signature },
  }, secret, now);

  assert.equal(first.legacy, true);
  assert.equal(first.timestampMs, now);
  assert.match(first.nonce, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(first.nonce, second.nonce);
});

test('assinatura legada não aceita corpo alterado e não contorna validação temporal', () => {
  const now = 1_800_000_000_000;
  const body = JSON.stringify({ userId: 'user-1' });
  const timestamp = String(now);
  const signature = signLegacyPortalProvisioning(secret, timestamp, body);

  assert.throws(() => verifyPortalProvisioning({
    body: JSON.stringify({ userId: 'user-2' }),
    headers: { 'x-e3i-timestamp': timestamp, 'x-e3i-signature': signature },
  }, secret, now), /Nonce/);

  assert.throws(() => verifyPortalProvisioning({
    body,
    headers: { 'x-e3i-timestamp': String(now - 180_000), 'x-e3i-signature': signature },
  }, secret, now), /expirada/);
});

test('aceita timestamp Unix em segundos sem alterar o conteúdo assinado', () => {
  const secret = 's'.repeat(32);
  const now = 1_900_000_000_500;
  const timestamp = '1900000000';
  const nonce = 'n'.repeat(32);
  const body = JSON.stringify({ userId: 'user-1' });
  const signature = signPortalProvisioning(secret, timestamp, nonce, body);

  assert.deepEqual(verifyPortalProvisioning({
    body,
    headers: { 'x-e3i-timestamp': timestamp, 'x-e3i-nonce': nonce, 'x-e3i-signature': signature },
  }, secret, now), { nonce, timestampMs: 1_900_000_000_000 });
});

test('rejeita replay concorrente e persiste somente o hash do nonce com TTL', async () => {
  let claimed = false;
  let firstCommand;
  const client = { send: async (command) => {
    firstCommand ||= command;
    await new Promise(resolve => setImmediate(resolve));
    if (claimed) throw Object.assign(new Error('conditional'), { name: 'ConditionalCheckFailedException' });
    claimed = true;
  } };
  const nonce = 'R'.repeat(43);
  const results = await Promise.allSettled([
    claimPortalProvisioningNonce(client, 'table', nonce, 1_800_000_000_000),
    claimPortalProvisioningNonce(client, 'table', nonce, 1_800_000_000_000),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), ['fulfilled', 'rejected']);
  assert.equal(results.find(result => result.status === 'rejected').reason.statusCode, 409);
  assert.equal(firstCommand.input.ConditionExpression, 'attribute_not_exists(PK)');
  assert.doesNotMatch(firstCommand.input.Item.PK, new RegExp(nonce));
  assert.equal(firstCommand.input.Item.expiresAt, 1_800_000_150);
});

test('rejeita nonce com timestamp expirado antes de gravá-lo', async () => {
  const now = 1_800_000_000_000;
  const timestamp = String(now - 120_001);
  const nonce = 'E'.repeat(43);
  const body = '{}';
  const signature = signPortalProvisioning(secret, timestamp, nonce, body);
  assert.throws(() => verifyPortalProvisioning({ body, headers: { 'x-e3i-timestamp': timestamp, 'x-request-id': nonce, 'x-e3i-signature': signature } }, secret, now), error => error.statusCode === 401);
});

test('provisiona vínculo, perfil, empresa e auditoria sem sobrescrever papéis existentes', async () => {
  let command;
  const client = { send: async (value) => { command = value; } };
  const result = await provisionPortalAccess(client, 'table', {
    userId: 'user-1', workspaceId: 'workspace-1', email: 'Pessoa@Empresa.com.br',
    displayName: 'Pessoa Teste', workspaceName: 'Empresa Teste', document: '12.345.678/0001-90',
  });
  assert.deepEqual(result, { userId: 'user-1', workspaceId: 'workspace-1', role: 'member' });
  assert.equal(command.input.TransactItems.length, 5);
  assert.match(command.input.TransactItems[0].Update.UpdateExpression, /if_not_exists\(#role,:member\)/);
  assert.match(command.input.TransactItems[2].Update.UpdateExpression, /if_not_exists\(#role,:legacyMember\)/);
  assert.equal(command.input.TransactItems[4].Put.Item.action, 'PORTAL_ACCESS_PROVISIONED');
});

test('permite SSO de organização antiga sem documento cadastrado', async () => {
  let command;
  const client = { send: async (value) => { command = value; } };

  const result = await provisionPortalAccess(client, 'table', {
    userId: 'user-1', workspaceId: 'workspace-1', email: 'pessoa@empresa.com.br',
    displayName: 'Pessoa Teste', workspaceName: 'Empresa antiga',
  });

  assert.deepEqual(result, { userId: 'user-1', workspaceId: 'workspace-1', role: 'member' });
  assert.equal(command.input.TransactItems[1].Update.ExpressionAttributeValues[':document'], '');
});
