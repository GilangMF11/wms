import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue(), tailwindcss(), basicSsl()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@wms/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    https: true,
    proxy: {
      '/api': { target: 'http://localhost:3034', changeOrigin: true },
    },
  },
});
