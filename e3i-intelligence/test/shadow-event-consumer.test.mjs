import test from 'node:test';
import assert from 'node:assert/strict';

import {
  InMemoryEventLedger,
  InMemoryShadowMappingStore,
  ShadowEventConsumer,
  shadowMappingId,
  translateModuleEvent,
} from '../src/shadow-event-consumer.mjs';
import {
  IntelligenceConfigurationError,
  readIntelligenceConfig,
} from '../src/intelligence-config.mjs';
import { checkShadowIsolationHealth } from '../src/shadow-health.mjs';

function eventItem(overrides = {}) {
  return {
    PK: 'WORKSPACE#tenant-a',
    SK: 'EVENT#2026-09-19T12:00:00.000Z#evt-12345678',
    workspace_id: 'tenant-a',
    entityType: 'event',
    event_id: 'evt-12345678',
    event_type: 'activity.completed',
    timestamp: '2026-09-19T12:00:00.000Z',
    actor_id: 'user-1',
    module_id: 'obrigacoes',
    record_type: 'activity',
    record_id: 'activity-42',
    customer_email: 'must-not-be-copied@example.com',
    ...overrides,
  };
}

function source(moduleId, items) {
  return {
    moduleId,
    async readEvents() {
      return { items, cursor: null };
    },
  };
}

test('feature flag remains OFF by default and cannot be enabled outside staging/test', () => {
  const defaults = readIntelligenceConfig({});
  assert.equal(defaults.enabled, false);
  assert.equal(defaults.environment, 'production');

  assert.throws(
    () => readIntelligenceConfig({
      E3I_ENVIRONMENT: 'production',
      E3I_INTELLIGENCE_ENABLED: 'true',
    }),
    (error) => error instanceof IntelligenceConfigurationError && error.code === 'STAGING_ONLY',
  );

  const staging = readIntelligenceConfig({
    E3I_ENVIRONMENT: 'staging',
    E3I_INTELLIGENCE_ENABLED: 'true',
    E3I_INTELLIGENCE_SHADOW_MODE: 'true',
  });
  assert.equal(staging.enabled, true);
  assert.equal(staging.shadowMode, true);
});

test('translates generic EVENT# from obrigacoes into event-v1 without raw payload leakage', () => {
  const translated = translateModuleEvent(eventItem(), { moduleId: 'obrigacoes' });

  assert.deepEqual(translated, {
    eventId: 'evt-12345678',
    eventVersion: 1,
    eventType: 'obrigacoes.activity.completed',
    tenantId: 'tenant-a',
    occurredAt: '2026-09-19T12:00:00.000Z',
    entityType: 'activity',
    entityId: 'activity-42',
    provenance: {
      sourceType: 'E3I_TOOL_MEASURED',
      sourceSystem: 'e3i:obrigacoes',
      sourceEntityId: 'activity-42',
      collectedAt: '2026-09-19T12:00:00.000Z',
      dataClassification: 'INTERNAL',
      processingPurposeId: 'operational-shadow-mapping-v1',
      retentionClass: 'ANALYTICS_2Y',
      containsPersonalData: false,
      containsSensitivePersonalData: false,
    },
  });
  assert.equal(JSON.stringify(translated).includes('must-not-be-copied'), false);
});

test('translates suprimentos EVENT# using the same contract and module namespace', () => {
  const translated = translateModuleEvent(eventItem({
    module_id: 'suprimentos',
    event_type: 'purchase.requested',
    record_type: 'purchase_request',
    record_id: 'pr-9001',
  }), { moduleId: 'suprimentos' });

  assert.equal(translated.eventType, 'suprimentos.purchase.requested');
  assert.equal(translated.entityType, 'purchase_request');
  assert.equal(translated.entityId, 'pr-9001');
  assert.equal(translated.provenance.sourceSystem, 'e3i:suprimentos');
});

test('consumer is idempotent in Event Ledger and only projects newly inserted events', async () => {
  const eventLedger = new InMemoryEventLedger();
  const mappingStore = new InMemoryShadowMappingStore();
  const consumer = new ShadowEventConsumer({
    sources: [source('obrigacoes', [eventItem()])],
    eventLedger,
    mappingStore,
    enabled: true,
    shadowMode: true,
  });

  const first = await consumer.runOnce();
  const second = await consumer.runOnce();

  assert.equal(first.ledgerInserted, 1);
  assert.equal(first.projected, 1);
  assert.equal(second.ledgerInserted, 0);
  assert.equal(second.projected, 0);

  const event = translateModuleEvent(eventItem(), { moduleId: 'obrigacoes' });
  const mapping = await mappingStore.get('tenant-a', shadowMappingId(event));
  assert.equal(mapping.facts.find((fact) => fact.key === 'shadow_event_count').value, 1);
  assert.equal(Object.hasOwn(mapping, 'shadowEventCount'), false);
});

test('telemetry target failure degrades consumer but does not throw into operational path', async () => {
  const errors = [];
  const consumer = new ShadowEventConsumer({
    sources: [source('obrigacoes', [eventItem()])],
    eventLedger: {
      async append() {
        throw Object.assign(new Error('ledger unavailable'), { code: 'LEDGER_DOWN' });
      },
    },
    mappingStore: new InMemoryShadowMappingStore(),
    enabled: true,
    shadowMode: true,
    onTelemetryError: (entry) => errors.push(entry),
  });

  const result = await consumer.runOnce();
  assert.equal(result.status, 'degraded');
  assert.equal(result.errors, 1);
  assert.equal(errors[0].stage, 'translate-or-project');
});

test('health check proves intelligence outage is isolated when operational modules are healthy', async () => {
  const health = await checkShadowIsolationHealth({
    intelligenceProbe: async () => {
      throw Object.assign(new Error('intelligence unavailable'), { code: 'INTELLIGENCE_DOWN' });
    },
    operationalProbes: {
      obrigacoes: async () => true,
      suprimentos: async () => true,
    },
  });

  assert.equal(health.status, 'degraded');
  assert.equal(health.operationHealthy, true);
  assert.equal(health.telemetryFailureIsolated, true);
  assert.equal(health.intelligence.ok, false);
});

test('consumer refuses write-capable/non-shadow execution mode', async () => {
  const consumer = new ShadowEventConsumer({
    sources: [],
    enabled: true,
    shadowMode: false,
  });
  await assert.rejects(() => consumer.runOnce(), /refuses non-shadow mode/);
});
