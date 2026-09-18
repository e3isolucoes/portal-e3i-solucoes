import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourceDir = path.join(root, 'sql', 'migrations');
const targetDir = path.join(root, 'supabase', 'migrations');

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

const files = (await readdir(sourceDir))
  .filter((name) => name.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b, 'en'));

if (!files.length) throw new Error('Nenhuma migração SQL encontrada em sql/migrations.');

const counters = new Map();
const targets = new Set();

for (const file of files) {
  let targetName;
  const fullTimestamp = /^(\d{14})_(.+\.sql)$/.exec(file);
  const dateOnly = /^(\d{8})_(.+\.sql)$/.exec(file);

  if (fullTimestamp) {
    targetName = file;
  } else if (dateOnly) {
    const [, date, suffix] = dateOnly;
    const sequence = counters.get(date) || 0;
    counters.set(date, sequence + 1);
    targetName = `${date}${String(sequence).padStart(6, '0')}_${suffix}`;
  } else {
    throw new Error(`Nome de migração inválido: ${file}. Use YYYYMMDD_nome.sql ou YYYYMMDDHHMMSS_nome.sql.`);
  }

  if (targets.has(targetName)) throw new Error(`Versão de migração duplicada: ${targetName}`);
  targets.add(targetName);
  await cp(path.join(sourceDir, file), path.join(targetDir, targetName));
}

console.log(`Prepared ${files.length} migrations in supabase/migrations.`);
