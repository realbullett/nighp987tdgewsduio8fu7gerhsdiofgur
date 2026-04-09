
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Derive __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple API route handler plugin for dev server
function apiRoutesPlugin() {
  return {
    name: 'api-routes',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/')) {
          const apiPath = req.url.split('?')[0];
          const modulePath = path.join(__dirname, `${apiPath}.ts`);
          
          try {
            // Convert Windows path to file:// URL
            const fileUrl = new URL(`file:///${modulePath.replace(/\\/g, '/')}`);
            const module = await import(fileUrl.href + '?t=' + Date.now());
            const handler = module.default;
            
            if (handler) {
              await handler(req, res);
              return;
            }
          } catch (error) {
            console.error('API route error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error', message: String(error) }));
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), apiRoutesPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
