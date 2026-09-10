import { createHash } from 'node:crypto';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { entities, fetchAll, requiredEnv } from './shared.mjs';
import { buildItems, createManifest, diffManifests, readJson, validateManifest, writeJson } from './manifest.mjs';

const config = requiredEnv();
const manifestIndex = process.argv.indexOf('--manifest');
if (manifestIndex < 0 || !process.argv[manifestIndex + 1]) throw new Error('verify-files exige --manifest <arquivo>.');
const manifest = validateManifest(await readJson(process.argv[manifestIndex + 1]), config);
const bucket = process.env.FILES_BUCKET;
if (!bucket) throw new Error('FILES_BUCKET ausente.');
const s3 = new S3Client({});
const fetched = {};
for (const entity of Object.keys(entities)) fetched[entity] = await fetchAll(config, entity);
const liveManifest = createManifest(config, buildItems(config, fetched), 'verify-files-live-source');
const drift = diffManifests(manifest, liveManifest);
if (drift.inserted.length || drift.updated.length || drift.deleted.length) {
  throw new Error(`Fonte divergiu do snapshot: ${drift.inserted.length} inserts, ${drift.updated.length} updates, ${drift.deleted.length} deletes.`);
}
const completions = fetched.completions;
const files = completions.filter((row) => row.attachment_path && row.workspace_id);
const report = { command: 'verify-files', executionId: manifest.executionId, checkedAt: new Date().toISOString(), source: files.length, verified: 0, failed: [] };

for (const completion of files) {
  const sourcePath = String(completion.attachment_path).replace(/^\/+/, '');
  const targetKey = `${config.toolId}/${config.appEnv}/${completion.workspace_id}/legacy/${sourcePath}`;
  try {
    const source = await fetch(`${config.supabaseUrl}/storage/v1/object/authenticated/comprovantes/${sourcePath.split('/').map(encodeURIComponent).join('/')}`, {
      headers: { apikey: config.serviceKey, authorization: `Bearer ${config.serviceKey}` }
    });
    if (!source.ok) throw new Error(`Supabase Storage ${source.status}`);
    const sourceHash = createHash('sha256').update(new Uint8Array(await source.arrayBuffer())).digest('hex');
    const target = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: targetKey }));
    if (target.Metadata?.sha256 !== sourceHash) throw new Error('hash SHA-256 divergente');
    if (target.Metadata?.workspace !== completion.workspace_id) throw new Error('workspace divergente');
    if (target.Metadata?.completion !== completion.id) throw new Error('completion divergente');
    report.verified += 1;
  } catch (error) {
    report.failed.push({ completionId: completion.id, error: error.message });
  }
}

report.matches = report.failed.length === 0 && report.verified === report.source;
report.status = report.matches ? 'PASS' : 'FAIL';
const reportIndex = process.argv.indexOf('--report');
if (reportIndex >= 0 && process.argv[reportIndex + 1]) await writeJson(process.argv[reportIndex + 1], report);
console.log(JSON.stringify(report, null, 2));
if (!report.matches) process.exitCode = 2;
