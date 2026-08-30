import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createOperationalPersistence, createAnalyticalPersistence } from '../../../src/infrastructure/persistence/persistenceFactory';

describe('SR-02.2C: Formal Persistence Provider Separation & Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('1. NODE_ENV=test + sqlite-test -> allowed', () => {
    process.env.NODE_ENV = 'test';
    process.env.OPERATIONAL_PERSISTENCE_PROVIDER = 'sqlite-test';
    process.env.ANALYTICAL_PERSISTENCE_PROVIDER = 'memory';

    expect(() => createOperationalPersistence()).not.toThrow();
    expect(() => createAnalyticalPersistence()).not.toThrow();
  });

  it('2. NODE_ENV=production + sqlite-test -> rejected with ConfigurationError', () => {
    process.env.NODE_ENV = 'production';
    process.env.OPERATIONAL_PERSISTENCE_PROVIDER = 'sqlite-test';

    expect(() => createOperationalPersistence()).toThrow(/ConfigurationError/i);
  });

  it('3. production + firestore without config -> rejected with ConfigurationError', () => {
    process.env.NODE_ENV = 'production';
    process.env.OPERATIONAL_PERSISTENCE_PROVIDER = 'firestore';
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    expect(() => createOperationalPersistence()).toThrow(/ConfigurationError/i);
  });

  it('4. production + bigquery without config -> rejected with ConfigurationError', () => {
    process.env.NODE_ENV = 'production';
    process.env.ANALYTICAL_PERSISTENCE_PROVIDER = 'bigquery';
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    expect(() => createAnalyticalPersistence()).toThrow(/ConfigurationError/i);
  });

  it('5. No automatic fallback occurs from production firestore to sqlite', () => {
    process.env.NODE_ENV = 'production';
    process.env.OPERATIONAL_PERSISTENCE_PROVIDER = 'firestore';
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    expect(() => createOperationalPersistence()).toThrow();
  });
});
