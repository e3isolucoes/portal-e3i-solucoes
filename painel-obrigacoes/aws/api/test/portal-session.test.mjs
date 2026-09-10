import assert from 'node:assert/strict';
import test from 'node:test';
import { consumePortalSession, createPortalSession } from '../src/portal-session.mjs';

test('consome uma sessão do portal uma única vez e rejeita reutilização', async () => {
  let item = { entityType: 'portal_session', toolId: 'painel-obrigacoes', environment: 'dev', expiresAt: 1_900_000_060, idToken: 'id', accessToken: 'access', refreshToken: 'refresh' };
  const client = { send: async () => { const Attributes = item; item = null; return { Attributes }; } };
  const code = 'A'.repeat(43);
  assert.deepEqual(await consumePortalSession(client, 'table', code, 1_900_000_000_000), { access_token: 'id', cognito_access_token: 'access', refresh_token: 'refresh' });
  await assert.rejects(() => consumePortalSession(client, 'table', code, 1_900_000_000_000), /inválido ou expirado/);
});

test('rejeita código malformado antes de consultar a tabela', async () => {
  const client = { send: async () => assert.fail('não deveria consultar') };
  await assert.rejects(() => consumePortalSession(client, 'table', 'curto'), /Código de acesso inválido/);
});

test('preserva a senha de usuário Cognito existente não gerenciado pelo portal', async () => {
  const calls = [];
  const cognito = { send: async (command) => {
    calls.push(command.constructor.name);
    return { UserAttributes: [{ Name: 'email', Value: 'pessoa@empresa.com' }] };
  } };
  const ddb = { send: async () => assert.fail('não deveria consultar o DynamoDB') };
  await assert.rejects(() => createPortalSession(cognito, ddb, 'table', { userPoolId: 'pool', clientId: 'client' }, {
    userId: 'user-1', workspaceId: 'workspace-1', email: 'pessoa@empresa.com', displayName: 'Pessoa',
  }), error => error.statusCode === 409 && /não gerenciada/.test(error.message));
  assert.deepEqual(calls, ['AdminGetUserCommand']);
  assert.ok(!calls.includes('AdminSetUserPasswordCommand'));
});

test('aceita conta migrada cujo identificador legado difere do identificador do portal', async () => {
  const cognitoCalls = [];
  const cognito = { send: async (command) => {
    cognitoCalls.push(command);
    if (command.constructor.name === 'AdminGetUserCommand') {
      return { UserAttributes: [{ Name: 'custom:legacy_user_id', Value: 'supabase-user-1' }] };
    }
    if (command.constructor.name === 'AdminUpdateUserAttributesCommand') return {};
    if (command.constructor.name === 'AdminSetUserPasswordCommand') return {};
    if (command.constructor.name === 'AdminInitiateAuthCommand') {
      return { AuthenticationResult: { IdToken: 'id', AccessToken: 'access', RefreshToken: 'refresh' } };
    }
    assert.fail(`comando Cognito inesperado: ${command.constructor.name}`);
  } };
  const ddb = { send: async (command) => command.constructor.name === 'GetCommand' ? {} : {} };

  const result = await createPortalSession(cognito, ddb, 'table', { userPoolId: 'pool', clientId: 'client' }, {
    userId: 'portal-user-9', workspaceId: 'workspace-1', email: 'pessoa@empresa.com', displayName: 'Pessoa',
  });

  assert.equal(result.expiresIn, 60);
  assert.ok(cognitoCalls.some(command => command.constructor.name === 'AdminSetUserPasswordCommand'));
});

test('troca refresh token de conta gerenciada sem redefinir sua senha', async () => {
  const cognitoCalls = [];
  const cognito = { send: async (command) => {
    cognitoCalls.push(command);
    if (command.constructor.name === 'AdminGetUserCommand') return { UserAttributes: [{ Name: 'custom:legacy_user_id', Value: 'user-1' }] };
    if (command.constructor.name === 'AdminUpdateUserAttributesCommand') return {};
    if (command.constructor.name === 'AdminInitiateAuthCommand') return { AuthenticationResult: { IdToken: 'id2', AccessToken: 'access2' } };
    assert.fail(`comando Cognito inesperado: ${command.constructor.name}`);
  } };
  const ddbCommands = [];
  const ddb = { send: async (command) => {
    ddbCommands.push(command);
    if (command.constructor.name === 'GetCommand') return { Item: { refreshToken: 'preservado' } };
    return {};
  } };
  const result = await createPortalSession(cognito, ddb, 'table', { userPoolId: 'pool', clientId: 'client' }, {
    userId: 'user-1', workspaceId: 'workspace-1', email: 'pessoa@empresa.com', displayName: 'Pessoa',
  }, 1_900_000_000_000);
  assert.equal(result.expiresIn, 60);
  assert.ok(!cognitoCalls.some(command => command.constructor.name === 'AdminSetUserPasswordCommand'));
  const auth = cognitoCalls.find(command => command.constructor.name === 'AdminInitiateAuthCommand');
  assert.equal(auth.input.AuthFlow, 'REFRESH_TOKEN_AUTH');
  assert.equal(auth.input.AuthParameters.REFRESH_TOKEN, 'preservado');
  const session = ddbCommands.find(command => command.constructor.name === 'PutCommand');
  assert.equal(session.input.Item.refreshToken, 'preservado');
});

test('recupera sessão do portal quando o refresh token gerenciado expirou', async () => {
  const cognitoCalls = [];
  const cognito = { send: async (command) => {
    cognitoCalls.push(command);
    if (command.constructor.name === 'AdminGetUserCommand') {
      return { UserAttributes: [{ Name: 'custom:legacy_user_id', Value: 'user-1' }] };
    }
    if (command.constructor.name === 'AdminUpdateUserAttributesCommand') return {};
    if (command.constructor.name === 'AdminSetUserPasswordCommand') return {};
    if (command.constructor.name === 'AdminInitiateAuthCommand' && command.input.AuthFlow === 'REFRESH_TOKEN_AUTH') {
      throw Object.assign(new Error('Refresh Token has expired'), { name: 'NotAuthorizedException' });
    }
    if (command.constructor.name === 'AdminInitiateAuthCommand') {
      return { AuthenticationResult: { IdToken: 'id-novo', AccessToken: 'access-novo', RefreshToken: 'refresh-novo' } };
    }
    assert.fail(`comando Cognito inesperado: ${command.constructor.name}`);
  } };
  const ddbCommands = [];
  const ddb = { send: async (command) => {
    ddbCommands.push(command);
    if (command.constructor.name === 'GetCommand') return { Item: { refreshToken: 'expirado' } };
    return {};
  } };

  const result = await createPortalSession(cognito, ddb, 'table', { userPoolId: 'pool', clientId: 'client' }, {
    userId: 'user-1', workspaceId: 'workspace-1', email: 'pessoa@empresa.com', displayName: 'Pessoa',
  }, 1_900_000_000_000);

  assert.equal(result.expiresIn, 60);
  assert.deepEqual(cognitoCalls.filter(command => command.constructor.name === 'AdminInitiateAuthCommand').map(command => command.input.AuthFlow), [
    'REFRESH_TOKEN_AUTH', 'ADMIN_USER_PASSWORD_AUTH',
  ]);
  assert.equal(cognitoCalls.filter(command => command.constructor.name === 'AdminSetUserPasswordCommand').length, 1);
  const credential = ddbCommands.find(command => command.constructor.name === 'PutCommand' && command.input.Item.entityType === 'portal_cognito_credential');
  assert.equal(credential.input.Item.refreshToken, 'refresh-novo');
});
