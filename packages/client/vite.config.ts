import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@serverless-tour/common': path.resolve(__dirname, '../common/src')
    }
  },
  server: {
    port: 3000,
    open: false
  },
  envDir: '../../'
});
