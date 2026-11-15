// GET  /api/users?check=아이디                     → { available }
// POST /api/users { id, password, nickname }       → 가입 { id, nickname, token }
//   아이디 2~10자(한글·영문·숫자·_.-), 비밀번호 영문+숫자 8자 이상, 중복 불가
import { getSql, ensureSchema, readJson, send, noDb, str, ID_RE, PW_RE, hashPassword, newToken } from './_lib/db.js';

export default async function handler(req, res) {
  const sql = getSql();
  if (!sql) return noDb(res);
  await ensureSchema(sql);

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    const id = str(url.searchParams.get('check'), 10);
    if (!ID_RE.test(id)) return send(res, 200, { available: false, reason: 'format' });
    const rows = await sql`SELECT 1 FROM users WHERE id = ${id}`;
    return send(res, 200, { available: rows.length === 0 });
  }

  if (req.method === 'POST') {
    const body = await readJson(req);
    const id = str(body.id, 10), nickname = str(body.nickname, 20), password = typeof body.password === 'string' ? body.password : '';
    if (!ID_RE.test(id)) return send(res, 400, { error: 'bad_id', message: '아이디는 2~10자, 한글·영문·숫자·_.- 만 쓸 수 있습니다.' });
    if (!PW_RE.test(password)) return send(res, 400, { error: 'bad_password', message: '비밀번호는 영문과 숫자를 섞어 8자 이상이어야 합니다.' });
    if (nickname.length < 1) return send(res, 400, { error: 'bad_nickname', message: '닉네임을 입력해 주세요.' });
    const token = newToken();
    try {
      await sql`INSERT INTO users (id, nickname, token, password_hash) VALUES (${id}, ${nickname}, ${token}, ${hashPassword(password)})`;
    } catch (e) {
      if (String(e.message).includes('duplicate') || e.code === '23505') return send(res, 409, { error: 'taken', message: '이미 쓰고 있는 아이디입니다.' });
      throw e;
    }
    return send(res, 201, { id, nickname, token, role: 'user' });
  }

  res.setHeader('Allow', 'GET, POST');
  return send(res, 405, { error: 'method_not_allowed' });
}
