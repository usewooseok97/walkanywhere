// GET /api/stats (Authorization: Bearer 관리자 토큰) → 사람들이 어디를 걷고 싶어 하는지, 어떤 걸음으로 걷는지, 어떤 간판을 누르는지
import { getSql, ensureSchema, send, noDb, userFromToken } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(res, 405, { error: 'method_not_allowed' }); }
  const sql = getSql();
  if (!sql) return noDb(res);
  await ensureSchema(sql);
  const me = await userFromToken(sql, req);
  if (!me || me.role !== 'admin') return send(res, 403, { error: 'forbidden', message: '관리자만 볼 수 있습니다.' });

  const [themes, prompts, speedPicks, walks, links, totals, hours, saved] = await Promise.all([
    sql`SELECT theme, count(*)::int AS n FROM events WHERE kind = 'open' AND theme IS NOT NULL GROUP BY theme ORDER BY n DESC`,
    sql`SELECT prompt, count(*)::int AS n FROM events WHERE kind = 'open' AND prompt IS NOT NULL GROUP BY prompt ORDER BY n DESC LIMIT 15`,
    sql`SELECT speed, count(*)::int AS n FROM events WHERE kind = 'speed' AND speed IS NOT NULL GROUP BY speed ORDER BY speed`,
    sql`SELECT data FROM events WHERE kind = 'walk' ORDER BY created_at DESC LIMIT 3000`,
    sql`SELECT data->>'name' AS name, data->>'url' AS url, count(*)::int AS n FROM events WHERE kind = 'link' GROUP BY 1, 2 ORDER BY n DESC LIMIT 15`,
    sql`SELECT
          (SELECT count(*)::int FROM events WHERE kind = 'open') AS opens,
          (SELECT count(*)::int FROM events WHERE kind = 'arrive') AS arrivals,
          (SELECT count(DISTINCT session)::int FROM events) AS sessions,
          (SELECT count(*)::int FROM walks) AS saved,
          (SELECT count(*)::int FROM users) AS users,
          (SELECT coalesce(sum((data->>'meters')::int), 0)::bigint FROM events WHERE kind = 'walk') AS meters`,
    sql`SELECT floor(((data->>'hour')::numeric)) AS hour, count(*)::int AS n FROM events WHERE kind = 'time' AND data ? 'hour' GROUP BY 1 ORDER BY 1`,
    sql`SELECT w.prompt, w.theme, w.meters, w.created_at, u.nickname FROM walks w LEFT JOIN users u ON u.id = w.user_id ORDER BY w.created_at DESC LIMIT 10`,
  ]);

  // 속도별 걸은 시간 합계 (초)
  const speedSeconds = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of walks) {
    const s = row.data?.speeds; if (!s) continue;
    for (const k of Object.keys(speedSeconds)) speedSeconds[k] += Number(s[k]) || 0;
  }

  return send(res, 200, {
    totals: totals[0],
    themes, prompts,
    speeds: { picks: speedPicks, seconds: speedSeconds },
    links, hours, saved,
    generatedAt: new Date().toISOString(),
  });
}
