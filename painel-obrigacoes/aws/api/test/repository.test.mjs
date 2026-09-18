import assert from 'node:assert/strict';
import test from 'node:test';
import { Repository } from '../src/repository.mjs';
import { frontendPayloads } from './fixtures/frontend-payloads.mjs';

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

function obligation(id = 'obligation-a', workspaceKey = tenantKey) {
  return { PK: workspaceKey, SK: `OBLIGATION#${id}`, id, entityType: 'obligations' };
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
          if (ExpressionAttributeValues?.[':expectedVersion'] !== undefined) {
            const expectedVersion = ExpressionAttributeValues[':expectedVersion'];
            const acceptsMissingVersion = ConditionExpression?.includes('attribute_not_exists(#version)');
            if (!existing
              || (existing.version === undefined && !acceptsMissingVersion)
              || (existing.version !== undefined && existing.version !== expectedVersion)) throw transactionCanceled();
          }
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
  const client = transactionalClient([current, oldLock, obligation('obligation-b')]);

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
  const client = transactionalClient([current, oldLock, obligation()]);

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
  const client = transactionalClient([current, oldLock, conflictingLock, obligation('obligation-b')]);

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
  const client = transactionalClient([current, oldLock, obligation()]);

  await assert.rejects(
    new Repository(client, 'table').update(auth, 'completions', current.id, { version: 1, occurrence_date: '2026-10-01' }),
    error => error.statusCode === 409
  );
  assert.deepEqual(client.state.get(`${tenantKey}|${current.SK}`), current);
  assert.equal(client.state.get(`${tenantKey}|${oldLock.SK}`).completionId, 'completion-b');
  assert.equal(client.state.has(`${tenantKey}|UNIQUE#COMPLETION#obligation-a#2026-10-01`), false);
  assert.equal([...client.state.values()].some(item => item.entityType === 'audit_log'), false);
});


test('obrigação legada sem flag explícita de validação pode ser concluída por membro', async () => {
  const client = transactionalClient([obligation()]);
  const created = await new Repository(client, 'table').create(auth, 'completions', {
    obligation_id: 'obligation-a',
    occurrence_date: '2026-09-17',
    done_by_name: 'Usuário'
  });
  assert.equal(created.status, 'validada');
  assert.equal(created.done_by, auth.userId);
  assert.equal(created.validator_id, null);
});

test('validação continua obrigatória quando foi explicitamente configurada', async () => {
  const client = transactionalClient([obligation('obligation-a', tenantKey), {
    PK: tenantKey,
    SK: 'OBLIGATION#obligation-a',
    id: 'obligation-a',
    entityType: 'obligations',
    requires_validation: true
  }]);
  await assert.rejects(
    new Repository(client, 'table').create(auth, 'completions', {
      obligation_id: 'obligation-a',
      occurrence_date: '2026-09-17',
      done_by_name: 'Usuário'
    }),
    error => error.statusCode === 400 && /validador/.test(error.message)
  );
});

test('nova conclusão congela competência e estrutura da obrigação', async () => {
  const currentObligation = {
    ...obligation(),
    ...frontendPayloads.obligation,
    competence_offset_months: 1,
    version: 4,
  };
  const client = transactionalClient([currentObligation]);

  const created = await new Repository(client, 'table').create(auth, 'completions', {
    obligation_id: currentObligation.id,
    occurrence_date: '2026-09-20',
    done_by_name: 'Usuário',
  });

  assert.equal(created.competence_date, '2026-08-01');
  assert.equal(created.obligation_snapshot.name, currentObligation.name);
  assert.equal(created.obligation_snapshot.competence_offset_months, 1);
  assert.equal(created.obligation_snapshot.source_version, 4);
});

test('alteração estrutural preserva uma versão anterior da obrigação', async () => {
  const current = {
    ...obligation(),
    ...frontendPayloads.obligation,
    competence_offset_months: 1,
    version: 3,
  };
  const client = transactionalClient([current]);
  const adminAuth = { ...auth, role: 'admin' };

  const updated = await new Repository(client, 'table').update(adminAuth, 'obligations', current.id, {
    competence_offset_months: 0,
    version: 3,
  });

  assert.equal(updated.competence_offset_months, 0);
  assert.equal(updated.structure_history.length, 1);
  assert.equal(updated.structure_history[0].snapshot.competence_offset_months, 1);
  assert.equal(updated.structure_history[0].snapshot.name, current.name);
  assert.ok(updated.structure_history[0].effective_until);
});

