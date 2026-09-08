import { batchPut, documentClient, enrichRows, entities, fetchAll, membershipItem, requiredEnv, toItem } from './shared.mjs';

const execute = process.argv.includes('--execute');
const config = requiredEnv();
const client = documentClient();
const selectedEntities = process.env.MIGRATION_ENTITIES
  ? new Set(process.env.MIGRATION_ENTITIES.split(',').map((value) => value.trim()).filter(Boolean))
  : null;
const report = {
  mode: execute ? 'execute' : 'dry-run',
  startedAt: new Date().toISOString(),
  entities: {},
  warningCount: 0,
  warningsByReason: {},
  warningExamples: []
};
const fetched = {};
for (const entity of Object.keys(entities)) {
  if (!selectedEntities || selectedEntities.has(entity) || entity === 'tax_regimes' || entity === 'obligation_rules') {
    fetched[entity] = await fetchAll(config, entity);
  } else {
    fetched[entity] = [];
  }
}
const allRows = enrichRows(fetched);

for (const entity of Object.keys(entities)) {
  if (selectedEntities && !selectedEntities.has(entity)) continue;
  const rows = allRows[entity];
  const valid = []; let skipped = 0;
  for (const row of rows) {
    try { valid.push(toItem(config, entity, row)); }
    catch (error) {
      skipped += 1;
      report.warningCount += 1;
      const reason = error.message.replace(/^[^/]+\/[^:]+:\s*/, '');
      const key = `${entity}: ${reason}`;
      report.warningsByReason[key] = (report.warningsByReason[key] || 0) + 1;
      if (report.warningExamples.length < 20) report.warningExamples.push(error.message);
    }
  }
  if (entity === 'profiles') {
    for (const row of rows.filter((profile) => profile.workspace_id)) valid.push(membershipItem(config, row));
  }
  if (execute && valid.length) await batchPut(client, config.table, valid);
  report.entities[entity] = { source: rows.length, writtenOrPlanned: valid.length, skipped };
}

report.finishedAt = new Date().toISOString();
console.log(JSON.stringify(report, null, 2));
