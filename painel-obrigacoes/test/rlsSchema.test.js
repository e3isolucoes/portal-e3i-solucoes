import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const vulnerableTables = [
  'profiles',
  'companies',
  'obligations',
  'completions',
  'obligation_comments',
  'holidays',
  'checklist_items',
  'obligation_rules',
  'obligation_date_overrides',
  'tax_regimes',
  'tax_regime_rules',
  'categories',
];

test('schema legado tinha 12 leituras globais conhecidas e a migração de isolamento cobre todas', async () => {
  const baseline = await readFile(new URL('../sql/migrations/20260801000000_initial_schema.sql', import.meta.url), 'utf8');
  const isolation = await readFile(new URL('../sql/migrations/20260815_isolate_workspaces_by_cnpj.sql', import.meta.url), 'utf8');

  for (const table of vulnerableTables) {
    const permissive = new RegExp(
      String.raw`on\\s+(?:public\\.)?${table}\\s+for\\s+select[\\s\\S]{0,120}?using\\s*\\(\\s*true\\s*\\)`,
      'i',
    );
    assert.match(baseline, permissive, `baseline deve documentar a policy permissiva histórica de ${table}`);
  }

  assert.equal((baseline.match(/using\s*\(\s*true\s*\)/gi) || []).length, 12);

  for (const table of vulnerableTables.filter((name) => name !== 'profiles')) {
    assert.match(
      isolation,
      new RegExp(String.raw`create policy tenant_select on public\\.%I[\\s\\S]*?can_access_workspace\\(workspace_id\\)`, 'i'),
    );
  }

  assert.match(isolation, /create policy profiles_select_workspace[\s\S]*?workspace_id=public\.current_workspace_id\(\)/i);
  assert.match(isolation, /current_workspace_id\(\)[\s\S]*?where id = auth\.uid\(\) and active/i);
  assert.match(isolation, /assign_and_validate_workspace[\s\S]*?new\.workspace_id <> expected/i);
});

test('não existem migrations posteriores reintroduzindo select global nas tabelas tenant-scoped', async () => {
  const dir = new URL('../sql/migrations/', import.meta.url);
  const names = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort();
  const afterIsolation = names.filter((name) => name > '20260815_isolate_workspaces_by_cnpj.sql');

  for (const name of afterIsolation) {
    const sql = await readFile(new URL(name, dir), 'utf8');
    for (const table of vulnerableTables) {
      const permissive = new RegExp(
        String.raw`on\\s+(?:public\\.)?${table}\\s+for\\s+select[\\s\\S]{0,120}?using\\s*\\(\\s*true\\s*\\)`,
        'i',
      );
      assert.doesNotMatch(sql, permissive, `${name} reintroduz leitura global em ${table}`);
    }
  }
});
