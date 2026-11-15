// 관리자 화면: 로그인(admin) → 불편사항 · 사용자(비밀번호 초기화) · 요약 · 비밀번호 바꾸기
import { renderStats } from './statsview.js';
const out = document.getElementById('out');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*._-]{8,64}$/;
let token = sessionStorage.getItem('wa-admin-token') || '';

async function api(path, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, ...j };
}

function renderLogin(msg = '') {
  out.innerHTML = `
    <form class="login" id="f">
      <label>아이디 <input id="id" value="admin" autocomplete="username" /></label>
      <label>비밀번호 <input id="pw" type="password" autocomplete="current-password" /></label>
      <button class="btn btn-ink" type="submit">로그인</button>
      <p class="status ${msg ? 'bad' : ''}" id="st">${esc(msg)}</p>
    </form>`;
  document.getElementById('f').addEventListener('submit', async e => {
    e.preventDefault();
    const st = document.getElementById('st'); st.className = 'status'; st.textContent = '확인 중';
    const j = await api('/api/auth', { action: 'login', id: document.getElementById('id').value.trim(), password: document.getElementById('pw').value });
    if (j.status === 503) { st.className = 'status bad'; st.textContent = 'DB(Neon)가 아직 연결되지 않았습니다. Vercel Storage 에서 연결하면 관리자 계정이 자동으로 만들어집니다.'; return; }
    if (!j.ok) { st.className = 'status bad'; st.textContent = j.message || '로그인하지 못했습니다.'; return; }
    if (j.role !== 'admin') { st.className = 'status bad'; st.textContent = '관리자 계정이 아닙니다.'; return; }
    token = j.token; sessionStorage.setItem('wa-admin-token', token);
    renderAdmin();
  });
}

async function renderAdmin() {
  const [sum, fb, us, st] = await Promise.all([api('/api/admin?what=summary'), api('/api/feedback'), api('/api/admin?what=users'), api('/api/stats')]);
  if (sum.status === 401 || sum.status === 403) { token = ''; sessionStorage.removeItem('wa-admin-token'); return renderLogin('다시 로그인해 주세요.'); }
  const t = sum.summary || {};
  out.innerHTML = `
    <div class="bar"><span>관리자로 로그인됨</span><button class="btn btn-ghost btn-sm" id="logout">로그아웃</button><button class="btn btn-ghost btn-sm" id="reload">새로고침</button></div>
    <div class="totals">
      <div class="total"><b>${t.users ?? 0}</b><span>가입한 사람</span></div>
      <div class="total"><b>${t.walks ?? 0}</b><span>저장된 길</span></div>
      <div class="total"><b>${t.feedback ?? 0}</b><span>불편사항</span></div>
      <div class="total"><b>${t.events ?? 0}</b><span>기록된 사건</span></div>
    </div>
    <nav class="tabs"><a href="#feedback">불편사항</a><a href="#stats">통계</a><a href="#users">사용자</a><a href="#password">비밀번호</a></nav>
    <h2 id="feedback">불편사항</h2>
    ${(fb.feedback || []).length ? `<table><thead><tr><th>언제</th><th>내용</th><th>연락처</th><th>페이지</th></tr></thead><tbody>
      ${fb.feedback.map(f => `<tr><td>${new Date(f.created_at).toLocaleString('ko-KR')}</td><td class="msg">${esc(f.message)}</td><td>${esc(f.contact || '')}</td><td>${esc(f.page || '')}</td></tr>`).join('')}
    </tbody></table>` : '<p class="empty">아직 접수된 불편사항이 없습니다.</p>'}
    <h2 id="stats">통계</h2>
    <div class="stats">${st.ok ? renderStats(st) : `<p class="empty">${esc(st.message || '통계를 불러오지 못했습니다.')}</p>`}</div>
    <h2 id="users">사용자</h2>
    ${(us.users || []).length ? `<table><thead><tr><th>아이디</th><th>닉네임</th><th>역할</th><th>저장한 길</th><th>가입</th><th></th></tr></thead><tbody>
      ${us.users.map(u => `<tr><td>${esc(u.id)}</td><td>${esc(u.nickname)}</td><td>${esc(u.role)}</td><td>${u.walks}</td><td>${new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
        <td>${u.role === 'admin' ? '' : `<button class="btn btn-ghost btn-sm reset" data-id="${esc(u.id)}">비밀번호 초기화</button>`}</td></tr>`).join('')}
    </tbody></table>` : '<p class="empty">아직 가입한 사람이 없습니다.</p>'}
    <p class="status" id="reset-st"></p>
    <h2 id="password">관리자 비밀번호 바꾸기</h2>
    <form class="pw" id="pwf">
      <label>현재 비밀번호 <input id="old" type="password" autocomplete="current-password" /></label>
      <label>새 비밀번호 (영문+숫자 8자 이상) <input id="new" type="password" autocomplete="new-password" /></label>
      <button class="btn btn-ink" type="submit">바꾸기</button>
      <p class="status" id="pw-st"></p>
    </form>`;
  document.getElementById('logout').addEventListener('click', async () => { await api('/api/auth', { action: 'logout' }); token = ''; sessionStorage.removeItem('wa-admin-token'); renderLogin(); });
  document.getElementById('reload').addEventListener('click', renderAdmin);
  out.querySelectorAll('.reset').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.id; if (!confirm(`${id} 의 비밀번호를 임시 비밀번호로 초기화할까요?`)) return;
    const j = await api('/api/auth', { action: 'reset', userId: id });
    const st = document.getElementById('reset-st');
    st.className = 'status ' + (j.ok ? 'ok' : 'bad');
    st.textContent = j.ok ? `${id} 의 임시 비밀번호: ${j.tempPassword}  (본인에게 알려 주고, 로그인 후 바꾸라고 안내하세요)` : (j.message || '초기화하지 못했습니다.');
  }));
  document.getElementById('pwf').addEventListener('submit', async e => {
    e.preventDefault();
    const st = document.getElementById('pw-st'), np = document.getElementById('new').value;
    if (!PW_RE.test(np)) { st.className = 'status bad'; st.textContent = '영문과 숫자를 섞어 8자 이상이어야 합니다.'; return; }
    const j = await api('/api/auth', { action: 'change', oldPassword: document.getElementById('old').value, newPassword: np });
    st.className = 'status ' + (j.ok ? 'ok' : 'bad'); st.textContent = j.ok ? '바꿨습니다.' : (j.message || '바꾸지 못했습니다.');
  });
}

if (token) renderAdmin(); else renderLogin();
