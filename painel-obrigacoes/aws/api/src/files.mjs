import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APP_ENV, TOOL_ID, tenantPk } from './model.mjs';
import { requireModuleGrant } from './auth.mjs';

export const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
export const MAX_BYTES = 10 * 1024 * 1024;
const FILE_TOKEN = /^upload:([0-9a-f-]{36})$/i;

export function cleanFileName(value, fallback = 'arquivo') {
  const name = String(value || fallback).normalize('NFKD').replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/^\.+/, '').slice(0, 120);
  return name || fallback;
}

function fileKey(auth, id) {
  return { PK: tenantPk(auth.workspaceId), SK: `FILE#${id}` };
}

async function findReleasedFile(ddb, tableName, auth, path) {
  const match = FILE_TOKEN.exec(path || '');
  if (!match) throw Object.assign(new Error('Comprovante inválido.'), { statusCode: 403 });
  const { Item } = await ddb.send(new GetCommand({ TableName: tableName, Key: fileKey(auth, match[1]), ConsistentRead: true }));
  if (!Item || Item.state !== 'released' || !Item.finalKey) {
    throw Object.assign(new Error('Comprovante ainda não foi aprovado.'), { statusCode: 409 });
  }
  return Item;
}

export async function createUploadUrl(s3, ddb, tableName, bucket, auth, input) {
  requireModuleGrant(auth, 'obrigacoes');
  if (!ALLOWED_TYPES.has(input.contentType)) throw Object.assign(new Error('Tipo de arquivo não permitido.'), { statusCode: 400 });
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > MAX_BYTES) throw Object.assign(new Error('O arquivo deve ter no máximo 10 MB.'), { statusCode: 400 });
  const id = randomUUID();
  const fileName = cleanFileName(input.fileName);
  const base = `${TOOL_ID}/${APP_ENV}/${auth.workspaceId}`;
  const quarantineKey = `${base}/quarantine/${id}`;
  const finalKey = `${base}/obligations/${cleanFileName(input.obligationId)}/${cleanFileName(input.occurrenceDate)}/${id}-${fileName}`;
  await ddb.send(new PutCommand({
    TableName: tableName,
    Item: { ...fileKey(auth, id), entityType: 'file_upload', id, workspaceId: auth.workspaceId, uploaderId: auth.userId, state: 'pending_scan', declaredSize: input.size, declaredType: input.contentType, fileName, quarantineKey, finalKey, createdAt: new Date().toISOString() },
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
  }));
  const command = new PutObjectCommand({ Bucket: bucket, Key: quarantineKey, ContentType: input.contentType, ContentLength: input.size, Metadata: { workspace: auth.workspaceId, uploader: auth.userId, tool: TOOL_ID, 'upload-id': id } });
  return { path: `upload:${id}`, state: 'pending_scan', url: await getSignedUrl(s3, command, { expiresIn: 300 }), expiresIn: 300 };
}

export async function createDownloadUrl(s3, ddb, tableName, bucket, auth, path) {
  requireModuleGrant(auth, 'obrigacoes');
  const file = await findReleasedFile(ddb, tableName, auth, path);
  const command = new GetObjectCommand({
    Bucket: bucket, Key: file.finalKey,
    ResponseContentDisposition: `attachment; filename="${cleanFileName(file.fileName)}"`,
    ResponseContentType: 'application/octet-stream',
    ResponseCacheControl: 'private, no-store'
  });
  return { url: await getSignedUrl(s3, command, { expiresIn: 300 }), expiresIn: 300 };
}

export async function deleteStoredFile(s3, ddb, tableName, bucket, auth, path) {
  requireModuleGrant(auth, 'obrigacoes');
  const file = await findReleasedFile(ddb, tableName, auth, path);
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: file.finalKey }));
}
