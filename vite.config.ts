import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    {
      // HACK: Removes pure annotations from SignalR: https://github.com/dotnet/aspnetcore/issues/55286
      name: 'remove-pure-annotations',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('node_modules/@microsoft/signalr')) {
          return code.replace(/\/\*#__PURE__\*\//g, '');
        }
        return null;
      }
    }
  ],
  envPrefix: 'APP_',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import', 'global-builtin'] // HACK: milligram is outdated
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          signalr: ['@microsoft/signalr']
        }
      }
    }
  }
});
