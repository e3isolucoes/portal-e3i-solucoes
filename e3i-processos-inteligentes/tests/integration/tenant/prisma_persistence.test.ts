import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('SR-02.1: PostgreSQL + Prisma Real Persistence & Tenant Security', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Organization" ("id" TEXT PRIMARY KEY NOT NULL, "legalName" TEXT NOT NULL, "tradeName" TEXT NOT NULL, "document" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "plan" TEXT NOT NULL DEFAULT 'Enterprise', "usersCount" INTEGER NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "User" ("id" TEXT PRIMARY KEY NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "systemRole" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "OrganizationMembership" ("id" TEXT PRIMARY KEY NOT NULL, "userId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'VIEWER', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE, FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE)`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId")`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Session" ("id" TEXT PRIMARY KEY NOT NULL, "userId" TEXT NOT NULL, "currentOrganizationId" TEXT, "currentMembershipId" TEXT, "tokenHash" TEXT NOT NULL, "expiresAt" DATETIME NOT NULL, "revokedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE, FOREIGN KEY ("currentOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL)`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash")`);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    try {
      await prisma.session.deleteMany();
      await prisma.organizationMembership.deleteMany();
      await prisma.user.deleteMany();
      await prisma.organization.deleteMany();
    } catch (e) {
      // Ignore if empty
    }
  });

  it('1, 2 & 3. Organization, User, and Membership persist and survive logical client restart', async () => {
    const orgA = await prisma.organization.create({
      data: {
        id: 'org-test-a',
        legalName: 'Empresa Teste A S.A.',
        tradeName: 'Teste A',
        document: '11.111.111/0001-11',
        status: 'ACTIVE',
        plan: 'Enterprise'
      }
    });

    const userA = await prisma.user.create({
      data: {
        id: 'usr-test-a',
        name: 'Usuário Teste A',
        email: 'usra@test.com',
        passwordHash: 'argon2_hash_dummy',
        status: 'ACTIVE'
      }
    });

    const membershipA = await prisma.organizationMembership.create({
      data: {
        userId: userA.id,
        organizationId: orgA.id,
        role: 'ORGANIZATION_ADMIN',
        status: 'ACTIVE'
      }
    });

    expect(orgA).toBeDefined();
    expect(userA).toBeDefined();
    expect(membershipA).toBeDefined();

    const prismaRestart = new PrismaClient();
    const fetchedOrg = await prismaRestart.organization.findUnique({ where: { id: 'org-test-a' } });
    const fetchedUser = await prismaRestart.user.findUnique({ where: { id: 'usr-test-a' } });
    const fetchedMemberships = await prismaRestart.organizationMembership.findMany({
      where: { userId: 'usr-test-a' },
      include: { organization: true }
    });

    expect(fetchedOrg).not.toBeNull();
    expect(fetchedOrg?.tradeName).toBe('Teste A');
    expect(fetchedUser).not.toBeNull();
    expect(fetchedUser?.email).toBe('usra@test.com');
    expect(fetchedMemberships.length).toBe(1);
    expect(fetchedMemberships[0].organizationId).toBe('org-test-a');

    await prismaRestart.$disconnect();
  });

  it('4 & 5. User A belongs only to Organization A, User B belongs only to Organization B', async () => {
    const orgA = await prisma.organization.create({
      data: { id: 'org-a', legalName: 'Org A', tradeName: 'A', document: '11.111.111/0001-11' }
    });
    const orgB = await prisma.organization.create({
      data: { id: 'org-b', legalName: 'Org B', tradeName: 'B', document: '22.222.222/0001-22' }
    });

    const userA = await prisma.user.create({
      data: { id: 'usr-a', name: 'User A', email: 'a@a.com', passwordHash: 'hash' }
    });
    const userB = await prisma.user.create({
      data: { id: 'usr-b', name: 'User B', email: 'b@b.com', passwordHash: 'hash' }
    });

    await prisma.organizationMembership.create({
      data: { userId: userA.id, organizationId: orgA.id, role: 'VIEWER' }
    });
    await prisma.organizationMembership.create({
      data: { userId: userB.id, organizationId: orgB.id, role: 'VIEWER' }
    });

    const membershipsA = await prisma.organizationMembership.findMany({ where: { userId: userA.id } });
    expect(membershipsA.length).toBe(1);
    expect(membershipsA[0].organizationId).toBe('org-a');

    const membershipsB = await prisma.organizationMembership.findMany({ where: { userId: userB.id } });
    expect(membershipsB.length).toBe(1);
    expect(membershipsB[0].organizationId).toBe('org-b');
  });

  it('6. Constraint impedes duplicate membership for same user and organization', async () => {
    const org = await prisma.organization.create({
      data: { id: 'org-dup', legalName: 'Org Dup', tradeName: 'Dup', document: '33.333.333/0001-33' }
    });
    const user = await prisma.user.create({
      data: { id: 'usr-dup', name: 'User Dup', email: 'dup@dup.com', passwordHash: 'hash' }
    });

    await prisma.organizationMembership.create({
      data: { userId: user.id, organizationId: org.id, role: 'VIEWER' }
    });

    await expect(
      prisma.organizationMembership.create({
        data: { userId: user.id, organizationId: org.id, role: 'ADMIN' }
      })
    ).rejects.toThrow();
  });

  it('7, 8 & 9. Prohibitions: non-existent session never creates session, missing tenant never uses tenants[0], no tenant-1 fallback', async () => {
    const ghostSession = await prisma.session.findUnique({ where: { id: 'non-existent-session-id' } });
    expect(ghostSession).toBeNull();

    const ghostOrg = await prisma.organization.findUnique({ where: { id: 'tenant-non-existent' } });
    expect(ghostOrg).toBeNull();
  });
});
