import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
import path from 'path';

const BIGQUERY_FILE = path.join(process.cwd(), 'data', 'bigquery_dataset.json');

export interface OrganizationRecord {
  id: string;
  legalName: string;
  tradeName: string;
  document: string;
  status: string;
  plan: string;
  usersCount: number;
  createdAt: string;
  customLogoUrl?: string;
  settings?: any;
  toolAccess?: string[];
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  status: string;
  systemRole?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface OrganizationMembershipRecord {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  status: string;
  joinedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  currentOrganizationId?: string;
  currentMembershipId?: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

export interface BigQueryDatasetSchema {
  projectId: string;
  datasetId: string;
  region: string;
  lastSyncAt: string;
  tables: {
    tenants: { rowsCount: number; schema: string[]; data: OrganizationRecord[] };
    users: { rowsCount: number; schema: string[]; data: UserRecord[] };
    organization_memberships: { rowsCount: number; schema: string[]; data: OrganizationMembershipRecord[] };
    sessions: { rowsCount: number; schema: string[]; data: SessionRecord[] };
    discovery_sessions: { rowsCount: number; schema: string[]; data: any[] };
    strategy_canvases: { rowsCount: number; schema: string[]; data: any[] };
    organization_maps: { rowsCount: number; schema: string[]; data: any[] };
    business_systems: { rowsCount: number; schema: string[]; data: any[] };
    manual_controls: { rowsCount: number; schema: string[]; data: any[] };
    information_flows: { rowsCount: number; schema: string[]; data: any[] };
    system_integrations: { rowsCount: number; schema: string[]; data: any[] };
    audit_logs: { rowsCount: number; schema: string[]; data: any[] };
  };
}

class BigQueryStore {
  private bqClient: BigQuery | null = null;
  private datasetId = 'e3i_analytics_ds';

  constructor() {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT_ID) {
        this.bqClient = new BigQuery({
          projectId: process.env.GCP_PROJECT_ID || 'e3i-solucoes-prod'
        });
      }
    } catch (e) {
      console.warn('[BigQueryStore] Initialized in file-backed BigQuery dataset mode:', e);
    }
  }

