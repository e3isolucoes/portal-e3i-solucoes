import { Firestore } from '@google-cloud/firestore';
import { BigQuery } from '@google-cloud/bigquery';
import { PrismaClient } from '@prisma/client';
import { OrganizationRepository, OrganizationEntity } from '../../domain/repositories/OrganizationRepository';
import { UserRepository, UserEntity } from '../../domain/repositories/UserRepository';
import { OrganizationMembershipRepository, OrganizationMembershipEntity } from '../../domain/repositories/OrganizationMembershipRepository';
import { SessionRepository, SessionEntity } from '../../domain/repositories/SessionRepository';
import { AuditRepository, AuditEventEntity } from '../../domain/repositories/AuditRepository';
import { BusinessContextRepository, BusinessContextEntity } from '../../domain/repositories/BusinessContextRepository';

class FirestoreOperationalPersistence {
  private firestore: Firestore;

  constructor() {
    try {
      this.firestore = new Firestore({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
        databaseId: process.env.FIRESTORE_DATABASE || '(default)'
      });
    } catch (e) {
      throw new Error(`[FirestoreOperationalPersistence] Failed to initialize Firestore: ${e}`);
    }
  }

  public organizations: OrganizationRepository = {
    async findById(id: string): Promise<OrganizationEntity | null> {
      const doc = await FirestoreOperationalPersistence.getFirestore().collection('organizations').doc(id).get();
      return doc.exists ? ({ id: doc.id, ...doc.data() } as OrganizationEntity) : null;
    },
    async findAll(): Promise<OrganizationEntity[]> {
      const snap = await FirestoreOperationalPersistence.getFirestore().collection('organizations').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrganizationEntity));
    },
    async save(org: OrganizationEntity): Promise<void> {
      await FirestoreOperationalPersistence.getFirestore().collection('organizations').doc(org.id).set({
        ...org,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    },
    async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<void> {
      await FirestoreOperationalPersistence.getFirestore().collection('organizations').doc(id).update({
        status,
        updatedAt: new Date().toISOString()
      });
    }
  };

  public users: UserRepository = {
    async findById(id: string): Promise<UserEntity | null> {
      const doc = await FirestoreOperationalPersistence.getFirestore().collection('users').doc(id).get();
      return doc.exists ? ({ id: doc.id, ...doc.data() } as UserEntity) : null;
    },
    async findByEmail(email: string): Promise<UserEntity | null> {
      const snap = await FirestoreOperationalPersistence.getFirestore().collection('users').where('email', '==', email.toLowerCase()).get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as UserEntity;
    },
    async findAll(): Promise<UserEntity[]> {
      const snap = await FirestoreOperationalPersistence.getFirestore().collection('users').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserEntity));
    },
    async save(user: UserEntity): Promise<void> {
      await FirestoreOperationalPersistence.getFirestore().collection('users').doc(user.id).set({
        ...user,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    },
    async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'PENDING'): Promise<void> {
      await FirestoreOperationalPersistence.getFirestore().collection('users').doc(id).update({
        status,
        updatedAt: new Date().toISOString()
      });
    }
  };

  public memberships: OrganizationMembershipRepository = {
    async findById(id: string): Promise<OrganizationMembershipEntity | null> {
      const doc = await FirestoreOperationalPersistence.getFirestore().collection('organizationMemberships').doc(id).get();
      return doc.exists ? ({ id: doc.id, ...doc.data() } as OrganizationMembershipEntity) : null;
    },
    async findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMembershipEntity | null> {
      const snap = await FirestoreOperationalPersistence.getFirestore().collection('organizationMemberships')
        .where('userId', '==', userId)
        .where('organizationId', '==', organizationId)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as OrganizationMembershipEntity;
    },
    async findByUserId(userId: string): Promise<OrganizationMembershipEntity[]> {
      const snap = await FirestoreOperationalPersistence.getFirestore().collection('organizationMemberships')
        .where('userId', '==', userId)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrganizationMembershipEntity));
    },
    async findByOrganizationId(organizationId: string): Promise<OrganizationMembershipEntity[]> {
      const snap = await FirestoreOperationalPersistence.getFirestore().collection('organizationMemberships')
        .where('organizationId', '==', organizationId)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrganizationMembershipEntity));
    },
    async save(membership: OrganizationMembershipEntity): Promise<void> {
      const id = membership.id || `mem-${membership.userId}-${membership.organizationId}`;
      await FirestoreOperationalPersistence.getFirestore().collection('organizationMemberships').doc(id).set({
        ...membership,
        id,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    },
    async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<void> {
      await FirestoreOperationalPersistence.getFirestore().collection('organizationMemberships').doc(id).update({
        status,
        updatedAt: new Date().toISOString()
      });
    }
  };

  public sessions: SessionRepository = {
    async findById(id: string): Promise<SessionEntity | null> {
      const doc = await FirestoreOperationalPersistence.getFirestore().collection('sessions').doc(id).get();
      if (!doc.exists) return null;
      const s = { id: doc.id, ...doc.data() } as SessionEntity;
      return s.revokedAt ? null : s;
    },
    async findByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
      const snap = await FirestoreOperationalPersistence.getFirestore().collection('sessions')
        .where('tokenHash', '==', tokenHash)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      const s = { id: d.id, ...d.data() } as SessionEntity;
      return s.revokedAt ? null : s;
    },
    async save(session: SessionEntity): Promise<void> {
      await FirestoreOperationalPersistence.getFirestore().collection('sessions').doc(session.id).set(session, { merge: true });
    },
    async revoke(id: string): Promise<void> {
      await FirestoreOperationalPersistence.getFirestore().collection('sessions').doc(id).update({
        revokedAt: new Date().toISOString()
      });
    },
    async delete(id: string): Promise<void> {
      await FirestoreOperationalPersistence.getFirestore().collection('sessions').doc(id).delete();
    }
  };

  public businessContexts: BusinessContextRepository = {
    async findByOrganizationId(organizationId: string): Promise<BusinessContextEntity | null> {
      const snap = await FirestoreOperationalPersistence.getFirestore().collection('businessContexts')
        .where('organizationId', '==', organizationId)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as BusinessContextEntity;
    },
    async save(context: BusinessContextEntity): Promise<void> {
      const id = context.id || `bc-${context.organizationId}`;
      await FirestoreOperationalPersistence.getFirestore().collection('businessContexts').doc(id).set({
        ...context,
        id,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  };

  private static instance: Firestore;
  public static getFirestore(): Firestore {
    if (!FirestoreOperationalPersistence.instance) {
      if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCP_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error('[FirestoreOperationalPersistence] Firestore is not configured. Missing GOOGLE_CLOUD_PROJECT or credentials.');
      }
      FirestoreOperationalPersistence.instance = new Firestore({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
        databaseId: process.env.FIRESTORE_DATABASE || '(default)'
      });
    }
    return FirestoreOperationalPersistence.instance;
  }
}

class BigQueryAnalyticalPersistence {
  constructor() {
    if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCP_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('[BigQueryAnalyticalPersistence] BigQuery is not configured. Missing GOOGLE_CLOUD_PROJECT or credentials.');
    }
  }

  public audit: AuditRepository = {
    async log(event: AuditEventEntity): Promise<void> {
      const datasetId = process.env.BIGQUERY_DATASET || 'e3i_analytics';
      const client = new BigQuery({ projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID });
      await client.dataset(datasetId).table('audit_events').insert([{
        ...event,
        timestamp: event.timestamp || new Date().toISOString()
      }]);
    },
    async findByOrganization(organizationId: string, limit = 50): Promise<AuditEventEntity[]> {
      const datasetId = process.env.BIGQUERY_DATASET || 'e3i_analytics';
      const client = new BigQuery({ projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID });
      const query = `SELECT * FROM \`${datasetId}.audit_events\` WHERE organizationId = @orgId ORDER BY timestamp DESC LIMIT @limit`;
      const [rows] = await client.query({ query, params: { orgId: organizationId, limit } });
      return rows as AuditEventEntity[];
    },
    async findAll(limit = 100): Promise<AuditEventEntity[]> {
      const datasetId = process.env.BIGQUERY_DATASET || 'e3i_analytics';
      const client = new BigQuery({ projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID });
      const query = `SELECT * FROM \`${datasetId}.audit_events\` ORDER BY timestamp DESC LIMIT @limit`;
      const [rows] = await client.query({ query, params: { limit } });
      return rows as AuditEventEntity[];
    }
  };
}

