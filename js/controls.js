// 걷기 조작: 포인터 잠금 시선, Esc 멈춤, 걷기/정지, 속도 1~5, 시각, 소리, 간판 클릭.
// 메인 화면과 소개 페이지의 데모가 함께 쓴다.

import { hourLabel } from './world.js';
import { track } from './track.js';

const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;

export function wireControls({ world, canvas, root, audio, els, onPause, onResume, onWalkChange }) {
  const state = { locked: false, wasWalking: true, focused: null, prevSpeed: null, enabled: true };

  // ----- 포인터 잠금 (마우스 숨기고 이동으로 둘러보기) -----
  function lock() {
    if (isTouch || !state.enabled) return;
    canvas.requestPointerLock?.({ unadjustedMovement: true })?.catch?.(() => canvas.requestPointerLock());
  }
  function unlock() { if (document.pointerLockElement === canvas) document.exitPointerLock(); }
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (locked === state.locked) return;
    state.locked = locked;
    root.classList.toggle('is-locked', locked);
    if (locked) {
      if (state.wasWalking && !world.arrived) setWalking(true);
      onResume?.();
    } else {
      state.wasWalking = world.walking;
      setWalking(false);
      clearFocus();
      onPause?.();
    }
  });
  document.addEventListener('mousemove', e => {
    if (!state.locked) return;
    world.look(-e.movementX * 0.0022, -e.movementY * 0.0022);
    world.drift = false;
  });
  // 터치: 드래그로 둘러보기
  let lastTouch = null;
  canvas.addEventListener('touchstart', e => { lastTouch = e.touches[0]; }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (!lastTouch) return; const t = e.touches[0];
    world.look((t.clientX - lastTouch.clientX) * 0.005, (t.clientY - lastTouch.clientY) * 0.005);
    lastTouch = t; e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { lastTouch = null; });

  // ----- 걷기/정지, 속도 -----
  function setWalking(on) {
    if (world.arrived && on) on = false;
    world.walking = on;
    els.btnWalk?.setAttribute('aria-pressed', String(on));
    els.btnWalk?.classList.toggle('is-walking', on);
    if (els.walkLabel) els.walkLabel.textContent = on ? '정지' : '걷기';
    onWalkChange?.(on);
  }
  function setSpeed(level, { silent = false } = {}) {
    world.setSpeed(level);
    els.speedBtns?.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === world.speedLevel)));
    if (!silent) track('speed', { speed: world.speedLevel, theme: world.theme?.key });
  }
  els.btnWalk?.addEventListener('click', () => { state.wasWalking = !world.walking; setWalking(!world.walking); });
  els.speedBtns?.forEach(b => b.addEventListener('click', () => { state.prevSpeed = null; setSpeed(Number(b.dataset.speed)); }));

  // ----- 시각 -----
  function syncTime() {
    if (els.timeLabel) els.timeLabel.textContent = hourLabel(world.hour);
    if (els.timeRange && document.activeElement !== els.timeRange) els.timeRange.value = world.hour.toFixed(2);
  }
  els.timeRange?.addEventListener('input', () => { world.setHour(Number(els.timeRange.value)); syncTime(); });
  els.timeRange?.addEventListener('change', () => track('time', { hour: Math.round(world.hour * 2) / 2, theme: world.theme?.key }));

  // ----- 소리 -----
  function syncMute() {
    if (!els.btnMute) return;
    els.btnMute.setAttribute('aria-pressed', String(!audio.muted));
    els.btnMute.textContent = audio.muted ? '소리 켜기' : '소리 끄기';
  }
  els.btnMute?.addEventListener('click', () => { audio.start(); audio.setMuted(!audio.muted); syncMute(); });
  syncMute();
  const firstGesture = () => { audio.start(); if (world.theme) audio.setTheme(world.theme, true); };
  addEventListener('pointerdown', firstGesture, { once: true });
  addEventListener('keydown', firstGesture, { once: true });

  // ----- 키보드 -----
  addEventListener('keydown', e => {
    if (!state.enabled) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'Space' && tag !== 'BUTTON') { e.preventDefault(); state.wasWalking = !world.walking; setWalking(!world.walking); }
    else if (/^Digit[1-5]$/.test(e.code)) { state.prevSpeed = null; setSpeed(Number(e.code.slice(5))); }
    else if (e.code === 'ArrowUp') { e.preventDefault(); setSpeed(world.speedLevel + 1); }
    else if (e.code === 'ArrowDown') { e.preventDefault(); setSpeed(world.speedLevel - 1); }
    else if (e.code === 'Comma') { world.setHour(world.hour - 0.5); syncTime(); }
    else if (e.code === 'Period') { world.setHour(world.hour + 0.5); syncTime(); }
    else if (e.code === 'KeyM') { els.btnMute?.click(); }
  });

  // ----- 간판/건물: 한 번 클릭하면 정보, 다시 클릭하면 방문 -----
  function showFocus(hit) {
    if (state.focused?.link === hit.link) return;
    state.focused = hit;
    if (state.prevSpeed == null) state.prevSpeed = world.speedLevel;
    setSpeed(1, { silent: true });
    if (els.card) {
      els.card.hidden = false;
      els.cardTitle.textContent = hit.link.name;
      els.cardDesc.textContent = hit.link.desc || '';
      els.cardUrl.textContent = hit.link.url.replace(/^https?:\/\//, '');
      els.cardTag.textContent = hit.link.tag || '';
    }
    track('look', { url: hit.link.url, name: hit.link.name, theme: world.theme?.key });
  }
  function clearFocus() {
    if (!state.focused) return;
    state.focused = null;
    if (els.card) els.card.hidden = true;
    if (state.prevSpeed != null) { setSpeed(state.prevSpeed, { silent: true }); state.prevSpeed = null; }
  }
  function visit(link) {
    track('link', { url: link.url, name: link.name, theme: world.theme?.key });
    window.open(link.url, '_blank', 'noopener');
  }
  function pickAt(x, y) {
    if (state.locked) { const r = canvas.getBoundingClientRect(); return world.pick(r.left + r.width / 2, r.top + r.height / 2); }
    return world.pick(x, y);
  }
  canvas.addEventListener('click', e => {
    if (!state.enabled) return;
    const hit = pickAt(e.clientX, e.clientY);
    if (hit && hit.distance < 90) {
      if (state.focused && state.focused.link === hit.link) { visit(hit.link); return; }
      showFocus(hit);
      return;
    }
    if (state.focused) { clearFocus(); return; }
    if (!state.locked) lock();
  });
  // 조준점 아래에 무엇이 있는지 (잠금 상태) / 커서 아래 (자유 상태)
  let hoverTimer = 0, lastMouse = [0, 0];
  canvas.addEventListener('mousemove', e => { lastMouse = [e.clientX, e.clientY]; });
  function pollHover() {
    hoverTimer = requestAnimationFrame(pollHover);
    if (!state.enabled || !world.active || !els.tooltip) return;
    const hit = pickAt(lastMouse[0], lastMouse[1]);
    const show = hit && hit.distance < 90;
    els.tooltip.hidden = !show;
    canvas.classList.toggle('is-hot', !!show);
    if (show) {
      els.tooltip.textContent = state.focused?.link === hit.link ? `${hit.link.name} — 다시 클릭하면 방문` : `${hit.link.name} — 클릭해서 알아보기`;
      if (!state.locked) { els.tooltip.style.left = lastMouse[0] + 14 + 'px'; els.tooltip.style.top = lastMouse[1] + 14 + 'px'; }
      else { els.tooltip.style.left = ''; els.tooltip.style.top = ''; }
    }
    // 걸어서 멀어지면 정보 카드를 닫는다
    if (state.focused && (!hit || hit.link !== state.focused.link)) {
      const still = world.landmarks.find(l => l.link === state.focused.link);
      if (!still || still.arc < world.dist - 8) clearFocus();
    }
  }
  pollHover();
  els.cardVisit?.addEventListener('click', () => { if (state.focused) visit(state.focused.link); });
  els.cardClose?.addEventListener('click', clearFocus);

  // ----- 전체 화면 -----
  els.btnFull?.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen?.(); });
  document.addEventListener('fullscreenchange', () => { if (els.btnFull) els.btnFull.textContent = document.fullscreenElement ? '창 모드' : '전체 화면'; });

  // ----- 매 프레임 표시 갱신 -----
  let lastShown = -1;
  function frame() {
    requestAnimationFrame(frame);
    if (!world.active) return;
    const m = Math.floor(world.dist);
    if (m !== lastShown) {
      lastShown = m;
      if (els.distance) els.distance.textContent = world.remaining == null ? `${m} m 걸음` : `목적지까지 ${Math.ceil(world.remaining)} m`;
      if (els.progress) els.progress.style.width = world.tripLength ? `${Math.min(100, (world.dist / world.tripLength) * 100).toFixed(1)}%` : '0%';
    }
    syncTime();
    if (audio.ctx && world.daylight != null) audio.setDaylight(world.daylight);
  }
  frame();

  return {
    lock, unlock, setWalking, setSpeed, clearFocus,
    get locked() { return state.locked; },
    set enabled(v) { state.enabled = v; if (!v) unlock(); },
    get enabled() { return state.enabled; },
    isTouch,
  };
}
