// GET  /api/walks?limit=30            → 최근 저장된 길 (모두)
// GET  /api/walks?user=아이디           → 그 사람이 저장한 길
// POST /api/walks { token, prompt, theme, meters, hour } → 저장 (로그인 필요)
import { getSql, ensureSchema, readJson, send, noDb, str, userFromToken } from './_lib/db.js';

export default async function handler(req, res) {
  const sql = getSql();
  if (!sql) return noDb(res);
  await ensureSchema(sql);

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 30));
    const user = str(url.searchParams.get('user'), 10);
    const rows = user
      ? await sql`SELECT w.id, w.prompt, w.theme, w.meters, w.hour, w.created_at, u.nickname FROM walks w LEFT JOIN users u ON u.id = w.user_id WHERE w.user_id = ${user} ORDER BY w.created_at DESC LIMIT ${limit}`
      : await sql`SELECT w.id, w.prompt, w.theme, w.meters, w.hour, w.created_at, u.nickname FROM walks w LEFT JOIN users u ON u.id = w.user_id ORDER BY w.created_at DESC LIMIT ${limit}`;
    return send(res, 200, { walks: rows });
  }

  if (req.method === 'POST') {
    const body = await readJson(req);
    const me = await userFromToken(sql, req, body);
    if (!me) return send(res, 401, { error: 'not_logged_in', message: '로그인이 필요합니다.' });
    const prompt = str(body.prompt, 80), theme = str(body.theme, 20);
    const meters = Number.isFinite(body.meters) ? Math.max(0, Math.min(100000, Math.round(body.meters))) : null;
    const hour = Number.isFinite(body.hour) ? Math.max(0, Math.min(24, body.hour)) : null;
    if (!prompt) return send(res, 400, { error: 'bad_prompt', message: '문장이 비어 있습니다.' });
    const rows = await sql`
      INSERT INTO walks (user_id, prompt, theme, meters, hour) VALUES (${me.id}, ${prompt}, ${theme || null}, ${meters}, ${hour})
      RETURNING id, prompt, theme, meters, hour, created_at`;
    return send(res, 201, { walk: rows[0] });
  }

  res.setHeader('Allow', 'GET, POST');
  return send(res, 405, { error: 'method_not_allowed' });
}
