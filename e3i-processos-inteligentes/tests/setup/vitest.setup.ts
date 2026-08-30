import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

if (!process.env.DATABASE_URL?.includes('e3i-prisma-test.db')) {
  throw new Error('DATABASE_URL de testes não está isolada no diretório temporário.');
}
process.env.GEMINI_MODEL_FAST = process.env.GEMINI_MODEL_FAST || 'gemini-2.5-flash';
process.env.GEMINI_MODEL_BALANCED = process.env.GEMINI_MODEL_BALANCED || 'gemini-2.5-flash';

beforeEach(() => {
  vi.clearAllMocks();
});
