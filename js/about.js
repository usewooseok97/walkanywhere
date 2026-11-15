// 소개 페이지: 내비 색 전환 + 3장에 들어 있는 미니 데모
import { Ambience } from './audio.js';
import { track } from './track.js';
import { wireControls } from './controls.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ----- 새벽 구간 위에서는 내비 글자색을 뒤집는다 -----
(() => {
  const nav = $('.nav'), dawn = [...document.querySelectorAll('[data-dawn]')];
  const update = () => {
    const probe = nav.offsetHeight * 0.5;
    document.body.classList.toggle('on-dawn', dawn.some(s => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; }));
  };
  addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
})();

// ----- 데모 -----
const demo = $('#demo'), canvas = $('#walk-canvas'), form = $('#prompt-form'), input = $('#prompt-input');
const ovIdle = $('#ov-idle'), ovBuilding = $('#ov-building'), ovReady = $('#ov-ready'), ovError = $('#ov-error'), hud = $('#hud');
const PRESETS = [...document.querySelectorAll('.chip')].map(b => b.textContent.trim());
const audio = new Ambience();
let W = null, world = null, controls = null, state = 'idle';

function setState(next) {
  state = next;
  ovIdle.hidden = next !== 'idle'; ovBuilding.hidden = next !== 'building'; ovReady.hidden = next !== 'ready';
  hud.hidden = next !== 'walking';
  if (controls) controls.enabled = next === 'walking';
}
function showError(msg) {
  if (msg) $('#error-text').textContent = msg;
  ovIdle.hidden = ovBuilding.hidden = ovReady.hidden = true; hud.hidden = true; ovError.hidden = false; state = 'error';
}

async function ensureWorld() {
  if (world) return world;
  try { W = await import('./world.js'); } catch (e) { showError('3D 라이브러리를 불러올 수 없습니다. 인터넷 연결을 확인한 뒤 다시 열어 주세요.'); throw e; }
  try {
    world = new W.World(canvas, demo, {
      onStep: (side, strength, surface) => audio.step(side, strength, surface),
      onArrive: () => { controls.unlock(); controls.setWalking(false); $('#hud-place').insertAdjacentHTML('beforeend', ' <span class="hud-tags">도착</span>'); },
    });
  } catch (e) { showError(); throw e; }
  controls = wireControls({
    world, canvas, root: demo, audio,
    els: {
      btnWalk: $('#btn-walk'), walkLabel: $('#btn-walk .walk-label'), speedBtns: [...document.querySelectorAll('.speed-btn')],
      timeRange: $('#time-range'), timeLabel: $('#time-label'), btnMute: $('#btn-mute'), btnFull: $('#btn-full'),
      distance: $('#distance'), progress: $('#progress'), tooltip: $('#tooltip'),
      card: $('#place-card'), cardTitle: $('#card-title'), cardDesc: $('#card-desc'), cardUrl: $('#card-url'), cardTag: $('#card-tag'),
      cardVisit: $('#card-visit'), cardClose: $('#card-close'),
    },
  });
  controls.enabled = false;
  new IntersectionObserver(([en]) => { world.visible = en.isIntersecting; }, { threshold: 0.05 }).observe(demo);
  return world;
}

async function open(prompt) {
  prompt = (prompt || '').trim() || PRESETS[Math.floor(Math.random() * PRESETS.length)];
  input.value = prompt;
  setState('building');
  $('#building-title').textContent = `「${prompt}」`;
  const steps = [...$('#building-steps').children]; steps.forEach(li => li.className = '');
  demo.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  const delay = reduceMotion ? 120 : 420;
  let w;
  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add('is-on');
    if (i === 1) w = await ensureWorld();
    if (i === 2) { w.build(prompt, { trip: 280 + (W.hashString(prompt) % 141) }); w.visible = true; audio.setTheme(w.theme); }
    await sleep(delay);
    steps[i].classList.replace('is-on', 'is-done');
  }
  if (state === 'error') return;
  demo.classList.add('is-open');
  const t = w.theme;
  $('#hud-place').innerHTML = `「${esc(prompt)}」 <span class="hud-tags">${esc([t.name, ...t.tags].join(', '))}</span>`;
  $('#ready-course').textContent = `${t.destName}까지 ${Math.round(w.tripLength)} m, ${W.hourLabel(t.startHour)}에 출발`;
  track('open', { prompt, theme: t.key, source: 'about', hour: t.startHour });
  controls.setSpeed(3, { silent: true });
  setState('ready');
}
function enter() {
  if (!world || state !== 'ready') return;
  setState('walking');
  controls.setWalking(true);
  controls.lock();
}

form.addEventListener('submit', e => { e.preventDefault(); open(input.value); });
document.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => open(b.textContent)));
$('#btn-random').addEventListener('click', () => open(''));
$('#btn-enter').addEventListener('click', enter);
ovReady.addEventListener('click', e => { if (e.target === ovReady) enter(); });
$('#btn-another').addEventListener('click', () => {
  controls.unlock(); controls.setWalking(false);
  input.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); input.focus({ preventScroll: true }); input.select();
});

const q = new URLSearchParams(location.search).get('walk');
if (q) open(q);
