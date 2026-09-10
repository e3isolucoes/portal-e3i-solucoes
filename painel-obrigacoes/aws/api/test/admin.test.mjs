import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminService } from '../src/admin.mjs';

const auth = (role, workspaceId = 'tenant-a', userId = 'actor') => ({ role, workspaceId, userId, email: 'actor@test.invalid' });
const commandName = (command) => command.constructor.name;

test('somente super_admin lista e mantém workspaces pela partição administrativa, sem Scan', async () => {
  const seen = [];
  const client = { send: async command => { seen.push(command); return commandName(command) === 'QueryCommand' ? { Items: [] } : {}; } };
  const service = new AdminService(client, {}, 'table', 'pool');
  await service.listWorkspaces(auth('super_admin'));
  assert.equal(commandName(seen[0]), 'QueryCommand');
  assert.match(seen[0].input.ExpressionAttributeValues[':pk'], /ADMINISTRATION$/);
  await assert.rejects(() => service.listWorkspaces(auth('admin')), { statusCode: 403 });
  await assert.rejects(() => service.createWorkspace(auth('manager'), { name: 'X' }), { statusCode: 403 });
  await assert.rejects(() => service.createWorkspace(auth('member'), { name: 'X' }), { statusCode: 403 });
});

test('workspace aceita trial/full/suspended e valida regras de trial', async () => {
  const writes = [];
  const service = new AdminService({ send: async command => { writes.push(command); return {}; } }, {}, 'table', 'pool');
  for (const access_status of ['trial', 'full', 'suspended']) {
    const value = await service.createWorkspace(auth('super_admin'), { name: access_status, access_status, ...(access_status === 'trial' ? { trial_ends_at: '2026-09-30' } : {}) });
    assert.equal(value.access_status, access_status);
  }
  assert.equal(writes.every(command => commandName(command) === 'TransactWriteCommand'), true);
  await assert.rejects(() => service.createWorkspace(auth('super_admin'), { name: 'bad', access_status: 'trial' }), { statusCode: 400 });
});

test('admin tenant convida somente no tenant e nunca concede super_admin', async () => {
  const client = { send: async command => commandName(command) === 'GetCommand' ? {} : {} };
  const cognito = { send: async () => ({ User: { Username: 'ignored' } }) };
  const service = new AdminService(client, cognito, 'table', 'pool');
  const result = await service.inviteUser(auth('admin'), { workspaceId: 'tenant-a', email: 'new@test.invalid', displayName: 'New', role: 'gestor' });
  assert.equal(result.profile.role, 'manager');
  await assert.rejects(() => service.inviteUser(auth('admin'), { workspaceId: 'tenant-b', email: 'x@test.invalid', displayName: 'X' }), { statusCode: 403 });
  await assert.rejects(() => service.inviteUser(auth('admin'), { workspaceId: 'tenant-a', email: 'x@test.invalid', displayName: 'X', role: 'super_admin' }), { statusCode: 403 });
});

test('falha Cognito remove reserva DynamoDB e não grava profile/membership', async () => {
  const commands = [];
  const client = { send: async command => { commands.push(commandName(command)); return {}; } };
  const cognito = { send: async () => { throw Object.assign(new Error('duplicate'), { name: 'UsernameExistsException' }); } };
  const service = new AdminService(client, cognito, 'table', 'pool');
  await assert.rejects(() => service.inviteUser(auth('super_admin'), { email: 'dup@test.invalid', displayName: 'Dup', role: 'member' }), { statusCode: 409 });
  assert.deepEqual(commands, ['PutCommand', 'DeleteCommand']);
});

test('falha DynamoDB depois do Cognito compensa excluindo usuário Cognito', async () => {
  let calls = 0; const cognitoCommands = [];
  const client = { send: async command => { if (commandName(command) === 'TransactWriteCommand') throw new Error('ddb unavailable'); return {}; } };
  const cognito = { send: async command => { cognitoCommands.push(commandName(command)); calls += 1; return {}; } };
  const service = new AdminService(client, cognito, 'table', 'pool');
  await assert.rejects(() => service.inviteUser(auth('super_admin'), { email: 'rollback@test.invalid', displayName: 'Rollback', role: 'member' }), /ddb unavailable/);
  assert.deepEqual(cognitoCommands, ['AdminCreateUserCommand', 'AdminDeleteUserCommand']);
  assert.equal(calls, 2);
});

test('vincula identidade Cognito existente preservando custom:legacy_user_id', async () => {
  const cognitoCommands = [];
  const client = { send: async () => ({}) };
  const cognito = { send: async command => {
    cognitoCommands.push(commandName(command));
    if (commandName(command) === 'AdminCreateUserCommand') throw Object.assign(new Error('exists'), { name: 'UsernameExistsException' });
    return { Username: 'cognito-sub', UserAttributes: [{ Name: 'email', Value: 'legacy@test.invalid' }, { Name: 'custom:legacy_user_id', Value: 'legacy-123' }] };
  } };
  const service = new AdminService(client, cognito, 'table', 'pool');
  const result = await service.inviteUser(auth('super_admin'), { email: 'legacy@test.invalid', displayName: 'Legacy', role: 'member', linkExisting: true });
  assert.equal(result.user.id, 'legacy-123');
  assert.deepEqual(cognitoCommands, ['AdminCreateUserCommand', 'AdminGetUserCommand']);
});

test('membership nega cross-workspace, autoescalation e manager/member; super_admin opera globalmente', async () => {
  const service = new AdminService({ send: async command => commandName(command) === 'GetCommand' ? { Item: { PK: 'p', SK: 's', role: 'member', active: true } } : {} }, {}, 'table', 'pool');
  await assert.rejects(() => service.setMembership(auth('admin'), 'target', 'tenant-b', { role: 'member' }), { statusCode: 403 });
  await assert.rejects(() => service.setMembership(auth('manager'), 'target', 'tenant-a', { role: 'member' }), { statusCode: 403 });
  await assert.rejects(() => service.setMembership(auth('member'), 'target', 'tenant-a', { role: 'member' }), { statusCode: 403 });
  await assert.rejects(() => service.setMembership(auth('admin'), 'actor', 'tenant-a', { role: 'manager' }), { statusCode: 403 });
  const updated = await service.setMembership(auth('super_admin'), 'target', 'tenant-b', { role: 'admin', active: false });
  assert.equal(updated.active, false);
});
