// Walk Anywhere — 산책 엔진
// 문장 → 세계 설정 → 끝없이 이어지는 길을 따라 걷는 1인칭 뷰.
// 지형·소품·건물은 플레이어 주변 청크 단위로 만들고, 지나온 것은 지운다.

import * as THREE from 'three';
import { pickLinks } from './links.js';

// ---------- 작은 유틸 ----------
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - t, 3);
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash2 = (seed, a, b) => hashString(`${seed}|${a}|${b}`);

// 속도 1~5 (m/s): 느린 산책 → 빠른 걸음
export const SPEEDS = [1.2, 1.9, 2.8, 4.0, 5.6];

// ---------- 문장 → 세계 설정 ----------
// sky/sun/hemi 는 '한낮' 기준 값. 시간대에 따라 밤·새벽·노을 팔레트와 섞인다.
export const THEMES = {
  meadow: { name: '초원', destName: '언덕 위 풍차', dest: 'windmill', sky: ['#5f93d6', '#eadbc9'], fogD: 0.011, ground: '#6f9a56', path: '#8a7a5a', amp: 6, freq: 0.035,
            props: ['deciduous', 'rocks'], density: 18, surface: 'dirt', curve: 0.03, defaultHour: 10.5,
            sun: { color: '#fff1d6', int: 2.2 }, hemi: ['#bcd4ff', '#4d6b3a', 0.9] },
  beach:  { name: '해변', destName: '해변 등대', dest: 'lighthouse', sky: ['#4f98e0', '#dfe9f0'], fogD: 0.0105, ground: '#e3cfa3', path: '#cdb48a', amp: 1.6, freq: 0.03,
            water: { level: -0.3, base: 0.6, slope: 0.1, color: '#2f7f9f' },
            props: ['palms', 'rocks'], density: 7, surface: 'sand', curve: 0.012, defaultHour: 17.5,
            sun: { color: '#fff1d6', int: 2.4 }, hemi: ['#cfe3ff', '#8a7a5a', 0.8] },
  forest: { name: '숲', destName: '숲속 오두막', dest: 'cabin', sky: ['#5c86b3', '#c7d5c1'], fogD: 0.02, ground: '#3f6b3a', path: '#5e4b3a', amp: 5, freq: 0.04,
            props: ['conifer', 'deciduous', 'rocks'], density: 34, surface: 'dirt', curve: 0.03, defaultHour: 10,
            sun: { color: '#e9f1d8', int: 1.8 }, hemi: ['#a9c8d8', '#2e4a2a', 0.8] },
  snow:   { name: '설원', destName: '눈 덮인 산장', dest: 'cabin', sky: ['#8ea2b8', '#dfe5ec'], fogD: 0.016, ground: '#eef2f6', path: '#cfd7df', amp: 4, freq: 0.03,
            props: ['birch', 'conifer-snow', 'rocks'], density: 22, particles: 'snow', surface: 'snow', curve: 0.025, defaultHour: 11,
            sun: { color: '#ffffff', int: 1.4 }, hemi: ['#e6ecf5', '#9aa6b8', 0.9] },
  desert: { name: '사막', destName: '오아시스 돔', dest: 'dome', sky: ['#4e97dd', '#f5d6a0'], fogD: 0.0105, ground: '#e0a765', path: '#c48d55', amp: 9, freq: 0.018,
            props: ['cacti', 'rocks'], density: 6, surface: 'sand', curve: 0.02, defaultHour: 15,
            sun: { color: '#fff4dc', int: 2.8 }, hemi: ['#ffe9c2', '#9a6a3a', 0.8] },
  city:   { name: '도시', destName: '전망 타워', dest: 'tower', sky: ['#6f9bd3', '#d9dde6'], fogD: 0.013, ground: '#1d1f2a', path: '#2c3040', amp: 0, freq: 0.03,
            props: ['buildings-far'], density: 0, wet: true, street: 'city', surface: 'asphalt', curve: 0.01, defaultHour: 21,
            sun: { color: '#fff1d6', int: 1.6 }, hemi: ['#b9c7e6', '#2a2a34', 0.8] },
  village:{ name: '옛 동네', destName: '시장 입구', dest: 'gate', sky: ['#6a9ad6', '#e6dfd2'], fogD: 0.012, ground: '#5f5a4e', path: '#726a5c', amp: 1.5, freq: 0.05,
            props: ['deciduous-far'], density: 6, particles: 'fireflies', street: 'village', surface: 'dirt', curve: 0.014, defaultHour: 18,
            sun: { color: '#fff1d6', int: 1.8 }, hemi: ['#c9d2ea', '#3a2f2a', 0.8] },
  mars:   { name: '화성', destName: '화성 기지 돔', dest: 'habitat', sky: ['#5b2f2a', '#c98c6a'], fogD: 0.0105, ground: '#9a4a32', path: '#6e3424', amp: 7, freq: 0.03,
            props: ['rocks', 'boulders'], density: 0, surface: 'gravel', curve: 0.025, defaultHour: 16,
            nightSky: ['#0b0609', '#3b1b16'], twilight: ['#2a1016', '#c0603a'],
            sun: { color: '#ffd9c0', int: 1.6 }, hemi: ['#d8907a', '#3a1a14', 0.6] },
};

const NIGHT_SKY = ['#06091a', '#1d2246'];
const DUSK_SKY = ['#2e3f86', '#f29a5a'];
const DAWN_SKY = ['#6d7fb6', '#f6d2c0'];
const HOUR_RULES = [
  [/자정|한밤/, 0], [/새벽|동틀/, 5.5], [/아침|일출|이른/, 7.2], [/정오|한낮|점심/, 12.5], [/오후/, 15],
  [/노을|석양|황혼|해질|일몰|저녁/, 18.1], [/밤|야경|심야|달빛|별빛/, 21.5],
];
export const HOURS_PER_SECOND = 1 / 120; // 현실 1분 = 그곳 30분

const THEME_RULES = [
  ['mars',    /화성|우주|달 표면|행성|크레이터|외계/],
  ['snow',    /눈|설원|겨울|자작나무|빙하|얼음|설산/],
  ['beach',   /해변|바다|파도|모래사장|제주|섬|해안|바닷|비치|백사장|해수욕장/],
  ['city',    /네온|도시|빌딩|서울|도쿄|홍콩|뉴욕|야경|번화가|도심|강남|홍대|명동/],
  ['village', /옛 동네|시골|마을|한옥|골목|동네|고향|198\d|199\d|8\d년대|9\d년대|시장|주택가|장터/],
  ['desert',  /사막|사구|모래 언덕|선인장|황야/],
  ['forest',  /숲|나무|산|계곡|오솔길|대나무|정글|산책길|수목|둘레길/],
];

export function interpret(prompt) {
  const key = THEME_RULES.find(([, re]) => re.test(prompt))?.[0] ?? 'meadow';
  const t = JSON.parse(JSON.stringify(THEMES[key]));
  t.key = key; t.tags = [];

  const rain   = /(^|\s)비(\s|가|에|오는|내린|내리|$)|빗|장마|우산|젖은/.test(prompt);
  const fog    = /안개|흐린|구름|뿌연/.test(prompt);
  const crowd  = /시장|장터|번화가|축제|광장|거리|골목|야시장|상점가|명동|홍대/.test(prompt) || key === 'city';

  // 시작 시각: 문장에 시간대가 있으면 그 시각, 없으면 테마 기본값
  const hourRule = HOUR_RULES.find(([re]) => re.test(prompt));
  t.startHour = hourRule ? hourRule[1] : t.defaultHour;
  if (hourRule) t.tags.push(hourLabel(t.startHour));
  if (/밤|야경|심야|달빛|별빛|자정|한밤/.test(prompt) && !t.particles && key !== 'snow' && key !== 'city') t.particles = 'fireflies';

  if (rain) { t.particles = 'rain'; t.fogD *= 1.8; t.wet = true; t.rain = true; t.tags.push('비'); }
  if (fog) { t.fogD = Math.max(t.fogD * 2.2, 0.03); t.fog = true; t.tags.push('안개'); }

  t.crowd = crowd;
  if (crowd && key !== 'city') t.tags.push('사람 소리');
  t.links = pickLinks(t);
  return t;
}

export function hourLabel(h) {
  h = ((h % 24) + 24) % 24;
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60 / 5) * 5;
  const m = mm === 60 ? 0 : mm, hr = mm === 60 ? (hh + 1) % 24 : hh;
  const period = hr < 12 ? '오전' : '오후';
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return `${period} ${h12}:${String(m).padStart(2, '0')}`;
}

