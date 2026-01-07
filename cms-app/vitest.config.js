import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/api/**/*.js', 'src/context/MembersContext.jsx'],
      exclude: ['src/api/firebaseconfig.js', 'node_modules/'],
    },
    testTimeout: 30000, // Increased timeout for CI environment
    // Run test files sequentially to avoid overwhelming Firebase emulator
    fileParallelism: false,
    // Ensure tests within a file also run sequentially for Firebase operations
    sequence: {
      shuffle: false,
    },
    // Retry flaky tests (helpful for Firebase emulator timing issues)
    retry: process.env.CI ? 1 : 0,
  },
});
