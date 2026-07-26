import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as schema from './schema';

function loadEnv() {
  try {
    const envPath = resolve(import.meta.dirname, '..', '..', '..', '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && !key.startsWith('#') && !process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {}
}
loadEnv();

const raw = process.env.DATABASE_URL || 'postgresql://wms:wms@localhost:5432/wms';
const url = new URL(raw);
url.searchParams.delete('schema');
url.searchParams.delete('connection_limit');
const databaseUrl = url.toString();

const client = postgres(databaseUrl);

export const db = drizzle(client, { schema });
export { schema };
