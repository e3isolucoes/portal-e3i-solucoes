import { readIntelligenceConfig } from './intelligence-config.mjs';
import { ShadowEventConsumer } from './shadow-event-consumer.mjs';
import {
  createDynamoIntelligenceStores,
  createDynamoModuleEventSource,
} from './dynamodb-shadow-adapter.mjs';

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`${name} is required when E3I Intelligence shadow ingestion is enabled`);
  return value;
}

export async function runShadowFromEnvironment(env = process.env) {
  const config = readIntelligenceConfig(env);
  if (!config.enabled) {
    return {
      status: 'disabled',
      environment: config.environment,
      shadowMode: config.shadowMode,
    };
  }

  const [obrigacoes, suprimentos] = await Promise.all([
    createDynamoModuleEventSource({
      moduleId: 'obrigacoes',
      tableName: required(env, 'E3I_OBRIGACOES_EVENT_TABLE'),
      region: env.AWS_REGION,
    }),
    createDynamoModuleEventSource({
      moduleId: 'suprimentos',
      tableName: required(env, 'E3I_SUPRIMENTOS_EVENT_TABLE'),
      region: env.AWS_REGION,
    }),
  ]);

  const stores = await createDynamoIntelligenceStores({
    eventLedgerTable: required(env, 'E3I_INTELLIGENCE_EVENT_LEDGER_TABLE'),
    mappingStoreTable: required(env, 'E3I_INTELLIGENCE_MAPPING_STORE_TABLE'),
    region: env.AWS_REGION,
  });

  const consumer = new ShadowEventConsumer({
    sources: [obrigacoes, suprimentos],
    eventLedger: stores.eventLedger,
    mappingStore: stores.mappingStore,
    enabled: true,
    shadowMode: config.shadowMode,
    processingPurposeId: config.processingPurposeId,
    retentionClass: config.retentionClass,
    onTelemetryError({ moduleId, stage, error }) {
      console.error(JSON.stringify({
        level: 'error',
        component: 'e3i-intelligence-shadow-consumer',
        moduleId,
        stage,
        errorName: error?.name || 'Error',
      }));
    },
  });

  const result = await consumer.runOnce({
    limitPerSource: Number(env.E3I_INTELLIGENCE_BATCH_SIZE || 100),
  });

  return {
    ...result,
    environment: config.environment,
    shadowMode: config.shadowMode,
  };
}

export async function handler() {
  return runShadowFromEnvironment(process.env);
}
