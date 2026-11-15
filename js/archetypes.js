// 목적지 건물 원형(archetype) 키트. 랜드마크 사전(landmarks.js)이 원형 + 치수/색을 고르면 여기서 로우폴리로 짓는다.
// 걸어오는 사람은 로컬 +z 쪽에서 다가온다. 모든 치수는 m.

import * as THREE from 'three';

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const GLOW = (color, k = 1.6) => M(color, { emissive: color, emissiveIntensity: k });
function mark(mesh) { mesh.userData.own = true; mesh.userData.ownMat = true; mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
function box(g, w, h, d, mat, x = 0, y = 0, z = 0, ry = 0) { const m = mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; }
function cyl(g, rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 16) { const m = mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)); m.position.set(x, y, z); g.add(m); return m; }
function cone(g, r, h, mat, x = 0, y = 0, z = 0, seg = 4, ry = Math.PI / 4, sx = 1, sz = 1) { const m = mark(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat)); m.position.set(x, y, z); m.rotation.y = ry; m.scale.set(sx, 1, sz); g.add(m); return m; }
function sphere(g, r, mat, x = 0, y = 0, z = 0, half = false, seg = 24) { const geo = half ? new THREE.SphereGeometry(r, seg, 12, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.SphereGeometry(r, seg, 16); const m = mark(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); g.add(m); return m; }
function plane(g, w, h, mat, x = 0, y = 0, z = 0, ry = 0, rx = 0) { const m = mark(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); g.add(m); return m; }
function torus(g, r, tube, mat, x = 0, y = 0, z = 0, rx = 0) { const m = mark(new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 48), mat)); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; }
function light(g, color, int, dist, x, y, z) { const l = new THREE.PointLight(color, int, dist, 2); l.position.set(x, y, z); g.add(l); g.userData.light = l; return l; }

