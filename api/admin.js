// GET /api/admin?what=users|summary  (Authorization: Bearer 관리자 토큰)
import { getSql, ensureSchema, send, noDb, userFromToken } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { error: 'method_not_allowed' }); }
  const sql = getSql();
  if (!sql) return noDb(res);
  await ensureSchema(sql);
  const me = await userFromToken(sql, req);
  if (!me || me.role !== 'admin') return send(res, 403, { error: 'forbidden', message: '관리자만 볼 수 있습니다.' });

  const url = new URL(req.url, 'http://x');
  const what = url.searchParams.get('what') || 'summary';
  if (what === 'users') {
    const rows = await sql`SELECT u.id, u.nickname, u.role, u.created_at, (SELECT count(*)::int FROM walks w WHERE w.user_id = u.id) AS walks FROM users u ORDER BY u.created_at DESC LIMIT 500`;
    return send(res, 200, { users: rows });
  }
  const [t] = await sql`SELECT
      (SELECT count(*)::int FROM users WHERE role = 'user') AS users,
      (SELECT count(*)::int FROM walks) AS walks,
      (SELECT count(*)::int FROM feedback) AS feedback,
      (SELECT count(*)::int FROM events) AS events`;
  return send(res, 200, { summary: t, me });
}
