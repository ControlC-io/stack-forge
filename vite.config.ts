import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: true,
    port: 5173,
    // Vite 5.3+ rejects requests whose Host header it does not know. Behind an
    // nginx/Traefik proxy the Host is the service name, which would 403.
    allowedHosts: true,
  },
});
