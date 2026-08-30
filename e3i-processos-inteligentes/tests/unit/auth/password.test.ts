import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateTestToken } from '../../helpers/auth';

describe('Unit: Authentication & Password Security', () => {
  it('should hash passwords securely with SHA-256', () => {
    const pwd1 = 'secret123';
    const pwd2 = 'secret123';
    const pwd3 = 'other456';

    const hash1 = hashPassword(pwd1);
    const hash2 = hashPassword(pwd2);
    const hash3 = hashPassword(pwd3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('should verify correct passwords and reject incorrect ones', () => {
    const password = 'e3i_secure_pass_2026!';
    const hash = hashPassword(password);

    expect(verifyPassword(hash, password)).toBe(true);
    expect(verifyPassword(hash, 'wrong_password')).toBe(false);
  });

  it('should generate unique test tokens', () => {
    const token1 = generateTestToken('usr-1');
    const token2 = generateTestToken('usr-1');

    expect(token1).toContain('usr-1');
    expect(token1).not.toBe(token2);
  });
});
