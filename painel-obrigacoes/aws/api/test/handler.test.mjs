import assert from 'node:assert/strict';
import test from 'node:test';
import { handleAuthenticatedRequest } from '../src/handler.mjs';

const auth = { workspaceId: 'empresa-a', userId: 'user-a', role: 'member', email: 'user@empresa.test' };

function event(method, path) {
  return {
    rawPath: `/v1/${path}`,
    headers: {},
    requestContext: { requestId: 'request-a', http: { method } }
  };
}

test('GET inexistente preserva o erro 404 do repositório', async () => {
  const repository = {
    get: async receivedAuth => {
      assert.equal(receivedAuth.workspaceId, 'empresa-a');
      throw Object.assign(new Error('Registro não encontrado.'), { statusCode: 404 });
    }
  };

  const result = await handleAuthenticatedRequest(event('GET', 'obligations/missing'), auth, { repository });

  assert.equal(result.statusCode, 404);
  assert.deepEqual(JSON.parse(result.body), { error: 'Registro não encontrado.', requestId: 'request-a' });
});

test('DELETE inexistente responde 204 conforme contrato idempotente', async () => {
  const repository = {
    remove: async receivedAuth => {
      assert.equal(receivedAuth.workspaceId, 'empresa-a');
      return null;
    }
  };

  const result = await handleAuthenticatedRequest(event('DELETE', 'obligations/missing'), auth, { repository });

  assert.equal(result.statusCode, 204);
  assert.equal(result.body, '');
});

test('handler repassa somente o workspace autenticado ao repositório', async () => {
  const calls = [];
  const repository = {
    get: async receivedAuth => {
      calls.push(receivedAuth.workspaceId);
      return { id: 'shared-id', workspace_id: receivedAuth.workspaceId };
    }
  };

  const result = await handleAuthenticatedRequest(
    event('GET', 'obligations/shared-id'),
    { ...auth, workspaceId: 'empresa-b' },
    { repository }
  );

  assert.deepEqual(calls, ['empresa-b']);
  assert.equal(JSON.parse(result.body).workspace_id, 'empresa-b');
});
