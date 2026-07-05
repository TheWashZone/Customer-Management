import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.js',
    test: {
      name: 'node',
      environment: 'node',
      include: ['src/tests/firebase-*.test.js', 'src/tests/excel-upload.test.js'],
      setupFiles: ['./vitest.setup.node.js'],
      globals: true,
    },
  },
  {
    extends: './vitest.config.js',
    test: {
      name: 'jsdom',
      environment: 'jsdom',
      include: ['src/**/*.test.{jsx,tsx}'],
      setupFiles: ['./vitest.setup.jsdom.js'],
      globals: true,
    },
  },
]);
