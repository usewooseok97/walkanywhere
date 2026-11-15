// Walk Anywhere — 메인 화면 흐름
// 들어오면 바로 풀숲 길을 걷는다 → "오늘은 어디로 가볼까?" → 선택/입력 → "거기로 가자." → 안개 너머 목적지 세계 →
// 목적지 도착 → 저장할지 묻기(아이디·닉네임) → 다시 처음 길로.

import { Ambience } from './audio.js';
import { track, SpeedMeter } from './track.js';
import { wireControls } from './controls.js';

const $ = (s, el = document) => el.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const TRAILHEAD = '맑은 낮의 들판 풀길';
const POOL = [
  '노을 지는 제주 해변', '비 내린 밤의 네온 골목', '눈 덮인 자작나무 숲', '안개 낀 아침의 숲길',
  '1990년대 옛 동네 골목 시장', '붉은 모래의 화성 평원', '별이 쏟아지는 사막의 밤', '해 질 녘 강남 빌딩 숲',
  '이른 아침 한옥 마을', '한낮의 제주 해안 산책로', '겨울 밤 눈 내리는 시골 마을', '봄날 오후의 들판',
  '달빛 아래 설원', '아침 안개 속 대나무 숲', '장마철 저녁의 도쿄 거리', '정오의 사막 오아시스 길',
  '노을 지는 옛 항구 마을', '한밤의 홍대 거리', '새벽 바닷가 산책로', '가을 저녁 숲속 오솔길',
];

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

let W = null;            // world.js 모듈
let world = null, controls = null;
const audio = new Ambience();
const meter = new SpeedMeter();
let mode = 'boot';
let current = { prompt: TRAILHEAD, startedAt: performance.now() };
let savedWalks = [];
let user = readUser();

function readUser() { try { return JSON.parse(localStorage.getItem('wa-user') || 'null'); } catch { return null; } }
function writeUser(u) { if (u) localStorage.setItem('wa-user', JSON.stringify(u)); else localStorage.removeItem('wa-user'); user = u; }

