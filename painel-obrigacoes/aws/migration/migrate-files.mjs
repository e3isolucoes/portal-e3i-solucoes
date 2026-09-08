import { createHash } from 'node:crypto';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fetchAll, requiredEnv } from './shared.mjs';

const execute = process.argv.includes('--execute');
const config = requiredEnv();
const bucket = process.env.FILES_BUCKET;
if (!bucket) throw new Error('FILES_BUCKET ausente.');
const s3 = new S3Client({});
const completions = await fetchAll(config, 'completions');
const files = completions.filter((row) => row.attachment_path && row.workspace_id);
const report = { mode: execute ? 'execute' : 'dry-run', startedAt: new Date().toISOString(), source: files.length, planned: files.length, copied: 0, alreadyPresent: 0, failed: [] };

if (!execute) {
  report.finishedAt = new Date().toISOString();
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

for (const completion of files) {
  const sourcePath = String(completion.attachment_path).replace(/^\/+/, '');
  const targetKey = `${config.toolId}/${config.appEnv}/${completion.workspace_id}/legacy/${sourcePath}`;
  try {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: targetKey }));
      report.alreadyPresent += 1; continue;
    } catch (error) { if (error.$metadata?.httpStatusCode !== 404 && error.name !== 'NotFound') throw error; }
    const source = await fetch(`${config.supabaseUrl}/storage/v1/object/authenticated/comprovantes/${sourcePath.split('/').map(encodeURIComponent).join('/')}`, { headers: { apikey: config.serviceKey, authorization: `Bearer ${config.serviceKey}` } });
    if (!source.ok) throw new Error(`Supabase Storage ${source.status}`);
    const bytes = new Uint8Array(await source.arrayBuffer());
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: targetKey, Body: bytes, ContentType: source.headers.get('content-type') || 'application/octet-stream', Metadata: { workspace: completion.workspace_id, source: 'supabase', sha256, completion: completion.id } }));
    report.copied += 1;
  } catch (error) { report.failed.push({ completionId: completion.id, sourcePath, error: error.message }); }
}
report.finishedAt = new Date().toISOString();
console.log(JSON.stringify(report, null, 2));
if (report.failed.length) process.exitCode = 2;