// 한국·동아시아 지붕: 네모 뿔을 납작하게 눌러 처마를 길게 뺀다
function roof(g, w, d, h, mat, x, y, z) { const r = cone(g, Math.max(w, d) * 0.78, h, mat, x, y, z, 4, Math.PI / 4, w / Math.max(w, d), d / Math.max(w, d)); return r; }
function windowsTex(shared, w, h) { const t = shared.windowTex.clone(); t.repeat.set(w / 2.4, h / 3); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#f5e6c8', emissiveIntensity: 0.9, roughness: 0.75 }); }

export const ARCHETYPES = {
  // ----- 탑 -----
  lattice(g, p, shared) { // 에펠탑, 도쿄타워
    const H = p.h ?? 60, c = M(p.color ?? '#6b5a4a', { metalness: 0.3, roughness: 0.6 });
    const legs = 4, base = H * 0.22;
    for (let i = 0; i < legs; i++) {
      const a = (i / legs) * Math.PI * 2 + Math.PI / 4, lx = Math.cos(a) * base, lz = Math.sin(a) * base;
      const leg = box(g, H * 0.035, H * 0.62, H * 0.035, c, lx * 0.55, H * 0.31, lz * 0.55);
      leg.lookAt(0, H * 0.62, 0); leg.rotateX(Math.PI / 2);
    }
    for (const [y, s] of [[H * 0.22, 0.75], [H * 0.42, 0.45], [H * 0.62, 0.28]]) {
      box(g, base * 2 * s, H * 0.02, base * 2 * s, c, 0, y, 0);
      box(g, base * 2 * s * 0.9, H * 0.02, H * 0.012, c, 0, y, base * s); box(g, base * 2 * s * 0.9, H * 0.02, H * 0.012, c, 0, y, -base * s);
    }
    box(g, H * 0.07, H * 0.32, H * 0.07, c, 0, H * 0.78, 0);
    cyl(g, H * 0.004, H * 0.012, H * 0.12, c, 0, H * 0.99, 0, 6);
    if (p.secondColor) for (const y of [H * 0.1, H * 0.32, H * 0.52, H * 0.7]) box(g, H * 0.085, H * 0.03, H * 0.085, M(p.secondColor), 0, y, 0);
    light(g, '#ffd9a0', 40, 60, 0, H * 0.3, 0);
  },
  needle(g, p) { // N서울타워, 스카이트리
    const H = p.h ?? 70, c = M(p.color ?? '#d9dde6'), disc = M(p.discColor ?? '#2a3160');
    cyl(g, H * 0.03, H * 0.06, H * 0.72, c, 0, H * 0.36, 0, 12);
    cyl(g, H * 0.11, H * 0.08, H * 0.09, disc, 0, H * 0.76, 0, 18);
    cyl(g, H * 0.12, H * 0.12, H * 0.02, GLOW('#ffe9a0', 1.2), 0, H * 0.805, 0, 18);
    cyl(g, H * 0.006, H * 0.02, H * 0.2, c, 0, H * 0.9, 0, 6);
    sphere(g, H * 0.012, GLOW('#ff4a3a', 2.5), 0, H * 1.0, 0);
    box(g, 12, 3.5, 10, M('#8a8f9a'), 0, 1.75, 0);
    light(g, '#ffe9a0', 30, 50, 0, H * 0.8, 0);
  },
  skyscraper(g, p, shared) { // 롯데타워, 엠파이어, 부르즈 할리파, 타이베이 101
    const H = p.h ?? 90, w = p.w ?? 14, segs = p.segments ?? 1;
    const glass = p.gold ? M('#c9a24a', { metalness: 0.6, roughness: 0.3, emissive: '#5a4210', emissiveIntensity: 0.3 }) : windowsTex(shared, w, H);
    let y = 0;
    for (let i = 0; i < segs; i++) {
      const sh = H / segs, sw = w * (1 - i * (p.taper ?? 0.12));
      const m = box(g, sw, sh, sw * (p.depthRatio ?? 1), glass, 0, y + sh / 2, 0, (p.twist ?? 0) * i);
      if (p.cap) box(g, sw * 1.08, 0.6, sw * 1.08, M('#2a2e3a'), 0, y + sh, 0);
      y += sh;
    }
    cyl(g, 0.3, 1.2, H * 0.18, M('#9aa3ad'), 0, y + H * 0.09, 0, 6);
    torus(g, w * 0.5, 0.35, GLOW(p.crown ?? '#8fd3ff', 1.8), 0, y - 1, 0, Math.PI / 2);
    box(g, w * 1.7, 4, w * 1.4, M('#2a2e3a'), 0, 2, 0);
    if (p.cluster) for (const [x, z, h2] of [[-w * 1.9, -8, H * 0.6], [w * 1.9, -12, H * 0.5], [w * 1.2, -w * 2.2, H * 0.7]]) box(g, w * 0.8, h2, w * 0.8, windowsTex(shared, w * 0.8, h2), x, h2 / 2, z);
    if (p.screens) for (const [x, z, ry] of [[-w * 1.4, 6, 0.3], [w * 1.4, 6, -0.3]]) plane(g, 9, 5, GLOW(['#ff3ea5', '#2ee6ff', '#ffd166'][Math.floor(Math.random() * 3)], 1.4), x, 9, z, ry);
    light(g, '#cfe3ff', 30, 60, 0, H * 0.3, 0);
  },
  clocktower(g, p) { // 빅벤
    const H = p.h ?? 48, stone = M('#c9b89a');
    box(g, 7, H * 0.72, 7, stone, 0, H * 0.36, 0);
    box(g, 8.2, 8, 8.2, M('#8f7f62'), 0, H * 0.76, 0);
    for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const f = plane(g, 5.5, 5.5, GLOW('#fff1c4', 1.2), Math.sin(ry) * 4.15, H * 0.76, Math.cos(ry) * 4.15, ry);
      f.add(mark(new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.1), M('#222'))).translateY(0.9));
    }
    cone(g, 5.5, H * 0.24, M('#4a5a4a'), 0, H * 0.92, 0, 4);
    cyl(g, 0.1, 0.3, 6, M('#d9c878'), 0, H * 1.07, 0, 6);
    box(g, 26, 10, 12, stone, -16, 5, -4);
  },
  leaning(g, p) { // 피사의 사탑
    const H = p.h ?? 32, white = M('#efe9dc');
    const t = new THREE.Group(); t.rotation.z = 0.07; g.add(t);
    for (let i = 0; i < 8; i++) {
      cyl(t, 4.4, 4.4, H / 8 - 0.5, white, 0, i * (H / 8) + H / 16, 0, 20);
      torus(t, 4.6, 0.35, white, 0, i * (H / 8) + H / 8 - 0.2, 0, Math.PI / 2);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; cyl(t, 0.25, 0.25, H / 8 - 1, white, Math.cos(a) * 4.7, i * (H / 8) + H / 16, Math.sin(a) * 4.7, 6); }
    }
    cyl(t, 3.2, 3.2, 3, white, 0, H + 1.5, 0, 20);
  },
  cheomseongdae(g, p) {
    const stone = M('#9a9480');
    for (let i = 0; i < 20; i++) { const r = 2.6 - (i / 20) * 1.1 + Math.sin(i * 0.5) * 0.05; cyl(g, r, r + 0.05, 0.42, stone, 0, i * 0.44 + 0.21, 0, 18); }
    box(g, 3.4, 0.5, 3.4, stone, 0, 9.05, 0); box(g, 3.4, 0.5, 3.4, stone, 0, 9.55, 0, Math.PI / 4);
    box(g, 0.9, 0.9, 0.3, M('#2b2b2b'), 0, 4.2, 2.1);
  },
  spires(g, p) { // 사그라다 파밀리아, 성당
    const stone = M(p.color ?? '#b9a98a');
    box(g, 26, 18, 16, stone, 0, 9, -4);
    for (const [x, z, h] of [[-9, 4, 46], [-3, 4, 52], [3, 4, 52], [9, 4, 46], [-6, -12, 40], [6, -12, 40], [0, -4, 60]]) {
      cyl(g, 1.2, 2.6, h, stone, x, h / 2, z, 10);
      cone(g, 1.3, 6, M('#8a7a5a'), x, h + 3, z, 8, 0);
      sphere(g, 0.8, GLOW('#ffd166', 1.2), x, h + 6.3, z);
    }
    plane(g, 5, 9, M('#2e1f14'), 0, 4.5, 4.05);
  },
  // ----- 문·아치 -----
  palacegate(g, p) { // 광화문, 숭례문, 자금성
    const W = p.w ?? 22, D = p.d ?? 10, tiers = p.tiers ?? 2;
    const stone = M(p.stone ?? '#8d8780'), wood = M(p.wood ?? '#8a3b2a'), tile = M(p.tile ?? '#3b3844', { flatShading: true });
    const baseH = p.baseH ?? 7;
    box(g, W, baseH, D, stone, 0, baseH / 2, 0);
    for (const x of (p.arches ?? [-6.5, 0, 6.5])) { const a = cyl(g, 2.1, 2.1, D + 0.4, M('#1a1a1a'), x, 2.1, 0, 16); a.rotation.x = Math.PI / 2; }
    let y = baseH;
    for (let t = 0; t < tiers; t++) {
      const s = 1 - t * 0.18;
      for (let k = 0; k < 7; k++) cyl(g, 0.35, 0.35, 4.2, wood, (-W * 0.42 + k * (W * 0.84 / 6)) * s, y + 2.1, D * 0.38 * s, 8);
      box(g, W * 0.86 * s, 4.2, D * 0.74 * s, M(p.wall ?? '#b9a07a'), 0, y + 2.1, 0);
      roof(g, W * 1.1 * s, D * 1.15 * s, 2.8, tile, 0, y + 4.2 + 1.4, 0);
      y += 4.2 + 2.6;
    }
    if (p.wall2) { box(g, 60, baseH * 0.8, 3, stone, 0, baseH * 0.4, -D / 2 - 1.5); }
    for (const x of [-W * 0.42, W * 0.42]) sphere(g, 0.35, GLOW('#ffb45a', 2), x, baseH + 2.5, D * 0.42);
  },
  arch(g, p) { // 개선문, 독립문, 브란덴부르크
    const W = p.w ?? 20, H = p.h ?? 24, D = p.d ?? 8, stone = M(p.color ?? '#cfc4ad');
    if (p.columns) {
      for (let k = 0; k < 6; k++) cyl(g, 1.1, 1.3, H * 0.75, stone, -W / 2 + 2 + k * ((W - 4) / 5), H * 0.375, 0, 14);
      box(g, W + 2, H * 0.25, D, stone, 0, H * 0.875, 0);
      box(g, 6, 4, 3, M('#4a6a5a', { metalness: 0.5 }), 0, H + 2, 0);
    } else {
      box(g, W * 0.32, H * 0.8, D, stone, -W * 0.34, H * 0.4, 0);
      box(g, W * 0.32, H * 0.8, D, stone, W * 0.34, H * 0.4, 0);
      box(g, W, H * 0.22, D, stone, 0, H * 0.89, 0);
      const vault = cyl(g, W * 0.18, W * 0.18, D + 0.2, stone, 0, H * 0.8, 0, 24); vault.rotation.x = Math.PI / 2;
    }
    light(g, '#ffe9c0', 30, 40, 0, H * 0.5, D);
  },
  torii(g, p) { // 후시미이나리: 길 위로 이어지는 붉은 문들
    const red = M('#c8392b'), black = M('#1a1a1a');
    for (let i = 0; i < (p.count ?? 14); i++) {
      const z = 8 - i * 3.2, s = 1 - i * 0.01;
      for (const x of [-2.1, 2.1]) cyl(g, 0.22, 0.26, 4.2 * s, red, x, 2.1 * s, z, 10);
      box(g, 5.6 * s, 0.35, 0.35, black, 0, 4.3 * s, z);
      box(g, 5.0 * s, 0.3, 0.3, red, 0, 3.7 * s, z);
    }
    box(g, 6, 3.5, 5, M('#5a3a2a'), 0, 1.75, -42); roof(g, 7, 6, 2.2, M('#3b3844', { flatShading: true }), 0, 4.6, -42);
    sphere(g, 0.3, GLOW('#ffb45a', 2), 0, 3.2, -39.2);
  },
  gate(g, p) { // 시장 입구
    for (const x of [-4.5, 4.5]) box(g, 0.8, 6, 0.8, M('#7a3b2a'), x, 3, 0);
    box(g, 11, 1.1, 0.9, M('#7a3b2a'), 0, 5.8, 0); box(g, 12.5, 0.45, 2, M('#3b3844'), 0, 6.6, 0);
    for (const x of [-3, 0, 3]) sphere(g, 0.35, GLOW('#ffb45a', 2), x, 4.9, 0.6);
    for (const [x, c] of [[-7, '#c8392b'], [7, '#2f6fa0']]) { box(g, 3.2, 1, 1.6, M('#a09484'), x, 0.5, -3); plane(g, 3.6, 2, M(c, { side: THREE.DoubleSide }), x, 2.3, -2.6, 0, -0.9); }
    light(g, '#ffb45a', 30, 30, 0, 4.5, 1.5);
  },
  // ----- 다리 -----
  bridge(g, p) { // 금문교, 광안대교, 타워브리지
    const c = M(p.color ?? '#c0392b'), L = p.len ?? 120, H = p.h ?? 40;
    const deck = box(g, L, 1.2, 10, M('#4a4a52'), 0, 9, -30, Math.PI / 2);
    for (const z of [-30 - L * 0.3, -30 + L * 0.3]) {
      if (p.gothic) { box(g, 7, H, 7, M('#b9a98a'), -5.5, H / 2, z); box(g, 7, H, 7, M('#b9a98a'), 5.5, H / 2, z); cone(g, 4.5, 6, M('#4a5a6a'), -5.5, H + 3, z, 4); cone(g, 4.5, 6, M('#4a5a6a'), 5.5, H + 3, z, 4); }
      else { for (const x of [-5.5, 5.5]) box(g, 2, H, 2, c, x, H / 2, z); box(g, 13, 1.5, 2, c, 0, H * 0.5, z); box(g, 13, 1.5, 2, c, 0, H * 0.95, z); }
    }
    // 케이블: 포물선 근사
    for (const x of [-5.5, 5.5]) for (let i = 0; i < 24; i++) {
      const t = i / 23, z = -30 - L * 0.3 + t * L * 0.6, y = H * 0.95 - Math.sin(t * Math.PI) * (H * 0.6);
      box(g, 0.3, 0.3, L * 0.6 / 23 + 0.4, c, x, y, z);
      if (i % 3 === 0) box(g, 0.12, Math.max(0.5, y - 9.6), 0.12, c, x, (y + 9.6) / 2, z);
    }
    deck.userData.isDeck = true;
    light(g, '#ffd9a0', 30, 60, 0, 14, -30);
  },
  // ----- 큰 건물 -----
  colosseum(g, p) {
    const stone = M('#c9b89a'), R = p.r ?? 26;
    for (let ring = 0; ring < 3; ring++) {
      const y = ring * 9, n = 36;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        if (ring === 2 && a > Math.PI * 0.9 && a < Math.PI * 1.5) continue; // 무너진 쪽
        const m = box(g, 2.6, 9, 3, stone, Math.cos(a) * R, y + 4.5, Math.sin(a) * R, -a);
      }
      torus(g, R, 1.3, stone, 0, y + 9, 0, Math.PI / 2);
    }
    cyl(g, R * 0.55, R * 0.55, 1, M('#a89878'), 0, 0.5, 0, 36);
  },
  mosque(g, p) { // 타지마할, 블루모스크, 바실리카
    const c = M(p.color ?? '#f1efe9'), dome = M(p.domeColor ?? '#f1efe9');
    box(g, 30, 14, 30, c, 0, 7, -10);
    sphere(g, 9, dome, 0, 14, -10, true); cyl(g, 0.3, 0.6, 5, M('#d9c878'), 0, 25.5, -10, 8);
    for (const [x, z] of [[-10, -1], [10, -1], [-10, -19], [10, -19]]) { sphere(g, 3.2, dome, x, 14, z, true); }
    for (const [x, z] of [[-20, 4], [20, 4], [-20, -24], [20, -24]]) { cyl(g, 1.2, 1.6, 30, c, x, 15, z, 12); sphere(g, 1.6, dome, x, 30.5, z, true); }
    const arch = cyl(g, 3.5, 3.5, 2, M('#1a1a1a'), 0, 4, 5.2, 16); arch.rotation.x = Math.PI / 2;
    if (p.pool) box(g, 4, 0.1, 40, M('#2f7f9f', { roughness: 0.2, metalness: 0.2 }), 0, 0.08, 30);
    light(g, '#ffe9c0', 30, 50, 0, 10, 8);
  },
  castle(g, p) { // 노이슈반슈타인, 오사카성
    if (p.japan) {
      const white = M('#f1efe9'), tile = M('#3b4a5a', { flatShading: true });
      box(g, 30, 10, 30, M('#8a8f8a'), 0, 5, 0);
      for (let t = 0; t < 5; t++) { const s = 1 - t * 0.14; box(g, 20 * s, 5, 18 * s, white, 0, 10 + t * 6 + 2.5, 0); roof(g, 24 * s, 22 * s, 2.2, tile, 0, 10 + t * 6 + 6, 0); }
      for (const x of [-8, 8]) sphere(g, 0.6, GLOW('#ffd166', 1.4), x, 41, 0);
      return;
    }
    const wall = M(p.color ?? '#efe9dc'), roofM = M('#2f4a6a');
    box(g, 28, 18, 16, wall, 0, 9, -6);
    for (const [x, z, h, r] of [[-12, 2, 34, 3], [12, 2, 30, 2.6], [-10, -14, 26, 2.4], [10, -14, 40, 3.2], [0, -8, 44, 2.2]]) { cyl(g, r, r, h, wall, x, h / 2, z, 14); cone(g, r * 1.3, r * 3, roofM, x, h + r * 1.5, z, 12, 0); }
    for (let k = -3; k <= 3; k++) plane(g, 1.2, 2.4, GLOW('#ffd9a0', 1.2), k * 3.6, 10, 2.05);
    light(g, '#ffd9a0', 30, 50, 0, 12, 6);
  },
  templehall(g, p) { // 불국사, 금각사
    const wall = M(p.gold ? '#d4a73a' : '#b9a07a', p.gold ? { metalness: 0.7, roughness: 0.35, emissive: '#5a4210', emissiveIntensity: 0.25 } : {});
    const wood = M('#8a3b2a'), tile = M('#3b3844', { flatShading: true });
    box(g, 20, 1.2, 14, M('#8d8780'), 0, 0.6, 0);
    for (let t = 0; t < (p.tiers ?? 2); t++) {
      const s = 1 - t * 0.2, y = 1.2 + t * 5.4;
      box(g, 16 * s, 4.2, 11 * s, wall, 0, y + 2.1, 0);
      for (let k = 0; k < 6; k++) cyl(g, 0.3, 0.3, 4.2, wood, (-7 + k * 2.8) * s, y + 2.1, 5.6 * s, 8);
      roof(g, 20 * s, 14 * s, 2.4, tile, 0, y + 5.4, 0);
    }
    if (p.pond) { cyl(g, 16, 16, 0.2, M('#2f6f8f', { roughness: 0.15, metalness: 0.3 }), 0, 0.1, 22, 32); }
    light(g, '#ffb45a', 25, 40, 0, 4, 9);
  },
  hanok(g, p) { // 한옥 마을: 기와집 몇 채와 담장
    const wall = M('#d9cfb9'), wood = M('#6b4a2e'), tile = M('#3b3844', { flatShading: true });
    for (const [x, z, w, d, ry] of [[0, -2, 12, 8, 0], [-13, -8, 9, 7, 0.1], [13, -7, 9, 7, -0.1], [-8, -20, 10, 7, 0], [9, -21, 10, 7, 0]]) {
      box(g, w, 3, d, wall, x, 1.5, z, ry); roof(g, w * 1.15, d * 1.25, 2.2, tile, x, 4.1, z);
      for (let k = 0; k < 4; k++) cyl(g, 0.22, 0.22, 3, wood, x + (-w / 2 + 1 + k * ((w - 2) / 3)), 1.5, z + d / 2 + 0.05, 8);
    }
    box(g, 34, 1.6, 0.5, M('#9a8f78'), 0, 0.8, 3.5); box(g, 34, 0.5, 1.4, tile, 0, 1.85, 3.5);
    box(g, 3, 2.4, 0.6, wood, 0, 1.2, 3.5); roof(g, 4.4, 2.6, 1.4, tile, 0, 3.1, 3.5);
    light(g, '#ffb45a', 20, 30, 0, 3, 6);
  },
  pavilion(g, p) { // 정자: 경포대, 해운대 누각
    const wood = M('#8a5a3a'), tile = M('#3b3844', { flatShading: true });
    box(g, 11, 1.2, 9, M('#8d8780'), 0, 0.6, 0);
    for (const [x, z] of [[-4.5, -3.5], [4.5, -3.5], [-4.5, 3.5], [4.5, 3.5], [0, -3.5], [0, 3.5]]) cyl(g, 0.3, 0.3, 4, wood, x, 3.2, z, 10);
    box(g, 11, 0.4, 9, wood, 0, 5.3, 0); roof(g, 14, 12, 2.6, tile, 0, 6.8, 0);
    box(g, 11, 0.9, 0.2, wood, 0, 1.7, 4.5); box(g, 11, 0.9, 0.2, wood, 0, 1.7, -4.5);
    sphere(g, 0.3, GLOW('#ffb45a', 2), 0, 4.6, 0);
  },
  opera(g, p) { // 시드니 오페라하우스
    const white = M('#f4f1ea', { roughness: 0.4 });
    box(g, 50, 4, 30, M('#b9a98a'), 0, 2, -8);
    for (const [x, z, r, ry] of [[-10, -2, 11, 0.3], [-2, -8, 13, 0.3], [6, -14, 10, 0.3], [12, 2, 8, -0.5], [18, -4, 9, -0.5]]) {
      const geo = new THREE.SphereGeometry(r, 24, 12, 0, Math.PI / 2, 0, Math.PI / 2);
      const m = mark(new THREE.Mesh(geo, white)); m.position.set(x, 4, z); m.rotation.set(0, ry, 0); m.scale.set(0.6, 1.6, 1); g.add(m);
    }
    light(g, '#ffe9c0', 25, 50, 0, 10, 12);
  },
  wheel(g, p) { // 런던아이
    const R = p.r ?? 22, steel = M('#dfe3ea', { metalness: 0.5, roughness: 0.4 });
    const w = new THREE.Group(); w.position.set(0, R + 3, -6); g.add(w);
    torus(w, R, 0.5, steel, 0, 0, 0, 0); torus(w, R * 0.12, 0.6, steel, 0, 0, 0, 0);
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; const s = box(w, 0.25, R, 0.25, steel, Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); s.rotation.z = a - Math.PI / 2; box(w, 2.2, 1.6, 2.2, GLOW('#cfe3ff', 0.8), Math.cos(a) * R, Math.sin(a) * R, 0.8); }
    g.userData.blades = w;
    for (const x of [-6, 6]) { const leg = box(g, 1.2, R + 3, 1.2, steel, x, (R + 3) / 2, -2); leg.rotation.x = -0.25; }
  },
  statue(g, p) { // 자유의 여신상, 리우 예수상
    const c = M(p.color ?? '#6fa08a'), H = p.h ?? 24;
    box(g, 14, 16, 14, M('#b9a98a'), 0, 8, 0);
    cyl(g, 2.4, 3.2, H * 0.55, c, 0, 16 + H * 0.275, 0, 12);
    sphere(g, 1.6, c, 0, 16 + H * 0.6, 0);
    if (p.arms === 'wide') { box(g, H * 0.7, 1.4, 1.4, c, 0, 16 + H * 0.5, 0); }
    else { const arm = box(g, 1.2, H * 0.4, 1.2, c, 2.2, 16 + H * 0.72, 0); sphere(g, 1.2, GLOW('#ffd166', 2), 2.2, 16 + H * 0.95, 0); }
    if (p.crown) for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k / 6 - 0.5) * Math.PI; cone(g, 0.3, 2, c, Math.cos(a) * 1.6, 16 + H * 0.6 + 1.6, Math.sin(a) * 1.6, 4, 0); }
    light(g, '#ffe9c0', 30, 50, 0, 16 + H * 0.8, 6);
  },
  // ----- 자연·유적 -----
  peak(g, p) { // 후지산, 한라산, 울산바위, 성산일출봉
    const R = p.r ?? 90, H = p.h ?? 70, rock = M(p.color ?? '#5a6a52', { flatShading: true });
    const geo = new THREE.ConeGeometry(R, H, 28, 6);
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < H / 2 - 0.1) { pos.setX(i, pos.getX(i) * (1 + (Math.random() - 0.5) * 0.12)); pos.setZ(i, pos.getZ(i) * (1 + (Math.random() - 0.5) * 0.12)); } }
    geo.computeVertexNormals();
    const m = mark(new THREE.Mesh(geo, rock)); m.position.set(0, H / 2 - 2, -R - 20); if (p.flat) m.scale.y = 0.45; g.add(m);
    if (p.snow) { const cap = cone(g, R * 0.32, H * 0.3, M('#f4f6f8', { flatShading: true }), 0, H * 0.85 - 2, -R - 20, 28, 0); if (p.flat) cap.scale.y = 0.45; }
    // 전망대
    box(g, 8, 0.4, 6, M('#6b4a2e'), 0, 1.2, 0); box(g, 8, 1, 0.2, M('#6b4a2e'), 0, 1.9, -3);
  },
  canyon(g, p) {
    const rock = M('#b86a3a', { flatShading: true }), rock2 = M('#8a4a2a', { flatShading: true });
    for (const [x, z, w, h, d] of [[-60, -80, 50, 38, 40], [40, -110, 60, 44, 50], [-10, -160, 90, 30, 60], [90, -60, 40, 26, 40], [-110, -40, 40, 22, 40]]) {
      box(g, w, h, d, rock, x, h / 2 - 20, z); box(g, w * 0.8, 3, d * 0.8, rock2, x, h - 18.5, z);
    }
    box(g, 300, 2, 60, M('#6a3a22'), 0, -22, -60);
    box(g, 8, 0.4, 6, M('#6b4a2e'), 0, 1.2, 0); box(g, 8, 1, 0.2, M('#6b4a2e'), 0, 1.9, -3);
  },
  terraces(g, p) { // 마추픽추
    const stone = M('#9aa08a', { flatShading: true }), grass = M('#6f9a56');
    for (let i = 0; i < 9; i++) { const w = 60 - i * 5; box(g, w, 3, 30 - i * 2, i % 2 ? stone : grass, 0, i * 3 + 1.5, -30 - i * 2); }
    for (const [x, z] of [[-12, -40], [-4, -42], [6, -41], [14, -44], [0, -50]]) { box(g, 5, 3, 4, stone, x, 29, z); cone(g, 3.6, 2, M('#8a7a4a'), x, 31.5, z, 4); }
    cone(g, 28, 60, M('#5a6a52', { flatShading: true }), 0, 50, -95, 12, 0);
  },
  wall(g, p) { // 만리장성: 능선을 따라 오르내리는 성벽
    const stone = M('#9a9480'), path = new THREE.Group(); g.add(path);
    let x = 0, z = 0, y = 0;
    for (let i = 0; i < 18; i++) {
      const seg = box(g, 7, 6 + Math.sin(i * 0.9) * 1.5, 10, stone, x, y + 3, z, Math.sin(i * 0.5) * 0.4);
      if (i % 5 === 0) { box(g, 9, 11, 9, stone, x, y + 5.5, z); roof(g, 10, 10, 2, M('#3b3844', { flatShading: true }), x, y + 11.8, z); }
      x += Math.sin(i * 0.5) * 4; z -= 9.5; y += Math.sin(i * 0.7) * 2.2 + 1.2;
    }
  },
  stones(g, p) { // 스톤헨지 / 모아이
    const stone = M(p.color ?? '#8a8f8a', { flatShading: true });
    if (p.moai) { for (let k = 0; k < 7; k++) { const x = -12 + k * 4; box(g, 2.2, 7, 2, stone, x, 3.5, -6); box(g, 2.4, 1.2, 2.2, M('#7a3a2a'), x, 7.4, -6); box(g, 1.2, 2.2, 0.6, stone, x, 3.6, -4.8); } return; }
    const R = 14;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; box(g, 2.2, 7, 1.4, stone, Math.cos(a) * R, 3.5, Math.sin(a) * R, -a); if (k % 2 === 0) box(g, 7.4, 1.4, 1.6, stone, Math.cos(a + Math.PI / 12) * R, 7.7, Math.sin(a + Math.PI / 12) * R, -(a + Math.PI / 12)); }
    for (let k = 0; k < 5; k++) { const a = Math.PI * 0.75 + k * 0.35; box(g, 2.8, 9, 1.6, stone, Math.cos(a) * 6, 4.5, Math.sin(a) * 6, -a); }
  },
  petra(g, p) { // 바위에 새긴 신전 정면
    const rock = M('#b86a3a', { flatShading: true }), face = M('#c98a5a');
    box(g, 80, 60, 30, rock, 0, 28, -22); box(g, 60, 70, 30, rock, -70, 33, -10); box(g, 60, 70, 30, rock, 70, 33, -10);
    box(g, 26, 30, 2, face, 0, 15, -6.5);
    for (let k = 0; k < 6; k++) cyl(g, 1, 1.1, 12, face, -10 + k * 4, 6, -5, 12);
    box(g, 28, 2, 3, face, 0, 13, -5); cone(g, 10, 5, face, 0, 16.5, -5, 4, 0, 1.6, 0.4);
    for (let k = 0; k < 4; k++) cyl(g, 0.9, 1, 9, face, -6 + k * 4, 22, -5, 12);
    cyl(g, 3.5, 3.5, 2, face, 0, 24, -5, 16);
    box(g, 4, 7, 1, M('#1a1a1a'), 0, 3.5, -5.3);
  },
  // ----- 마을 -----
  whitevillage(g, p) { // 산토리니
    const white = M('#f6f4ee'), blue = M('#2f6fa0');
    for (let i = 0; i < 16; i++) {
      const x = (i % 4) * 7 - 10 + Math.random() * 2, z = -Math.floor(i / 4) * 7 - 2, h = 3 + Math.random() * 3, y = Math.floor(i / 4) * 3;
      box(g, 5.5, h, 5.5, white, x, y + h / 2, z);
      if (i % 5 === 0) { sphere(g, 2.6, blue, x, y + h + 0.3, z, true); } else if (i % 3 === 0) box(g, 1.4, 1.4, 0.3, blue, x, y + h / 2, z + 2.9);
    }
    cyl(g, 1.6, 1.6, 7, white, 14, 3.5, -12, 16); sphere(g, 1.9, blue, 14, 7.2, -12, true);
  },
  hillvillage(g, p) { // 감천문화마을: 비탈에 층층이 색색 집
    const colors = ['#f2b544', '#6fa8dc', '#e07a5f', '#8fd3a0', '#f4f1ea', '#c9a0dc', '#f28cb1'];
    for (let r = 0; r < 6; r++) for (let k = 0; k < 7; k++) {
      const x = -18 + k * 6 + (r % 2) * 3, z = -r * 6 - 2, y = r * 2.8;
      box(g, 4.6, 3.2, 4.6, M(colors[(r + k) % colors.length]), x, y + 1.6, z);
      box(g, 5, 0.3, 5, M('#4a4a52'), x, y + 3.35, z);
    }
    box(g, 48, 1, 3, M('#8d8780'), 0, 0.5, 2);
  },
  yurt(g, p) { // 몽골 게르
    for (const [x, z, r] of [[0, -2, 4], [-9, -6, 3.2], [9, -7, 3.2]]) {
      cyl(g, r, r, 2.2, M('#f1efe9'), x, 1.1, z, 20); cone(g, r + 0.3, 2.2, M('#e6e1d4'), x, 3.3, z, 20, 0);
      box(g, 1.4, 1.8, 0.2, M('#c8392b'), x, 0.9, z + r);
    }
    for (let k = 0; k < 5; k++) { const x = -8 + k * 4; cyl(g, 0.05, 0.08, 2.6, M('#6b4a2e'), x, 1.3, -14, 6); plane(g, 1.2, 0.8, M(['#2f6fa0', '#f2b544', '#c8392b', '#f1efe9', '#4a8a4a'][k], { side: THREE.DoubleSide }), x + 0.6, 2.2, -14); }
  },
  blob(g, p) { // DDP
    const silver = M('#c9ccd4', { metalness: 0.7, roughness: 0.25 });
    const a = sphere(g, 18, silver, 0, 2, -14); a.scale.set(1.6, 0.5, 1.1);
    const b = sphere(g, 10, silver, 14, 3, 0); b.scale.set(1.3, 0.6, 1);
    plane(g, 10, 3, GLOW('#9be3ff', 1), 0, 2.2, 6.2);
  },
  angkor(g, p) { // 앙코르와트: 단 위의 연꽃 탑 다섯
    const stone = M('#8a8572', { flatShading: true });
    box(g, 70, 4, 50, stone, 0, 2, -25); box(g, 50, 5, 36, stone, 0, 6.5, -25);
    for (const [x, z, h] of [[0, -25, 32], [-16, -12, 24], [16, -12, 24], [-16, -38, 24], [16, -38, 24]]) {
      for (let t = 0; t < 6; t++) { const s = 1 - t * 0.14; box(g, 8 * s, h / 6, 8 * s, stone, x, 9 + t * (h / 6) + h / 12, z); }
      cone(g, 2, 5, stone, x, 9 + h + 2.5, z, 8, 0);
    }
    cyl(g, 3, 3, 2, M('#2f6f8f', { roughness: 0.2 }), 0, 0.2, 20, 24).scale.set(6, 1, 2);
  },
  pyramid(g, p) {
    const sand = M(p.glass ? '#bcd8ee' : '#d8b57a', p.glass ? { transparent: true, opacity: 0.5, metalness: 0.4, roughness: 0.15 } : { flatShading: true });
    const H = p.h ?? 60, B = H * 1.57;
    cone(g, B / Math.SQRT2, H, sand, 0, H / 2, -B / 2 - 10, 4, Math.PI / 4);
    if (!p.glass) { cone(g, B * 0.45 / Math.SQRT2, H * 0.6, sand, -B * 1.1, H * 0.3, -B - 30, 4, Math.PI / 4); cone(g, B * 0.3 / Math.SQRT2, H * 0.4, sand, B * 0.9, H * 0.2, -B - 50, 4, Math.PI / 4); }
    else { box(g, 60, 3, 40, M('#efe9dc'), 0, 1.5, 20); }
    if (p.glass) sphere(g, 0.5, GLOW('#ffffff', 2), 0, H + 0.5, -B / 2 - 10);
  },
  // ----- 기존 -----
  lighthouse(g) {
    cyl(g, 1.9, 2.5, 14, M('#f1efe9'), 0, 7, 0, 20);
    for (const y of [3, 7.5, 12]) cyl(g, 2.42 - (y / 14) * 0.5, 2.5 - (y / 14) * 0.5, 1.2, M('#c8392b'), 0, y, 0, 20);
    cyl(g, 1.7, 1.7, 2.2, M('#ffe9a0', { emissive: '#ffe9a0', emissiveIntensity: 1.4, transparent: true, opacity: 0.9 }), 0, 15.1, 0, 16);
    cone(g, 2.1, 1.8, M('#c8392b'), 0, 17.1, 0, 16, 0);
    box(g, 5, 3, 4, M('#e6e1d4'), 0, 1.5, 4.5); roof(g, 5, 4, 1.6, M('#3b3844', { flatShading: true }), 0, 3.8, 4.5);
    light(g, '#ffe9a0', 60, 60, 0, 15.2, 0);
  },
  cabin(g, p) {
    const snow = !!p.snow;
    box(g, 8, 3.6, 6.5, M(snow ? '#5a4030' : '#6b4a2e'), 0, 1.8, 0);
    const r = roof(g, 9.5, 8, 2.8, M(snow ? '#e8edf2' : '#3b3844', { flatShading: true }), 0, 5, 0);
    box(g, 0.9, 2.2, 0.9, M('#55514a'), 2.4, 5.4, -1);
    plane(g, 1.2, 2.2, M('#2e1f14'), 0, 1.1, 3.26);
    for (const x of [-2.4, 2.4]) plane(g, 1.2, 1.1, GLOW('#ffb45a', 1.4), x, 2, 3.26);
    box(g, 9, 0.3, 2.4, M(snow ? '#4a3626' : '#5b4030'), 0, 0.15, 4.4);
  },
  dome(g, p, shared, rng) {
    sphere(g, 5.5, M(p.color ?? '#d9b887'), 0, 0, 0, true);
    box(g, 2.4, 3.2, 1.6, M('#2e1f14'), 0, 1.6, 5.2);
    if (!p.noPalms) {
      cyl(g, 4, 4, 0.16, M('#2f7f9f', { roughness: 0.2, metalness: 0.2 }), 8.5, 0.08, 1, 24);
      for (const [x, z] of [[11.5, -1.5], [7, -4.5]]) {
        const t = new THREE.Mesh(shared.pTrunk, shared.pTrunkMat); t.position.set(x, 0, z); t.castShadow = true; g.add(t);
        for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(shared.leaf, shared.leafMat); l.position.set(x, 7.5, z); l.rotation.order = 'YXZ'; l.rotation.set(0.45, (i / 7) * 6.28, 0); l.castShadow = true; g.add(l); }
      }
    }
  },
  tower(g, p, shared) {
    const side = windowsTex(shared, 10, 58), top = M('#1a1d2b');
    const body = mark(new THREE.Mesh(new THREE.BoxGeometry(10, 58, 10), [side, side, top, top, side, side])); body.position.y = 29; g.add(body);
    cyl(g, 0.3, 0.5, 12, M('#9aa3ad'), 0, 64, 0, 8);
    torus(g, 6.5, 0.4, GLOW('#2ee6ff', 2), 0, 58.5, 0, Math.PI / 2);
    box(g, 14, 4, 14, M('#23283a'), 0, 2, 0); box(g, 3, 3.2, 0.3, GLOW('#ffd166', 1.2), 0, 1.8, 7.1);
  },
  habitat(g) {
    sphere(g, 6.5, M('#cfe3ff', { transparent: true, opacity: 0.45, emissive: '#8fb7ff', emissiveIntensity: 0.3, roughness: 0.2 }), 0, 0, 0, true);
    box(g, 3.2, 2.8, 3.4, M('#9aa3ad'), 0, 1.4, 6.4);
    cyl(g, 0.1, 0.15, 7, M('#9aa3ad'), 5, 3.5, -3, 6); sphere(g, 0.3, GLOW('#ff4a3a', 2.5), 5, 7.2, -3);
    box(g, 5, 0.3, 4, M('#2b3a5a', { metalness: 0.4, roughness: 0.4 }), -8, 2.4, 0).rotation.z = 0.35;
  },
  windmill(g) {
    cyl(g, 1.7, 2.4, 9, M('#d9d3c4'), 0, 4.5, 0, 16); cone(g, 2.2, 2.2, M('#5b4030'), 0, 10.1, 0, 16, 0);
    const hub = new THREE.Group(); hub.position.set(0, 8.6, 2.1);
    for (let i = 0; i < 4; i++) { const b = mark(new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.15), M('#f1efe9'))); b.position.y = 3.5; const gg = new THREE.Group(); gg.rotation.z = (i / 4) * Math.PI * 2; gg.add(b); hub.add(gg); }
    g.add(hub); g.userData.blades = hub;
    plane(g, 1, 2, M('#2e1f14'), 0, 1, 2.42);
  },
};

