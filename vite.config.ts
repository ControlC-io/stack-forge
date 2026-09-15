import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Sub-path the bundle is served from. GitHub Pages serves the site under
  // /stack-forge/ and sets BASE_PATH in its workflow; everywhere else (dev,
  // Coolify on its own domain) it is the root. A wrong value loads a blank page:
  // every asset request 404s.
  base: process.env.BASE_PATH || '/',
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
  test: {
    // Pure logic: catalog integrity, selection rules and generator output.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
