// 사용 통계 수집: 어디로 가고 싶어 하는지, 어떤 속도로 걷는지, 어떤 간판을 누르는지.
// 개인 정보 없이 사건만 보낸다. 서버(DB)가 없으면 조용히 실패한다.

const ENDPOINT = '/api/track';
const SESSION = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).slice(0, 12);

export function track(kind, data = {}) {
  const body = JSON.stringify({ kind, session: SESSION, ...data });
  try {
    if (navigator.sendBeacon && body.length < 60000) {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      if (ok) return;
    }
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {}
}

// 속도별로 걸은 시간을 모았다가 한 번에 보낸다
export class SpeedMeter {
  constructor() { this.seconds = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; this.meters = 0; this.last = performance.now(); }
  tick(world) {
    const now = performance.now(), dt = (now - this.last) / 1000; this.last = now;
    if (world.walking && world.speedOverride == null) { this.seconds[world.speedLevel] += dt; this.meters += world.speed * dt; }
  }
  flush(extra = {}) {
    const total = Object.values(this.seconds).reduce((a, b) => a + b, 0);
    if (total < 2) return;
    track('walk', { speeds: Object.fromEntries(Object.entries(this.seconds).map(([k, v]) => [k, Math.round(v)])), meters: Math.round(this.meters), ...extra });
    this.seconds = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; this.meters = 0;
  }
}