// 시각(0~24) → 하늘·빛. elev 는 해의 높이(-1~1).
function sunDirection(hour) {
  const a = ((hour - 6) / 12) * Math.PI; // 6시 0, 12시 π/2, 18시 π
  return new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(a) * 0.95, -0.35).normalize();
}
function skyPalette(theme, hour, elev) {
  const night = theme.nightSky ?? NIGHT_SKY;
  const twilight = theme.twilight ?? (hour < 12 ? DAWN_SKY : DUSK_SKY);
  const out = [0, 1].map(i => {
    const c = new THREE.Color(night[i]);
    c.lerp(new THREE.Color(twilight[i]), smoothstep(-0.28, 0.02, elev));
    c.lerp(new THREE.Color(theme.sky[i]), smoothstep(0.06, 0.38, elev));
    return c;
  });
  const daylight = smoothstep(-0.12, 0.25, elev);
  if (theme.rain) {
    const grey = [new THREE.Color('#3a4050').lerp(new THREE.Color('#0d1018'), 1 - daylight), new THREE.Color('#8a909e').lerp(new THREE.Color('#1a1e2a'), 1 - daylight)];
    out[0].lerp(grey[0], 0.85); out[1].lerp(grey[1], 0.85);
  }
  if (theme.fog) out[1].lerp(new THREE.Color('#b9bfc9').lerp(new THREE.Color('#2a2f3a'), 1 - daylight), 0.8);
  return { top: out[0], bottom: out[1], daylight };
}

// ---------- 끝없이 이어지는 길 ----------
const LOOKAHEAD = 420;   // 플레이어 앞으로 미리 만들어 두는 길이 (m)
const KEEP_BEHIND = 160; // 뒤로 남겨 두는 길이 (m)

class Path {
  constructor(rng, { curve, maxTurn = 0.87, start = -80 }) {
    this.rng = rng;
    this.maxK = curve;
    this.maxTurn = maxTurn;
    this.start = start;      // pts[0]의 호 길이(m)
    this.pts = [];
    this.th = 0; this.k = 0; this.kTarget = 0; this.untilNext = 0;
    // 앞이 -z 이므로, 호 0 근처가 원점에 오도록 뒤쪽(+z)에서 출발한다
    this.x = 0; this.z = -start;
    for (let a = start; a <= 0; a++) this._push(a === start);
  }
  _push(first) {
    if (!first) {
      if (this.untilNext <= 0) {
        this.untilNext = 25 + this.rng() * 30;
        let kt = (this.rng() - 0.5) * 2 * this.maxK;
        if (this.th > this.maxTurn * 0.55) kt = -Math.abs(kt);
        if (this.th < -this.maxTurn * 0.55) kt = Math.abs(kt);
        this.kTarget = kt;
      }
      this.untilNext -= 1;
      this.k += (this.kTarget - this.k) * 0.08;
      this.th = clamp(this.th + this.k, -this.maxTurn, this.maxTurn);
      this.x += -Math.sin(this.th);
      this.z += -Math.cos(this.th);
    }
    this.pts.push({ x: this.x, z: this.z, th: this.th });
  }
  get head() { return this.start + this.pts.length - 1; }
  extendTo(arc) { while (this.head < arc) this._push(false); }
  dropBefore(arc) {
    const n = Math.floor(arc - this.start);
    if (n > 40) { this.pts.splice(0, n); this.start += n; }
  }
  at(s) {
    const f = s - this.start;
    const i = clamp(Math.floor(f), 0, this.pts.length - 2);
    const t = clamp(f - i, 0, 1);
    const a = this.pts[i], b = this.pts[i + 1];
    const tx = b.x - a.x, tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    return { x: a.x + tx * t, z: a.z + tz * t, tx: tx / l, tz: tz / l, th: a.th + wrapAngle(b.th - a.th) * t };
  }
  // 호 구간 [from, to] 안에서 가장 가까운 점까지의 거리와 좌우 부호 거리
  nearest(x, z, from = -Infinity, to = Infinity) {
    const i0 = clamp(Math.floor(from - this.start), 0, this.pts.length - 1);
    const i1 = clamp(Math.ceil(to - this.start), 0, this.pts.length - 1);
    let best = Infinity, bi = i0;
    for (let i = i0; i <= i1; i++) {
      const p = this.pts[i]; const dx = p.x - x, dz = p.z - z; const d2 = dx * dx + dz * dz;
      if (d2 < best) { best = d2; bi = i; }
    }
    return this._result(this.pts[bi], x, z, Math.sqrt(best), this.start + bi);
  }
  nearestIn(list, x, z) {
    if (!list.length) return { d: 1e9, side: 0, arc: 0, th: 0 };
    let best = Infinity, bp = list[0];
    for (const p of list) { const dx = p.x - x, dz = p.z - z; const d2 = dx * dx + dz * dz; if (d2 < best) { best = d2; bp = p; } }
    return this._result(bp, x, z, Math.sqrt(best), bp.arc ?? 0);
  }
  _result(p, x, z, d, arc) {
    // 왼쪽 법선: 앞이 (-sin th, -cos th) 이면 왼쪽은 (-cos th, sin th)
    const lx = -Math.cos(p.th), lz = Math.sin(p.th);
    const side = (x - p.x) * lx + (z - p.z) * lz;
    return { d, side, arc, th: p.th };
  }
  collect(minX, maxX, minZ, maxZ) {
    const out = [];
    for (let i = 0; i < this.pts.length; i++) {
      const p = this.pts[i];
      if (p.x >= minX && p.x <= maxX && p.z >= minZ && p.z <= maxZ) out.push({ x: p.x, z: p.z, th: p.th, arc: this.start + i });
    }
    if (!out.length) for (let i = 0; i < this.pts.length; i += 6) { const p = this.pts[i]; out.push({ x: p.x, z: p.z, th: p.th, arc: this.start + i }); }
    return out;
  }
}

// ---------- 세계 ----------
const CHUNK = 64;
const CHUNK_RADIUS = 176;
const CHUNK_DROP = 215;

