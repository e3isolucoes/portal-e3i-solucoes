import assert from 'node:assert/strict';
import test from 'node:test';
import { Repository } from '../src/repository.mjs';

const auth = { workspaceId: 'empresa-a', userId: 'user-a', role: 'member', email: 'user@empresa.test' };
const tenantKey = 'TOOL#painel-obrigacoes#ENV#dev#WORKSPACE#empresa-a';

function completion(id = 'completion-a', overrides = {}) {
  return {
    PK: tenantKey,
    SK: `COMPLETION#${id}`,
    id,
    obligation_id: 'obligation-a',
    occurrence_date: '2026-09-01',
    version: 1,
    entityType: 'completions',
    ...overrides
  };
}

function transactionalClient(items) {
  const state = new Map(items.map(item => [`${item.PK}|${item.SK}`, structuredClone(item)]));
  return {
    state,
    send: async (command) => {
      if (!command.input.TransactItems) {
        return { Item: structuredClone(state.get(`${command.input.Key.PK}|${command.input.Key.SK}`)) };
      }

      const next = new Map([...state].map(([key, value]) => [key, structuredClone(value)]));
      for (const operation of command.input.TransactItems) {
        if (operation.Delete) {
          const { Key, ExpressionAttributeValues } = operation.Delete;
          const stateKey = `${Key.PK}|${Key.SK}`;
          const existing = next.get(stateKey);
          if (!existing || existing.completionId !== ExpressionAttributeValues[':completionId']) throw transactionCanceled();
          next.delete(stateKey);
        } else {
          const { Item, ConditionExpression, ExpressionAttributeValues } = operation.Put;
          const stateKey = `${Item.PK}|${Item.SK}`;
          const existing = next.get(stateKey);
          if (ConditionExpression?.includes('attribute_not_exists(PK)') && existing) throw transactionCanceled();
          if (ExpressionAttributeValues?.[':expectedVersion'] !== undefined
            && (!existing || existing.version !== ExpressionAttributeValues[':expectedVersion'])) throw transactionCanceled();
          next.set(stateKey, structuredClone(Item));
        }
      }
      state.clear();
      for (const [key, value] of next) state.set(key, value);
      return {};
    }
  };
}

function transactionCanceled() {
  return Object.assign(new Error('transaction canceled'), { name: 'TransactionCanceledException' });
}

test('listagem limita a página e devolve cursor opaco', async () => {
  const calls = [];
  const client = { send: async (command) => {
    calls.push(command.input);
    return {
      Items: [{ PK: 'private', SK: 'private', id: '1', name: 'Obrigacao' }],
      LastEvaluatedKey: { PK: 'tenant', SK: 'OBLIGATION#1' }
    };
  } };
  const repository = new Repository(client, 'table');
  const page = await repository.list(auth, 'obligations', { limit: 500 });
  assert.equal(calls[0].Limit, 100);
  assert.deepEqual(page.items, [{ id: '1', name: 'Obrigacao' }]);
  assert.ok(page.cursor);
});

test('listagem rejeita cursor adulterado', async () => {
  const repository = new Repository({ send: async () => ({}) }, 'table');
  await assert.rejects(
    repository.list(auth, 'obligations', { cursor: 'nao-e-um-cursor' }),
    /Cursor inválido/
  );
});

test('atualização de conclusão move o lock ao mudar a obrigação', async () => {
  const current = completion();
  const oldLock = { PK: tenantKey, SK: 'UNIQUE#COMPLETION#obligation-a#2026-09-01', completionId: current.id };
  const client = transactionalClient([current, oldLock]);

  const updated = await new Repository(client, 'table').update(auth, 'completions', current.id, {
    version: 1,
    obligation_id: 'obligation-b'
  });

  assert.equal(updated.obligation_id, 'obligation-b');
  assert.equal(client.state.has(`${tenantKey}|${oldLock.SK}`), false);
  assert.equal(client.state.get(`${tenantKey}|UNIQUE#COMPLETION#obligation-b#2026-09-01`).completionId, current.id);
});

test('atualização de conclusão move o lock ao mudar a ocorrência', async () => {
  const current = completion();
  const oldLock = { PK: tenantKey, SK: 'UNIQUE#COMPLETION#obligation-a#2026-09-01', completionId: current.id };
  const client = transactionalClient([current, oldLock]);

  const updated = await new Repository(client, 'table').update(auth, 'completions', current.id, {
    version: 1,
    occurrence_date: '2026-10-01'
  });

  assert.equal(updated.occurrence_date, '2026-10-01');
  assert.equal(client.state.has(`${tenantKey}|${oldLock.SK}`), false);
  assert.equal(client.state.get(`${tenantKey}|UNIQUE#COMPLETION#obligation-a#2026-10-01`).completionId, current.id);
});

test('atualização de conclusão responde 409 quando o novo lock pertence a outra conclusão', async () => {
  const current = completion();
  const oldLock = { PK: tenantKey, SK: 'UNIQUE#COMPLETION#obligation-a#2026-09-01', completionId: current.id };
  const conflictingLock = { PK: tenantKey, SK: 'UNIQUE#COMPLETION#obligation-b#2026-09-01', completionId: 'completion-b' };
  const client = transactionalClient([current, oldLock, conflictingLock]);

  await assert.rejects(
    new Repository(client, 'table').update(auth, 'completions', current.id, { version: 1, obligation_id: 'obligation-b' }),
    error => error.statusCode === 409
  );
  assert.equal(client.state.get(`${tenantKey}|${current.SK}`).obligation_id, 'obligation-a');
  assert.equal(client.state.get(`${tenantKey}|${oldLock.SK}`).completionId, current.id);
});

test('atualização faz rollback atômico quando o lock antigo não pertence à conclusão', async () => {
  const current = completion();
  const oldLock = { PK: tenantKey, SK: 'UNIQUE#COMPLETION#obligation-a#2026-09-01', completionId: 'completion-b' };
  const client = transactionalClient([current, oldLock]);

  await assert.rejects(
    new Repository(client, 'table').update(auth, 'completions', current.id, { version: 1, occurrence_date: '2026-10-01' }),
    error => error.statusCode === 409
  );
  assert.deepEqual(client.state.get(`${tenantKey}|${current.SK}`), current);
  assert.equal(client.state.get(`${tenantKey}|${oldLock.SK}`).completionId, 'completion-b');
  assert.equal(client.state.has(`${tenantKey}|UNIQUE#COMPLETION#obligation-a#2026-10-01`), false);
  assert.equal([...client.state.values()].some(item => item.entityType === 'audit_log'), false);
});
