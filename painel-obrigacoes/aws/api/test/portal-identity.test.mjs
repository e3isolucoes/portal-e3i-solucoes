import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePortalIdentity } from '../src/portal-identity.mjs';

test('resolve identidade e workspace migrados pelo legacy_user_id e CNPJ', async () => {
  const legacyUserId = 'bd05a0d4-74e3-419b-9585-16f403a6e5c3';
  const canonicalWorkspace = 'b6af768a-db62-442e-9927-344640f6a770';
  const cognito = { send: async () => ({
    UserAttributes: [
      { Name: 'email', Value: 'daniela@gracomercio.com.br' },
      { Name: 'custom:legacy_user_id', Value: legacyUserId },
    ],
  }) };
  const client = { send: async (command) => {
    if (command.input.KeyConditionExpression) {
      return { Items: [{ userId: legacyUserId, workspaceId: canonicalWorkspace, role: 'admin', active: true }] };
    }
    if (command.input.Key) {
      return { Item: { id: canonicalWorkspace, document: '00.999.175/0001-54', access_status: 'full' } };
    }
    throw new Error('Comando inesperado');
  } };

  const resolved = await resolvePortalIdentity(cognito, client, 'table', 'pool-1', {
    userId: 'usr-e96ccbe9-8458-486b-b5ef-37858bbc39b5',
    workspaceId: 'tenant-79a71160-8ea3-4119-bd2c-ffa9d22758a0',
    email: 'Daniela@GRACOMERCIO.com.br',
    displayName: 'Daniela Estoque Miranda',
    workspaceName: 'GRA Comercio',
    document: '00.999.175/0001-54',
  });

  assert.equal(resolved.userId, legacyUserId);
  assert.equal(resolved.workspaceId, canonicalWorkspace);
  assert.equal(resolved.email, 'daniela@gracomercio.com.br');
});

test('mantém workspace recebido quando CNPJ do vínculo legado não corresponde', async () => {
  const cognito = { send: async () => ({
    UserAttributes: [{ Name: 'custom:legacy_user_id', Value: 'legacy-user-1' }],
  }) };
  const client = { send: async (command) => {
    if (command.input.KeyConditionExpression) return { Items: [{ workspaceId: 'workspace-antigo', active: true }] };
    if (command.input.Key) return { Item: { document: '11.222.333/0001-44' } };
    throw new Error('Comando inesperado');
  } };

  const resolved = await resolvePortalIdentity(cognito, client, 'table', 'pool-1', {
    userId: 'portal-user-1', workspaceId: 'workspace-novo', email: 'pessoa@empresa.com.br',
    displayName: 'Pessoa Teste', workspaceName: 'Empresa Nova', document: '55.666.777/0001-88',
  });

  assert.equal(resolved.userId, 'legacy-user-1');
  assert.equal(resolved.workspaceId, 'workspace-novo');
});

test('preserva identidade do Portal quando usuário ainda não existe no Cognito', async () => {
  const cognito = { send: async () => {
    throw Object.assign(new Error('missing'), { name: 'UserNotFoundException' });
  } };
  const client = { send: async () => { throw new Error('DynamoDB não deveria ser consultado'); } };

  const resolved = await resolvePortalIdentity(cognito, client, 'table', 'pool-1', {
    userId: 'portal-user-1', workspaceId: 'workspace-1', email: 'Nova@Empresa.com.br',
  });

  assert.equal(resolved.userId, 'portal-user-1');
  assert.equal(resolved.workspaceId, 'workspace-1');
  assert.equal(resolved.email, 'nova@empresa.com.br');
});
