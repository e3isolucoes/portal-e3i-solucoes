import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { administrationPk, enrichRows, entities, membershipItem, toItem } from './shared.mjs';

const TECHNICAL_FIELDS = new Set(['PK', 'SK', 'migratedAt', 'migrationContentHash']);

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function contentView(item) {
  return Object.fromEntries(Object.entries(item).filter(([key]) => !TECHNICAL_FIELDS.has(key)));
}

export function contentHash(item) {
  return createHash('sha256').update(canonicalJson(contentView(item))).digest('hex');
}

function entry(entity, workspace, sourceKey, item) {
  return { entity, workspace: workspace || null, sourceKey: String(sourceKey), targetKey: { PK: item.PK, SK: item.SK }, contentHash: contentHash(item) };
}

export function buildItems(config, fetched) {
  const rows = enrichRows(fetched);
  const result = [];
  for (const entity of Object.keys(entities)) {
    for (const row of rows[entity] || []) {
      const item = toItem(config, entity, row);
      result.push({ item, manifest: entry(entity, item.workspace_id, row.id || `${row.tax_regime_id}:${row.obligation_rule_id}`, item) });
      if (entity === 'profiles' && row.workspace_id) {
        const membership = membershipItem(config, row);
        result.push({ item: membership, manifest: entry('membership', row.workspace_id, row.id, membership) });
      }
      if (entity === 'workspaces') {
        const administration = { ...item, PK: administrationPk(config), SK: `WORKSPACE#${row.id}`, scope: 'administration' };
        result.push({ item: administration, manifest: entry('administrative_workspace', row.id, row.id, administration) });
      }
    }
  }
  return result.sort((a, b) => keyOf(a.manifest.targetKey).localeCompare(keyOf(b.manifest.targetKey)));
}

export function keyOf(key) { return `${key.PK}\u0000${key.SK}`; }

export function diffManifests(previous, current) {
  const before = new Map(previous.items.map((item) => [keyOf(item.targetKey), item]));
  const after = new Map(current.items.map((item) => [keyOf(item.targetKey), item]));
  const inserted = [], updated = [], deleted = [], unchanged = [];
  for (const [key, item] of after) {
    const old = before.get(key);
    if (!old) inserted.push(item);
    else if (old.contentHash !== item.contentHash) updated.push({ previous: old, current: item });
    else unchanged.push(item);
  }
  for (const [key, item] of before) if (!after.has(key)) deleted.push(item);
  return { inserted, updated, deleted, unchanged };
}

export function classifyTarget(existing, current, previous) {
  if (!existing) return 'insert';
  const hash = contentHash(existing);
  if (hash === current.contentHash) return 'unchanged';
  if (previous && hash === previous.contentHash) return 'update';
  return 'conflict';
}

export function createManifest(config, built, label = 'snapshot') {
  const keys = built.map(({ manifest }) => keyOf(manifest.targetKey));
  if (new Set(keys).size !== keys.length) throw new Error('Manifesto inválido: target key duplicada.');
  return { schemaVersion: 1, label, createdAt: new Date().toISOString(), toolId: config.toolId, environment: config.appEnv, items: built.map(({ manifest }) => manifest) };
}

export function classifyExtras(keys, allowlist) {
  const allowed = new Set(allowlist.map(keyOf));
  return keys.map((key) => {
    const [PK, SK] = key.split('\u0000');
    return { targetKey: { PK, SK }, entityPrefix: SK.split('#', 1)[0], classification: allowed.has(key) ? 'allowlisted' : 'unapproved' };
  });
}

export async function writeJson(path, value) {
  const target = resolve(path); await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

export async function readJson(path) { return JSON.parse(await readFile(resolve(path), 'utf8')); }

export function safeError(error) {
  return { name: error?.name || 'Error', message: String(error?.message || error).replace(/eyJ[A-Za-z0-9_.-]+/g, '[REDACTED]') };
}