// 간판을 세울 자리 (로컬 +z, 건물 정면보다 조금 앞)
export const SIGN_FRONT = {
  lattice: 16, needle: 9, skyscraper: 14, clocktower: 9, leaning: 8, cheomseongdae: 5, spires: 8,
  palacegate: 10, arch: 8, torii: 12, gate: 3.5, bridge: 4, colosseum: 32, mosque: 10, castle: 12, templehall: 10, hanok: 7, pavilion: 7, opera: 12, wheel: 8, statue: 11,
  peak: 6, canyon: 6, terraces: 6, wall: 8, stones: 20, petra: 6, whitevillage: 8, hillvillage: 7, yurt: 8, blob: 9, angkor: 6, pyramid: 8,
  lighthouse: 8, cabin: 7, dome: 7.5, tower: 9.5, habitat: 9.8, windmill: 5,
};
// 목적지 둘레에서 소품을 비울 반지름
export const CLEAR_RADIUS = { peak: 60, canyon: 90, terraces: 60, wall: 50, petra: 70, colosseum: 40, pyramid: 70, bridge: 60, angkor: 50, hillvillage: 40, whitevillage: 40, mosque: 40, castle: 40 };

export function buildDestination(kind, params, shared, rng) {
  const g = new THREE.Group();
  (ARCHETYPES[kind] ?? ARCHETYPES.windmill)(g, params ?? {}, shared, rng);
  return g;
}