test('admin pode salvar obrigação legada sem version e registro passa a ser versionado', async () => {
  const current = {
    ...obligation(),
    ...frontendPayloads.obligation,
  };
  delete current.version;
  const client = transactionalClient([current]);
  const adminAuth = { ...auth, role: 'admin' };

  const updated = await new Repository(client, 'table').update(adminAuth, 'obligations', current.id, {
    name: 'DCTFWeb migrada na primeira edição',
  });

  assert.equal(updated.name, 'DCTFWeb migrada na primeira edição');
  assert.equal(updated.version, 2);
  assert.equal(client.state.get(`${tenantKey}|${current.SK}`).version, 2);
});

test('admin pode editar obrigação legada com responsável não migrado sem alterar o vínculo', async () => {
  const legacyResponsibleId = 'legacy-user-not-migrated';
  const current = {
    ...obligation(),
    ...frontendPayloads.obligation,
    responsible_id: legacyResponsibleId,
    version: 1,
  };
  const client = transactionalClient([current]);
  const adminAuth = { ...auth, role: 'admin' };

  const updated = await new Repository(client, 'table').update(adminAuth, 'obligations', current.id, {
    ...frontendPayloads.obligation,
    responsible_id: legacyResponsibleId,
    name: 'DCTFWeb ajustada pelo admin',
    version: 1,
  });

  assert.equal(updated.name, 'DCTFWeb ajustada pelo admin');
  assert.equal(updated.responsible_id, legacyResponsibleId);
  assert.equal(updated.version, 2);
});

test('admin continua impedido de apontar obrigação para relação inexistente nova', async () => {
  const current = {
    ...obligation(),
    ...frontendPayloads.obligation,
    responsible_id: null,
    version: 1,
  };
  const client = transactionalClient([current]);
  const adminAuth = { ...auth, role: 'admin' };

  await assert.rejects(
    new Repository(client, 'table').update(adminAuth, 'obligations', current.id, {
      responsible_id: 'missing-user',
      version: 1,
    }),
    error => error.statusCode === 400 && error.message === 'Referência inválida: responsible_id.'
  );
});

test('gestor pode salvar alteração de atividade no próprio workspace', async () => {
  const current = {
    ...obligation(),
    name: 'DCTFWeb',
    category: 'federal',
    frequency: 'mensal',
    day_of_month: 15,
    version: 1,
  };
  const client = transactionalClient([current]);
  const managerAuth = { ...auth, role: 'manager' };

  const updated = await new Repository(client, 'table').update(managerAuth, 'obligations', current.id, {
    name: 'DCTFWeb ajustada',
    version: 1,
  });

  assert.equal(updated.name, 'DCTFWeb ajustada');
  assert.equal(updated.version, 2);
});

test('membro pode criar empresa pelo fluxo operacional, mas não alterar o cadastro mestre', async () => {
  const client = transactionalClient([]);
  const repository = new Repository(client, 'table');
  const created = await repository.create(auth, 'companies', { name: 'Empresa Operacional' });
  assert.equal(created.name, 'Empresa Operacional');
  await assert.rejects(
    repository.update(auth, 'companies', created.id, { name: 'Nome alterado', version: 1 }),
    error => error.statusCode === 403
  );
});

test('criação de conclusão rejeita obrigação existente somente em outro tenant', async () => {
  const otherTenant = 'TOOL#painel-obrigacoes#ENV#dev#WORKSPACE#empresa-b';
  const client = transactionalClient([obligation('obligation-b', otherTenant)]);
  await assert.rejects(
    new Repository(client, 'table').create(auth, 'completions', {
      obligation_id: 'obligation-b', occurrence_date: '2026-09-01', done_by_name: 'Usuário'
    }),
    error => error.statusCode === 400 && error.message === 'Referência inválida: obligation_id.'
  );
  assert.equal([...client.state.values()].some(item => item.entityType === 'completions'), false);
});

