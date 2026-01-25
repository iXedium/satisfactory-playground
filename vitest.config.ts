/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for browser-like environment
    environment: 'jsdom',
    
    // Global test setup file
    setupFiles: ['./tests/setup.ts'],
    
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,
    
    // Include patterns for test files
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    
    // Exclude patterns
    exclude: ['node_modules', 'dist', 'src/backup/**'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/backup/**',
      ],
    },
    
    // Reporter configuration
    reporters: ['default'],
    
    // Timeout for async tests
    testTimeout: 10000,
    
    // Retry flaky tests
    retry: 0,
    
    // CSS handling - mock CSS modules
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
  
  // Path aliases matching tsconfig.json
  resolve: {
    alias: {
      '@store': path.resolve(__dirname, './src/store'),
      '@features': path.resolve(__dirname, './src/features'),
      '@data': path.resolve(__dirname, './src/data'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
});
