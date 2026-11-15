// Walk Anywhere — 메인 화면 흐름
// 들어오면 바로 들판 길을 걷는다 → 걷다 보면 "오늘은 어디로 가볼까?" 가 떠오른다 → 고르거나 적는다 → "거기로 가자." →
// 안개 너머 목적지 세계 → 도착 → 저장할지 묻기(가입 또는 로그인) → 다시 처음 길로.

import { Ambience } from './audio.js';
import { track, SpeedMeter } from './track.js';
import { wireControls } from './controls.js';
import { LANDMARKS, randomLandmarkPrompt } from './landmarks.js';

const $ = (s, el = document) => el.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ID_RE = /^[0-9A-Za-z가-힣_.-]{2,10}$/;
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*._-]{8,64}$/;

const TRAILHEAD = '맑은 낮의 들판 풀길';
const SCENES = [
  '노을 지는 제주 해변', '비 내린 밤의 네온 골목', '눈 덮인 자작나무 숲', '안개 낀 아침의 숲길',
  '1990년대 옛 동네 골목 시장', '붉은 모래의 화성 평원', '별이 쏟아지는 사막의 밤', '해 질 녘 강남 빌딩 숲',
  '이른 아침 한옥 마을', '한낮의 제주 해안 산책로', '겨울 밤 눈 내리는 시골 마을', '봄날 오후의 들판',
  '달빛 아래 설원', '아침 안개 속 대나무 숲', '장마철 저녁의 도쿄 거리', '정오의 사막 오아시스 길',
  '노을 지는 옛 항구 마을', '한밤의 홍대 거리', '새벽 바닷가 산책로', '가을 저녁 숲속 오솔길', '계곡 물소리 따라 걷는 숲길',
];
const QUESTIONS = ['오늘은 어디로 가볼까?', '다른 곳을 가볼까?', '이번엔 어디가 좋을까?', '문득, 가고 싶은 곳이 있다면.'];

const stage = $('#stage'), canvas = $('#walk-canvas'), story = $('#story'), hudPlace = $('#hud-place');
const els = {
  btnWalk: $('#btn-walk'), walkLabel: $('#btn-walk .walk-label'),
  speedBtns: [...document.querySelectorAll('.speed-btn')],
  timeRange: $('#time-range'), timeLabel: $('#time-label'),
  btnMute: $('#btn-mute'), btnFull: $('#btn-full'),
  distance: $('#distance'), progress: $('#progress'),
  tooltip: $('#tooltip'),
  card: $('#place-card'), cardTitle: $('#card-title'), cardDesc: $('#card-desc'), cardUrl: $('#card-url'), cardTag: $('#card-tag'),
  cardVisit: $('#card-visit'), cardClose: $('#card-close'),
};

let W = null;
let world = null, controls = null;
const audio = new Ambience();
const meter = new SpeedMeter();
let mode = 'boot';
let current = { prompt: TRAILHEAD, startedAt: performance.now() };
let savedWalks = [], myWalks = [];
let user = readUser();

function readUser() { try { return JSON.parse(localStorage.getItem('wa-user') || 'null'); } catch { return null; } }
function writeUser(u) { if (u) localStorage.setItem('wa-user', JSON.stringify(u)); else localStorage.removeItem('wa-user'); user = u; }
const authHeaders = () => (user?.token ? { Authorization: `Bearer ${user.token}` } : {});
async function api(path, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, ...j };
}

