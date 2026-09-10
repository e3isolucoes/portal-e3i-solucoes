const TYPES = new Set(['obligations', 'completions', 'holidays', 'profiles', 'obligation_date_overrides']);

export function emptyDataset() {
  return { obligations: [], completions: [], holidays: [], profiles: [], overrides: [] };
}

export function normalizeSupabaseFixture(fixture) {
  return {
    obligations: fixture.obligations || [], completions: fixture.completions || [],
    holidays: fixture.holidays || [], profiles: fixture.profiles || [],
    overrides: fixture.obligation_date_overrides || fixture.overrides || []
  };
}

export function normalizeDynamoItems(items, workspaceId) {
  const data = emptyDataset();
  for (const item of items) {
    if (!TYPES.has(item.entityType) || item.workspace_id !== workspaceId || item.deletion_pending) continue;
    const key = item.entityType === 'obligation_date_overrides' ? 'overrides' : item.entityType;
    const { PK, SK, GSI1PK, GSI1SK, ...record } = item;
    data[key].push(record);
  }
  return data;
}

async function allPages(client, commandFor) {
  const items = []; let ExclusiveStartKey;
  do {
    const page = await client.send(commandFor(ExclusiveStartKey));
    items.push(...(page.Items || []));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

export async function loadDynamoWorkspaces(client, tableName, { QueryCommand, ScanCommand }) {
  // The small administration partition is scanned only to discover tenant ids;
  // operational records are subsequently queried one isolated PK at a time.
  const metadata = await allPages(client, (ExclusiveStartKey) => new ScanCommand({
    TableName: tableName,
    FilterExpression: 'entityType = :workspace',
    ExpressionAttributeValues: { ':workspace': 'workspaces' },
    ProjectionExpression: 'id, workspace_id, entityType',
    ExclusiveStartKey
  }));
  const ids = [...new Set(metadata.map((item) => item.workspace_id || item.id).filter(Boolean))];
  const result = [];
  for (const workspaceId of ids) {
    const prefix = `TOOL#${process.env.TOOL_ID || 'painel-obrigacoes'}#ENV#${process.env.APP_ENV || 'prod'}#WORKSPACE#${workspaceId}`;
    const items = await allPages(client, (ExclusiveStartKey) => new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': prefix },
      ExclusiveStartKey
    }));
    result.push({ workspaceId, data: normalizeDynamoItems(items, workspaceId) });
  }
  return result;
}