test('relações relevantes não aceitam referências entre tenants', async () => {
  // 'companies' e 'tax_regime_rules' exigem papel manager/admin para escrita
  // (ver entityConfig em model.mjs); usar o 'auth' padrão (role: 'member')
  // faria requireRole() barrar essas duas entidades antes mesmo de chegar
  // na validação de referência entre tenants, mascarando o que este teste
  // realmente verifica. Um papel com permissão de escrita em todas as
  // entidades do caso garante que a falha observada seja sempre a de
  // referência inválida, nunca a de permissão.
  const adminAuth = { ...auth, role: 'admin' };
  const otherTenant = 'TOOL#painel-obrigacoes#ENV#dev#WORKSPACE#empresa-b';
  const cases = [
    ['obligation_comments', { obligation_id: 'obligation-b', author_name: 'Usuário', body: 'Texto' }, 'obligation_id'],
    ['checklist_items', { obligation_id: 'obligation-b', description: 'Passo' }, 'obligation_id'],
    ['obligation_date_overrides', { obligation_id: 'obligation-b', original_date: '2026-09-01', override_date: '2026-09-02' }, 'obligation_id'],
    ['companies', { name: 'Empresa', tax_regime_id: 'regime-b' }, 'tax_regime_id'],
    ['tax_regime_rules', { tax_regime_id: 'regime-b', obligation_rule_id: 'rule-b' }, 'tax_regime_id']
  ];
  for (const [entity, payload, field] of cases) {
    const client = transactionalClient([
      obligation('obligation-b', otherTenant),
      { PK: otherTenant, SK: 'TAX_REGIME#regime-b', id: 'regime-b' },
      { PK: otherTenant, SK: 'RULE#rule-b', id: 'rule-b' }
    ]);
    await assert.rejects(new Repository(client, 'table').create(adminAuth, entity, payload), error => error.statusCode === 400 && error.message === `Referência inválida: ${field}.`);
  }
});

test('admin não pode escalar perfil para super_admin', async () => {
  const profile = { PK: tenantKey, SK: 'PROFILE#user-b', id: 'user-b', role: 'member', version: 1, entityType: 'profiles' };
  const client = transactionalClient([profile]);
  await assert.rejects(
    new Repository(client, 'table').update({ ...auth, role: 'admin' }, 'profiles', 'user-b', { role: 'super_admin', version: 1 }),
    error => error.statusCode === 403
  );
  assert.equal(client.state.get(`${tenantKey}|${profile.SK}`).role, 'member');
});

test('membro não pode adulterar o validador antes de aprovar', async () => {
  const current = completion('completion-pending', { status: 'aguardando_validacao', validator_id: 'validator-a' });
  const client = transactionalClient([current]);
  await assert.rejects(
    new Repository(client, 'table').update(auth, 'completions', current.id, { validator_id: auth.userId, version: 1 }),
    error => error.statusCode === 403 && /controlado pelo servidor/.test(error.message)
  );
  assert.equal(client.state.get(`${tenantKey}|${current.SK}`).validator_id, 'validator-a');
});

test('update exige a versão observada pelo cliente', async () => {
  const current = completion();
  const client = transactionalClient([current]);
  await assert.rejects(
    new Repository(client, 'table').update(auth, 'completions', current.id, { attachment_path: 'file.pdf' }),
    error => error.statusCode === 400 && /version/.test(error.message)
  );
});

test('registro legado rejeitado pode ser reenviado pelo executor', () => {
  const repository = new Repository({}, 'table');
  const patch = repository.completionTransition(auth, completion('legacy', { status: 'rejeitado', done_by: auth.userId }), {
    status: 'aguardando_validacao', version: 1
  });
  assert.equal(patch.status, 'aguardando_validacao');
  assert.equal(patch.rejection_reason, null);
  assert.equal(patch.validated_at, null);
});

test('conclusão não pode ser criada em nome de outro usuário', async () => {
  const client = transactionalClient([obligation()]);
  await assert.rejects(
    new Repository(client, 'table').create(auth, 'completions', { ...frontendPayloads.completion, done_by: 'user-b' }),
    error => error.statusCode === 403
  );
});

test('exclusão grava estado pendente e outbox atomicamente antes de qualquer efeito externo', async () => {
  const current = completion('completion-delete', { attachment_path: 'painel-obrigacoes/dev/empresa-a/file.pdf' });
  const client = transactionalClient([current]);
  const result = await new Repository(client, 'table').remove(auth, 'completions', current.id);
  const saved = client.state.get(`${tenantKey}|${current.SK}`);
  assert.equal(saved.deletion_pending, true);
  assert.equal(saved.deletion_event_id, result.eventId);
  assert.equal(client.state.get(`${tenantKey}|OUTBOX#DELETE#${result.eventId}`).attachment_path, current.attachment_path);
});

test('falha do DynamoDB não altera o registro nem cria outbox', async () => {
  const current = completion('completion-failure', { attachment_path: 'file.pdf' });
  const client = {
    calls: 0,
    send: async command => {
      client.calls += 1;
      if (command.input.Key) return { Item: structuredClone(current) };
      throw new Error('dynamodb unavailable');
    }
  };
  await assert.rejects(new Repository(client, 'table').remove(auth, 'completions', current.id), /dynamodb unavailable/);
  assert.equal(client.calls, 2);
});
