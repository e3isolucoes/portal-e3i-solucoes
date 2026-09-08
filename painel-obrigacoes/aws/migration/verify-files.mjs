import { createHash } from 'node:crypto';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fetchAll, requiredEnv } from './shared.mjs';

const config = requiredEnv();
const bucket = process.env.FILES_BUCKET;
if (!bucket) throw new Error('FILES_BUCKET ausente.');
const s3 = new S3Client({});
const completions = await fetchAll(config, 'completions');
const files = completions.filter((row) => row.attachment_path && row.workspace_id);
const report = { checkedAt: new Date().toISOString(), source: files.length, verified: 0, failed: [] };

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
    report.failed.push({ completionId: completion.id, sourcePath, error: error.message });
  }
}

report.matches = report.failed.length === 0 && report.verified === report.source;
console.log(JSON.stringify(report, null, 2));
if (!report.matches) process.exitCode = 2;
