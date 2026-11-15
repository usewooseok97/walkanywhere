// 통계 표 그리기 (관리자 화면에서 쓴다)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const THEME_NAMES = { meadow: '초원', beach: '해변', forest: '숲', snow: '설원', desert: '사막', city: '도시', village: '옛 동네', mars: '화성', park: '공원', mountain: '산길' };
const SPEED_NAMES = { 1: '느긋이', 2: '천천히', 3: '걷기', 4: '빠르게', 5: '달리기' };

function bars(rows, label, value, fmt = v => String(v)) {
  if (!rows.length) return '<p class="empty">아직 기록이 없습니다.</p>';
  const max = Math.max(...rows.map(value)) || 1;
  return `<ul class="bars">${rows.map(r => `<li><span>${esc(label(r))}</span><span class="bar"><i style="width:${(value(r) / max * 100).toFixed(1)}%"></i></span><span class="n">${esc(fmt(value(r)))}</span></li>`).join('')}</ul>`;
}
const mins = s => `${Math.round(s / 60)}분`;
const hourName = h => { h = Number(h); const p = h < 12 ? '오전' : '오후'; const x = h % 12 === 0 ? 12 : h % 12; return `${p} ${x}시`; };

export function renderStats(s) {
  const t = s.totals || {};
  const speedSec = Object.entries(s.speeds?.seconds || {}).map(([k, v]) => ({ k, v }));
  return `
    <div class="totals">
      <div class="total"><b>${t.sessions ?? 0}</b><span>방문 세션</span></div>
      <div class="total"><b>${t.opens ?? 0}</b><span>고른 목적지</span></div>
      <div class="total"><b>${t.arrivals ?? 0}</b><span>도착</span></div>
      <div class="total"><b>${((Number(t.meters) || 0) / 1000).toFixed(1)} km</b><span>함께 걸은 거리</span></div>
      <div class="total"><b>${t.saved ?? 0}</b><span>저장된 길</span></div>
      <div class="total"><b>${t.users ?? 0}</b><span>이름을 남긴 사람</span></div>
    </div>
    <section><h3>어떤 장소를 고를까</h3>${bars(s.themes || [], r => THEME_NAMES[r.theme] || r.theme, r => r.n, v => `${v}회`)}</section>
    <section><h3>많이 고른 문장</h3>${bars(s.prompts || [], r => r.prompt, r => r.n, v => `${v}회`)}</section>
    <section><h3>어떤 걸음으로 걸을까 (걸은 시간)</h3>${bars(speedSec, r => SPEED_NAMES[r.k], r => r.v, mins)}</section>
    <section><h3>걸음을 바꾼 횟수</h3>${bars(s.speeds?.picks || [], r => SPEED_NAMES[r.speed], r => r.n, v => `${v}회`)}</section>
    <section><h3>시각을 어디로 맞출까</h3>${bars(s.hours || [], r => hourName(r.hour), r => r.n, v => `${v}회`)}</section>
    <section><h3>많이 누른 간판</h3>${bars(s.links || [], r => r.name || r.url, r => r.n, v => `${v}회`)}</section>
    <section><h3>최근 저장된 길</h3>
      ${(s.saved || []).length ? `<table><thead><tr><th>문장</th><th>장소</th><th>거리</th><th>누가</th><th>언제</th></tr></thead><tbody>
        ${s.saved.map(w => `<tr><td>${esc(w.prompt)}</td><td>${esc(THEME_NAMES[w.theme] || w.theme || '')}</td><td>${w.meters ?? ''} m</td><td>${esc(w.nickname || '')}</td><td>${new Date(w.created_at).toLocaleString('ko-KR')}</td></tr>`).join('')}
      </tbody></table>` : '<p class="empty">아직 저장된 길이 없습니다.</p>'}
    </section>
    <p class="foot">${new Date(s.generatedAt).toLocaleString('ko-KR')} 기준</p>`;
}
