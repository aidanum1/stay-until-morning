import { defineConfig, type Plugin } from 'vite';
import { join } from 'node:path';

/** Recompile story + locales whenever a .s25 or locale source changes (dev), and once before build. */
function storyPlugin(): Plugin {
  let building = false;
  const rebuild = async () => {
    if (building) return;
    building = true;
    try {
      const { buildLocales } = await import('./tools/locales-lib');
      buildLocales({ quiet: true });
    } catch (e) {
      console.error('[story]', (e as Error).message);
    } finally {
      building = false;
    }
  };
  return {
    name: 's25-story',
    async buildStart() {
      await rebuild();
    },
    configureServer(server) {
      server.watcher.add([join(__dirname, 'story'), join(__dirname, 'locales/src')]);
      server.watcher.on('change', (file) => {
        if (file.endsWith('.s25') || (file.includes('locales/src') && file.endsWith('.json'))) void rebuild();
      });
    },
  };
}

export default defineConfig({
  // relative base so the build works on GitHub Pages sub-paths and any static host
  base: './',
  plugins: [storyPlugin()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
  },
  server: { host: true, port: 5173 },
  preview: { port: 4173 },
});
