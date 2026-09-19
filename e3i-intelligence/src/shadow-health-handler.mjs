import { checkShadowIsolationHealth } from './shadow-health.mjs';

async function dynamo() {
  const { DynamoDBClient, DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
  return { DynamoDBClient, DescribeTableCommand };
}

export async function handler() {
  const { DynamoDBClient, DescribeTableCommand } = await dynamo();
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });

  const describe = (tableName) => async () => {
    if (!tableName) return false;
    const result = await client.send(new DescribeTableCommand({ TableName: tableName }));
    return result.Table?.TableStatus === 'ACTIVE';
  };

  const eventLedger = process.env.E3I_INTELLIGENCE_EVENT_LEDGER_TABLE;
  const mappingStore = process.env.E3I_INTELLIGENCE_MAPPING_STORE_TABLE;

  const health = await checkShadowIsolationHealth({
    intelligenceProbe: async () => {
      const [ledger, mapping] = await Promise.all([
        describe(eventLedger)(),
        describe(mappingStore)(),
      ]);
      return ledger && mapping;
    },
    operationalProbes: {
      obrigacoes: describe(process.env.E3I_OBRIGACOES_EVENT_TABLE),
      suprimentos: describe(process.env.E3I_SUPRIMENTOS_EVENT_TABLE),
    },
  });

  return {
    statusCode: health.status === 'unhealthy' ? 503 : 200,
    body: JSON.stringify(health),
  };
}
