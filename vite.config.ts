import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { IncomingMessage, ServerResponse } from 'node:http'
import { getAllSetupNames, getSetup, saveSetup, deleteSetup, getMeta, setMeta } from './server/database'

function bodyParser(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: string) => { data += chunk; });
    req.on('end', () => { resolve(data); });
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function savesApiPlugin(): Plugin {
  return {
    name: 'saves-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/saves')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const path = url.pathname;

        try {
          if (req.method === 'GET' && path === '/api/saves') {
            const names = getAllSetupNames();
            return sendJson(res, 200, { names });
          }

          if (req.method === 'GET' && path === '/api/saves/active') {
            const name = getMeta('activeSetupName');
            return sendJson(res, 200, { name: name || null });
          }

          if (req.method === 'GET' && path.startsWith('/api/saves/')) {
            const name = decodeURIComponent(path.slice('/api/saves/'.length));
            const state = getSetup(name);
            if (state === null) {
              return sendJson(res, 404, { error: `Setup "${name}" not found` });
            }
            return sendJson(res, 200, { name, state });
          }

          if (req.method === 'PUT' && path === '/api/saves/active') {
            const raw = await bodyParser(req);
            const { name } = JSON.parse(raw);
            setMeta('activeSetupName', name || '');
            return sendJson(res, 200, { ok: true });
          }

          if (req.method === 'PUT' && path.startsWith('/api/saves/')) {
            const name = decodeURIComponent(path.slice('/api/saves/'.length));
            const raw = await bodyParser(req);
            let state: string;
            try {
              const parsed = JSON.parse(raw);
              state = typeof parsed.state === 'string' ? parsed.state : raw;
            } catch {
              state = raw;
            }
            saveSetup(name, state);
            return sendJson(res, 200, { ok: true, name });
          }

          if (req.method === 'DELETE' && path.startsWith('/api/saves/')) {
            const name = decodeURIComponent(path.slice('/api/saves/'.length));
            const existed = deleteSetup(name);
            if (!existed) {
              return sendJson(res, 404, { error: `Setup "${name}" not found` });
            }
            return sendJson(res, 200, { ok: true });
          }

          return sendJson(res, 405, { error: 'Method not allowed' });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Internal server error';
          return sendJson(res, 500, { error: message });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), savesApiPlugin()],
  optimizeDeps: {
    include: ["@mui/x-tree-view"]
  },
  server: {
    hmr: {
      overlay: true,
      timeout: 5000
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  }
})