// ---------- 시작 ----------
async function boot() {
  try {
    W = await import('./world.js');
  } catch (e) {
    return bootError('3D 라이브러리를 불러올 수 없습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.');
  }
  try {
    world = new W.World(canvas, stage, {
      onStep: (side, strength, surface) => audio.step(side, strength, surface),
      onArrive: onArrive,
    });
  } catch (e) {
    return bootError('이 브라우저에서는 WebGL 을 사용할 수 없습니다. 최신 Chrome, Edge, Safari 에서 열어 주세요.');
  }
  controls = wireControls({
    world, canvas, root: stage, audio, els,
    onPause: () => {}, onResume: () => {},
  });
  // Enter 로 문장 입력칸 열기 (포인터 잠금 중에도)
  addEventListener('keydown', e => {
    if (e.code === 'Enter' && mode === 'ask' && !['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) { e.preventDefault(); $('#chat-input')?.focus(); }
  });
  startTrailhead(true);
  $('#boot').classList.add('is-done');
  track('start');
  fetchSaved();
  wireFeedback();

  // 속도별 시간 집계
  (function loop() { requestAnimationFrame(loop); if (world?.active) meter.tick(world); })();
  addEventListener('pagehide', () => meter.flush({ prompt: current.prompt, theme: world?.theme?.key }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) meter.flush({ prompt: current.prompt, theme: world?.theme?.key }); });
}
function bootError(msg) { $('#boot-text').textContent = '길을 열지 못했습니다'; const e = $('#boot-err'); e.hidden = false; e.textContent = msg; }

function startTrailhead(first = false) {
  world.fogBoost = 0;
  world.build(TRAILHEAD, { trailhead: true });
  controls.setWalking(true);
  current = { prompt: TRAILHEAD, startedAt: performance.now() };
  setPlace();
  audio.setTheme(world.theme, first);
  mode = 'ask';
  renderAsk();
}

function setPlace() {
  const t = world.theme;
  hudPlace.innerHTML = `「${esc(current.prompt)}」 <span class="hud-tags">${esc([t.name, ...t.tags].join(', '))}</span>`;
}

// ---------- 카드: 오늘은 어디로 가볼까? ----------
function pickChoices() {
  const avoid = new Set([current.prompt]);
  const pool = POOL.filter(p => !avoid.has(p)).sort(() => Math.random() - 0.5);
  const out = [{ prompt: pool[0] }, { prompt: pool[1] }];
  const saved = savedWalks.filter(w => w.prompt && !avoid.has(w.prompt) && !POOL.includes(w.prompt));
  if (saved.length && Math.random() < 0.35) {
    const s = saved[Math.floor(Math.random() * saved.length)];
    out[1] = { prompt: s.prompt, by: s.nickname || '누군가' };
  }
  return out;
}
function describe(prompt) {
  const t = W.interpret(prompt);
  return `${t.name}, ${W.hourLabel(t.startHour)}${t.rain ? ', 비' : ''}${t.fog ? ', 안개' : ''}`;
}
function renderAsk(title = '오늘은 어디로 가볼까?') {
  const choices = pickChoices();
  story.hidden = false;
  story.innerHTML = `
    <h2>${esc(title)}</h2>
    <ul class="choices">
      ${choices.map((c, i) => `<li><button type="button" class="choice" data-i="${i}">
        <strong>${esc(c.prompt)}</strong>
        <small>${c.by ? esc(c.by) + '님이 저장한 길, ' : ''}${esc(describe(c.prompt))}</small>
      </button></li>`).join('')}
    </ul>
    <form class="chat" id="chat-form" autocomplete="off">
      <label class="visually-hidden" for="chat-input">가고 싶은 곳을 한 문장으로</label>
      <input id="chat-input" type="text" maxlength="80" placeholder="또는 직접 적어요. 예) 비 오는 저녁 부산 자갈치 시장" />
      <button type="submit" class="btn btn-lamp">가자</button>
    </form>
    <div class="card-foot">
      <span class="sub">걷는 동안 마우스로 둘러보고, 가고 싶은 곳이 떠오르면 적어 주세요.</span>
      <button type="button" class="linklike" id="shuffle">다른 선택지</button>
    </div>`;
  story.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => go(choices[Number(b.dataset.i)].prompt, choices[Number(b.dataset.i)].by ? 'saved' : 'choice')));
  $('#chat-form').addEventListener('submit', e => { e.preventDefault(); const v = $('#chat-input').value.trim(); if (v) go(v, 'chat'); });
  $('#shuffle').addEventListener('click', () => renderAsk(title));
}

// ---------- 거기로 가자 ----------
async function go(prompt, source) {
  if (mode === 'going') return;
  mode = 'going';
  controls.clearFocus();
  const theme = W.interpret(prompt);
  track('open', { prompt, theme: theme.key, source, hour: theme.startHour });
  meter.flush({ prompt: current.prompt, theme: world.theme?.key });

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
  track('arrive', { prompt: current.prompt, theme: w.theme.key, meters: Math.round(w.dist), seconds });
  story.hidden = false;
  story.innerHTML = `
    <h2>목적지에 도착했다.</h2>
    <p>「${esc(current.prompt)}」의 ${esc(w.theme.destName)} 앞. ${Math.round(w.dist)} m 를 걸어 왔습니다.</p>
    <p class="sub">이 길을 저장하면 다른 사람의 선택지에도 가끔 나타납니다.</p>
    <div class="btn-row">
      <button type="button" class="btn btn-lamp" id="save-yes">이 길 저장하기</button>
      <button type="button" class="btn btn-ghost" id="save-no">저장하지 않고 처음으로</button>
    </div>`;
  $('#save-yes').addEventListener('click', () => (user ? saveWalk() : renderRegister()));
  $('#save-no').addEventListener('click', () => startTrailhead());
}

