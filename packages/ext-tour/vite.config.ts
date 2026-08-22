import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@serverless-tour/common': path.resolve(__dirname, '../common/src')
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'popup.html'),
        serviceWorker: path.resolve(__dirname, 'src/background/serviceWorker.ts'),
        contentScript: path.resolve(__dirname, 'src/content/recorder.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  envDir: '../../'
});
