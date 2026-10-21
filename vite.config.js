import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
          duckdb: ['@duckdb/duckdb-wasm', 'apache-arrow'],
          xlsx: ['xlsx'],
        },
      },
    },
  },
  optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] },
  test: { environment: 'node' },
});
