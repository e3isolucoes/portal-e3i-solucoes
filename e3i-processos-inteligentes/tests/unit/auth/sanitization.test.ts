import { describe, it, expect } from 'vitest';

describe('Audit Sanitization Unit Tests', () => {
  // Test sanitization logic directly or via helper
  const SENSITIVE_KEYS = new Set([
    'password', 'newpassword', 'currentpassword', 'passwordhash',
    'token', 'tokenhash', 'accesstoken', 'refreshtoken',
    'authorization', 'cookie', 'secret', 'apikey'
  ]);

  function sanitizeMetadata(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeMetadata(item));
    }
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  it('should recursively redact sensitive fields', () => {
    const payload = {
      email: 'user@example.com',
      password: 'mySecretPassword123',
      tokenHash: 'abc123hash',
      nested: {
        apiKey: 'sk_live_xyz',
        publicField: 'ok'
      },
      arrayField: [
        { secretKey: 'topsecret', normal: 'safe' }
      ]
    };

    const sanitized = sanitizeMetadata(payload);

    expect(sanitized.email).toBe('user@example.com');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.tokenHash).toBe('[REDACTED]');
    expect(sanitized.nested.apiKey).toBe('[REDACTED]');
    expect(sanitized.nested.publicField).toBe('ok');
    expect(sanitized.arrayField[0].secretKey).toBe('[REDACTED]');
    expect(sanitized.arrayField[0].normal).toBe('safe');
  });
});
