import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const content = readFileSync(resolve(import.meta.dirname, '..', '..', '.env'), 'utf-8');
    for (const line of content.split('\n')) {
      const [key, ...vals] = line.split('=');
      if (key && !key.startsWith('#') && !process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  } catch {}
}
loadEnv();

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://wms:wms@localhost:5432/wms',
  },
});