// ---------- 시작 ----------
async function boot() {
  try { W = await import('./world.js'); }
  catch { return bootError('3D 라이브러리를 불러올 수 없습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.'); }
  try {
    world = new W.World(canvas, stage, { onStep: (side, strength, surface) => audio.step(side, strength, surface), onArrive });
  } catch { return bootError('이 브라우저에서는 WebGL 을 사용할 수 없습니다. 최신 Chrome, Edge, Safari 에서 열어 주세요.'); }
  controls = wireControls({ world, canvas, root: stage, audio, els });
  addEventListener('keydown', e => {
    if (e.code === 'Enter' && mode === 'ask' && !['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) { e.preventDefault(); $('#chat-input')?.focus(); }
  });
  startTrailhead(true);
  $('#boot').classList.add('is-done');
  track('start');
  fetchSaved();
  if (user) refreshMe();
  wireFeedback();
  (function loop() { requestAnimationFrame(loop); if (world?.active) meter.tick(world); })();
  addEventListener('pagehide', () => meter.flush({ prompt: current.prompt, theme: world?.theme?.key }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) meter.flush({ prompt: current.prompt, theme: world?.theme?.key }); });
  setTimeout(() => $('.hint')?.classList.add('is-faded'), 14000);
}
function bootError(msg) { $('#boot-text').textContent = '길을 열지 못했습니다'; const e = $('#boot-err'); e.hidden = false; e.textContent = msg; }

function startTrailhead(first = false) {
  world.fogBoost = 0;
  world.build(TRAILHEAD, { trailhead: true });
  controls.setSpeed(2, { silent: true });
  controls.setWalking(true);
  current = { prompt: TRAILHEAD, startedAt: performance.now() };
  setPlace();
  audio.setTheme(world.theme, first);
  mode = 'ask';
  // 걷기 시작하고 잠시 뒤에 생각이 떠오른다
  story.hidden = true;
  const delay = first ? 2600 : 1800;
  setTimeout(() => { if (mode === 'ask') renderAsk(first ? QUESTIONS[0] : QUESTIONS[1 + Math.floor(Math.random() * (QUESTIONS.length - 1))]); }, reduceMotion ? 200 : delay);
}

function setPlace() {
  const t = world.theme;
  hudPlace.innerHTML = `「${esc(current.prompt)}」 <span class="hud-tags">${esc([t.name, ...t.tags].join(', '))}</span>`;
}

// ---------- 떠오르는 생각: 어디로 가볼까 ----------
function describe(prompt) {
  const t = W.interpret(prompt);
  const head = t.landmark ? `${t.landmark.country}, ` : `${t.name}, `;
  return `${head}${W.hourLabel(t.startHour)}${t.rain ? ', 비' : ''}${t.fog ? ', 안개' : ''}`;
}
function pickChoices() {
  const avoid = new Set([current.prompt]);
  const scenes = SCENES.filter(p => !avoid.has(p)).sort(() => Math.random() - 0.5);
  const lmk = randomLandmarkPrompt();
  // 한 장면 + 한 랜드마크. 가끔은 둘 다 랜드마크, 가끔은 누군가 저장한 길.
  const out = Math.random() < 0.25 ? [{ prompt: lmk.prompt }, { prompt: randomLandmarkPrompt().prompt }] : [{ prompt: scenes[0] }, { prompt: lmk.prompt }];
  if (out[0].prompt === out[1].prompt) out[1] = { prompt: scenes[1] };
  const saved = savedWalks.filter(w => w.prompt && !avoid.has(w.prompt) && !SCENES.includes(w.prompt));
  if (saved.length && Math.random() < 0.3) { const s = saved[Math.floor(Math.random() * saved.length)]; out[Math.floor(Math.random() * 2)] = { prompt: s.prompt, by: s.nickname || '누군가' }; }
  return out;
}
function renderAsk(title) {
  const choices = pickChoices();
  story.hidden = false;
  story.className = 'story-card is-thought';
  story.innerHTML = `
    <h2 class="thought">${esc(title)}</h2>
    <ul class="choices">
      ${choices.map((c, i) => `<li style="--i:${i}"><button type="button" class="choice" data-i="${i}">
        <strong>${esc(c.prompt)}</strong>
        <small>${c.by ? esc(c.by) + '님이 저장한 길, ' : ''}${esc(describe(c.prompt))}</small>
      </button></li>`).join('')}
    </ul>
    <form class="chat" id="chat-form" autocomplete="off" style="--i:2">
      <label class="visually-hidden" for="chat-input">가고 싶은 곳을 한 문장으로</label>
      <input id="chat-input" type="text" maxlength="80" placeholder="아니면… 예) 비 오는 저녁 부산 자갈치 시장, 에펠탑" />
      <button type="submit" class="btn btn-lamp">가자</button>
    </form>
    <div class="card-foot" style="--i:3">
      <button type="button" class="linklike" id="shuffle">다른 곳을 가볼까?</button>
      <span class="sub" id="account-line"></span>
    </div>
    <div id="mine" style="--i:4"></div>`;
  story.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => { const c = choices[Number(b.dataset.i)]; go(c.prompt, c.by ? 'saved' : (LANDMARKS.some(l => c.prompt.includes(l.title)) ? 'landmark' : 'choice')); }));
  $('#chat-form').addEventListener('submit', e => { e.preventDefault(); const v = $('#chat-input').value.trim(); if (v) go(v, 'chat'); });
  $('#shuffle').addEventListener('click', () => renderAsk(QUESTIONS[1 + Math.floor(Math.random() * (QUESTIONS.length - 1))]));
  renderAccountLine();
}
function renderAccountLine() {
  const line = $('#account-line'), mine = $('#mine');
  if (!line) return;
  if (!user) {
    line.innerHTML = `<button type="button" class="linklike" id="login-link">로그인</button>`;
    $('#login-link').addEventListener('click', () => renderAuth('login', { back: true }));
    mine.innerHTML = ''; return;
  }
  line.innerHTML = `${esc(user.nickname)}님 <button type="button" class="linklike" id="pw-link">비밀번호</button> <button type="button" class="linklike" id="logout-link">로그아웃</button>`;
  $('#pw-link').addEventListener('click', () => renderPasswordChange());
  $('#logout-link').addEventListener('click', async () => { try { await api('/api/auth', { action: 'logout' }); } catch {} writeUser(null); myWalks = []; renderAccountLine(); });
  if (!myWalks.length) { mine.innerHTML = ''; return; }
  mine.innerHTML = `<p class="mine-title">내가 저장한 길</p><ul class="mine-list">${myWalks.slice(0, 4).map((w, i) => `<li><button type="button" class="mine-item" data-i="${i}"><span>${esc(w.prompt)}</span><small>${w.meters ?? ''} m</small></button></li>`).join('')}</ul>`;
  mine.querySelectorAll('.mine-item').forEach(b => b.addEventListener('click', () => go(myWalks[Number(b.dataset.i)].prompt, 'mine')));
}
async function refreshMe() {
  try {
    const me = await api('/api/auth', { action: 'me' });
    if (me.status === 401) { writeUser(null); }
    else if (me.ok) {
      writeUser({ ...user, nickname: me.nickname, role: me.role });
      const r = await api(`/api/walks?user=${encodeURIComponent(user.id)}&limit=12`);
      if (r.ok) myWalks = r.walks || [];
    }
  } catch {}
  renderAccountLine();
}

