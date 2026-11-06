import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'virtual:pwa-register': path.resolve(import.meta.dirname, 'src/test/virtualPwaRegisterStub.ts'),
    },
  },
  test: {
    // Store tests touch localStorage, so they need a DOM-ish environment.
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
