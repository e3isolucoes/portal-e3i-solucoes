import crypto from 'crypto';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(hash: string, password: string): boolean {
  return hash === hashPassword(password);
}

export function generateTestToken(userId: string): string {
  return `test_token_${userId}_${Math.random().toString(36).substring(2)}`;
}
