// POST /api/auth { action, ... }
//   login  { id, password }                 → { id, nickname, role, token }
//   me     { token }                         → { id, nickname, role }
//   logout { token }
//   change { token, oldPassword, newPassword }
//   reset  { token(관리자), userId }          → { tempPassword }   관리자가 다른 사용자의 비밀번호를 임시 비밀번호로 초기화
import { getSql, ensureSchema, readJson, send, noDb, str, PW_RE, hashPassword, verifyPassword, newToken, userFromToken } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method_not_allowed' }); }
  const sql = getSql();
  if (!sql) return noDb(res);
  await ensureSchema(sql);
  const body = await readJson(req);
  const action = str(body.action, 16);

  if (action === 'login') {
    const id = str(body.id, 10), password = typeof body.password === 'string' ? body.password : '';
    const rows = await sql`SELECT id, nickname, role, password_hash FROM users WHERE id = ${id}`;
    const u = rows[0];
    if (!u || !verifyPassword(password, u.password_hash)) return send(res, 401, { error: 'bad_login', message: '아이디 또는 비밀번호가 맞지 않습니다.' });
    const token = newToken();
    await sql`UPDATE users SET token = ${token} WHERE id = ${id}`;
    return send(res, 200, { id: u.id, nickname: u.nickname, role: u.role, token });
  }

  const me = await userFromToken(sql, req, body);
  if (!me) return send(res, 401, { error: 'not_logged_in', message: '다시 로그인해 주세요.' });

  if (action === 'me') return send(res, 200, { id: me.id, nickname: me.nickname, role: me.role });

  if (action === 'logout') {
    await sql`UPDATE users SET token = ${newToken()} WHERE id = ${me.id}`;
    return send(res, 200, { ok: true });
  }

  if (action === 'change') {
    const oldPw = typeof body.oldPassword === 'string' ? body.oldPassword : '', newPw = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (!PW_RE.test(newPw)) return send(res, 400, { error: 'bad_password', message: '새 비밀번호는 영문과 숫자를 섞어 8자 이상이어야 합니다.' });
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${me.id}`;
    if (!verifyPassword(oldPw, rows[0]?.password_hash)) return send(res, 401, { error: 'bad_old', message: '현재 비밀번호가 맞지 않습니다.' });
    await sql`UPDATE users SET password_hash = ${hashPassword(newPw)} WHERE id = ${me.id}`;
    return send(res, 200, { ok: true });
  }

  if (action === 'reset') {
    if (me.role !== 'admin') return send(res, 403, { error: 'forbidden', message: '관리자만 할 수 있습니다.' });
    const userId = str(body.userId, 10);
    const rows = await sql`SELECT id FROM users WHERE id = ${userId}`;
    if (!rows.length) return send(res, 404, { error: 'no_user', message: '그런 아이디가 없습니다.' });
    const temp = 'walk' + Math.floor(1000 + Math.random() * 9000) + 'a';
    await sql`UPDATE users SET password_hash = ${hashPassword(temp)}, token = ${newToken()} WHERE id = ${userId}`;
    return send(res, 200, { ok: true, tempPassword: temp });
  }

  return send(res, 400, { error: 'bad_action' });
}
