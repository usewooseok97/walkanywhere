// POST /api/track { kind, session?, prompt?, theme?, speed?, ...data }
// kind: open(목적지 선택) · arrive(도착) · speed(속도 선택) · walk(속도별 걸은 시간) · look(간판 보기) · link(방문) · time(시각 조절) · save
import { getSql, ensureSchema, readJson, send, str } from './_lib/db.js';

const KINDS = new Set(['open', 'arrive', 'speed', 'walk', 'look', 'link', 'time', 'save', 'start']);

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method_not_allowed' }); }
  const body = await readJson(req);
  const kind = str(body.kind, 16);
  if (!KINDS.has(kind)) return send(res, 400, { error: 'bad_kind' });
  const sql = getSql();
  if (!sql) return send(res, 202, { stored: false });
  await ensureSchema(sql);

  const { kind: _k, session, prompt, theme, speed, ...rest } = body;
  const data = JSON.stringify(rest).slice(0, 4000);
  await sql`INSERT INTO events (kind, session, prompt, theme, speed, data)
            VALUES (${kind}, ${str(session, 16) || null}, ${str(prompt, 80) || null}, ${str(theme, 20) || null},
                    ${Number.isInteger(speed) && speed >= 1 && speed <= 5 ? speed : null}, ${data}::jsonb)`;
  return send(res, 202, { stored: true });
}