class SQLiteTestAdapter {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  public organizations: OrganizationRepository = {
    async findById(id: string): Promise<OrganizationEntity | null> {
      const org = await this.prisma.organization.findUnique({ where: { id } });
      if (!org) return null;
      return {
        id: org.id,
        legalName: org.legalName,
        tradeName: org.tradeName,
        document: org.document,
        status: org.status as any,
        plan: org.plan as any,
        usersCount: org.usersCount,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
      };
    },
    async findAll(): Promise<OrganizationEntity[]> {
      const orgs = await this.prisma.organization.findMany();
      return orgs.map(org => ({
        id: org.id,
        legalName: org.legalName,
        tradeName: org.tradeName,
        document: org.document,
        status: org.status as any,
        plan: org.plan as any,
        usersCount: org.usersCount,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
      }));
    },
    async save(org: OrganizationEntity): Promise<void> {
      await this.prisma.organization.upsert({
        where: { id: org.id },
        update: {
          legalName: org.legalName,
          tradeName: org.tradeName,
          document: org.document,
          status: org.status,
          plan: org.plan,
          usersCount: org.usersCount,
        },
        create: {
          id: org.id,
          legalName: org.legalName,
          tradeName: org.tradeName,
          document: org.document,
          status: org.status,
          plan: org.plan,
          usersCount: org.usersCount,
        }
      });
    },
    async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<void> {
      await this.prisma.organization.update({
        where: { id },
        data: { status }
      });
    }
  };