  public loadDataset(): BigQueryDatasetSchema {
    try {
      if (fs.existsSync(BIGQUERY_FILE)) {
        const raw = fs.readFileSync(BIGQUERY_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.tables) {
          if (!parsed.tables.organization_memberships) {
            parsed.tables.organization_memberships = { rowsCount: 0, schema: ["id", "userId", "organizationId", "role", "status", "joinedAt"], data: [] };
          }
          if (!parsed.tables.sessions) {
            parsed.tables.sessions = { rowsCount: 0, schema: ["id", "userId", "currentOrganizationId", "currentMembershipId", "tokenHash", "expiresAt", "revokedAt", "createdAt"], data: [] };
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('[BigQueryStore] Error loading dataset:', e);
    }

    return {
      projectId: "e3i-solucoes-prod",
      datasetId: this.datasetId,
      region: "us-east1",
      lastSyncAt: new Date().toISOString(),
      tables: {
        tenants: { rowsCount: 0, schema: ["id", "legalName", "tradeName", "document", "status", "plan", "usersCount", "createdAt"], data: [] },
        users: { rowsCount: 0, schema: ["id", "name", "email", "passwordHash", "status", "systemRole", "createdAt"], data: [] },
        organization_memberships: { rowsCount: 0, schema: ["id", "userId", "organizationId", "role", "status", "joinedAt"], data: [] },
        sessions: { rowsCount: 0, schema: ["id", "userId", "currentOrganizationId", "currentMembershipId", "tokenHash", "expiresAt", "revokedAt", "createdAt"], data: [] },
        discovery_sessions: { rowsCount: 0, schema: ["id", "tenantId", "userId", "status"], data: [] },
        strategy_canvases: { rowsCount: 0, schema: ["id", "tenantId", "mission", "vision"], data: [] },
        organization_maps: { rowsCount: 0, schema: ["id", "tenantId", "version"], data: [] },
        business_systems: { rowsCount: 0, schema: ["id", "name", "category"], data: [] },
        manual_controls: { rowsCount: 0, schema: ["id", "responsible", "purpose"], data: [] },
        information_flows: { rowsCount: 0, schema: ["id", "source", "target"], data: [] },
        system_integrations: { rowsCount: 0, schema: ["id", "integrationType"], data: [] },
        audit_logs: { rowsCount: 0, schema: ["id", "timestamp", "organizationId", "actorUserId", "action"], data: [] }
      }
    };
  }

  public saveDataset(dataset: BigQueryDatasetSchema): void {
    const temporaryFile = `${BIGQUERY_FILE}.${process.pid}.tmp`;
    try {
      const dir = path.dirname(BIGQUERY_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      dataset.lastSyncAt = new Date().toISOString();
      for (const key of Object.keys(dataset.tables) as Array<keyof typeof dataset.tables>) {
        if (dataset.tables[key] && Array.isArray(dataset.tables[key].data)) {
          dataset.tables[key].rowsCount = dataset.tables[key].data.length;
        }
      }
      const content = JSON.stringify(dataset, null, 2);
      const descriptor = fs.openSync(temporaryFile, 'w', 0o600);
      try {
        fs.writeFileSync(descriptor, content, 'utf8');
        fs.fsyncSync(descriptor);
      } finally {
        fs.closeSync(descriptor);
      }
      // O rename no mesmo volume é atômico: leitores enxergam o arquivo antigo
      // completo ou o novo completo, nunca JSON parcialmente gravado.
      fs.renameSync(temporaryFile, BIGQUERY_FILE);
    } catch (e) {
      console.error('[BigQueryStore] Error saving dataset:', e);
      try { fs.rmSync(temporaryFile, { force: true }); } catch {}
      throw e;
    }
  }

  public getOrganizations(): OrganizationRecord[] {
    const ds = this.loadDataset();
    return ds.tables.tenants.data || [];
  }

  public getOrganization(id: string): OrganizationRecord | null {
    const orgs = this.getOrganizations();
    return orgs.find(o => o.id === id) || null;
  }

  public saveOrganization(org: OrganizationRecord): void {
    const ds = this.loadDataset();
    const index = ds.tables.tenants.data.findIndex(o => o.id === org.id);
    if (index >= 0) {
      ds.tables.tenants.data[index] = { ...ds.tables.tenants.data[index], ...org };
    } else {
      ds.tables.tenants.data.push(org);
    }
    this.saveDataset(ds);
  }

  public getUsers(): UserRecord[] {
    const ds = this.loadDataset();
    return ds.tables.users.data || [];
  }

  public getUser(id: string): UserRecord | null {
    const users = this.getUsers();
    return users.find(u => u.id === id) || null;
  }

  public getUserByEmail(email: string): UserRecord | null {
    const users = this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public saveUser(user: UserRecord): void {
    const ds = this.loadDataset();
    const index = ds.tables.users.data.findIndex(u => u.id === user.id);
    if (index >= 0) {
      ds.tables.users.data[index] = { ...ds.tables.users.data[index], ...user };
    } else {
      ds.tables.users.data.push(user);
    }
    this.saveDataset(ds);
  }

  public getMemberships(): OrganizationMembershipRecord[] {
    const ds = this.loadDataset();
    return ds.tables.organization_memberships.data || [];
  }

  public getMembershipsForUser(userId: string): OrganizationMembershipRecord[] {
    const memberships = this.getMemberships();
    return memberships.filter(m => m.userId === userId && m.status === 'ACTIVE');
  }

  public getMembership(userId: string, organizationId: string): OrganizationMembershipRecord | null {
    const memberships = this.getMemberships();
    return memberships.find(m => m.userId === userId && m.organizationId === organizationId) || null;
  }

  public saveMembership(membership: OrganizationMembershipRecord): void {
    const ds = this.loadDataset();
    const index = ds.tables.organization_memberships.data.findIndex(
      m => m.userId === membership.userId && m.organizationId === membership.organizationId
    );
    if (index >= 0) {
      ds.tables.organization_memberships.data[index] = { ...ds.tables.organization_memberships.data[index], ...membership };
    } else {
      const existing = ds.tables.organization_memberships.data.find(
        m => m.userId === membership.userId && m.organizationId === membership.organizationId
      );
      if (existing) {
        throw new Error(`Membership already exists for user ${membership.userId} and organization ${membership.organizationId}`);
      }
      ds.tables.organization_memberships.data.push(membership);
    }
    this.saveDataset(ds);
  }

  public getSessions(): SessionRecord[] {
    const ds = this.loadDataset();
    return ds.tables.sessions.data || [];
  }

  public getSession(sessionId: string): SessionRecord | null {
    const sessions = this.getSessions();
    return sessions.find(s => s.id === sessionId && !s.revokedAt) || null;
  }

  public saveSession(session: SessionRecord): void {
    const ds = this.loadDataset();
    const index = ds.tables.sessions.data.findIndex(s => s.id === session.id);
    if (index >= 0) {
      ds.tables.sessions.data[index] = { ...ds.tables.sessions.data[index], ...session };
    } else {
      ds.tables.sessions.data.push(session);
    }
    this.saveDataset(ds);
  }

  public deleteSession(sessionId: string): void {
    const ds = this.loadDataset();
    ds.tables.sessions.data = ds.tables.sessions.data.filter(s => s.id !== sessionId);
    this.saveDataset(ds);
  }

  public getTableData(tableName: keyof BigQueryDatasetSchema['tables']): any[] {
    const ds = this.loadDataset();
    return ds.tables[tableName]?.data || [];
  }

  public saveTableData(tableName: keyof BigQueryDatasetSchema['tables'], data: any[]): void {
    const ds = this.loadDataset();
    if (ds.tables[tableName]) {
      ds.tables[tableName].data = data;
      this.saveDataset(ds);
    }
  }
}

export const bigQueryStore = new BigQueryStore();