// ---------- 거기로 가자 ----------
async function go(prompt, source) {
  if (mode === 'going') return;
  mode = 'going';
  controls.clearFocus();
  const theme = W.interpret(prompt);
  track('open', { prompt, theme: theme.key, source, hour: theme.startHour, landmark: theme.landmark?.id });
  meter.flush({ prompt: current.prompt, theme: world.theme?.key });

  story.hidden = false;
  story.className = 'story-card';
  story.innerHTML = `
    <h2>거기로 가자.</h2>
    <p>「${esc(prompt)}」 <span class="sub">${esc(describe(prompt))}</span></p>
    <ol class="steps-live" id="steps">
      <li>문장을 읽는 중</li>
      <li>그곳의 지형을 빚는 중</li>
      <li>빛과 날씨를 맞추는 중</li>
      <li>산책로를 잇는 중</li>
    </ol>`;
  const steps = [...$('#steps').children];
  const on = i => { steps.forEach((li, k) => li.className = k < i ? 'is-done' : k === i ? 'is-on' : ''); };
  const wasWalking = world.walking || true;

  on(0); await sleep(reduceMotion ? 100 : 600);
  on(1); await fogTo(0.11, reduceMotion ? 50 : 1300);
  on(2);
  const trip = 280 + (W.hashString(prompt) % 141);
  world.build(prompt, { trip });
  world.fogBoost = 0.11; world.applyTime();
  current = { prompt, startedAt: performance.now() };
  setPlace();
  audio.setTheme(world.theme);
  if (world.speedLevel < 3) controls.setSpeed(3, { silent: true });
  controls.setWalking(wasWalking);
  await sleep(reduceMotion ? 50 : 500);
  on(3); await fogTo(0, reduceMotion ? 50 : 1600);
  steps.forEach(li => li.className = 'is-done');
  mode = 'trip';
  story.innerHTML = `<h2>${esc(world.theme.destName)}까지 ${Math.round(trip)} m</h2><p class="sub">길가의 간판이 달린 건물을 클릭하면 어떤 곳인지 알려 줍니다. 다시 클릭하면 새 탭에서 열립니다.</p>`;
  setTimeout(() => { if (mode === 'trip') story.hidden = true; }, 6000);
}
function fogTo(target, ms) {
  return new Promise(resolve => {
    const from = world.fogBoost || 0, t0 = performance.now();
    (function step() {
      const k = Math.min(1, (performance.now() - t0) / ms);
      world.fogBoost = from + (target - from) * (k * k * (3 - 2 * k));
      if (k < 1) requestAnimationFrame(step); else resolve();
    })();
  });
}

