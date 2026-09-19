import { createHash } from 'node:crypto';

const SUPPORTED_MODULES = new Set(['obrigacoes', 'suprimentos']);
const SAFE_ID = /^[A-Za-z0-9_.:@/-]{1,180}$/;

function text(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function assertIsoDate(value, field) {
  const normalized = text(value);
  if (!normalized || Number.isNaN(Date.parse(normalized))) {
    throw new TypeError(`${field} must be an ISO date-time`);
  }
  return new Date(normalized).toISOString();
}

function parseEventSk(sk = '') {
  const match = /^EVENT#([^#]+)#(.+)$/.exec(String(sk));
  return match ? { timestamp: match[1], eventId: match[2] } : {};
}

function workspaceFromPk(pk = '') {
  const match = /^WORKSPACE#(.+)$/.exec(String(pk));
  return match ? match[1] : '';
}

function normalizedModule(value) {
  const moduleId = text(value).toLowerCase();
  if (!SUPPORTED_MODULES.has(moduleId)) {
    throw new TypeError(`unsupported module: ${moduleId || '<empty>'}`);
  }
  return moduleId;
}

function safeContractText(value, fallback, maxLength) {
  const candidate = text(value, fallback).slice(0, maxLength);
  return candidate || fallback;
}

function entityIdentity(item, moduleId, eventId) {
  const entityType = safeContractText(
    item.source_entity_type
      || item.record_type
      || item.resource_type
      || item.subject_type
      || `${moduleId}.event`,
    `${moduleId}.event`,
    100,
  );

  const entityId = safeContractText(
    item.entity_id
      || item.record_id
      || item.activity_id
      || item.obligation_id
      || item.purchase_id
      || item.purchase_request_id
      || item.request_id
      || eventId,
    eventId,
    160,
  );

  return { entityType, entityId };
}

export function translateModuleEvent(item, {
  moduleId,
  processingPurposeId = 'operational-shadow-mapping-v1',
  retentionClass = 'ANALYTICS_2Y',
} = {}) {
  if (!item || typeof item !== 'object') throw new TypeError('EVENT# item is required');

  const sourceModule = normalizedModule(moduleId || item.module_id);
  const parsed = parseEventSk(item.SK);
  const eventId = safeContractText(item.event_id || parsed.eventId, '', 180);
  if (eventId.length < 8 || !SAFE_ID.test(eventId)) {
    throw new TypeError('EVENT# item has invalid event id');
  }

  const tenantId = safeContractText(item.workspace_id || workspaceFromPk(item.PK), '', 160);
  if (!tenantId) throw new TypeError('EVENT# item has no workspace/tenant id');

  const occurredAt = assertIsoDate(item.timestamp || item.created_at || parsed.timestamp, 'occurredAt');
  const { entityType, entityId } = entityIdentity(item, sourceModule, eventId);
  const eventType = safeContractText(
    `${sourceModule}.${text(item.event_type, 'event')}`,
    `${sourceModule}.event`,
    100,
  );

  return {
    eventId,
    eventVersion: 1,
    eventType,
    tenantId,
    occurredAt,
    ...(text(item.correlation_id) ? { correlationId: text(item.correlation_id).slice(0, 160) } : {}),
    entityType,
    entityId,
    provenance: {
      sourceType: 'E3I_TOOL_MEASURED',
      sourceSystem: `e3i:${sourceModule}`,
      sourceEntityId: entityId,
      collectedAt: occurredAt,
      dataClassification: 'INTERNAL',
      processingPurposeId: safeContractText(processingPurposeId, 'operational-shadow-mapping-v1', 120),
      retentionClass: safeContractText(retentionClass, 'ANALYTICS_2Y', 80),
      containsPersonalData: false,
      containsSensitivePersonalData: false,
    },
  };
}

export function shadowMappingId(event) {
  const digest = createHash('sha256')
    .update([event.tenantId, event.provenance.sourceSystem, event.entityType, event.entityId].join('|'))
    .digest('hex')
    .slice(0, 24);
  return `map-shadow-${digest}`;
}

function clone(value) {
  return structuredClone(value);
}

export class InMemoryEventLedger {
  #items = new Map();

  async append(event) {
    const key = `${event.tenantId}::${event.eventId}`;
    if (this.#items.has(key)) return { inserted: false, event: clone(this.#items.get(key)) };
    this.#items.set(key, clone(event));
    return { inserted: true, event: clone(event) };
  }

  async list(tenantId) {
    return [...this.#items.values()].filter((event) => event.tenantId === tenantId).map(clone);
  }
}

export class InMemoryShadowMappingStore {
  #items = new Map();

  async project(event) {
    const mappingId = shadowMappingId(event);
    const key = `${event.tenantId}::${mappingId}`;
    const current = this.#items.get(key);
    const now = event.occurredAt;
    const count = Number(current?.shadowEventCount || 0) + 1;
    const firstSeenAt = current?.createdAt || now;

    const mapping = {
      mappingId,
      tenantId: event.tenantId,
      name: `Shadow telemetry — ${event.provenance.sourceSystem.replace('e3i:', '')}: ${event.entityType}`.slice(0, 200),
      mappingType: 'PROCESS',
      status: 'IN_PROGRESS',
      sources: ['E3I_TOOL'],
      activities: [],
      facts: [
        { key: 'shadow_event_count', value: count, provenance: clone(event.provenance) },
        { key: 'shadow_last_event_type', value: event.eventType, provenance: clone(event.provenance) },
        { key: 'shadow_last_occurred_at', value: event.occurredAt, provenance: clone(event.provenance) },
      ],
      riskRefs: [],
      opportunityRefs: [],
      evidenceRefs: [],
      createdByActorId: 'shadow-consumer',
      createdAt: firstSeenAt,
      updatedAt: now,
      shadowEventCount: count,
    };

    this.#items.set(key, clone(mapping));
    return clone(mapping);
  }

  async get(tenantId, mappingId) {
    const item = this.#items.get(`${tenantId}::${mappingId}`);
    return item ? clone(item) : null;
  }
}

export class ShadowEventConsumer {
  constructor({
    sources = [],
    eventLedger = new InMemoryEventLedger(),
    mappingStore = new InMemoryShadowMappingStore(),
    enabled = false,
    shadowMode = true,
    processingPurposeId,
    retentionClass,
    onTelemetryError = () => {},
  } = {}) {
    this.sources = sources;
    this.eventLedger = eventLedger;
    this.mappingStore = mappingStore;
    this.enabled = enabled;
    this.shadowMode = shadowMode;
    this.processingPurposeId = processingPurposeId;
    this.retentionClass = retentionClass;
    this.onTelemetryError = onTelemetryError;
  }

  async runOnce({ limitPerSource = 100 } = {}) {
    if (!this.enabled) {
      return { status: 'disabled', read: 0, translated: 0, ledgerInserted: 0, projected: 0, errors: 0 };
    }
    if (!this.shadowMode) throw new Error('ShadowEventConsumer refuses non-shadow mode');

    const summary = {
      status: 'ok',
      read: 0,
      translated: 0,
      ledgerInserted: 0,
      projected: 0,
      errors: 0,
      sources: {},
    };

    for (const source of this.sources) {
      const moduleId = normalizedModule(source.moduleId);
      const sourceSummary = { read: 0, translated: 0, inserted: 0, projected: 0, errors: 0 };
      summary.sources[moduleId] = sourceSummary;

      try {
        let cursor;
        do {
          const page = await source.readEvents({ cursor, limit: limitPerSource });
          const items = Array.isArray(page?.items) ? page.items : [];
          cursor = page?.cursor || null;

          for (const item of items) {
            summary.read += 1;
            sourceSummary.read += 1;
            try {
              const event = translateModuleEvent(item, {
                moduleId,
                processingPurposeId: this.processingPurposeId,
                retentionClass: this.retentionClass,
              });
              summary.translated += 1;
              sourceSummary.translated += 1;

              const ledger = await this.eventLedger.append(event);
              if (ledger.inserted) {
                summary.ledgerInserted += 1;
                sourceSummary.inserted += 1;
                await this.mappingStore.project(event);
                summary.projected += 1;
                sourceSummary.projected += 1;
              }
            } catch (error) {
              summary.errors += 1;
              sourceSummary.errors += 1;
              this.onTelemetryError({ moduleId, stage: 'translate-or-project', error });
            }
          }
        } while (cursor);
      } catch (error) {
        summary.errors += 1;
        sourceSummary.errors += 1;
        this.onTelemetryError({ moduleId, stage: 'source-read', error });
      }
    }

    if (summary.errors > 0) summary.status = 'degraded';
    return summary;
  }
}