// ---------- 저장: 아이디·닉네임 ----------
function renderRegister() {
  mode = 'register';
  story.innerHTML = `
    <h2>처음 저장할 때 한 번만 이름을 남겨요.</h2>
    <p class="sub">비밀번호는 없습니다. 아이디는 2~10자, 중복은 안 됩니다.</p>
    <form class="form-grid" id="reg-form" autocomplete="off">
      <div class="field">
        <label for="reg-id">아이디</label>
        <input id="reg-id" type="text" minlength="2" maxlength="10" required placeholder="2~10자" />
        <span class="check" id="reg-check"></span>
      </div>
      <div class="field">
        <label for="reg-nick">닉네임</label>
        <input id="reg-nick" type="text" maxlength="20" required placeholder="저장한 길에 함께 표시됩니다" />
      </div>
      <div class="btn-row" style="margin-top:.2rem">
        <button type="submit" class="btn btn-lamp" id="reg-submit">저장하기</button>
        <button type="button" class="btn btn-ghost" id="reg-cancel">처음으로</button>
      </div>
      <p class="status" id="reg-status"></p>
    </form>`;
  const idEl = $('#reg-id'), check = $('#reg-check'), status = $('#reg-status');
  let timer = 0, available = false;
  const ID_RE = /^[0-9A-Za-z가-힣_.-]{2,10}$/;
  idEl.addEventListener('input', () => {
    clearTimeout(timer); available = false;
    const v = idEl.value.trim();
    if (!ID_RE.test(v)) { check.textContent = v ? '2~10자, 한글·영문·숫자·_.- 만' : ''; check.className = 'check bad'; return; }
    check.textContent = '확인 중'; check.className = 'check';
    timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/users?check=${encodeURIComponent(v)}`);
        if (r.status === 503) { check.textContent = '저장 서버가 아직 연결되지 않았습니다'; check.className = 'check bad'; return; }
        const j = await r.json();
        available = !!j.available;
        check.textContent = available ? '사용할 수 있는 아이디입니다' : '이미 쓰고 있는 아이디입니다';
        check.className = 'check ' + (available ? 'ok' : 'bad');
      } catch { check.textContent = '확인하지 못했습니다'; check.className = 'check bad'; }
    }, 350);
  });
  $('#reg-cancel').addEventListener('click', () => startTrailhead());
  $('#reg-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id = idEl.value.trim(), nickname = $('#reg-nick').value.trim();
    if (!ID_RE.test(id)) { status.textContent = '아이디는 2~10자입니다.'; status.className = 'status bad'; return; }
    status.textContent = '등록하는 중'; status.className = 'status';
    $('#reg-submit').disabled = true;
    try {
      const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, nickname }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 503) { status.textContent = '저장 서버(DB)가 아직 연결되지 않았습니다. 연결되면 다시 시도해 주세요.'; status.className = 'status bad'; return; }
      if (!r.ok) { status.textContent = j.message || '등록하지 못했습니다.'; status.className = 'status bad'; return; }
      writeUser({ id: j.id, nickname: j.nickname, token: j.token });
      await saveWalk();
    } catch { status.textContent = '네트워크 오류입니다.'; status.className = 'status bad'; }
    finally { const b = $('#reg-submit'); if (b) b.disabled = false; }
  });
  idEl.focus();
}

async function saveWalk() {
  mode = 'saving';
  story.innerHTML = `<h2>저장하는 중</h2><p class="sub">「${esc(current.prompt)}」</p>`;
  try {
    const r = await fetch('/api/walks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, token: user.token, prompt: current.prompt, theme: world.theme.key, meters: Math.round(world.dist), hour: world.hour }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { writeUser(null); return renderRegister(); }
    if (r.status === 503) return afterSave('저장 서버(DB)가 아직 연결되지 않았습니다.', false);
    if (!r.ok) return afterSave(j.message || '저장하지 못했습니다.', false);
    track('save', { prompt: current.prompt, theme: world.theme.key });
    savedWalks.unshift({ prompt: current.prompt, nickname: user.nickname });
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
  try { const r = await fetch('/api/walks?limit=30'); if (r.ok) savedWalks = (await r.json()).walks || []; } catch {}
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
      const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, contact, page: location.pathname }) });
      if (r.ok) { status.textContent = '고맙습니다. 접수되었습니다.'; $('#fb-text').value = ''; }
      else {
        const j = await r.json().catch(() => ({}));
        status.textContent = (j.message || '보내지 못했습니다.') + ' 아래 "메일로 직접 보내기"를 눌러 주세요.'; status.className = 'status bad';
        $('#fb-mail').href = `mailto:kwoos333@naver.com?subject=${encodeURIComponent('[Walk Anywhere] 불편사항')}&body=${encodeURIComponent(message)}`;
      }
    } catch { status.textContent = '네트워크 오류입니다. 메일로 직접 보내 주세요.'; status.className = 'status bad'; }
  });
}

boot();

// 개발 확인용
window.__wa = { get world() { return world; }, go, startTrailhead, get mode() { return mode; } };