  public users: UserRepository = {
    async findById(id: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        status: user.status as any,
        systemRole: user.systemRole || undefined,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
    async findByEmail(email: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        status: user.status as any,
        systemRole: user.systemRole || undefined,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
    async findAll(): Promise<UserEntity[]> {
      const users = await this.prisma.user.findMany();
      return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        status: user.status as any,
        systemRole: user.systemRole || undefined,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    },
    async save(user: UserEntity): Promise<void> {
      await this.prisma.user.upsert({
        where: { id: user.id },
        update: {
          name: user.name,
          email: user.email.toLowerCase(),
          passwordHash: user.passwordHash || 'hash',
          status: user.status,
          systemRole: user.systemRole,
        },
        create: {
          id: user.id,
          name: user.name,
          email: user.email.toLowerCase(),
          passwordHash: user.passwordHash || 'hash',
          status: user.status,
          systemRole: user.systemRole,
        }
      });
    },
    async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'PENDING'): Promise<void> {
      await this.prisma.user.update({
        where: { id },
        data: { status }
      });
    }
  };

  public memberships: OrganizationMembershipRepository = {
    async findById(id: string): Promise<OrganizationMembershipEntity | null> {
      const m = await this.prisma.organizationMembership.findUnique({ where: { id } });
      if (!m) return null;
      return {
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        role: m.role as any,
        status: m.status as any,
        joinedAt: m.joinedAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };
    },
    async findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMembershipEntity | null> {
      const m = await this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId, organizationId } }
      });
      if (!m) return null;
      return {
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        role: m.role as any,
        status: m.status as any,
        joinedAt: m.joinedAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };
    },
    async findByUserId(userId: string): Promise<OrganizationMembershipEntity[]> {
      const memberships = await this.prisma.organizationMembership.findMany({ where: { userId } });
      return memberships.map(m => ({
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        role: m.role as any,
        status: m.status as any,
        joinedAt: m.joinedAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }));
    },
    async findByOrganizationId(organizationId: string): Promise<OrganizationMembershipEntity[]> {
      const memberships = await this.prisma.organizationMembership.findMany({ where: { organizationId } });
      return memberships.map(m => ({
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        role: m.role as any,
        status: m.status as any,
        joinedAt: m.joinedAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }));
    },
    async save(membership: OrganizationMembershipEntity): Promise<void> {
      const id = membership.id || `mem-${membership.userId}-${membership.organizationId}`;
      await this.prisma.organizationMembership.upsert({
        where: { userId_organizationId: { userId: membership.userId, organizationId: membership.organizationId } },
        update: {
          role: membership.role,
          status: membership.status,
        },
        create: {
          id,
          userId: membership.userId,
          organizationId: membership.organizationId,
          role: membership.role,
          status: membership.status,
        }
      });
    },
    async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<void> {
      await this.prisma.organizationMembership.update({
        where: { id },
        data: { status }
      });
    }
  };

  public sessions: SessionRepository = {
    async findById(id: string): Promise<SessionEntity | null> {
      const s = await this.prisma.session.findUnique({ where: { id } });
      if (!s) return null;
      if (s.revokedAt) return null;
      return {
        id: s.id,
        userId: s.userId,
        currentOrganizationId: s.currentOrganizationId || undefined,
        currentMembershipId: s.currentMembershipId || undefined,
        tokenHash: s.tokenHash,
        expiresAt: s.expiresAt.toISOString(),
        revokedAt: s.revokedAt ? s.revokedAt.toISOString() : undefined,
        createdAt: s.createdAt.toISOString(),
      };
    },
    async findByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
      const s = await this.prisma.session.findUnique({ where: { tokenHash } });
      if (!s) return null;
      if (s.revokedAt) return null;
      return {
        id: s.id,
        userId: s.userId,
        currentOrganizationId: s.currentOrganizationId || undefined,
        currentMembershipId: s.currentMembershipId || undefined,
        tokenHash: s.tokenHash,
        expiresAt: s.expiresAt.toISOString(),
        revokedAt: s.revokedAt ? s.revokedAt.toISOString() : undefined,
        createdAt: s.createdAt.toISOString(),
      };
    },
    async save(session: SessionEntity): Promise<void> {
      await this.prisma.session.upsert({
        where: { id: session.id },
        update: {
          userId: session.userId,
          currentOrganizationId: session.currentOrganizationId,
          currentMembershipId: session.currentMembershipId,
          tokenHash: session.tokenHash,
          expiresAt: new Date(session.expiresAt),
          revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
        },
        create: {
          id: session.id,
          userId: session.userId,
          currentOrganizationId: session.currentOrganizationId,
          currentMembershipId: session.currentMembershipId,
          tokenHash: session.tokenHash,
          expiresAt: new Date(session.expiresAt),
          revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
        }
      });
    },
    async revoke(id: string): Promise<void> {
      await this.prisma.session.update({
        where: { id },
        data: { revokedAt: new Date() }
      });
    },
    async delete(id: string): Promise<void> {
      await this.prisma.session.delete({ where: { id } }).catch(() => {});
    }
  };

  public businessContexts: BusinessContextRepository = {
    async findByOrganizationId(organizationId: string): Promise<BusinessContextEntity | null> {
      return null;
    },
    async save(context: BusinessContextEntity): Promise<void> {}
  };
}

