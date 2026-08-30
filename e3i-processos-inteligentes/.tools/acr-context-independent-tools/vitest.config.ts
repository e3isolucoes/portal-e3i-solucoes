import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { tmpdir } from 'os';
import { rmSync } from 'fs';

const tempRoot = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Temp') : tmpdir();
const testDatabase = path.join(tempRoot, 'e3i-prisma-test.db').replace(/\\/g, '/');
rmSync(testDatabase, { force: true });
rmSync(`${testDatabase}-journal`, { force: true });
process.env.DATABASE_URL = `file:${testDatabase}`;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    setupFiles: './tests/setup/vitest.setup.ts',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
