import { defineConfig } from 'vite';
export default defineConfig({build:{outDir:'dist/client',rollupOptions:{output:{manualChunks:{three:['three']}}}}});