class TestAnalyticalPersistence {
  public audit: AuditRepository = {
    async log(event: AuditEventEntity): Promise<void> {},
    async findByOrganization(organizationId: string, limit = 50): Promise<AuditEventEntity[]> { return []; },
    async findAll(limit = 100): Promise<AuditEventEntity[]> { return []; }
  };
}

let operationalInstance: any = null;
let analyticalInstance: any = null;

export function createOperationalPersistence() {
  const provider = process.env.OPERATIONAL_PERSISTENCE_PROVIDER || (process.env.NODE_ENV === 'test' ? 'sqlite-test' : 'firestore');
  const isTestEnv = process.env.NODE_ENV === 'test';

  if (provider === 'sqlite-test') {
    if (!isTestEnv) {
      throw new Error(`[Persistence] ConfigurationError: sqlite-test provider is not permitted outside test environment (NODE_ENV=${process.env.NODE_ENV})`);
    }
    if (!operationalInstance) {
      operationalInstance = new SQLiteTestAdapter();
    }
    return operationalInstance;
  }

  if (provider === 'firestore') {
    const isProductionOrNonTest = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'development';
    if (isProductionOrNonTest && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCP_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error(`[Persistence] ConfigurationError: Firestore operational persistence is mandatory in non-test environment but GOOGLE_CLOUD_PROJECT / credentials are missing. No automatic SQLite fallback is allowed.`);
    }
    if (!operationalInstance) {
      operationalInstance = new FirestoreOperationalPersistence();
    }
    return operationalInstance;
  }

  throw new Error(`[Persistence] ConfigurationError: Unsupported operational persistence provider: ${provider}`);
}

export function createAnalyticalPersistence() {
  const provider = process.env.ANALYTICAL_PERSISTENCE_PROVIDER || (process.env.NODE_ENV === 'test' ? 'memory' : 'bigquery');
  const isTestEnv = process.env.NODE_ENV === 'test';

  if (provider === 'memory' || provider === 'test' || provider === 'sqlite-test') {
    if (!isTestEnv) {
      throw new Error(`[Persistence] ConfigurationError: non-BigQuery analytical provider (${provider}) is not permitted outside test environment`);
    }
    if (!analyticalInstance) {
      analyticalInstance = new TestAnalyticalPersistence();
    }
    return analyticalInstance;
  }

  if (provider === 'bigquery') {
    const isProductionOrNonTest = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'development';
    if (isProductionOrNonTest && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCP_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error(`[Persistence] ConfigurationError: BigQuery analytical persistence is mandatory in non-test environment but GOOGLE_CLOUD_PROJECT / credentials are missing.`);
    }
    if (!analyticalInstance) {
      analyticalInstance = new BigQueryAnalyticalPersistence();
    }
    return analyticalInstance;
  }

  throw new Error(`[Persistence] ConfigurationError: Unsupported analytical persistence provider: ${provider}`);
}
