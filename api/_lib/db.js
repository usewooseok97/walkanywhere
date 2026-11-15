// Neon Postgres 연결 (Vercel Storage → Marketplace → Neon 으로 연결하면 DATABASE_URL 이 자동으로 들어온다)
import { neon } from '@neondatabase/serverless';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

let sql = null;
let schemaReady = null;

export const ID_RE = /^[0-9A-Za-z가-힣_.-]{2,10}$/;
export const PW_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*._-]{8,64}$/; // 영문 + 숫자 포함 8자 이상
export const INITIAL_ADMIN_PASSWORD = 'admin1234';

export function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) return null;
  if (!sql) sql = neon(url);
  return sql;
}

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(pw, salt, 64).toString('hex');
}
export function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex'), b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const newToken = () => randomBytes(24).toString('base64url');

export async function ensureSchema(sql) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        token TEXT NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`;
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
      // 관리자 계정: admin / admin1234 (처음 한 번만 만들어진다)
      await sql`INSERT INTO users (id, nickname, token, password_hash, role)
                VALUES ('admin', '관리자', ${newToken()}, ${hashPassword(INITIAL_ADMIN_PASSWORD)}, 'admin')
                ON CONFLICT (id) DO NOTHING`;
    })().catch(e => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

// 토큰으로 사용자 찾기 (Authorization: Bearer … 또는 body.token)
export async function userFromToken(sql, req, body = {}) {
  const auth = req.headers?.authorization || '';
  const token = (auth.startsWith('Bearer ') ? auth.slice(7) : '') || str(body.token, 80);
  if (!token) return null;
  const rows = await sql`SELECT id, nickname, role FROM users WHERE token = ${token}`;
  return rows[0] || null;
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