// ---------- 도착 ----------
function onArrive(w) {
  mode = 'arrived';
  controls.unlock();
  controls.setWalking(false);
  const seconds = Math.round((performance.now() - current.startedAt) / 1000);
  meter.flush({ prompt: current.prompt, theme: w.theme.key });
  track('arrive', { prompt: current.prompt, theme: w.theme.key, meters: Math.round(w.dist), seconds, landmark: w.theme.landmark?.id });
  story.hidden = false;
  story.className = 'story-card';
  story.innerHTML = `
    <h2>목적지에 도착했다.</h2>
    <p>「${esc(current.prompt)}」의 ${esc(w.theme.destName)} 앞. ${Math.round(w.dist)} m 를 걸어 왔습니다.</p>
    <p class="sub">이 길을 저장하면 내가 저장한 길에서 다시 갈 수 있고, 다른 사람의 선택지에도 가끔 나타납니다.</p>
    <div class="btn-row">
      <button type="button" class="btn btn-lamp" id="save-yes">이 길 저장하기</button>
      <button type="button" class="btn btn-ghost" id="save-no">저장하지 않고 처음으로</button>
    </div>`;
  $('#save-yes').addEventListener('click', () => (user ? saveWalk() : renderAuth('register')));
  $('#save-no').addEventListener('click', () => startTrailhead());
}

