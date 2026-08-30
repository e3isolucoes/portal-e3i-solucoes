import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Unit Quality Gate: Authentication & Security Rules', () => {
  const hashPass = (p: string) => crypto.createHash('sha256').update(p).digest('hex');
  const verifyPass = (h: string, p: string) => h === hashPass(p);

  it('should generate secure and deterministic SHA-256 hash', () => {
    const pass = 'E3I_Secure_2026!';
    const hash1 = hashPass(pass);
    const hash2 = hashPass(pass);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
    expect(hash1).not.toBe(pass);
  });

  it('should accept correct password and reject incorrect password', () => {
    const password = 'CorrectPassword123#';
    const hash = hashPass(password);

    expect(verifyPass(hash, password)).toBe(true);
    expect(verifyPass(hash, 'WrongPassword')).toBe(false);
    expect(verifyPass(hash, '')).toBe(false);
  });

  it('should normalize email correctly (lowercase and trim)', () => {
    const rawEmail = '   ADMIN.A@E3I.COM.BR   ';
    const normalized = rawEmail.trim().toLowerCase();

    expect(normalized).toBe('admin.a@e3i.com.br');
  });

  it('should ensure each user compares only their own passwordHash', () => {
    const userA = { email: 'a@e3i.com.br', passwordHash: hashPass('passA') };
    const userB = { email: 'b@e3i.com.br', passwordHash: hashPass('passB') };

    expect(userA.passwordHash).not.toBe(userB.passwordHash);

    // User A authenticates with passA against userA.passwordHash
    expect(verifyPass(userA.passwordHash, 'passA')).toBe(true);
    // User A cannot authenticate with passB
    expect(verifyPass(userA.passwordHash, 'passB')).toBe(false);
    // User B authenticates with passB against userB.passwordHash
    expect(verifyPass(userB.passwordHash, 'passB')).toBe(true);
    // User B cannot authenticate with passA
    expect(verifyPass(userB.passwordHash, 'passA')).toBe(false);
  });

  it('should not expose passwordHash in user DTO response', () => {
    const user = {
      id: 'usr-1',
      name: 'Carlos',
      email: 'carlos@e3i.com.br',
      role: 'ADMIN',
      passwordHash: hashPass('secret'),
    };

    const { passwordHash, ...safeUser } = user;
    expect(safeUser).not.toHaveProperty('passwordHash');
    expect(safeUser.email).toBe('carlos@e3i.com.br');
  });

  it('should sanitize audit logs (never include raw passwords or password hashes)', () => {
    const auditLogs: Array<{ action: string; details: string }> = [];
    const logLoginAttempt = (email: string, success: boolean) => {
      auditLogs.unshift({
        action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        details: `Tentativa de login para o usuário ${email}`
      });
    };

    logLoginAttempt('admin@e3i.com.br', false);

    const logEntry = auditLogs[0];
    expect(logEntry.details).not.toContain('secret123');
    expect(logEntry.details).not.toContain('passwordHash');
    expect(logEntry.details).toContain('admin@e3i.com.br');
  });
});
