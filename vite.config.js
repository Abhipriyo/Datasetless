import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        embed: resolve(__dirname, 'embed.html'),
      },
      output: {
        manualChunks: {
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
          duckdb: ['@duckdb/duckdb-wasm', 'apache-arrow'],
        },
      },
    },
  },
  optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] },
  test: { environment: 'node' },
});
