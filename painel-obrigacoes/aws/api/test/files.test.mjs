import assert from 'node:assert/strict';
import test from 'node:test';
import { createDownloadUrl } from '../src/files.mjs';
import { inspectFile, processObject } from '../src/file-scanner.mjs';

function webp() {
  const value = Buffer.alloc(20);
  value.write('RIFF'); value.writeUInt32LE(12, 4); value.write('WEBP', 8); value.write('VP8 ', 12);
  return value;
}

test('rejeita MIME declarado falsificado', () => {
  assert.throws(() => inspectFile(webp(), 'image/png', 20), /invalid_file_format/);
});

test('rejeita tamanho real divergente do declarado', () => {
  assert.throws(() => inspectFile(webp(), 'image/webp', 21), /size_mismatch/);
});

test('rejeita arquivo malicioso e remove a quarentena', async () => {
  const bytes = webp(); const calls = [];
  const s3 = { send: async command => {
    calls.push(command.constructor.name);
    if (command.constructor.name === 'GetObjectCommand') return { Metadata: { 'upload-id': '11111111-1111-4111-8111-111111111111', workspace: 'w1' }, Body: [bytes] };
    return {};
  } };
  const ddb = { send: async command => command.constructor.name === 'GetCommand' ? { Item: { state: 'pending_scan', quarantineKey: 'painel-obrigacoes/dev/w1/quarantine/id', declaredType: 'image/webp', declaredSize: 20, finalKey: 'final', fileName: 'x.webp' } } : {} };
  assert.equal(await processObject(s3, ddb, 'table', 'bucket', 'painel-obrigacoes/dev/w1/quarantine/id', async () => false), 'rejected');
  assert.deepEqual(calls, ['GetObjectCommand', 'DeleteObjectCommand']);
});

test('promove arquivo válido somente depois da análise', async () => {
  const bytes = webp(); const calls = [];
  const s3 = { send: async command => {
    calls.push(command.constructor.name);
    if (command.constructor.name === 'GetObjectCommand') return { Metadata: { 'upload-id': '11111111-1111-4111-8111-111111111111', workspace: 'w1' }, Body: [bytes] };
    return {};
  } };
  const ddb = { send: async command => command.constructor.name === 'GetCommand' ? { Item: { state: 'pending_scan', quarantineKey: 'painel-obrigacoes/dev/w1/quarantine/id', declaredType: 'image/webp', declaredSize: 20, finalKey: 'final', fileName: 'x.webp' } } : {} };
  assert.equal(await processObject(s3, ddb, 'table', 'bucket', 'painel-obrigacoes/dev/w1/quarantine/id', async () => true), 'released');
  assert.deepEqual(calls, ['GetObjectCommand', 'CopyObjectCommand', 'DeleteObjectCommand']);
});

test('impede download antes da aprovação', async () => {
  const ddb = { send: async () => ({ Item: { state: 'pending_scan' } }) };
  await assert.rejects(() => createDownloadUrl({}, ddb, 'table', 'bucket', { workspaceId: 'w1', moduleGrants: ['obrigacoes'] }, 'upload:11111111-1111-4111-8111-111111111111'), error => error.statusCode === 409);
});
