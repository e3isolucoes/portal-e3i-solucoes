import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const baselinePath = path.join(root, 'sql', 'migrations', '20260812_legacy_baseline.sql');
const isolationPath = path.join(root, 'sql', 'migrations', '20260815_isolate_workspaces_by_cnpj.sql');
const generatedPath = process.argv[2] ? path.resolve(root, process.argv[2]) : null;

const expectedLegacyGlobalReads = [
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
].sort();

const baseline = await readFile(baselinePath, 'utf8');
const isolation = await readFile(isolationPath, 'utf8');

const legacyMatches = [...baseline.matchAll(
  /create\s+policy\s+(?:"[^"]+"|[^\s]+)[\s\S]{0,220}?on\s+(?:public\.)?([a-z0-9_]+)\s+for\s+select[\s\S]{0,180}?using\s*\(\s*true\s*\)/gi
)];
const legacyTables = [...new Set(legacyMatches.map((match) => match[1]))].sort();

assert.deepEqual(
  legacyTables,
  expectedLegacyGlobalReads,
  `Inventário de policies globais mudou. Encontrado: ${legacyTables.join(', ')}`
);

assert.match(
  isolation,
  /current_workspace_id\(\)[\s\S]*?workspace_id\s+from\s+public\.profiles\s+where\s+id\s*=\s*auth\.uid\(\)/i,
  'current_workspace_id() deve derivar o tenant exclusivamente de auth.uid().'
);
assert.match(
  isolation,
  /can_access_workspace\(p_workspace_id uuid\)[\s\S]*?p_workspace_id\s*=\s*\(select\s+workspace_id\s+from\s+public\.profiles\s+where\s+id\s*=\s*auth\.uid\(\)/i,
  'can_access_workspace() deve comparar contra o workspace obtido por auth.uid().'
);
assert.match(
  isolation,
  /create policy profiles_select_workspace[\s\S]*?workspace_id\s*=\s*public\.current_workspace_id\(\)/i,
  'profiles precisa de leitura limitada ao workspace autenticado.'
);

const tenantLoop = /foreach\s+t\s+in\s+array\s+array\[([^\]]+)\][\s\S]*?create policy tenant_select/gi;
const covered = new Set();
for (const match of isolation.matchAll(tenantLoop)) {
  for (const table of match[1].matchAll(/'([a-z0-9_]+)'/gi)) covered.add(table[1]);
}

for (const table of expectedLegacyGlobalReads.filter((table) => table !== 'profiles')) {
  assert.ok(covered.has(table), `A migração de isolamento não recria SELECT tenant-scoped para ${table}.`);
}

const migrationDir = path.join(root, 'sql', 'migrations');
const migrationFiles = (await readdir(migrationDir)).filter((name) => name.endsWith('.sql')).sort();
const isolationIndex = migrationFiles.indexOf('20260815_isolate_workspaces_by_cnpj.sql');
assert.ok(isolationIndex >= 0, 'Migração de isolamento não encontrada.');

for (const file of migrationFiles.slice(isolationIndex + 1)) {
  const sql = await readFile(path.join(migrationDir, file), 'utf8');
  assert.doesNotMatch(
    sql,
    /using\s*\(\s*true\s*\)/i,
    `Migração posterior reintroduz leitura global via USING (true): ${file}`
  );
}

if (generatedPath) {
  const generated = await readFile(generatedPath, 'utf8');
  for (const table of expectedLegacyGlobalReads) {
    const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const globalPolicy = new RegExp(
      `CREATE\\s+POLICY[\\s\\S]{0,260}?ON\\s+(?:public\\.)?["']?${escaped}["']?[\\s\\S]{0,260}?USING\\s*\\(\\s*true\\s*\\)`,
      'i'
    );
    assert.doesNotMatch(generated, globalPolicy, `Schema final ainda expõe leitura global em ${table}.`);
  }
}

console.log('RLS isolation audit OK.');
console.log(`Legacy global SELECT policies covered: ${expectedLegacyGlobalReads.join(', ')}`);
