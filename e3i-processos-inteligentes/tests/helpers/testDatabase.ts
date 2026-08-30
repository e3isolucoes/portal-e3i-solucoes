import { mockOrganizations } from '../fixtures/organizations';
import { mockUsers } from '../fixtures/users';
import { mockSessions } from '../fixtures/sessions';

export interface TestDatabaseState {
  tenants: typeof mockOrganizations;
  users: typeof mockUsers;
  sessions: typeof mockSessions;
  auditLogs: any[];
  sentEmails: any[];
  notifications: any[];
  usageMetrics: any[];
  costRates: any[];
  alerts: any[];
  structuredLogs: any[];
  backupJobs: any[];
  restoreJobs: any[];
  disasterRecoveryTests: any[];
  operationalMode: string;
  discoverySessions: any[];
  contextPackages: any[];
  llmUsageLogs: any[];
  strategyCanvases: any[];
}

export function createTestDatabase(): TestDatabaseState {
  return {
    tenants: JSON.parse(JSON.stringify(mockOrganizations)),
    users: JSON.parse(JSON.stringify(mockUsers)),
    sessions: JSON.parse(JSON.stringify(mockSessions)),
    auditLogs: [],
    sentEmails: [],
    notifications: [],
    usageMetrics: [
      { id: 'um-1', organizationId: 'tenant-1', metricType: 'API_REQUEST', quantity: 1250, unit: 'requests', source: 'gateway', periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-08-05T23:59:59Z', metadata: {}, createdAt: new Date().toISOString() },
      { id: 'um-2', organizationId: 'tenant-1', metricType: 'EMAIL_SENT', quantity: 45, unit: 'emails', source: 'notification-service', periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-08-05T23:59:59Z', metadata: {}, createdAt: new Date().toISOString() },
      { id: 'um-3', organizationId: 'tenant-1', metricType: 'STORAGE_BYTES', quantity: 104857600, unit: 'bytes', source: 'storage', periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-08-05T23:59:59Z', metadata: {}, createdAt: new Date().toISOString() },
      { id: 'um-4', organizationId: 'tenant-2', metricType: 'API_REQUEST', quantity: 320, unit: 'requests', source: 'gateway', periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-08-05T23:59:59Z', metadata: {}, createdAt: new Date().toISOString() }
    ],
    costRates: [
      { id: 'cr-1', provider: 'aws', service: 'api', metricType: 'API_REQUEST', unit: 'request', unitPrice: 0.00001, currency: 'BRL', validFrom: '2026-01-01T00:00:00Z', validTo: '2026-12-31T23:59:59Z' },
      { id: 'cr-2', provider: 'smtp', service: 'email', metricType: 'EMAIL_SENT', unit: 'email', unitPrice: 0.05, currency: 'BRL', validFrom: '2026-01-01T00:00:00Z', validTo: '2026-12-31T23:59:59Z' },
      { id: 'cr-3', provider: 'aws', service: 's3', metricType: 'STORAGE_BYTES', unit: 'byte', unitPrice: 0.000000001, currency: 'BRL', validFrom: '2026-01-01T00:00:00Z', validTo: '2026-12-31T23:59:59Z' }
    ],
    alerts: [
      { id: 'alt-1', severity: 'WARNING', title: 'Latência elevada na rota /api/processes', message: 'Tempo médio de resposta superior a 800ms', status: 'ACTIVE', createdAt: new Date().toISOString() }
    ],
    structuredLogs: [],
    backupJobs: [
      { id: 'bkp-1', type: 'FULL', scope: 'GLOBAL', organizationId: null, status: 'SUCCEEDED', startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3500000).toISOString(), storageLocation: 'secure-bucket/backup-2026-08-05.tar.gz', checksum: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', sizeBytes: 15482000, initiatedByUserId: 'usr-1', errorCode: null, metadata: {}, createdAt: new Date(Date.now() - 3600000).toISOString() }
    ],
    restoreJobs: [],
    disasterRecoveryTests: [
      { id: 'drt-1', backupJobId: 'bkp-1', restoreJobId: 'rst-1', status: 'SUCCEEDED', startedAt: new Date(Date.now() - 1800000).toISOString(), completedAt: new Date(Date.now() - 1700000).toISOString(), rpoObservedMinutes: 15, rtoObservedMinutes: 45, findings: 'Restore bem-sucedido e íntegro.', createdAt: new Date(Date.now() - 1800000).toISOString() }
    ],
    operationalMode: 'NORMAL',
    discoverySessions: [],
    contextPackages: [],
    llmUsageLogs: [],
    strategyCanvases: []
  };
}

export const testDb = createTestDatabase();

export function resetTestDatabase() {
  testDb.tenants = JSON.parse(JSON.stringify(mockOrganizations));
  testDb.users = JSON.parse(JSON.stringify(mockUsers));
  testDb.sessions = JSON.parse(JSON.stringify(mockSessions));
  testDb.auditLogs = [];
  testDb.sentEmails = [];
  testDb.notifications = [];
  testDb.usageMetrics = [
    { id: 'um-1', organizationId: 'tenant-1', metricType: 'API_REQUEST', quantity: 1250, unit: 'requests', source: 'gateway', periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-08-05T23:59:59Z', metadata: {}, createdAt: new Date().toISOString() },
    { id: 'um-2', organizationId: 'tenant-1', metricType: 'EMAIL_SENT', quantity: 45, unit: 'emails', source: 'notification-service', periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-08-05T23:59:59Z', metadata: {}, createdAt: new Date().toISOString() },
    { id: 'um-3', organizationId: 'tenant-1', metricType: 'STORAGE_BYTES', quantity: 104857600, unit: 'bytes', source: 'storage', periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-08-05T23:59:59Z', metadata: {}, createdAt: new Date().toISOString() },
    { id: 'um-4', organizationId: 'tenant-2', metricType: 'API_REQUEST', quantity: 320, unit: 'requests', source: 'gateway', periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-08-05T23:59:59Z', metadata: {}, createdAt: new Date().toISOString() }
  ];
  testDb.costRates = [
    { id: 'cr-1', provider: 'aws', service: 'api', metricType: 'API_REQUEST', unit: 'request', unitPrice: 0.00001, currency: 'BRL', validFrom: '2026-01-01T00:00:00Z', validTo: '2026-12-31T23:59:59Z' },
    { id: 'cr-2', provider: 'smtp', service: 'email', metricType: 'EMAIL_SENT', unit: 'email', unitPrice: 0.05, currency: 'BRL', validFrom: '2026-01-01T00:00:00Z', validTo: '2026-12-31T23:59:59Z' },
    { id: 'cr-3', provider: 'aws', service: 's3', metricType: 'STORAGE_BYTES', unit: 'byte', unitPrice: 0.000000001, currency: 'BRL', validFrom: '2026-01-01T00:00:00Z', validTo: '2026-12-31T23:59:59Z' }
  ];
  testDb.alerts = [
    { id: 'alt-1', severity: 'WARNING', title: 'Latência elevada na rota /api/processes', message: 'Tempo médio de resposta superior a 800ms', status: 'ACTIVE', createdAt: new Date().toISOString() }
  ];
  testDb.structuredLogs = [];
  testDb.backupJobs = [
    { id: 'bkp-1', type: 'FULL', scope: 'GLOBAL', organizationId: null, status: 'SUCCEEDED', startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3500000).toISOString(), storageLocation: 'secure-bucket/backup-2026-08-05.tar.gz', checksum: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', sizeBytes: 15482000, initiatedByUserId: 'usr-1', errorCode: null, metadata: {}, createdAt: new Date(Date.now() - 3600000).toISOString() }
  ];
  testDb.restoreJobs = [];
  testDb.disasterRecoveryTests = [
    { id: 'drt-1', backupJobId: 'bkp-1', restoreJobId: 'rst-1', status: 'SUCCEEDED', startedAt: new Date(Date.now() - 1800000).toISOString(), completedAt: new Date(Date.now() - 1700000).toISOString(), rpoObservedMinutes: 15, rtoObservedMinutes: 45, findings: 'Restore bem-sucedido e íntegro.', createdAt: new Date(Date.now() - 1800000).toISOString() }
  ];
  testDb.operationalMode = 'NORMAL';
  testDb.discoverySessions = [];
  testDb.contextPackages = [];
  testDb.llmUsageLogs = [];
  testDb.strategyCanvases = [];
}
