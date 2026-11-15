// Neon Postgres 연결 (Vercel Storage → Marketplace → Neon 으로 연결하면 DATABASE_URL 이 자동으로 들어온다)
import { neon } from '@neondatabase/serverless';

let sql = null;
let schemaReady = null;

export function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) return null;
  if (!sql) sql = neon(url);
  return sql;
}

export async function ensureSchema(sql) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        token TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS walks (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        prompt TEXT NOT NULL,
        theme TEXT,
        meters INTEGER,
        hour REAL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        kind TEXT NOT NULL,
        session TEXT,
        prompt TEXT,
        theme TEXT,
        speed SMALLINT,
        data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS events_kind_idx ON events (kind, created_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        contact TEXT,
        page TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    })().catch(e => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) { try { return JSON.parse(req.body); } catch { return {}; } }
  return await new Promise(resolve => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 100000) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export const noDb = (res) => send(res, 503, { error: 'db_not_configured', message: 'DATABASE_URL 이 없습니다. Vercel Storage 에서 Neon 을 연결하세요.' });
export const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