// ---------- 가입 / 로그인 ----------
function renderAuth(tab = 'register', { back = false } = {}) {
  mode = 'auth';
  story.hidden = false; story.className = 'story-card';
  const isReg = tab === 'register';
  story.innerHTML = `
    <div class="tabs">
      <button type="button" class="tab ${isReg ? 'is-on' : ''}" data-tab="register">처음이에요</button>
      <button type="button" class="tab ${!isReg ? 'is-on' : ''}" data-tab="login">아이디가 있어요</button>
    </div>
    <h2>${isReg ? '처음 저장할 때 한 번만 이름을 남겨요.' : '다시 만나서 반가워요.'}</h2>
    <p class="sub">${isReg ? '아이디 2~10자, 비밀번호는 영문과 숫자를 섞어 8자 이상.' : '아이디와 비밀번호로 들어옵니다. 비밀번호를 잊었다면 불편사항으로 알려 주세요.'}</p>
    <form class="form-grid" id="auth-form" autocomplete="on">
      <div class="field"><label for="au-id">아이디</label><input id="au-id" type="text" maxlength="10" required autocomplete="username" /><span class="check" id="au-check"></span></div>
      <div class="field"><label for="au-pw">비밀번호</label><input id="au-pw" type="password" maxlength="64" required autocomplete="${isReg ? 'new-password' : 'current-password'}" /></div>
      ${isReg ? '<div class="field"><label for="au-nick">닉네임</label><input id="au-nick" type="text" maxlength="20" required placeholder="저장한 길에 함께 표시됩니다" /></div>' : ''}
      <div class="btn-row" style="margin-top:.2rem">
        <button type="submit" class="btn btn-lamp" id="au-submit">${isReg ? (back ? '가입하기' : '가입하고 저장하기') : '로그인'}</button>
        <button type="button" class="btn btn-ghost" id="au-cancel">${back ? '돌아가기' : '처음으로'}</button>
      </div>
      <p class="status" id="au-status"></p>
    </form>`;
  story.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => renderAuth(b.dataset.tab, { back })));
  const idEl = $('#au-id'), check = $('#au-check'), status = $('#au-status');
  const setStatus = (msg, bad = true) => { status.textContent = msg; status.className = 'status' + (bad ? ' bad' : ''); };
  if (isReg) {
    let timer = 0;
    idEl.addEventListener('input', () => {
      clearTimeout(timer);
      const v = idEl.value.trim();
      if (!ID_RE.test(v)) { check.textContent = v ? '2~10자, 한글·영문·숫자·_.- 만' : ''; check.className = 'check bad'; return; }
      check.textContent = '확인 중'; check.className = 'check';
      timer = setTimeout(async () => {
        try {
          const j = await api(`/api/users?check=${encodeURIComponent(v)}`);
          if (j.status === 503) { check.textContent = '저장 서버가 아직 연결되지 않았습니다'; check.className = 'check bad'; return; }
          check.textContent = j.available ? '사용할 수 있는 아이디입니다' : '이미 쓰고 있는 아이디입니다';
          check.className = 'check ' + (j.available ? 'ok' : 'bad');
        } catch { check.textContent = '확인하지 못했습니다'; check.className = 'check bad'; }
      }, 350);
    });
  }
  $('#au-cancel').addEventListener('click', () => (back ? renderAsk(QUESTIONS[0]) : startTrailhead()));
  $('#auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id = idEl.value.trim(), pw = $('#au-pw').value;
    if (!ID_RE.test(id)) return setStatus('아이디는 2~10자입니다.');
    if (isReg && !PW_RE.test(pw)) return setStatus('비밀번호는 영문과 숫자를 섞어 8자 이상이어야 합니다.');
    $('#au-submit').disabled = true; setStatus(isReg ? '가입하는 중' : '로그인하는 중', false);
    try {
      const j = isReg ? await api('/api/users', { id, password: pw, nickname: $('#au-nick').value.trim() }) : await api('/api/auth', { action: 'login', id, password: pw });
      if (j.status === 503) return setStatus('저장 서버(DB)가 아직 연결되지 않았습니다. 연결되면 다시 시도해 주세요.');
      if (!j.ok) return setStatus(j.message || (isReg ? '가입하지 못했습니다.' : '로그인하지 못했습니다.'));
      writeUser({ id: j.id, nickname: j.nickname, token: j.token, role: j.role });
      const r = await api(`/api/walks?user=${encodeURIComponent(user.id)}&limit=12`); if (r.ok) myWalks = r.walks || [];
      if (back) renderAsk(QUESTIONS[0]); else await saveWalk();
    } catch { setStatus('네트워크 오류입니다.'); }
    finally { const b = $('#au-submit'); if (b) b.disabled = false; }
  });
  idEl.focus();
}

