import assert from 'node:assert/strict';
import test from 'node:test';
import { collectDeadlineAlerts, mismatchItems, recipientsForAlerts } from '../../../scripts/alertas-core.mjs';
import { loadDynamoWorkspaces, mismatchesForProfile, normalizeDynamoItems, normalizeSupabaseFixture } from '../src/notification-datasource.mjs';

const supabase = {
  obligations: [{ id: 'o1', workspace_id: 'w1', name: 'Fechamento', frequency: 'pontual', due_date: '2026-08-29', responsible_id: 'u1', module_key: 'financeiro' }],
  completions: [{ id: 'c1', workspace_id: 'w1', obligation_id: 'o1', occurrence_date: '2026-08-20', done_at: '2026-08-27T15:00:00.000Z', ocr_status: 'mismatch' }],
  holidays: [{ id: 'h1', workspace_id: 'w1', holiday_date: '2026-08-28' }],
  profiles: [{ id: 'u1', workspace_id: 'w1', email: 'a@example.com', active: true, role: 'membro' }, { id: 'off', workspace_id: 'w1', email: 'off@example.com', active: false, role: 'admin' }, { id: 'g1', workspace_id: 'w1', email: 'g@example.com', active: true, role: 'gestor', module_access: ['financeiro'] }],
  obligation_date_overrides: [{ id: 'v1', workspace_id: 'w1', obligation_id: 'o1', original_date: '2026-08-29', override_date: '2026-08-30' }]
};
const dynamoItems = Object.entries(supabase).flatMap(([type, rows]) => rows.map((row) => ({ PK: 'tenant', SK: `${type}#${row.id}`, entityType: type, ...row })));

function output(data) {
  const alerts = collectDeadlineAlerts({ ...data, now: new Date('2026-08-27T12:00:00-03:00') });
  const recipients = recipientsForAlerts({ alerts, profiles: data.profiles });
  const mismatches = mismatchItems({ completions: data.completions, obligationById: new Map(data.obligations.map((item) => [item.id, item])), since: '2026-08-26T15:00:00.000Z' });
  return { alerts: alerts.map((item) => [item.ob.id, item.occurrence.toISOString(), item.status.tone]), responsible: [...recipients.responsible.keys()], managers: [...recipients.managers.keys()], mismatches: mismatches.map((item) => item.id) };
}

test('fixtures Supabase e DynamoDB produzem exatamente o mesmo conjunto de alertas', () => {
  assert.deepEqual(output(normalizeDynamoItems(dynamoItems, 'w1')), output(normalizeSupabaseFixture(supabase)));
  assert.deepEqual(output(normalizeSupabaseFixture(supabase)).responsible, ['u1']);
  assert.deepEqual(output(normalizeSupabaseFixture(supabase)).managers, ['g1']);
  assert.deepEqual(output(normalizeSupabaseFixture(supabase)).mismatches, ['c1']);
});

test('adapta os papéis canônicos do DynamoDB sem alterar alertas-core', () => {
  const canonical = dynamoItems.map((item) => item.id === 'g1' ? { ...item, role: 'manager' } : item);
  assert.deepEqual(output(normalizeDynamoItems(canonical, 'w1')), output(normalizeSupabaseFixture(supabase)));
});

test('restringe divergências aos módulos do gestor e mantém visão completa do admin', () => {
  const items = [
    { id: 'fiscal', obligation: { module_key: 'fiscal' } },
    { id: 'rh', obligation: { module_key: 'rh' } },
    { id: 'geral', obligation: {} }
  ];
  assert.deepEqual(mismatchesForProfile(items, { role: 'gestor', module_access: ['fiscal'] }).map((item) => item.id), ['fiscal', 'geral']);
  assert.deepEqual(mismatchesForProfile(items, { role: 'admin' }).map((item) => item.id), ['fiscal', 'rh', 'geral']);
});

test('datasource pagina descoberta e query por PK sem aceitar registros de outro tenant', async () => {
  class Command { constructor(input) { this.input = input; } }
  const calls = [];
  const client = { send: async (command) => {
    calls.push(command.input);
    if (command.input.ExpressionAttributeValues[':workspace']) return command.input.ExclusiveStartKey ? { Items: [{ id: 'w2' }] } : { Items: [{ id: 'w1' }], LastEvaluatedKey: { PK: 'next' } };
    const workspace = command.input.ExpressionAttributeValues[':pk'].endsWith('#w1') ? 'w1' : 'w2';
    return { Items: [{ ...dynamoItems[0], workspace_id: workspace }, { ...dynamoItems[0], workspace_id: workspace === 'w1' ? 'w2' : 'w1' }] };
  } };
  const result = await loadDynamoWorkspaces(client, 'table', { QueryCommand: Command });
  assert.equal(calls.length, 4);
  assert.equal(calls[0].ExpressionAttributeValues[':pk'], 'TOOL#painel-obrigacoes#ENV#prod#ADMINISTRATION');
  assert.equal(calls.filter((call) => call.ExpressionAttributeValues[':workspace']).length, 2);
  assert.deepEqual(result.map(({ workspaceId, data }) => [workspaceId, data.obligations.length]), [['w1', 1], ['w2', 1]]);
});