export class World {
  constructor(canvas, host, hooks = {}) {
    this.canvas = canvas;
    this.host = host;
    this.hooks = hooks; // onStep(side, strength, surface), onProgress(meters), onLandmarkHover(landmark|null)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 1400);
    this.camera.rotation.order = 'YXZ';
    this.raycaster = new THREE.Raycaster();

    this.walking = false;
    this.speedLevel = 3;
    this.speedOverride = null; // 타이틀 배경(파노라마)용
    this.drift = false;
    this.dist = 0;
    this.headYaw = 0; this.pitch = 0; this.bodyYaw = 0;
    this.bob = 0; this.lastStepSign = 1;
    this.camY = 1.7;
    this.active = false;
    this.visible = true;
    this.entry = null;
    this.clock = new THREE.Clock();
    this.chunks = new Map();
    this.along = [];        // 길을 따라 놓인 것들 {arc, group}
    this.landmarks = [];    // 클릭할 수 있는 것들 {arc, root, link}
    this.lamps = [];        // {arc, x, y, z}
    this.pointLights = [];
    this.tick = this.tick.bind(this);

    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    requestAnimationFrame(this.tick);
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  get speed() { return this.speedOverride ?? SPEEDS[this.speedLevel - 1]; }
  setSpeed(level) { this.speedLevel = clamp(Math.round(level), 1, 5); }
  look(dx, dy) { this.headYaw = wrapAngle(this.headYaw + dx); this.pitch = clamp(this.pitch + dy, -1.2, 1.2); }

  // ----- 생성/해제 -----
  dispose() {
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      mats.forEach(m => { Object.values(m).forEach(v => v?.isTexture && v.dispose()); m.dispose(); });
    });
    this.scene.clear();
    this.chunks.clear(); this.along = []; this.landmarks = []; this.lamps = []; this.pointLights = [];
    this.particles = null; this.water = null; this.sky = null; this.sunLight = null;
    this.shared = null;
  }

  // opts.trip: 목적지까지의 거리(m). 없으면 끝없이 걷는 자유 산책.
  // opts.trailhead: 첫 화면용 풀숲 길(모래·자갈).
  build(prompt, opts = {}) {
    this.dispose();
    const theme = interpret(prompt);
    if (opts.trailhead) { theme.path = '#c8b58d'; theme.surface = 'gravel'; theme.startHour = 10.5; theme.name = '풀숲 길'; }
    this.theme = theme;
    this.prompt = prompt;
    this.tripLength = opts.trip ?? null;
    this.arrived = false;
    this.destination = null;
    this.fogBoost = this.fogBoost ?? 0;
    const seed = hashString(prompt);
    this.seed = seed;
    const rng = makeRng(seed);
    this.rng = rng;
    this.noise = [rng() * 100, rng() * 100, rng() * 100, rng() * 100];
    this.path = new Path(makeRng(seed ^ 0x9e3779b9), { curve: theme.curve });
    this.path.extendTo(LOOKAHEAD);
    this.linkIndex = Math.floor(rng() * 7);
    this.nextLandmark = 55 + Math.floor(rng() * 30);
    this.shared = makeSharedAssets(theme, rng);

    // 하늘, 안개 (색은 applyTime 에서 시각에 맞춰 채운다)
    this.scene.fog = new THREE.FogExp2(new THREE.Color('#000000'), theme.fogD);
    this.sky = new THREE.Group();
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { topColor: { value: new THREE.Color() }, bottomColor: { value: new THREE.Color() }, offset: { value: 30 }, exponent: { value: 0.65 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz - cameraPosition; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vW;
        void main(){ float h = normalize(vW + vec3(0.0, offset, 0.0)).y; gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0); }`,
    });
    this.sky.add(new THREE.Mesh(new THREE.SphereGeometry(600, 40, 20), this.skyMat));
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(8, 18, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }));
    this.moonDisc = new THREE.Mesh(new THREE.SphereGeometry(5, 18, 12), new THREE.MeshBasicMaterial({ color: '#e8ecff', fog: false }));
    this.sky.add(this.sunDisc, this.moonDisc);
    {
      const n = 1600, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const u = rng(), v = rng(), th = 2 * Math.PI * u, ph = Math.acos(1 - v), r = 580;
        arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
        arr[i * 3 + 1] = Math.abs(r * Math.cos(ph)) + 10;
        arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, map: spriteTexture('dot'), sizeAttenuation: true, fog: false, transparent: true, opacity: 0, depthWrite: false });
      this.sky.add(new THREE.Points(g, this.starMat));
    }
    this.scene.add(this.sky);

    // 빛
    this.hemi = new THREE.HemisphereLight(theme.hemi[0], theme.hemi[1], theme.hemi[2]);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(theme.sun.color, theme.sun.int);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
    this.scene.add(sun); this.scene.add(sun.target);
    this.sunLight = sun; this.sunDir = new THREE.Vector3(0, 1, 0);

    if (theme.street) {
      const col = theme.street === 'city' ? '#ffd9a0' : '#ffb45a';
      for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(col, 26, 24, 2); this.scene.add(l); this.pointLights.push(l); }
    }
    this.hour = theme.startHour;
    this.applyTime();

    // 물
    if (theme.water) {
      const g = new THREE.PlaneGeometry(600, 600, 60, 60); g.rotateX(-Math.PI / 2);
      const m = new THREE.MeshStandardMaterial({ color: theme.water.color, transparent: true, opacity: 0.8, roughness: 0.15, metalness: 0.15 });
      this.water = new THREE.Mesh(g, m);
      this.water.position.y = theme.water.level;
      this.water.receiveShadow = true;
      this.scene.add(this.water);
    }

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // 날씨 입자
    if (theme.particles) { this.particles = makeParticles(theme.particles, rng); this.scene.add(this.particles.points); }

    // 플레이어 초기화
    this.dist = 0; this.headYaw = 0; this.pitch = 0; this.bob = 0;
    this.alongCursor = this.path.start;
    const p0 = this.path.at(0);
    this.bodyYaw = p0.th;
    this.camY = this.groundY(p0.x, p0.z) + 1.7;
    this.entry = reduceMotion ? null : { t: 0, dur: 1.6 };
    this.walking = false;
    this.active = true;

    // 첫 프레임 전에 주변을 다 만들어 둔다
    this.camera.position.set(p0.x, this.camY, p0.z);
    this.buildAlong();
    this.updateChunks(Infinity);
    this.clock.getDelta();
  }

  // ----- 시각 -----
  setHour(h) { this.hour = ((h % 24) + 24) % 24; this.applyTime(); }
  applyTime() {
    const t = this.theme, hour = this.hour;
    const sunDir = sunDirection(hour);
    const elev = sunDir.y;
    const { top, bottom, daylight } = skyPalette(t, hour, elev);
    this.daylight = daylight;
    this.skyMat.uniforms.topColor.value.copy(top);
    this.skyMat.uniforms.bottomColor.value.copy(bottom);
    this.scene.fog.color.copy(bottom).lerp(top, 0.15);
    this.scene.fog.density = t.fogD + (this.fogBoost || 0);
    this.scene.background = this.scene.fog.color;

    // 해 또는 달이 그림자를 드리운다
    const moonDir = sunDir.clone().multiplyScalar(-1);
    const useMoon = elev < -0.05;
    const dir = useMoon ? moonDir : sunDir;
    const warm = new THREE.Color('#ffb070'), dayCol = new THREE.Color(t.sun.color);
    const sunCol = warm.lerp(dayCol, smoothstep(0.0, 0.4, elev));
    let int = t.sun.int * smoothstep(-0.05, 0.22, elev);
    if (useMoon) { int = 0.35 * smoothstep(-0.05, -0.22, elev); this.sunLight.color.set('#cfd8ff'); }
    else this.sunLight.color.copy(sunCol);
    if (t.rain) int *= 0.35; else if (t.fog) int *= 0.6;
    this.sunLight.intensity = int;
    this.sunDir.copy(dir);

    this.hemi.color.set(t.street ? '#4a4f80' : '#3b4470').lerp(new THREE.Color(t.hemi[0]), daylight);
    this.hemi.groundColor.set(t.street ? '#1c1f30' : '#141826').lerp(new THREE.Color(t.hemi[1]), daylight);
    this.hemi.intensity = lerp(t.street ? 0.6 : 0.45, t.hemi[2], daylight) * (t.rain ? 0.85 : 1);

    this.sunDisc.visible = elev > -0.12 && !t.rain && !t.fog;
    this.sunDisc.position.copy(sunDir).multiplyScalar(560);
    this.sunDisc.material.color.copy(new THREE.Color('#ff9a4a').lerp(new THREE.Color('#fff6e0'), smoothstep(0, 0.35, elev)));
    this.moonDisc.visible = elev < 0.1 && !t.rain && !t.fog;
    this.moonDisc.position.copy(moonDir).multiplyScalar(560);
    this.starMat.opacity = (t.rain || t.fog) ? 0 : 0.9 * (1 - smoothstep(-0.32, -0.03, elev));

    const lampOn = 1 - smoothstep(0.1, 0.45, daylight);
    this.lampOn = lampOn;
    for (const m of this.shared._lampHeadMats.values()) m.emissiveIntensity = 0.2 + 2.3 * lampOn;
    this.shared.winOn.emissiveIntensity = 0.15 + 1.45 * lampOn;
    this.pointLights.forEach(l => { l.intensity = 26 * lampOn; });
    if (this.particles?.kind === 'fireflies') this.particles.points.material.opacity = 0.9 * lampOn;
  }

  // ----- 높이 -----
  baseNoise(x, z) {
    const s = this.noise, f = this.theme.freq;
    return Math.sin(x * f + s[0]) * Math.cos(z * f * 1.27 + s[1])
         + 0.55 * Math.sin((x * 0.7 - z * 0.9) * f * 2.1 + s[2])
         + 0.25 * Math.sin((x + z) * f * 4.3 + s[3]);
  }
  heightFrom(x, z, d, side) {
    const t = this.theme;
    const flat = 0.35 + 0.65 * smoothstep(3, 22, d);
    let h = t.amp * (this.baseNoise(x, z) / 1.8) * flat;
    if (t.water) {
      h = t.water.base + h * 0.6 - t.water.slope * Math.max(0, side - 8) + 0.02 * Math.min(3, Math.max(0, -side - 12));
      h = Math.max(h, -6);
    }
    return h;
  }
  heightNear(x, z, arc) { const q = this.path.nearest(x, z, arc - 40, arc + 40); return this.heightFrom(x, z, q.d, q.side); }
  groundY(x, z) {
    let g = this.heightNear(x, z, this.dist);
    if (this.theme?.water) g = Math.max(g, this.theme.water.level - 0.55);
    return g;
  }

  // ----- 길을 따라 놓이는 것들: 길 리본, 건물, 가로등, 표지판 -----
  buildAlong() {
    const head = this.path.head;
    const t = this.theme;
    const L = this.tripLength;
    while (this.alongCursor + 32 <= head) {
      const a0 = this.alongCursor;
      // 목적지가 있으면 길은 목적지 앞에서 끝난다
      if (L == null || a0 < L + 4) this.addRibbon(a0, L == null ? a0 + 32 : Math.min(a0 + 32, L + 4));
      for (let a = a0; a < a0 + 32; a++) {
        const nearDest = L != null && a > L - 34;
        if (L != null && a === L) this.addDestination(L);
        if (nearDest) continue;
        if (t.street === 'city') {
          if (a % 14 === 0) this.addBuildingPair(a);
          if (a % 16 === 0) this.addLamps(a, 6, 5.2, '#ffd9a0');
        } else if (t.street === 'village') {
          if (a % 10 === 0) this.addHousePair(a);
          if (a % 14 === 0) this.addLamps(a, 5.2, 3.2, '#ffb45a');
        } else if (a >= this.nextLandmark) {
          this.addSignpost(a);
          this.nextLandmark = a + 70 + Math.floor(this.rng() * 50);
        }
      }
      this.alongCursor = a0 + 32;
    }
    // 뒤로 지나간 것 제거
    const cut = this.dist - 120;
    while (this.along.length && this.along[0].arc < cut) {
      const it = this.along.shift();
      this.worldGroup.remove(it.group);
      disposeObject(it.group);
    }
    this.landmarks = this.landmarks.filter(l => l.arc >= cut);
    this.lamps = this.lamps.filter(l => l.arc >= cut - 20);
  }

  place(arc, side, offset) {
    const p = this.path.at(arc);
    const lx = -Math.cos(p.th), lz = Math.sin(p.th); // 왼쪽 법선
    const x = p.x + lx * offset * side, z = p.z + lz * offset * side;
    return { x, z, th: p.th, y: this.heightNear(x, z, arc) };
  }
  track(arc, group) {
    this.worldGroup.add(group);
    this.along.push({ arc, group });
  }

  addRibbon(a0, a1) {
    const w = this.theme.street === 'city' ? 2.8 : 1.5;
    const n = a1 - a0;
    const verts = new Float32Array((n + 1) * 6);
    const idx = [];
    for (let i = 0; i <= n; i++) {
      const L = this.place(a0 + i, 1, w / 2), R = this.place(a0 + i, -1, w / 2);
      verts.set([L.x, L.y + 0.06, L.z, R.x, R.y + 0.06, R.z], i * 6);
      if (i < n) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.shared.ribbonMat);
    mesh.receiveShadow = true;
    mesh.userData.own = true;
    this.track(a0, mesh);
  }

  addLamps(arc, offset, height, color) {
    const g = new THREE.Group();
    for (const side of [-1, 1]) {
      const p = this.place(arc, side, offset);
      const post = new THREE.Mesh(this.shared.lampPost(height), this.shared.postMat);
      post.position.set(p.x, p.y, p.z); post.castShadow = true;
      const head = new THREE.Mesh(this.shared.lampHead, this.shared.lampHeadMat(color));
      head.position.set(p.x, p.y + height, p.z);
      g.add(post, head);
      this.lamps.push({ arc, x: p.x, y: p.y + height - 0.3, z: p.z });
    }
    this.track(arc, g);
  }

  takeLandmarkLink(arc) {
    if (arc < this.nextLandmark) return null;
    this.nextLandmark = arc + 70 + Math.floor(this.rng() * 50);
    const links = this.theme.links;
    const link = links[this.linkIndex % links.length];
    this.linkIndex++;
    return link;
  }

  addBuildingPair(arc) {
    const { rng, shared } = this;
    const g = new THREE.Group();
    const link = this.takeLandmarkLink(arc);
    const linkSide = rng() < 0.5 ? -1 : 1;
    for (const side of [-1, 1]) {
      if (rng() < 0.12 && !(link && side === linkSide)) continue;
      const w = 7 + rng() * 4, d = 7 + rng() * 4;
      const hgt = 10 + rng() * rng() * 36;
      const p = this.place(arc, side, 10 + rng() * 3 + w / 2);
      const tex = shared.windowTex.clone(); tex.repeat.set(w / 2.4, hgt / 3); tex.needsUpdate = true;
      const sideMat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#f5e6c8', emissiveIntensity: 0.9, roughness: 0.75 });
      const topMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1a1d2b').offsetHSL(0, 0, (rng() - 0.5) * 0.08), roughness: 0.9 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), [sideMat, sideMat, topMat, topMat, sideMat, sideMat]);
      mesh.position.set(p.x, p.y + hgt / 2 - 0.2, p.z);
      mesh.rotation.y = p.th;
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.own = true; mesh.userData.ownMat = true;
      (g.userData.emissives ??= []).push(sideMat);
      g.add(mesh);
      // 길 쪽 면: 왼쪽 건물은 로컬 +x, 오른쪽 건물은 로컬 -x
      const faceX = -side * (w / 2 + 0.2);
      if (link && side === linkSide) {
        const sign = makeSignBoard(link, { glow: true, width: Math.min(w * 0.8, 7) });
        sign.position.set(faceX - side * 0.15, 4.2, 0);
        sign.rotation.y = -side * Math.PI / 2;
        mesh.add(sign);
        this.landmarks.push({ arc, root: mesh, link });
        mesh.userData.link = link;
      } else if (rng() < 0.35) {
        const c = NEON[Math.floor(rng() * NEON.length)];
        const neon = new THREE.Mesh(shared.unitBox, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.2, roughness: 0.4 }));
        neon.scale.set(0.3, 1.1, Math.min(d * 0.6, 5));
        neon.position.set(faceX, 3 + rng() * Math.min(hgt * 0.6, 20), 0);
        mesh.add(neon);
      }
    }
    this.track(arc, g);
  }

  addHousePair(arc) {
    const { rng, shared } = this;
    const g = new THREE.Group();
    const link = this.takeLandmarkLink(arc);
    const linkSide = rng() < 0.5 ? -1 : 1;
    for (const side of [-1, 1]) {
      for (const row of [0, 1]) {
        if (row === 1 && rng() < 0.5) continue;
        const w = 5.5 + rng() * 2, d = 4.6 + rng() * 1.6, hh = 3 + rng() * 0.8;
        const p = this.place(arc + (row ? 4 : 0), side, (row ? 23 : 10.5) + (rng() - 0.5) * 2);
        const house = new THREE.Group();
        house.position.set(p.x, p.y - 0.1, p.z); house.rotation.y = p.th;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), shared.wallMats[Math.floor(rng() * shared.wallMats.length)]);
        body.position.y = hh / 2; body.castShadow = true; body.receiveShadow = true; body.userData.own = true;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.3, 4), shared.roofMats[Math.floor(rng() * shared.roofMats.length)]);
        roof.rotation.y = Math.PI / 4; roof.position.y = hh + 1.05; roof.castShadow = true; roof.userData.own = true;
        house.add(body, roof);
        const faceX = -side * (w / 2 + 0.02);
        for (const off of [-1.4, 1.4]) {
          const win = new THREE.Mesh(shared.winGeo, rng() < 0.7 ? shared.winOn : shared.winOff);
          win.position.set(faceX, hh * 0.55, off); win.rotation.y = -side * Math.PI / 2;
          house.add(win);
        }
        if (link && row === 0 && side === linkSide) {
          const sign = makeSignBoard(link, { glow: true, width: Math.min(w * 0.9, 5) });
          sign.position.set(faceX - side * 0.12, hh + 0.2, 0); sign.rotation.y = -side * Math.PI / 2;
          house.add(sign);
          house.userData.link = link;
          this.landmarks.push({ arc, root: house, link });
        }
        g.add(house);
      }
    }
    this.track(arc, g);
  }

  addSignpost(arc) {
    const links = this.theme.links;
    const link = links[this.linkIndex % links.length]; this.linkIndex++;
    const side = this.rng() < 0.5 ? -1 : 1;
    const p = this.place(arc, side, 3.6);
    const root = new THREE.Group();
    root.position.set(p.x, p.y, p.z); root.rotation.y = p.th;
    const post = new THREE.Mesh(this.shared.signPost, this.shared.woodMat);
    post.position.y = 1.1; post.castShadow = true;
    const board = makeSignBoard(link, { glow: true, width: 2.2, wood: true });
    board.position.set(0, 2.05, 0);
    board.rotation.y = -side * 0.35; // 길 쪽으로 살짝 틀어 둔다
    root.add(post, board);
    root.userData.link = link;
    this.landmarks.push({ arc, root, link });
    this.track(arc, root);
  }

  // ----- 목적지 건물 -----
  addDestination(L) {
    const p = this.place(L + 14, 1, 0);
    const link = this.theme.links[0];
    const root = makeDestination(this.theme, this.shared, this.rng);
    root.position.set(p.x, p.y, p.z); root.rotation.y = p.th;
    const sign = makeSignBoard({ name: this.theme.destName, tag: this.prompt }, { glow: true, width: 3.2 });
    sign.position.set(0, 2.3, SIGN_FRONT[this.theme.dest] ?? 6); // 건물 앞, 걸어오는 쪽
    root.add(sign);
    root.userData.link = link;
    root.userData.isDestination = true;
    this.landmarks.push({ arc: L, root, link });
    this.destination = { x: p.x, z: p.z, arc: L, root };
    this.track(L, root);
  }

  get remaining() { return this.tripLength == null ? null : Math.max(0, this.tripLength - 2 - this.dist); }

  // ----- 청크 -----
  updateChunks(budget = 2) {
    const cx = Math.floor(this.camera.position.x / CHUNK), cz = Math.floor(this.camera.position.z / CHUNK);
    const r = Math.ceil(CHUNK_RADIUS / CHUNK) + 1;
    const want = [];
    for (let i = cx - r; i <= cx + r; i++) for (let j = cz - r; j <= cz + r; j++) {
      const key = `${i},${j}`;
      if (this.chunks.has(key)) continue;
      const dx = (i + 0.5) * CHUNK - this.camera.position.x, dz = (j + 0.5) * CHUNK - this.camera.position.z;
      const d = Math.hypot(dx, dz);
      if (d <= CHUNK_RADIUS) want.push({ i, j, key, d });
    }
    want.sort((a, b) => a.d - b.d);
    for (const w of want.slice(0, budget)) this.chunks.set(w.key, this.makeChunk(w.i, w.j));
    for (const [key, ch] of this.chunks) {
      const dx = ch.cx - this.camera.position.x, dz = ch.cz - this.camera.position.z;
      if (Math.hypot(dx, dz) > CHUNK_DROP) { this.worldGroup.remove(ch.group); disposeObject(ch.group); this.chunks.delete(key); }
    }
  }

  makeChunk(i, j) {
    const t = this.theme, shared = this.shared;
    const x0 = i * CHUNK, z0 = j * CHUNK, cx = x0 + CHUNK / 2, cz = z0 + CHUNK / 2;
    const group = new THREE.Group();
    const near = this.path.collect(x0 - 48, x0 + CHUNK + 48, z0 - 48, z0 + CHUNK + 48);
    const H = (x, z) => { const q = this.path.nearestIn(near, x, z); return this.heightFrom(x, z, q.d, q.side); };

    // 지형
    const seg = 24;
    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, nrm = geo.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color(), e = 0.9;
    for (let k = 0; k < pos.count; k++) {
      const x = cx + pos.getX(k), z = cz + pos.getZ(k);
      const y = H(x, z);
      pos.setY(k, y);
      const nx = -(H(x + e, z) - H(x - e, z)) / (2 * e), nz = -(H(x, z + e) - H(x, z - e)) / (2 * e);
      const l = Math.hypot(nx, 1, nz); nrm.setXYZ(k, nx / l, 1 / l, nz / l);
      const n = 0.5 + 0.5 * Math.sin(x * 0.21 + Math.sin(z * 0.17) * 2.0) * Math.cos(z * 0.19 + Math.sin(x * 0.13) * 1.7);
      c.copy(shared.g1).lerp(n > 0.5 ? shared.g2 : shared.g3, Math.abs(n - 0.5) * 2);
      if (t.water && y < t.water.level + 0.9) c.lerp(shared.gWet, smoothstep(t.water.level + 0.9, t.water.level - 0.4, y));
      colors[k * 3] = c.r; colors[k * 3 + 1] = c.g; colors[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const terrain = new THREE.Mesh(geo, shared.groundMat);
    terrain.position.set(cx, 0, cz);
    terrain.receiveShadow = true;
    terrain.userData.own = true;
    group.add(terrain);

    // 소품
    const rng = makeRng(hash2(this.seed, i, j));
    const ctx = {
      rng, group, theme: t, shared, H,
      scatter: (count, clear, filter) => {
        const out = []; let guard = count * 6;
        while (out.length < count && guard-- > 0) {
          const x = x0 + rng() * CHUNK, z = z0 + rng() * CHUNK;
          const q = this.path.nearestIn(near, x, z);
          if (q.d < clear) continue;
          if (this.tripLength != null && Math.abs(q.arc - this.tripLength - 14) < 32 && q.d < 24) continue; // 목적지 둘레는 비운다
          const y = this.heightFrom(x, z, q.d, q.side);
          if (t.water && y < 0.45) continue;
          if (filter && !filter(x, y, z, q)) continue;
          out.push({ x, y, z });
        }
        return out;
      },
    };
    for (const p of t.props) PROPS[p]?.(ctx);

    this.worldGroup.add(group);
    return { cx, cz, group };
  }

  // ----- 클릭/호버 -----
  pick(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const roots = this.landmarks.map(l => l.root);
    const hits = this.raycaster.intersectObjects(roots, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.link) o = o.parent;
    return o ? { link: o.userData.link, distance: hits[0].distance } : null;
  }

  // ----- 프레임 -----
  tick() {
    requestAnimationFrame(this.tick);
    if (!this.active) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (document.hidden || !this.visible) return;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    let moving = this.walking ? this.speed : 0;
    this.dist += moving * dt;
    if (this.tripLength != null && this.dist >= this.tripLength - 2) {
      this.dist = this.tripLength - 2; moving = 0; this.walking = false;
      if (!this.arrived) { this.arrived = true; this.hooks.onArrive?.(this); }
    }

    // 시간은 늘 흐른다: 현실 1분 = 그곳 30분
    this.hour = (this.hour + dt * HOURS_PER_SECOND) % 24;
    this.applyTime();

    // 길을 앞으로 늘리고 뒤를 정리
    this.path.extendTo(this.dist + LOOKAHEAD);
    this.path.dropBefore(this.dist - KEEP_BEHIND);
    this.buildAlong();

    const p = this.path.at(this.dist);
    this.bodyYaw = wrapAngle(this.bodyYaw + wrapAngle(p.th - this.bodyYaw) * (1 - Math.exp(-dt * 5)));
    if (this.drift) this.headYaw = 0.35 * Math.sin(performance.now() * 0.00012);

    // 발걸음
    if (!reduceMotion || true) {
      const before = Math.sin(this.bob);
      this.bob += dt * moving * 1.8;
      const after = Math.sin(this.bob);
      if (moving > 0 && Math.sign(after) !== Math.sign(before) && Math.abs(after - before) > 1e-4) {
        this.lastStepSign = -this.lastStepSign;
        this.hooks.onStep?.(this.lastStepSign, Math.min(1, moving / 4), this.theme.surface);
      }
    }
    const eye = this.groundY(p.x, p.z) + 1.7;
    this.camY = lerp(this.camY, eye, 1 - Math.exp(-dt * 10));
    let y = this.camY + (reduceMotion ? 0 : Math.sin(this.bob) * 0.03 * Math.min(1, moving / 3));

    let pitchOffset = 0, fov = 72;
    if (this.entry) {
      this.entry.t += dt;
      const e2 = easeOut(clamp(this.entry.t / this.entry.dur, 0, 1));
      y += lerp(3.2, 0, e2); pitchOffset = lerp(-0.42, 0, e2); fov = lerp(92, 72, e2);
      if (e2 >= 1) this.entry = null;
    }
    if (this.camera.fov !== fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.camera.position.set(p.x, y, p.z);
    this.camera.rotation.set(this.pitch + pitchOffset, this.bodyYaw + this.headYaw, 0);

    this.updateChunks(2);

    // 하늘, 해, 물, 입자는 플레이어를 따라간다
    this.sky.position.copy(this.camera.position);
    const s = this.sunLight;
    s.position.copy(this.camera.position).addScaledVector(this.sunDir, 150);
    s.target.position.copy(this.camera.position); s.target.updateMatrixWorld();
    if (this.water) {
      this.water.position.x = Math.round(this.camera.position.x / 4) * 4;
      this.water.position.z = Math.round(this.camera.position.z / 4) * 4;
      const t = performance.now() * 0.001, pa = this.water.geometry.attributes.position, ox = this.water.position.x, oz = this.water.position.z;
      for (let k = 0; k < pa.count; k++) {
        const x = pa.getX(k) + ox, z = pa.getZ(k) + oz;
        pa.setY(k, 0.07 * Math.sin(x * 0.28 + t * 1.2) * Math.cos(z * 0.22 + t * 0.9));
      }
      pa.needsUpdate = true;
      this.water.geometry.computeVertexNormals();
    }
    if (this.particles) this.particles.update(dt, this.camera.position, this.lampOn);
    if (this.destination?.root) {
      const r = this.destination.root;
      if (r.userData.blades) r.userData.blades.rotation.z += dt * 0.5;
      const l = r.userData.light;
      if (l) { l.userData.base ??= l.intensity; l.intensity = l.userData.base * (0.15 + 0.85 * this.lampOn); }
    }
    for (const it of this.along) {
      const ems = it.group.userData.emissives;
      if (ems) for (const m of ems) m.emissiveIntensity = 0.9 * (0.15 + 0.85 * this.lampOn);
    }

    // 가까운 가로등에만 실제 광원을 붙인다
    if (this.pointLights.length) {
      const cands = this.lamps.filter(l => l.arc > this.dist - 12).sort((a, b) => a.arc - b.arc).slice(0, this.pointLights.length);
      this.pointLights.forEach((pl, k) => { const l = cands[k]; if (l) { pl.visible = true; pl.position.set(l.x, l.y, l.z); } else pl.visible = false; });
    }
    this.hooks.onProgress?.(this.dist);
  }
}

// ---------- 공용 재료 ----------
const NEON = ['#ff3ea5', '#2ee6ff', '#ffd166', '#9b5cff', '#3cff9a'];

function makeSharedAssets(theme, rng) {
  const g1 = new THREE.Color(theme.ground);
  const s = {
    g1, g2: g1.clone().offsetHSL(0.015, 0.04, 0.07), g3: g1.clone().offsetHSL(-0.015, -0.04, -0.09), gWet: g1.clone().offsetHSL(0, 0.05, -0.18),
    groundMat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: theme.wet ? 0.35 : 0.95, metalness: theme.wet ? 0.15 : 0 }),
    ribbonMat: new THREE.MeshStandardMaterial({ color: theme.path, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    postMat: new THREE.MeshStandardMaterial({ color: '#2a2d3a', roughness: 0.8 }),
    woodMat: new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.95 }),
    lampHead: new THREE.SphereGeometry(0.28, 10, 8),
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    signPost: new THREE.CylinderGeometry(0.07, 0.09, 2.2, 7),
    winGeo: new THREE.PlaneGeometry(0.9, 1.0),
    winOn: new THREE.MeshStandardMaterial({ color: '#ffb45a', emissive: '#ffb45a', emissiveIntensity: 1.6 }),
    winOff: new THREE.MeshStandardMaterial({ color: '#1a1a22', roughness: 0.9 }),
    wallMats: ['#8a7f70', '#a09484', '#6f6a68', '#b9ad9a', '#7d7466'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })),
    roofMats: ['#3b3844', '#4a3f3f', '#2f3340'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true })),
    windowTex: windowTexture(rng),
    birchTex: birchTexture(rng),
    _lampPosts: new Map(), _lampHeadMats: new Map(),
    lampPost(h) { if (!this._lampPosts.has(h)) { const g = new THREE.CylinderGeometry(0.07, 0.1, h, 6); g.translate(0, h / 2, 0); this._lampPosts.set(h, g); } return this._lampPosts.get(h); },
    lampHeadMat(c) { if (!this._lampHeadMats.has(c)) this._lampHeadMats.set(c, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.5 })); return this._lampHeadMats.get(c); },
    // 소품 기하
    trunk: (() => { const g = new THREE.CylinderGeometry(0.2, 0.36, 2.8, 7); g.translate(0, 1.4, 0); return g; })(),
    canopy: (() => { const g = new THREE.SphereGeometry(1, 10, 8); g.translate(0, 0.85, 0); return g; })(),
    cTrunk: (() => { const g = new THREE.CylinderGeometry(0.18, 0.32, 2.2, 7); g.translate(0, 1.1, 0); return g; })(),
    cone: (() => { const g = new THREE.ConeGeometry(1.7, 6.2, 8); g.translate(0, 3.1, 0); return g; })(),
    bTrunk: (() => { const g = new THREE.CylinderGeometry(0.13, 0.22, 7.5, 7); g.translate(0, 3.75, 0); return g; })(),
    branch: (() => { const g = new THREE.CylinderGeometry(0.035, 0.06, 2.6, 5); g.translate(0, 1.3, 0); return g; })(),
    pTrunk: (() => { const g = new THREE.CylinderGeometry(0.2, 0.42, 7.5, 7); g.translate(0, 3.75, 0); return g; })(),
    leaf: (() => {
      const g = new THREE.PlaneGeometry(1.1, 4.4, 1, 3); g.rotateX(-Math.PI / 2); g.translate(0, 0, 2.2);
      const lp = g.attributes.position; for (let i = 0; i < lp.count; i++) { const z = lp.getZ(i); lp.setY(i, -0.25 * (z / 4.4) * (z / 4.4) * 4.4); }
      return g;
    })(),
    cactus: (() => { const g = new THREE.CylinderGeometry(0.42, 0.52, 3.4, 9); g.translate(0, 1.7, 0); return g; })(),
    armH: (() => { const g = new THREE.CylinderGeometry(0.22, 0.26, 1.1, 7); g.rotateZ(Math.PI / 2); g.translate(0.55, 0, 0); return g; })(),
    armV: (() => { const g = new THREE.CylinderGeometry(0.22, 0.24, 1.3, 7); g.translate(1.1, 0.65, 0); return g; })(),
    rock: new THREE.DodecahedronGeometry(1, 0),
    boulder: new THREE.DodecahedronGeometry(1, 1),
    flatWhite: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }),
    white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }),
    rockMat: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }),
    trunkMat: new THREE.MeshStandardMaterial({ color: '#5b4030', roughness: 0.95 }),
    cTrunkMat: new THREE.MeshStandardMaterial({ color: '#4a3326', roughness: 0.95 }),
    pTrunkMat: new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.95 }),
    leafMat: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide }),
    cactusMat: new THREE.MeshStandardMaterial({ color: '#4f7f45', roughness: 0.85 }),
  };
  s.birchMat = new THREE.MeshStandardMaterial({ map: s.birchTex, roughness: 0.9 });
  return s;
}

function disposeObject(root) {
  root.traverse(o => {
    if (o.isInstancedMesh) { o.dispose(); return; }
    // 공용 기하/재질은 두고, 각자 만든 것만 지운다
    if (o.userData.own) { o.geometry?.dispose(); }
    if (o.isMesh && o.userData.ownMat) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose(); m.dispose(); }); }
  });
}

function instanced(ctx, geo, mat, items, { shadow = true } = {}) {
  if (!items.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const d = new THREE.Object3D(); d.rotation.order = 'YXZ';
  items.forEach((it, i) => {
    d.position.set(it.x, it.y, it.z);
    d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    const s = it.s ?? 1;
    if (typeof s === 'number') d.scale.setScalar(s); else d.scale.set(s[0], s[1], s[2]);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
    if (it.color) m.setColorAt(i, it.color);
  });
  m.castShadow = shadow; m.receiveShadow = shadow;
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  ctx.group.add(m);
  return m;
}
const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l);

const PROPS = {
  deciduous(ctx) { treesDeciduous(ctx, ctx.theme.density, 3.5); },
  'deciduous-far'(ctx) { treesDeciduous(ctx, ctx.theme.density, 30); },
  conifer(ctx) { treesConifer(ctx, ctx.theme.density, false); },
  'conifer-snow'(ctx) { treesConifer(ctx, Math.round(ctx.theme.density * 0.45), true); },

  birch(ctx) {
    const { rng, shared } = ctx;
    const items = ctx.scatter(ctx.theme.density, 3.2).map(p => ({ ...p, ry: rng() * 6.28, s: [1, 0.8 + rng() * 0.6, 1] }));
    instanced(ctx, shared.bTrunk, shared.birchMat, items);
    const branches = [];
    items.forEach(t => { for (let i = 0; i < 3; i++) branches.push({ x: t.x, y: t.y + (4.2 + rng() * 2.8) * t.s[1], z: t.z, ry: rng() * 6.28, rz: 0.9 + rng() * 0.5, s: 0.8 + rng() * 0.5, color: hsl(0.08, 0.1, 0.3) }); });
    instanced(ctx, shared.branch, shared.white, branches, { shadow: false });
  },

  palms(ctx) {
    const { rng, shared } = ctx;
    const trunks = ctx.scatter(ctx.theme.density, 5.2).map(p => ({ ...p, rx: (rng() - 0.5) * 0.3, rz: (rng() - 0.5) * 0.3, ry: rng() * 6.28, s: [1, 0.8 + rng() * 0.5, 1] }));
    instanced(ctx, shared.pTrunk, shared.pTrunkMat, trunks);
    const leaves = [], top = new THREE.Vector3(), e = new THREE.Euler(0, 0, 0, 'YXZ');
    trunks.forEach(t => {
      e.set(t.rx, t.ry, t.rz); top.set(0, 7.5 * t.s[1], 0).applyEuler(e);
      const n = 6 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) leaves.push({ x: t.x + top.x, y: t.y + top.y, z: t.z + top.z, ry: (i / n) * 6.28 + rng() * 0.4, rx: 0.35 + rng() * 0.45, s: 0.8 + rng() * 0.4, color: hsl(0.3 + rng() * 0.05, 0.45, 0.28 + rng() * 0.12) });
    });
    instanced(ctx, shared.leaf, shared.leafMat, leaves);
  },

  cacti(ctx) {
    const { rng, shared } = ctx;
    const items = ctx.scatter(ctx.theme.density, 3.2).map(p => ({ ...p, ry: rng() * 6.28, s: 0.8 + rng() * 0.7 }));
    instanced(ctx, shared.cactus, shared.cactusMat, items);
    const arms = [];
    items.forEach(c => { const n = rng() < 0.7 ? 2 : 1; for (let i = 0; i < n; i++) arms.push({ x: c.x, y: c.y + (1.4 + rng()) * c.s, z: c.z, ry: c.ry + (i ? Math.PI : 0) + (rng() - 0.5), s: c.s }); });
    instanced(ctx, shared.armH, shared.cactusMat, arms); instanced(ctx, shared.armV, shared.cactusMat, arms);
  },

  rocks(ctx) {
    const { rng, shared, theme } = ctx;
    const base = new THREE.Color(theme.key === 'mars' ? '#7a3a28' : theme.key === 'beach' ? '#8a8276' : theme.key === 'snow' ? '#8a93a0' : '#6b6b70');
    const items = ctx.scatter(theme.key === 'mars' ? 22 : 8, 2.2, (x, y) => !theme.water || y > 0.2)
      .map(p => ({ ...p, y: p.y - 0.15, rx: rng() * 3, ry: rng() * 3, rz: rng() * 3, s: [0.5 + rng() * 1.3, 0.35 + rng() * 0.7, 0.5 + rng() * 1.3], color: base.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.16) }));
    instanced(ctx, shared.rock, shared.rockMat, items);
  },

  boulders(ctx) {
    const { rng, shared } = ctx;
    const base = new THREE.Color('#8f4530');
    const items = ctx.scatter(3, 7).map(p => ({ ...p, y: p.y - 0.6, rx: rng() * 3, ry: rng() * 3, rz: rng() * 3, s: [2 + rng() * 3, 1.4 + rng() * 2.2, 2 + rng() * 3], color: base.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.14) }));
    instanced(ctx, shared.boulder, shared.rockMat, items);
  },

  // 길에서 멀리 떨어진 배경 빌딩
  'buildings-far'(ctx) {
    const { rng, shared, group } = ctx;
    const spots = ctx.scatter(4, 30);
    for (const p of spots) {
      const w = 8 + rng() * 6, d = 8 + rng() * 6, hgt = 14 + rng() * rng() * 50;
      const tex = shared.windowTex.clone(); tex.repeat.set(w / 2.4, hgt / 3); tex.needsUpdate = true;
      const sideMat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#f5e6c8', emissiveIntensity: 0.9, roughness: 0.75 });
      const topMat = new THREE.MeshStandardMaterial({ color: '#1a1d2b', roughness: 0.9 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), [sideMat, sideMat, topMat, topMat, sideMat, sideMat]);
      mesh.position.set(p.x, p.y + hgt / 2 - 0.2, p.z); mesh.rotation.y = rng() * 0.5;
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.own = true; mesh.userData.ownMat = true;
      group.add(mesh);
    }
  },
};

function treesDeciduous(ctx, count, clear) {
  const { rng, shared, theme } = ctx;
  const pts = ctx.scatter(count, clear);
  const dark = theme.key === 'village';
  const trunks = pts.map(p => ({ ...p, ry: rng() * 6.28, s: [1, 0.9 + rng() * 0.5, 1] }));
  instanced(ctx, shared.trunk, shared.trunkMat, trunks);
  const canopies = trunks.map(t => { const r = 1.7 + rng() * 1.2; return { x: t.x, y: t.y + 2.8 * t.s[1], z: t.z, ry: rng() * 6.28, s: [r, r * (0.8 + rng() * 0.3), r], color: hsl(0.22 + rng() * 0.12, 0.38 + rng() * 0.15, dark ? 0.24 + rng() * 0.08 : 0.3 + rng() * 0.12) }; });
  instanced(ctx, shared.canopy, shared.flatWhite, canopies);
}

function treesConifer(ctx, count, snowy) {
  const { rng, shared } = ctx;
  const pts = ctx.scatter(count, 3.5);
  const trunks = pts.map(p => ({ ...p, ry: rng() * 6.28, s: [1, 0.85 + rng() * 0.6, 1] }));
  instanced(ctx, shared.cTrunk, shared.cTrunkMat, trunks);
  const cones = trunks.map(t => ({ x: t.x, y: t.y + 1.6 * t.s[1], z: t.z, ry: rng() * 6.28, s: [0.8 + rng() * 0.5, t.s[1], 0.8 + rng() * 0.5], color: snowy ? hsl(0.4 + rng() * 0.05, 0.12, 0.55 + rng() * 0.15) : hsl(0.33 + rng() * 0.05, 0.35, 0.2 + rng() * 0.1) }));
  instanced(ctx, shared.cone, shared.flatWhite, cones);
}

// ---------- 목적지 건물 ----------
// 걸어오는 사람은 로컬 +z 쪽에서 다가온다. 간판은 건물 정면보다 조금 앞에 둔다.
const SIGN_FRONT = { lighthouse: 8, cabin: 7, dome: 7.5, tower: 9.5, gate: 3.5, habitat: 9.8, windmill: 5 };
function own(mesh, ownMat = true) { mesh.userData.own = true; mesh.userData.ownMat = ownMat; mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
function mat(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra }); }
function makeDestination(theme, shared, rng) {
  const root = new THREE.Group();
  const add = (geo, m, x, y, z) => { const mesh = own(new THREE.Mesh(geo, m)); mesh.position.set(x, y, z); root.add(mesh); return mesh; };
  switch (theme.dest) {
    case 'lighthouse': {
      add(new THREE.CylinderGeometry(1.9, 2.5, 14, 20), mat('#f1efe9'), 0, 7, 0);
      for (const y of [3, 7.5, 12]) add(new THREE.CylinderGeometry(2.42 - (y / 14) * 0.5, 2.5 - (y / 14) * 0.5, 1.2, 20), mat('#c8392b'), 0, y, 0);
      add(new THREE.CylinderGeometry(1.7, 1.7, 2.2, 16), mat('#ffe9a0', { emissive: '#ffe9a0', emissiveIntensity: 1.4, transparent: true, opacity: 0.9 }), 0, 15.1, 0);
      add(new THREE.ConeGeometry(2.1, 1.8, 16), mat('#c8392b'), 0, 17.1, 0);
      add(new THREE.BoxGeometry(5, 3, 4), mat('#e6e1d4'), 0, 1.5, 4.5);
      add(new THREE.ConeGeometry(3.8, 1.6, 4), mat('#3b3844', { flatShading: true }), 0, 3.8, 4.5).rotation.y = Math.PI / 4;
      const light = new THREE.PointLight('#ffe9a0', 60, 60, 2); light.position.set(0, 15.2, 0); root.add(light); root.userData.light = light;
      break;
    }
    case 'cabin': {
      const snow = theme.key === 'snow';
      add(new THREE.BoxGeometry(8, 3.6, 6.5), mat(snow ? '#5a4030' : '#6b4a2e'), 0, 1.8, 0);
      const roof = add(new THREE.ConeGeometry(6.2, 2.8, 4), mat(snow ? '#e8edf2' : '#3b3844', { flatShading: true }), 0, 5, 0);
      roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, 1);
      add(new THREE.BoxGeometry(0.9, 2.2, 0.9), mat('#55514a'), 2.4, 5.4, -1);
      add(new THREE.PlaneGeometry(1.2, 2.2), mat('#2e1f14'), 0, 1.1, 3.26);
      for (const x of [-2.4, 2.4]) add(new THREE.PlaneGeometry(1.2, 1.1), mat('#ffb45a', { emissive: '#ffb45a', emissiveIntensity: 1.4 }), x, 2, 3.26);
      add(new THREE.BoxGeometry(9, 0.3, 2.4), mat(snow ? '#4a3626' : '#5b4030'), 0, 0.15, 4.4);
      break;
    }
    case 'dome': {
      add(new THREE.SphereGeometry(5.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d9b887'), 0, 0, 0);
      add(new THREE.BoxGeometry(2.4, 3.2, 1.6), mat('#2e1f14'), 0, 1.6, 5.2);
      add(new THREE.CircleGeometry(4, 24).rotateX(-Math.PI / 2), mat('#2f7f9f', { roughness: 0.2, metalness: 0.2 }), 8.5, 0.08, 1);
      for (const [x, z] of [[11.5, -1.5], [7, -4.5]]) {
        const t = add(shared.pTrunk, shared.pTrunkMat, x, 0, z); t.userData.own = false; t.userData.ownMat = false; t.rotation.z = (rng() - 0.5) * 0.3;
        for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(shared.leaf, shared.leafMat); l.position.set(x, 7.5, z); l.rotation.order = 'YXZ'; l.rotation.set(0.45, (i / 7) * 6.28, 0); l.castShadow = true; root.add(l); }
      }
      break;
    }
    case 'tower': {
      const tex = shared.windowTex.clone(); tex.repeat.set(4, 20); tex.needsUpdate = true;
      const side = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#f5e6c8', emissiveIntensity: 0.9, roughness: 0.75 });
      const top = mat('#1a1d2b');
      const body = own(new THREE.Mesh(new THREE.BoxGeometry(10, 58, 10), [side, side, top, top, side, side])); body.position.y = 29; root.add(body);
      add(new THREE.CylinderGeometry(0.3, 0.5, 12, 8), mat('#9aa3ad'), 0, 64, 0);
      add(new THREE.TorusGeometry(6.5, 0.4, 10, 40).rotateX(Math.PI / 2), mat('#2ee6ff', { emissive: '#2ee6ff', emissiveIntensity: 2 }), 0, 58.5, 0);
      add(new THREE.BoxGeometry(14, 4, 14), mat('#23283a'), 0, 2, 0);
      add(new THREE.BoxGeometry(3, 3.2, 0.3), mat('#ffd166', { emissive: '#ffd166', emissiveIntensity: 1.2 }), 0, 1.8, 7.1);
      break;
    }
    case 'gate': {
      for (const x of [-4.5, 4.5]) add(new THREE.BoxGeometry(0.8, 6, 0.8), mat('#7a3b2a'), x, 3, 0);
      add(new THREE.BoxGeometry(11, 1.1, 0.9), mat('#7a3b2a'), 0, 5.8, 0);
      add(new THREE.BoxGeometry(12.5, 0.45, 2), mat('#3b3844'), 0, 6.6, 0);
      for (const x of [-3, 0, 3]) add(new THREE.SphereGeometry(0.35, 10, 8), mat('#ffb45a', { emissive: '#ffb45a', emissiveIntensity: 2 }), x, 4.9, 0.6);
      for (const [x, c] of [[-7, '#c8392b'], [7, '#2f6fa0']]) {
        add(new THREE.BoxGeometry(3.2, 1, 1.6), mat('#a09484'), x, 0.5, -3);
        const aw = add(new THREE.PlaneGeometry(3.6, 2), mat(c, { side: THREE.DoubleSide }), x, 2.3, -2.6); aw.rotation.x = -0.9;
      }
      const light = new THREE.PointLight('#ffb45a', 30, 30, 2); light.position.set(0, 4.5, 1.5); root.add(light); root.userData.light = light;
      break;
    }
    case 'habitat': {
      add(new THREE.SphereGeometry(6.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#cfe3ff', { transparent: true, opacity: 0.45, emissive: '#8fb7ff', emissiveIntensity: 0.3, roughness: 0.2 }), 0, 0, 0);
      add(new THREE.BoxGeometry(3.2, 2.8, 3.4), mat('#9aa3ad'), 0, 1.4, 6.4);
      add(new THREE.CylinderGeometry(0.1, 0.15, 7, 6), mat('#9aa3ad'), 5, 3.5, -3);
      add(new THREE.SphereGeometry(0.3, 8, 8), mat('#ff4a3a', { emissive: '#ff4a3a', emissiveIntensity: 2.5 }), 5, 7.2, -3);
      add(new THREE.BoxGeometry(5, 0.3, 4), mat('#2b3a5a', { metalness: 0.4, roughness: 0.4 }), -8, 2.4, 0).rotation.z = 0.35;
      break;
    }
    default: { // windmill
      add(new THREE.CylinderGeometry(1.7, 2.4, 9, 16), mat('#d9d3c4'), 0, 4.5, 0);
      add(new THREE.ConeGeometry(2.2, 2.2, 16), mat('#5b4030'), 0, 10.1, 0);
      const hub = new THREE.Group(); hub.position.set(0, 8.6, 2.1);
      for (let i = 0; i < 4; i++) { const b = own(new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.15), mat('#f1efe9'))); b.position.y = 3.5; const g = new THREE.Group(); g.rotation.z = (i / 4) * Math.PI * 2; g.add(b); hub.add(g); }
      root.add(hub); root.userData.blades = hub;
      add(new THREE.PlaneGeometry(1, 2), mat('#2e1f14'), 0, 1, 2.42);
    }
  }
  return root;
}

// ---------- 간판 ----------
function makeSignBoard(link, { glow = false, width = 2.2, wood = false } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = wood ? '#4a3321' : (glow ? '#141a2e' : '#f1efe9');
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = glow ? '#f0b43f' : (wood ? '#2e1f14' : '#1b2140');
  g.lineWidth = 10; g.strokeRect(10, 10, 492, 236);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = glow ? '#f0b43f' : (wood ? '#f3e7cf' : '#1b2140');
  g.font = '700 54px "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  wrapText(g, link.name, 256, 100, 440, 60);
  g.font = '500 30px "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  g.fillStyle = glow ? '#ecebf5' : (wood ? '#d8c8a8' : '#5b6080');
  g.fillText(link.tag || '클릭해서 방문', 256, 200);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: glow ? '#ffffff' : '#000000', emissiveIntensity: glow ? 0.9 : 0, roughness: 0.7, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 2), mat);
  mesh.userData.own = true; mesh.userData.ownMat = true;
  mesh.castShadow = true;
  return mesh;
}
function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  lines.push(line);
  const y0 = y - (lines.length - 1) * lh / 2;
  lines.slice(0, 2).forEach((l, i) => g.fillText(l, x, y0 + i * lh));
}

// ---------- 텍스처 ----------
function windowTexture(rng) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#171a26'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = 8 + i * 30, y = 6 + j * 32;
    g.fillStyle = rng() < 0.55 ? (rng() < 0.7 ? `rgba(255,217,160,${0.5 + rng() * 0.5})` : `rgba(201,226,255,${0.5 + rng() * 0.5})`) : '#0b0d16';
    g.fillRect(x, y, 18, 20);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function birchTexture(rng) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e9e9e3'; g.fillRect(0, 0, 64, 256);
  g.fillStyle = '#2b2b2b';
  for (let i = 0; i < 22; i++) { const y = rng() * 256, w = 8 + rng() * 30, hh = 2 + rng() * 4, x = rng() * 64; g.beginPath(); g.roundRect(x, y, w, hh, 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const spriteCache = new Map();
function spriteTexture(kind) {
  if (spriteCache.has(kind)) return spriteCache.get(kind);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  if (kind === 'streak') {
    const grd = g.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(29, 0, 6, 64);
  } else {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.75)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  spriteCache.set(kind, t);
  return t;
}

// ---------- 날씨 입자 ----------
function makeParticles(kind, rng) {
  const cfg = {
    snow:      { n: 2600, box: [110, 36, 110], size: 0.26, color: '#ffffff', opacity: 0.9, vy: -1.6, sway: 0.6, additive: false, sprite: 'dot' },
    rain:      { n: 2800, box: [70, 34, 70], size: 0.5, color: '#b5bdd6', opacity: 0.5, vy: -19, sway: 0.0, additive: false, sprite: 'streak' },
    fireflies: { n: 180, box: [90, 4, 90], size: 0.22, color: '#ffe08a', opacity: 0.95, vy: 0, sway: 0.5, additive: true, sprite: 'dot' },
  }[kind];
  const arr = new Float32Array(cfg.n * 3), phase = new Float32Array(cfg.n);
  for (let i = 0; i < cfg.n; i++) {
    arr[i * 3] = (rng() - 0.5) * cfg.box[0];
    arr[i * 3 + 1] = rng() * cfg.box[1] + (kind === 'fireflies' ? 0.6 : 0);
    arr[i * 3 + 2] = (rng() - 0.5) * cfg.box[2];
    phase[i] = rng() * 6.28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color: cfg.color, size: cfg.size, map: spriteTexture(cfg.sprite), transparent: true, opacity: cfg.opacity, depthWrite: false, sizeAttenuation: true, blending: cfg.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let t = 0;
  return {
    points, kind,
    update(dt, cam, dim = 1) {
      t += dt;
      const p = geo.attributes.position, [bx, by, bz] = cfg.box;
      for (let i = 0; i < cfg.n; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (kind === 'fireflies') {
          x += Math.sin(t * 0.7 + phase[i]) * dt * cfg.sway; z += Math.cos(t * 0.6 + phase[i] * 1.3) * dt * cfg.sway; y += Math.sin(t * 1.1 + phase[i]) * dt * 0.3;
        } else {
          y += cfg.vy * dt; x += Math.sin(t * 1.3 + phase[i]) * dt * cfg.sway;
          if (y < cam.y - 6) y += by;
        }
        if (x < cam.x - bx / 2) x += bx; else if (x > cam.x + bx / 2) x -= bx;
        if (z < cam.z - bz / 2) z += bz; else if (z > cam.z + bz / 2) z -= bz;
        if (kind === 'fireflies') { const base = cam.y - 1.2; if (y < base) y = base; if (y > base + by + 1) y = base + by + 1; }
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
      if (kind === 'fireflies') mat.opacity = (0.6 + 0.35 * Math.sin(t * 2.3)) * dim;
    },
  };
}