function renderPasswordChange() {
  mode = 'auth';
  story.className = 'story-card';
  story.innerHTML = `
    <h2>비밀번호 바꾸기</h2>
    <form class="form-grid" id="pw-form" autocomplete="off">
      <div class="field"><label for="pw-old">현재 비밀번호</label><input id="pw-old" type="password" required autocomplete="current-password" /></div>
      <div class="field"><label for="pw-new">새 비밀번호</label><input id="pw-new" type="password" required autocomplete="new-password" placeholder="영문+숫자 8자 이상" /></div>
      <div class="btn-row" style="margin-top:.2rem"><button type="submit" class="btn btn-lamp">바꾸기</button><button type="button" class="btn btn-ghost" id="pw-cancel">돌아가기</button></div>
      <p class="status" id="pw-status"></p>
    </form>`;
  const status = $('#pw-status');
  $('#pw-cancel').addEventListener('click', () => renderAsk(QUESTIONS[0]));
  $('#pw-form').addEventListener('submit', async e => {
    e.preventDefault();
    const np = $('#pw-new').value;
    if (!PW_RE.test(np)) { status.textContent = '새 비밀번호는 영문과 숫자를 섞어 8자 이상이어야 합니다.'; status.className = 'status bad'; return; }
    const j = await api('/api/auth', { action: 'change', oldPassword: $('#pw-old').value, newPassword: np });
    if (j.status === 401 && j.error === 'not_logged_in') { writeUser(null); return renderAuth('login', { back: true }); }
    status.textContent = j.ok ? '바꿨습니다.' : (j.message || '바꾸지 못했습니다.'); status.className = 'status' + (j.ok ? '' : ' bad');
    if (j.ok) setTimeout(() => renderAsk(QUESTIONS[0]), 1200);
  });
}

async function saveWalk() {
  mode = 'saving';
  story.className = 'story-card';
  story.innerHTML = `<h2>저장하는 중</h2><p class="sub">「${esc(current.prompt)}」</p>`;
  try {
    const j = await api('/api/walks', { prompt: current.prompt, theme: world.theme.key, meters: Math.round(world.dist), hour: world.hour });
    if (j.status === 401) { writeUser(null); return renderAuth('login'); }
    if (j.status === 503) return afterSave('저장 서버(DB)가 아직 연결되지 않았습니다.', false);
    if (!j.ok) return afterSave(j.message || '저장하지 못했습니다.', false);
    track('save', { prompt: current.prompt, theme: world.theme.key });
    savedWalks.unshift({ prompt: current.prompt, nickname: user.nickname });
    myWalks.unshift({ prompt: current.prompt, meters: Math.round(world.dist) });
    afterSave(`${user.nickname}님의 길로 남겼습니다.`, true);
  } catch { afterSave('네트워크 오류로 저장하지 못했습니다.', false); }
}
function afterSave(msg, ok) {
  mode = 'saved';
  story.innerHTML = `
    <h2>${ok ? '저장했어요.' : '저장하지 못했어요.'}</h2>
    <p>${esc(msg)}</p>
    <p class="sub">잠시 뒤 처음 길에서 다시 시작합니다.</p>
    <div class="btn-row"><button type="button" class="btn btn-lamp" id="again">바로 처음으로</button></div>`;
  $('#again').addEventListener('click', () => startTrailhead());
  setTimeout(() => { if (mode === 'saved') startTrailhead(); }, 3200);
}

async function fetchSaved() {
  try { const r = await api('/api/walks?limit=30'); if (r.ok) savedWalks = r.walks || []; } catch {}
}

// ---------- 불편사항 ----------
function wireFeedback() {
  const panel = $('#feedback-panel'), status = $('#fb-status');
  $('#feedback-tab').addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) { controls.unlock(); $('#fb-text').focus(); } });
  $('#fb-send').addEventListener('click', async () => {
    const message = $('#fb-text').value.trim(), contact = $('#fb-contact').value.trim();
    if (message.length < 2) { status.textContent = '내용을 적어 주세요.'; status.className = 'status bad'; return; }
    status.textContent = '보내는 중'; status.className = 'status';
    try {
      const j = await api('/api/feedback', { message, contact, page: location.pathname });
      if (j.ok) { status.textContent = '고맙습니다. 접수되었습니다.'; $('#fb-text').value = ''; }
      else {
        status.textContent = (j.message || '보내지 못했습니다.') + ' 아래 "메일로 직접 보내기"를 눌러 주세요.'; status.className = 'status bad';
        $('#fb-mail').href = `mailto:kwoos333@naver.com?subject=${encodeURIComponent('[Walk Anywhere] 불편사항')}&body=${encodeURIComponent(message)}`;
      }
    } catch { status.textContent = '네트워크 오류입니다. 메일로 직접 보내 주세요.'; status.className = 'status bad'; }
  });
}

boot();

// 개발 확인용
window.__wa = { get world() { return world; }, go, startTrailhead, get mode() { return mode; } };
