function encodeCursor(key) {
  return key ? Buffer.from(JSON.stringify(key), 'utf8').toString('base64url') : null;
}

function decodeCursor(cursor) {
  if (!cursor) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    throw new TypeError('invalid DynamoDB cursor');
  }
}

async function sdk() {
  const [{ DynamoDBClient }, lib] = await Promise.all([
    import('@aws-sdk/client-dynamodb'),
    import('@aws-sdk/lib-dynamodb'),
  ]);
  const {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    GetCommand,
  } = lib;
  return { DynamoDBClient, DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand };
}

function sourceTableArn(tableName, region, accountId) {
  return `arn:aws:dynamodb:${region}:${accountId}:table/${tableName}`;
}

export function expectedReadOnlySourcePolicy({ tableNames, region, accountId }) {
  return {
    Effect: 'Allow',
    Action: ['dynamodb:DescribeTable', 'dynamodb:Scan'],
    Resource: tableNames.map((name) => sourceTableArn(name, region, accountId)),
  };
}

export async function createDynamoModuleEventSource({
  moduleId,
  tableName,
  region = process.env.AWS_REGION,
  documentClient,
} = {}) {
  if (!moduleId || !tableName) throw new TypeError('moduleId and tableName are required');

  const { DynamoDBClient, DynamoDBDocumentClient, ScanCommand } = await sdk();
  const client = documentClient || DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

  return {
    moduleId,
    tableName,
    readOnly: true,
    async readEvents({ cursor, limit = 100 } = {}) {
      const result = await client.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: 'begins_with(SK, :eventPrefix) AND module_id = :moduleId',
        ExpressionAttributeValues: {
          ':eventPrefix': 'EVENT#',
          ':moduleId': moduleId,
        },
        Limit: Math.max(1, Math.min(500, Number(limit) || 100)),
        ExclusiveStartKey: decodeCursor(cursor),
      }));

      return {
        items: Array.isArray(result.Items) ? result.Items : [],
        cursor: encodeCursor(result.LastEvaluatedKey),
      };
    },
  };
}

function tenantPk(tenantId) {
  return `TENANT#${tenantId}`;
}

function eventSk(event) {
  return `EVENT#${event.occurredAt}#${event.eventId}`;
}

function mappingSk(mappingId) {
  return `MAPPING#${mappingId}`;
}

export async function createDynamoIntelligenceStores({
  eventLedgerTable,
  mappingStoreTable,
  region = process.env.AWS_REGION,
  documentClient,
} = {}) {
  if (!eventLedgerTable || !mappingStoreTable) {
    throw new TypeError('eventLedgerTable and mappingStoreTable are required');
  }

  const {
    DynamoDBClient,
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
  } = await sdk();
  const client = documentClient || DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

  const eventLedger = {
    async append(event) {
      try {
        await client.send(new PutCommand({
          TableName: eventLedgerTable,
          Item: {
            PK: tenantPk(event.tenantId),
            SK: eventSk(event),
            entityType: 'intelligence_event',
            schemaVersion: 1,
            ...event,
          },
          ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
        }));
        return { inserted: true, event };
      } catch (error) {
        if (error?.name === 'ConditionalCheckFailedException') {
          return { inserted: false, event };
        }
        throw error;
      }
    },
  };

  const mappingStore = {
    async project(event) {
      const { shadowMappingId } = await import('./shadow-event-consumer.mjs');
      const mappingId = shadowMappingId(event);
      const key = { PK: tenantPk(event.tenantId), SK: mappingSk(mappingId) };
      const currentResult = await client.send(new GetCommand({
        TableName: mappingStoreTable,
        Key: key,
        ConsistentRead: true,
      }));
      const current = currentResult.Item;
      const currentCount = current?.facts?.find((fact) => fact.key === 'shadow_event_count')?.value;
      const count = Number(currentCount || 0) + 1;

      const mapping = {
        mappingId,
        tenantId: event.tenantId,
        name: `Shadow telemetry — ${event.provenance.sourceSystem.replace('e3i:', '')}: ${event.entityType}`.slice(0, 200),
        mappingType: 'PROCESS',
        status: 'IN_PROGRESS',
        sources: ['E3I_TOOL'],
        activities: [],
        facts: [
          { key: 'shadow_event_count', value: count, provenance: structuredClone(event.provenance) },
          { key: 'shadow_last_event_type', value: event.eventType, provenance: structuredClone(event.provenance) },
          { key: 'shadow_last_occurred_at', value: event.occurredAt, provenance: structuredClone(event.provenance) },
        ],
        riskRefs: [],
        opportunityRefs: [],
        evidenceRefs: [],
        createdByActorId: 'shadow-consumer',
        createdAt: current?.createdAt || event.occurredAt,
        updatedAt: event.occurredAt,
      };

      await client.send(new PutCommand({
        TableName: mappingStoreTable,
        Item: {
          ...key,
          entityType: 'mapping',
          schemaVersion: 1,
          ...mapping,
        },
      }));
      return mapping;
    },
  };

  return { eventLedger, mappingStore };
}
