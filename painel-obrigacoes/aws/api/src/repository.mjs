import { randomUUID } from 'node:crypto';
import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { entityConfig, entitySk, publicRecord, SCHEMA_VERSION, tenantPk, TOOL_ID, APP_ENV } from './model.mjs';
import { requireModuleGrant, requireRole } from './auth.mjs';
import { entityRelationships, validateCreate, validateUpdate } from './validators.mjs';

const now = () => new Date().toISOString();

export class Repository {
  constructor(client, tableName) { this.client = client; this.tableName = tableName; }

  async list(auth, entity, { limit = 100, cursor } = {}) {
    const config = entityConfig(entity);
    requireModuleGrant(auth, config.grant);
    requireRole(auth, config.read);
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
    const exclusiveStartKey = cursor ? decodeCursor(cursor) : undefined;
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': tenantPk(auth.workspaceId), ':prefix': `${config.prefix}#` },
      Limit: safeLimit,
      ExclusiveStartKey: exclusiveStartKey
    }));
    return {
      items: (result.Items || []).map(publicRecord),
      cursor: result.LastEvaluatedKey ? encodeCursor(result.LastEvaluatedKey) : null
    };
  }

  async get(auth, entity, id) {
    const config = entityConfig(entity);
    requireModuleGrant(auth, config.grant);
    requireRole(auth, config.read);
    const result = await this.client.send(new GetCommand({ TableName: this.tableName, Key: { PK: tenantPk(auth.workspaceId), SK: entitySk(entity, id) } }));
    return publicRecord(result.Item);
  }

  async create(auth, entity, input) {
    const config = entityConfig(entity);
    requireModuleGrant(auth, config.writeGrant || config.grant);
    requireRole(auth, config.write);
    const validated = validateCreate(entity, input);
    await this.requireRelationships(auth, entity, validated);
    const id = validated.id || randomUUID();
    const timestamp = now();
    const entityDefaults = entity === 'completions'
      ? { done_at: validated.done_at || timestamp }
      : {};
    const record = { ...validated, ...entityDefaults, id, version: 1, toolId: TOOL_ID, environment: APP_ENV, workspace_id: auth.workspaceId, entityType: entity, schemaVersion: SCHEMA_VERSION, created_at: timestamp, updated_at: timestamp };
    const item = { ...record, PK: tenantPk(auth.workspaceId), SK: entitySk(entity, id, record) };
    const audit = this.auditItem(auth, 'INSERT', entity, id, null, record);
    const uniqueOccurrence = entity === 'completions'
      ? { Put: { TableName: this.tableName, Item: { PK: item.PK, SK: `UNIQUE#COMPLETION#${record.obligation_id}#${record.occurrence_date}`, entityType: 'uniqueness_lock', completionId: id }, ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)' } }
      : null;
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Put: { TableName: this.tableName, Item: item, ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)' } },
        ...(uniqueOccurrence ? [uniqueOccurrence] : []),
        { Put: { TableName: this.tableName, Item: audit } }
      ] }));
    } catch (error) {
      if (error.name === 'TransactionCanceledException') throw Object.assign(new Error('Registro já existente ou concorrência detectada.'), { statusCode: 409 });
      throw error;
    }
    return publicRecord(item);
  }

  async update(auth, entity, id, patch) {
    const config = entityConfig(entity);
    requireModuleGrant(auth, config.writeGrant || config.grant);
    requireRole(auth, config.write);
    const safePatch = validateUpdate(entity, patch);
    const key = { PK: tenantPk(auth.workspaceId), SK: entitySk(entity, id, safePatch) };
    const current = (await this.client.send(new GetCommand({ TableName: this.tableName, Key: key, ConsistentRead: true }))).Item;
    if (!current) throw Object.assign(new Error('Registro não encontrado.'), { statusCode: 404 });
    await this.requireRelationships(auth, entity, { ...publicRecord(current), ...safePatch });
    const expectedVersion = Number(safePatch.version ?? current.version ?? 1);
    if (expectedVersion !== Number(current.version ?? 1)) throw Object.assign(new Error('O registro foi alterado por outro usuário. Atualize e tente novamente.'), { statusCode: 409 });
    const item = { ...current, ...safePatch, version: expectedVersion + 1, updated_at: now() };
    const occurrenceChanged = entity === 'completions'
      && (item.obligation_id !== current.obligation_id || item.occurrence_date !== current.occurrence_date);
    const lockChanges = occurrenceChanged
      ? [
          { Delete: {
            TableName: this.tableName,
            Key: { PK: key.PK, SK: `UNIQUE#COMPLETION#${current.obligation_id}#${current.occurrence_date}` },
            ConditionExpression: '#completionId = :completionId',
            ExpressionAttributeNames: { '#completionId': 'completionId' },
            ExpressionAttributeValues: { ':completionId': id }
          } },
          { Put: {
            TableName: this.tableName,
            Item: { PK: key.PK, SK: `UNIQUE#COMPLETION#${item.obligation_id}#${item.occurrence_date}`, entityType: 'uniqueness_lock', completionId: id },
            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
          } }
        ]
      : [];
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Put: {
          TableName: this.tableName,
          Item: item,
          ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK) AND (attribute_not_exists(#version) OR #version = :expectedVersion)',
          ExpressionAttributeNames: { '#version': 'version' },
          ExpressionAttributeValues: { ':expectedVersion': expectedVersion }
        } },
        ...lockChanges,
        { Put: { TableName: this.tableName, Item: this.auditItem(auth, 'UPDATE', entity, id, publicRecord(current), publicRecord(item)) } }
      ] }));
    } catch (error) {
      if (error.name === 'TransactionCanceledException') throw Object.assign(new Error('Registro já existente ou concorrência detectada.'), { statusCode: 409 });
      throw error;
    }
    return publicRecord(item);
  }

  async remove(auth, entity, id) {
    const config = entityConfig(entity);
    requireModuleGrant(auth, config.writeGrant || config.grant);
    requireRole(auth, config.write);
    const key = { PK: tenantPk(auth.workspaceId), SK: entitySk(entity, id) };
    const current = (await this.client.send(new GetCommand({ TableName: this.tableName, Key: key, ConsistentRead: true }))).Item;
    if (!current) return;
    const uniqueDelete = entity === 'completions'
      ? { Delete: { TableName: this.tableName, Key: { PK: key.PK, SK: `UNIQUE#COMPLETION#${current.obligation_id}#${current.occurrence_date}` } } }
      : null;
    await this.client.send(new TransactWriteCommand({ TransactItems: [
      { Delete: { TableName: this.tableName, Key: key, ConditionExpression: 'attribute_exists(PK)' } },
      ...(uniqueDelete ? [uniqueDelete] : []),
      { Put: { TableName: this.tableName, Item: this.auditItem(auth, 'DELETE', entity, id, publicRecord(current), null) } }
    ] }));
  }

  auditItem(auth, action, entity, entityId, before, after) {
    const timestamp = now(); const id = randomUUID();
    return { PK: tenantPk(auth.workspaceId), SK: `AUDIT#${timestamp}#${id}`, id, entityType: 'audit_log', toolId: TOOL_ID, environment: APP_ENV, workspace_id: auth.workspaceId, action, table_name: entity, record_id: entityId, actor_id: auth.userId, actor_email: auth.email, old_data: before, new_data: after, created_at: timestamp, schemaVersion: SCHEMA_VERSION };
  }

  async requireRelationships(auth, entity, record) {
    for (const [field, targetEntity] of Object.entries(entityRelationships[entity] || {})) {
      const value = record[field];
      if (value == null) continue;
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: { PK: tenantPk(auth.workspaceId), SK: entitySk(targetEntity, value) },
        ConsistentRead: true
      }));
      if (!result.Item) throw Object.assign(new Error(`Referência inválida: ${field}.`), { statusCode: 400 });
    }
  }
}

function encodeCursor(key) {
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  try {
    const key = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if (!key?.PK || !key?.SK) throw new Error('invalid');
    return key;
  } catch {
    throw Object.assign(new Error('Cursor inválido.'), { statusCode: 400 });
  }
}
