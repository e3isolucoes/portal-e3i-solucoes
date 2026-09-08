import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { MAX_BYTES } from './files.mjs';
import { tenantPk } from './model.mjs';

const MIME_SIGNATURES = [
  ['application/pdf', b => b.subarray(0, 5).toString() === '%PDF-'],
  ['image/png', b => b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))],
  ['image/jpeg', b => b[0] === 0xff && b[1] === 0xd8 && b.at(-2) === 0xff && b.at(-1) === 0xd9],
  ['image/webp', b => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP']
];

function structural(type, bytes) {
  if (type === 'application/pdf') return bytes.lastIndexOf(Buffer.from('%%EOF')) >= Math.max(0, bytes.length - 1024);
  if (type === 'image/png') {
    let offset = 8; let chunks = 0;
    while (offset + 12 <= bytes.length && chunks++ < 10000) {
      const length = bytes.readUInt32BE(offset);
      if (length > MAX_BYTES || offset + length + 12 > bytes.length) return false;
      const name = bytes.subarray(offset + 4, offset + 8).toString();
      offset += length + 12;
      if (name === 'IEND') return length === 0 && offset === bytes.length;
    }
    return false;
  }
  if (type === 'image/webp') return bytes.length >= 20 && bytes.readUInt32LE(4) + 8 === bytes.length && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.subarray(12, 16).toString());
  return type === 'image/jpeg';
}

export function inspectFile(bytes, declaredType, declaredSize) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 4 || bytes.length > MAX_BYTES || bytes.length !== declaredSize) throw new Error('size_mismatch');
  const matches = MIME_SIGNATURES.filter(([, test]) => test(bytes)).map(([type]) => type);
  if (matches.length !== 1 || matches[0] !== declaredType || !structural(matches[0], bytes)) throw new Error(matches.length > 1 ? 'polyglot_file' : 'invalid_file_format');
  const foreignSignatures = [Buffer.from('MZ'), Buffer.from('PK\x03\x04', 'binary')];
  if (foreignSignatures.some(signature => bytes.indexOf(signature, 2) >= 0)) throw new Error('polyglot_file');
  return matches[0];
}

export async function scanMalware(bytes) {
  const directory = await mkdtemp(join(tmpdir(), 'scan-'));
  const path = join(directory, 'object');
  try {
    await writeFile(path, bytes, { mode: 0o600 });
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.env.CLAMSCAN_PATH || '/opt/bin/clamscan', ['--no-summary', path], { stdio: 'ignore' });
      child.once('error', reject); child.once('close', resolve);
    });
    if (exitCode === 1) return false;
    if (exitCode !== 0) throw new Error('malware_scanner_unavailable');
    return true;
  } finally { await rm(directory, { recursive: true, force: true }); }
}

async function bodyBuffer(body) {
  const parts = []; let length = 0;
  for await (const part of body) { length += part.length; if (length > MAX_BYTES) throw new Error('size_limit'); parts.push(part); }
  return Buffer.concat(parts);
}

export async function processObject(s3, ddb, tableName, bucket, key, malwareScanner = scanMalware) {
  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const id = object.Metadata?.['upload-id']; const workspaceId = object.Metadata?.workspace;
  if (!id || !workspaceId || !key.includes('/quarantine/')) throw new Error('untracked_quarantine_object');
  const recordKey = { PK: tenantPk(workspaceId), SK: `FILE#${id}` };
  const { Item: file } = await ddb.send(new GetCommand({ TableName: tableName, Key: recordKey, ConsistentRead: true }));
  if (!file || file.state !== 'pending_scan' || file.quarantineKey !== key) throw new Error('invalid_upload_state');
  try {
    const bytes = await bodyBuffer(object.Body);
    inspectFile(bytes, file.declaredType, file.declaredSize);
    if (!await malwareScanner(bytes)) throw new Error('malware_detected');
    await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`, Key: file.finalKey, ContentType: file.declaredType, ContentDisposition: `attachment; filename="${file.fileName}"`, MetadataDirective: 'REPLACE', Metadata: { workspace: workspaceId, 'upload-id': id, scan: 'approved' } }));
    await ddb.send(new UpdateCommand({ TableName: tableName, Key: recordKey, UpdateExpression: 'SET #state = :released, releasedAt = :now', ConditionExpression: '#state = :pending', ExpressionAttributeNames: { '#state': 'state' }, ExpressionAttributeValues: { ':released': 'released', ':pending': 'pending_scan', ':now': new Date().toISOString() } }));
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return 'released';
  } catch (error) {
    await ddb.send(new UpdateCommand({ TableName: tableName, Key: recordKey, UpdateExpression: 'SET #state = :rejected, rejectionReason = :reason', ExpressionAttributeNames: { '#state': 'state' }, ExpressionAttributeValues: { ':rejected': 'rejected', ':reason': error.message } }));
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return 'rejected';
  }
}

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
export async function handler(event) {
  for (const record of event.Records || []) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    if (key.includes('/quarantine/')) await processObject(s3, ddb, process.env.TABLE_NAME, record.s3.bucket.name, key);
  }
}
