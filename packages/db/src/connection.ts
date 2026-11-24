import type { D1Database } from '@cloudflare/workers-types';
import { type DrizzleD1Database, drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';

export type OpenPaddyDb = DrizzleD1Database<typeof schema>;

export function createDb(d1: D1Database): OpenPaddyDb {
  return drizzle(d1, { schema });
}
