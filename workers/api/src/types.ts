import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  JWT_SECRET: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  R2_REGION?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}

export interface AuthUser {
  sub: string;
  username: string;
  role: 'dn' | 'htx';
  dn_id: string;
}

export interface AppVariables {
  user: AuthUser;
}
