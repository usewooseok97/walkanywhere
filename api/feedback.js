// POST /api/feedback { message, contact?, page? } → DB 에 저장하고, RESEND_API_KEY 가 있으면 FEEDBACK_TO 로 메일도 보낸다
// GET  /api/feedback?key=ADMIN_KEY                  → 최근 불편사항 (관리자용)
import { getSql, ensureSchema, readJson, send, str } from './_lib/db.js';

const TO = process.env.FEEDBACK_TO || 'kwoos333@naver.com';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    if (!process.env.ADMIN_KEY || url.searchParams.get('key') !== process.env.ADMIN_KEY) return send(res, 403, { error: 'forbidden' });
    const sql = getSql(); if (!sql) return send(res, 503, { error: 'db_not_configured' });
    await ensureSchema(sql);
    const rows = await sql`SELECT id, message, contact, page, created_at FROM feedback ORDER BY created_at DESC LIMIT 100`;
    return send(res, 200, { feedback: rows });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'method_not_allowed' }); }

  const body = await readJson(req);
  const message = str(body.message, 2000), contact = str(body.contact, 120), page = str(body.page, 200);
  if (message.length < 2) return send(res, 400, { error: 'empty', message: '내용을 적어 주세요.' });

  let stored = false, mailed = false;
  const sql = getSql();
  if (sql) { await ensureSchema(sql); await sql`INSERT INTO feedback (message, contact, page) VALUES (${message}, ${contact || null}, ${page || null})`; stored = true; }

  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.FEEDBACK_FROM || 'Walk Anywhere <onboarding@resend.dev>',
          to: [TO],
          subject: '[Walk Anywhere] 불편사항 접수',
          text: `${message}\n\n연락처: ${contact || '(없음)'}\n페이지: ${page || '(없음)'}`,
        }),
      });
      mailed = r.ok;
    } catch { mailed = false; }
  }
  if (!stored && !mailed) return send(res, 503, { error: 'not_configured', message: '아직 접수 창구가 연결되지 않았습니다. 메일로 보내 주세요.', mailto: TO });
  return send(res, 201, { stored, mailed });
}
