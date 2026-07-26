import app from './app';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { join } from 'node:path';

app.use('/uploads/*', serveStatic({ root: join(import.meta.dirname, '..') }));

const port = Number(process.env.PORT) || 3034;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
