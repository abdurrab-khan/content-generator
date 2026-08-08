import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
  plugins: [
    // Decorators + emitDecoratorMetadata support for NestJS
    // F
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
