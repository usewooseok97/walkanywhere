// Walk Anywhere — 소리
// 파일 없이 Web Audio 로 즉석 합성한다: 표면별 발소리, 장소별 환경음(파도·바람·새·귀뚜라미·비·도시·웅성거림).
// 사람은 보이지 않지만 시장·거리에서는 사람들 소리가 깔린다.

const FILES = {
  waves: 'waves.ogg', birds: 'birds.ogg', rain: 'rain.ogg', wind: 'wind.ogg', windOpen: 'wind-open.ogg',
  crowd: 'crowd.ogg', crickets: 'crickets.ogg', stream: 'stream.ogg', forest: 'forest.ogg',
};

export class Ambience {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('wa-muted') === '1';
    this.layers = [];
    this.timers = [];
    this.theme = null;
    this.stepPan = 1;
    this.buffers = new Map();
  }

  // ---------- 녹음 파일 (audio/ 폴더, 출처는 audio/CREDITS.md) ----------
  loadBuffer(name) {
    if (!this.buffers.has(name)) {
      this.buffers.set(name, fetch(`/audio/${FILES[name]}`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(ab => this.ctx.decodeAudioData(ab))
        .catch(e => { this.buffers.delete(name); throw e; }));
    }
    return this.buffers.get(name);
  }
  // 파일을 겹쳐 이어 붙여 끊김 없이 반복. 못 불러오면 합성음으로 대신한다.
  fileLayer(kind, name, base, fallback) {
    const L = this.layer(kind, base);
    const ctx = this.ctx, XF = 1.5;
    this.loadBuffer(name).then(buf => {
      if (L.stopped) return;
      let next = ctx.currentTime + 0.05;
      const schedule = () => {
        if (L.stopped) return;
        const src = ctx.createBufferSource(); src.buffer = buf;
        const g = ctx.createGain();
        const end = next + buf.duration;
        g.gain.setValueAtTime(0, next); g.gain.linearRampToValueAtTime(1, next + XF);
        g.gain.setValueAtTime(1, end - XF); g.gain.linearRampToValueAtTime(0, end);
        src.connect(g); g.connect(L.gain);
        src.start(next); src.stop(end + 0.05);
        L.nodes.push(src, g);
        next = end - XF;
        L.timer = setTimeout(schedule, Math.max(100, (next - ctx.currentTime - 0.6) * 1000));
      };
      schedule();
    }).catch(() => { if (!L.stopped && fallback) this.layers.push(fallback()); });
    return L;
  }

  // 사용자 제스처 뒤에 한 번 호출
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(this.ctx.destination);
    this.ambGain = this.ctx.createGain(); this.ambGain.gain.value = 1; this.ambGain.connect(this.master);
    this.stepGain = this.ctx.createGain(); this.stepGain.gain.value = 0.9; this.stepGain.connect(this.master);
    this.noise = makeNoiseBuffer(this.ctx, 2.0, 'white');
    this.brown = makeNoiseBuffer(this.ctx, 2.0, 'brown');
    if (this.theme) this.setTheme(this.theme, true);
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('wa-muted', m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.05);
  }

  // 테마가 바뀌면 환경음을 1.5초에 걸쳐 교체
  setTheme(theme, immediate = false) {
    this.theme = theme;
    if (!this.ctx) return;
    const ctx = this.ctx, now = ctx.currentTime;
    // 이전 레이어 페이드아웃
    for (const l of this.layers) { l.gain.gain.setTargetAtTime(0, now, immediate ? 0.01 : 0.6); setTimeout(() => l.stop(), immediate ? 50 : 2500); }
    this.layers = [];
    for (const t of this.timers) clearInterval(t);
    this.timers = [];

    const add = (layer) => { this.layers.push(layer); };
    const k = theme.key;
    const night = theme.startHour >= 20 || theme.startHour < 5;
    const woods = k === 'forest' || k === 'meadow' || k === 'village' || k === 'park' || k === 'mountain';
    const windAmt = { snow: 0.45, desert: 0.4, mars: 0.3, meadow: 0.22, forest: 0.18, beach: 0.28, village: 0.12, city: 0.08, park: 0.14, mountain: 0.3 }[k] ?? 0.2;
    // 바람: 숲이면 나뭇잎 바람, 트인 곳이면 벌판 바람. 화성은 합성 저음 바람만.
    if (k === 'mars') add(this.wind(windAmt, 160));
    else add(this.fileLayer('wind', woods ? 'wind' : 'windOpen', windAmt, () => this.wind(windAmt, 420)));
    if (k === 'forest' || k === 'mountain') add(this.fileLayer('forest', 'forest', 0.25));
    if (theme.water || k === 'beach') add(this.fileLayer('waves', 'waves', 0.55, () => this.waves(0.5)));
    if (theme.stream) add(this.fileLayer('stream', 'stream', 0.4));
    if (theme.rain) add(this.fileLayer('rain', 'rain', 0.5, () => this.rain(0.45)));
    if (k === 'city') { add(this.traffic(0.3)); add(this.fileLayer('crowd', 'crowd', 0.22, () => this.crowd(0.18))); }
    else if (theme.crowd) { add(this.fileLayer('crowd', 'crowd', 0.45, () => this.crowd(0.4))); add(this.crowd(0.12)); }
    if (!theme.rain && (woods || k === 'beach')) {
      add(this.fileLayer('birds', 'birds', k === 'forest' ? 0.45 : 0.3, () => this.birds(0.3)));
      add(this.fileLayer('crickets', 'crickets', 0.35, () => this.crickets(0.25)));
      if (k === 'beach') add(this.birds(0.25, true));
    }
    this.setDaylight(this.lastDaylight ?? 1);
  }

  // 낮/밤에 따라 새 ↔ 귀뚜라미 균형 (레이어가 둘 다 있을 때만)
  setDaylight(d) {
    this.lastDaylight = d;
    for (const l of this.layers) {
      if (l.kind === 'birds') l.gain.gain.setTargetAtTime(l.base * Math.max(0.05, d), this.ctx.currentTime, 1);
      if (l.kind === 'crickets') l.gain.gain.setTargetAtTime(l.base * Math.max(0.1, 1 - d), this.ctx.currentTime, 1);
    }
  }

  // ---------- 발소리 ----------
  step(side, strength, surface) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    const cfg = {
      sand:    { type: 'lowpass', freq: 700, q: 0.7, dur: 0.16, gain: 0.5 },
      gravel:  { type: 'bandpass', freq: 1400, q: 0.9, dur: 0.11, gain: 0.55 },
      dirt:    { type: 'bandpass', freq: 900, q: 0.8, dur: 0.1, gain: 0.45 },
      snow:    { type: 'bandpass', freq: 1900, q: 1.2, dur: 0.14, gain: 0.5 },
      asphalt: { type: 'lowpass', freq: 1600, q: 0.5, dur: 0.06, gain: 0.4 },
    }[surface] ?? { type: 'bandpass', freq: 1000, q: 0.8, dur: 0.1, gain: 0.45 };
    f.type = cfg.type; f.frequency.value = cfg.freq * (0.9 + Math.random() * 0.2); f.Q.value = cfg.q;
    const g = ctx.createGain();
    const peak = cfg.gain * (0.5 + 0.5 * strength) * (0.85 + Math.random() * 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + cfg.dur);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = side * 0.25;
    src.connect(f); f.connect(g);
    if (pan) { g.connect(pan); pan.connect(this.stepGain); } else g.connect(this.stepGain);
    src.start(t, Math.random() * 1.5); src.stop(t + cfg.dur + 0.05);
  }

  // ---------- 환경음 레이어 ----------
  layer(kind, base) {
    const ctx = this.ctx;
    const gain = ctx.createGain(); gain.gain.value = 0;
    gain.connect(this.ambGain);
    gain.gain.setTargetAtTime(base, ctx.currentTime + 0.05, 1.2);
    const nodes = [];
    const L = { kind, base, gain, nodes, stopped: false, timer: 0, sub: null,
      stop() { L.stopped = true; clearTimeout(L.timer); L.sub?.stop(); nodes.forEach(n => { try { n.stop?.(); } catch {} try { n.disconnect(); } catch {} }); try { gain.disconnect(); } catch {} } };
    return L;
  }
  noiseSource(buf = this.noise) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 1.5); return s; }
  lfo(target, freq, depth, offset = 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target);
    if (offset) target.value = offset;
    o.start(); return [o, g];
  }

  wind(amount, cutoff) {
    const L = this.layer('wind', amount);
    const src = this.noiseSource(this.brown);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.5;
    const g = this.ctx.createGain(); g.gain.value = 0.7;
    L.nodes.push(src, f, g, ...this.lfo(f.frequency, 0.07, cutoff * 0.5, cutoff), ...this.lfo(g.gain, 0.11, 0.3, 0.7));
    src.connect(f); f.connect(g); g.connect(L.gain);
    return L;
  }

  waves(amount) {
    const L = this.layer('waves', amount);
    const src = this.noiseSource();
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 0.4;
    const g = this.ctx.createGain(); g.gain.value = 0.3;
    // 느린 너울: 두 LFO 를 겹쳐 규칙적이지 않게
    L.nodes.push(src, f, g, ...this.lfo(g.gain, 0.085, 0.28, 0.32), ...this.lfo(g.gain, 0.053, 0.12), ...this.lfo(f.frequency, 0.06, 250, 650));
    src.connect(f); f.connect(g); g.connect(L.gain);
    return L;
  }

  rain(amount) {
    const L = this.layer('rain', amount);
    const src = this.noiseSource();
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400;
    const f2 = this.ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 7000;
    const g = this.ctx.createGain(); g.gain.value = 0.5;
    L.nodes.push(src, f, f2, g, ...this.lfo(g.gain, 0.2, 0.08, 0.5));
    src.connect(f); f.connect(f2); f2.connect(g); g.connect(L.gain);
    return L;
  }

  traffic(amount) {
    const L = this.layer('traffic', amount);
    const src = this.noiseSource(this.brown);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const g = this.ctx.createGain(); g.gain.value = 0.9;
    L.nodes.push(src, f, g, ...this.lfo(g.gain, 0.05, 0.25, 0.9));
    src.connect(f); f.connect(g); g.connect(L.gain);
    // 가끔 지나가는 차
    this.timers.push(setInterval(() => { if (Math.random() < 0.5) this.swoosh(L.gain); }, 4000));
    return L;
  }
  swoosh(dest) {
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(900, t + 1.2); f.frequency.linearRampToValueAtTime(250, t + 2.6);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + 3);
  }

  // 사람들 웅성거림: 세 개의 중음 대역 + 짧은 목소리 조각들
  crowd(amount) {
    const L = this.layer('crowd', amount);
    for (const [fc, q] of [[320, 2.2], [620, 2.5], [1100, 3]]) {
      const src = this.noiseSource();
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = q;
      const g = this.ctx.createGain(); g.gain.value = 0.25;
      L.nodes.push(src, f, g, ...this.lfo(g.gain, 0.9 + Math.random() * 1.6, 0.12, 0.22), ...this.lfo(g.gain, 0.17 + Math.random() * 0.2, 0.08));
      src.connect(f); f.connect(g); g.connect(L.gain);
    }
    this.timers.push(setInterval(() => { if (Math.random() < 0.75) this.voiceBlip(L.gain); }, 420));
    return L;
  }
  voiceBlip(dest) {
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
    const f0 = 220 + Math.random() * 420, dur = 0.12 + Math.random() * 0.22;
    f.frequency.setValueAtTime(f0 * 1.15, t); f.frequency.exponentialRampToValueAtTime(f0 * 0.85, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14 + Math.random() * 0.1, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pan) pan.pan.value = (Math.random() - 0.5) * 1.4;
    s.connect(f); f.connect(g); if (pan) { g.connect(pan); pan.connect(dest); } else g.connect(dest);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  birds(amount, gulls = false) {
    const L = this.layer('birds', amount);
    this.timers.push(setInterval(() => {
      if (Math.random() < 0.6) (gulls ? this.gull(L.gain) : this.chirp(L.gain));
    }, gulls ? 2600 : 1500));
    return L;
  }
  chirp(dest) {
    const ctx = this.ctx; let t = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 4), base = 2200 + Math.random() * 1600;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pan) { pan.pan.value = (Math.random() - 0.5) * 1.6; pan.connect(dest); }
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t); o.frequency.exponentialRampToValueAtTime(base * (1.1 + Math.random() * 0.3), t + 0.07);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g); g.connect(pan ?? dest); o.start(t); o.stop(t + 0.1);
      t += 0.1 + Math.random() * 0.08;
    }
  }
  gull(dest) {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth';
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400;
    o.frequency.setValueAtTime(900, t); o.frequency.linearRampToValueAtTime(1400, t + 0.18); o.frequency.linearRampToValueAtTime(800, t + 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.7);
  }

  crickets(amount) {
    const L = this.layer('crickets', amount);
    for (const fc of [4300, 4700]) {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fc;
      const g = this.ctx.createGain(); g.gain.value = 0;
      const am = this.ctx.createOscillator(); am.type = 'square'; am.frequency.value = 17 + Math.random() * 8;
      const amG = this.ctx.createGain(); amG.gain.value = 0.045; am.connect(amG); amG.connect(g.gain);
      const slow = this.lfo(g.gain, 0.08 + Math.random() * 0.1, 0.04, 0.045);
      o.connect(g); g.connect(L.gain); o.start(); am.start();
      L.nodes.push(o, g, am, amG, ...slow);
    }
    return L;
  }
}

function makeNoiseBuffer(ctx, seconds, kind) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
  }
  return buf;
}
