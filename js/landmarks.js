// 랜드마크 사전: 문장에 이 이름이 들어 있으면 그 장소의 환경·목적지 원형·추천 사이트를 쓴다.
// env: world.js 의 THEMES 키 / dest: archetypes.js 의 원형 / params: 원형 치수·색 / over: 테마 덮어쓰기 / hour: 기본 시각
// 링크는 공식 또는 공공 관광 사이트 위주로 골랐고, 바뀔 수 있으니 안 열리면 여기서 고치면 된다.

const L = (name, url, desc, tag = '공식 안내') => ({ name, url, desc, tag });

export const LANDMARKS = [
  // ---------- 한국 ----------
  { id: 'nseoul', names: ['남산타워', 'n서울타워', '서울타워', '남산 타워'], title: 'N서울타워', country: '서울', env: 'park', dest: 'needle', params: { h: 70, color: '#e6e8ee', discColor: '#2a3160' }, hour: 19,
    links: [L('N서울타워', 'https://www.seoultower.co.kr', '남산 꼭대기 전망대. 야경과 사랑의 자물쇠.'), L('비짓서울', 'https://www.visitseoul.net', '서울 관광 공식 안내.', '여행 정보')] },
  { id: 'gyeongbok', names: ['경복궁', '광화문', '근정전'], title: '경복궁 광화문', country: '서울', env: 'park', dest: 'palacegate', params: { w: 24, d: 10, tiers: 2, wall2: true }, hour: 10,
    links: [L('궁능유적본부', 'https://royal.khs.go.kr', '경복궁 관람 안내와 야간 개장.'), L('비짓서울', 'https://www.visitseoul.net', '서울 관광 공식 안내.', '여행 정보')] },
  { id: 'namdaemun', names: ['숭례문', '남대문'], title: '숭례문', country: '서울', env: 'city', dest: 'palacegate', params: { w: 20, d: 9, tiers: 2, arches: [0] }, hour: 11,
    links: [L('국가유산청', 'https://www.khs.go.kr', '국보 숭례문 소개.', '문화유산'), L('비짓서울', 'https://www.visitseoul.net', '서울 관광 공식 안내.', '여행 정보')] },
  { id: 'lotte', names: ['롯데월드타워', '롯데타워', '잠실 타워'], title: '롯데월드타워', country: '서울 잠실', env: 'city', dest: 'skyscraper', params: { h: 150, w: 16, segments: 5, taper: 0.1, crown: '#9be3ff' }, hour: 19.5,
    links: [L('롯데월드타워', 'https://www.lwt.co.kr', '서울스카이 전망대와 타워 안내.'), L('비짓서울', 'https://www.visitseoul.net', '서울 관광 공식 안내.', '여행 정보')] },
  { id: 'b63', names: ['63빌딩', '63 빌딩', '여의도'], title: '63빌딩', country: '서울 여의도', env: 'park', dest: 'skyscraper', params: { h: 100, w: 14, segments: 1, gold: true, depthRatio: 0.5 }, hour: 17.5, over: { water: { level: -0.3, base: 0.6, slope: 0.1, color: '#3f6f8f' } },
    links: [L('63스퀘어', 'https://www.63.co.kr', '63아트 전망대와 아쿠아리움.'), L('비짓서울', 'https://www.visitseoul.net', '서울 관광 공식 안내.', '여행 정보')] },
  { id: 'gwangan', names: ['광안대교', '광안리'], title: '광안대교', country: '부산', env: 'beach', dest: 'bridge', params: { color: '#8a94a8', len: 160, h: 46 }, hour: 20,
    links: [L('비짓부산', 'https://www.visitbusan.net', '부산 관광 공식 안내. 광안리 불꽃축제.'), L('부산시설공단 광안대교', 'https://www.bisco.or.kr', '광안대교 경관 조명 시간.')] },
  { id: 'haeundae', names: ['해운대'], title: '해운대 해변', country: '부산', env: 'beach', dest: 'skyscraper', params: { h: 80, w: 12, segments: 1, cluster: true, crown: '#ffd166' }, hour: 18,
    links: [L('비짓부산', 'https://www.visitbusan.net', '부산 관광 공식 안내.'), L('해운대구 문화관광', 'https://www.haeundae.go.kr/tour', '해운대 해수욕장과 축제.')] },
  { id: 'gamcheon', names: ['감천문화마을', '감천마을', '감천'], title: '감천문화마을', country: '부산', env: 'village', dest: 'hillvillage', params: {}, hour: 15, over: { crowd: true },
    links: [L('감천문화마을', 'https://www.gamcheon.or.kr', '골목 지도와 스탬프 투어.'), L('비짓부산', 'https://www.visitbusan.net', '부산 관광 공식 안내.', '여행 정보')] },
  { id: 'seongsan', names: ['성산일출봉', '일출봉'], title: '성산일출봉', country: '제주', env: 'beach', dest: 'peak', params: { r: 70, h: 60, flat: true, color: '#5a7a52' }, hour: 6,
    links: [L('비짓제주', 'https://www.visitjeju.net', '제주 관광 공식 안내. 일출 명소.'), L('제주 세계유산본부', 'https://www.jeju.go.kr/wnhcenter', '성산일출봉 탐방 안내.')] },
  { id: 'halla', names: ['한라산', '백록담'], title: '한라산', country: '제주', env: 'mountain', dest: 'peak', params: { r: 120, h: 80, color: '#4f6a4a', snow: false }, hour: 9,
    links: [L('한라산국립공원', 'https://www.jeju.go.kr/hallasan', '탐방로 예약과 날씨.'), L('비짓제주', 'https://www.visitjeju.net', '제주 관광 공식 안내.', '여행 정보')] },
  { id: 'bulguksa', names: ['불국사', '다보탑'], title: '불국사', country: '경주', env: 'mountain', dest: 'templehall', params: { tiers: 2 }, hour: 10,
    links: [L('불국사', 'https://www.bulguksa.or.kr', '불국사 관람과 템플스테이.'), L('경주문화관광', 'https://www.gyeongju.go.kr/tour', '경주 여행 안내.', '여행 정보')] },
  { id: 'seokguram', names: ['석굴암'], title: '석굴암', country: '경주', env: 'mountain', dest: 'dome', params: { color: '#8a8f8a', noPalms: true }, hour: 7,
    links: [L('석굴암', 'https://www.seokguram.org', '석굴암 관람 안내.'), L('경주문화관광', 'https://www.gyeongju.go.kr/tour', '경주 여행 안내.', '여행 정보')] },
  { id: 'cheomseongdae', names: ['첨성대'], title: '첨성대', country: '경주', env: 'meadow', dest: 'cheomseongdae', params: {}, hour: 20.5,
    links: [L('경주문화관광', 'https://www.gyeongju.go.kr/tour', '첨성대와 동궁과 월지 야경.'), L('한국천문연구원', 'https://www.kasi.re.kr', '오늘 밤의 별.', '별 보기')] },
  { id: 'jeonju', names: ['전주 한옥마을', '전주한옥마을', '전주'], title: '전주 한옥마을', country: '전주', env: 'village', dest: 'hanok', params: {}, hour: 16, over: { crowd: true },
    links: [L('전주 문화관광', 'https://tour.jeonju.go.kr', '한옥마을 지도와 먹거리.'), L('대한민국 구석구석', 'https://korean.visitkorea.or.kr', '국내 여행지 안내.', '여행 정보')] },
  { id: 'bukchon', names: ['북촌 한옥마을', '북촌한옥마을', '북촌'], title: '북촌 한옥마을', country: '서울', env: 'village', dest: 'hanok', params: {}, hour: 9,
    links: [L('비짓서울 북촌', 'https://www.visitseoul.net', '북촌 8경 산책 코스.'), L('서울역사박물관', 'https://museum.seoul.go.kr', '서울의 옛 동네 이야기.', '박물관')] },
  { id: 'dongnimmun', names: ['독립문'], title: '독립문', country: '서울', env: 'park', dest: 'arch', params: { w: 16, h: 16, d: 6, color: '#b9b4a8' }, hour: 15,
    links: [L('서대문독립공원', 'https://www.sscmc.or.kr', '독립문과 독립공원 안내.'), L('비짓서울', 'https://www.visitseoul.net', '서울 관광 공식 안내.', '여행 정보')] },
  { id: 'hwaseong', names: ['수원 화성', '수원화성', '화성행궁', '팔달문'], title: '수원 화성 팔달문', country: '수원', env: 'park', dest: 'palacegate', params: { w: 20, d: 9, tiers: 2, wall2: true, arches: [0] }, hour: 16,
    links: [L('수원문화재단', 'https://www.swcf.or.kr', '수원 화성 관람과 야간 행사.'), L('대한민국 구석구석', 'https://korean.visitkorea.or.kr', '국내 여행지 안내.', '여행 정보')] },
  { id: 'ddp', names: ['ddp', '동대문디자인플라자', '동대문 디자인 플라자', '동대문'], title: 'DDP 동대문디자인플라자', country: '서울', env: 'city', dest: 'blob', params: {}, hour: 20,
    links: [L('DDP', 'https://www.ddp.or.kr', '전시와 디자인 행사.'), L('비짓서울', 'https://www.visitseoul.net', '서울 관광 공식 안내.', '여행 정보')] },
  { id: 'gyeongpo', names: ['경포대', '경포호', '경포 해변', '강릉'], title: '경포대', country: '강릉', env: 'beach', dest: 'pavilion', params: {}, hour: 6.5,
    links: [L('강릉 문화관광', 'https://www.gn.go.kr/tour', '경포대와 경포 해변.'), L('강원관광', 'https://www.gangwon.to', '강원도 여행 안내.', '여행 정보')] },
  { id: 'ulsanbawi', names: ['울산바위', '설악산'], title: '설악산 울산바위', country: '속초', env: 'mountain', dest: 'peak', params: { r: 60, h: 70, color: '#8a8f8a' }, hour: 8,
    links: [L('설악산국립공원', 'https://www.knps.or.kr', '탐방로와 예약.'), L('강원관광', 'https://www.gangwon.to', '강원도 여행 안내.', '여행 정보')] },

  // ---------- 세계 ----------
  { id: 'eiffel', names: ['에펠탑', '에펠 탑', '에펠', 'eiffel'], title: '에펠탑', country: '프랑스 파리', env: 'park', dest: 'lattice', params: { h: 70, color: '#6b5a4a' }, hour: 17.5,
    links: [L('에펠탑 공식', 'https://www.toureiffel.paris', '입장권과 전망대 안내.'), L('파리 관광청', 'https://parisjetaime.com', '파리 여행 안내.', '여행 정보')] },
  { id: 'arc', names: ['개선문', '샹젤리제'], title: '개선문', country: '프랑스 파리', env: 'city', dest: 'arch', params: { w: 22, h: 26, d: 10 }, hour: 18,
    links: [L('개선문 공식', 'https://www.paris-arc-de-triomphe.fr', '옥상 전망대 안내.'), L('파리 관광청', 'https://parisjetaime.com', '파리 여행 안내.', '여행 정보')] },
  { id: 'louvre', names: ['루브르', '루브르 박물관'], title: '루브르 유리 피라미드', country: '프랑스 파리', env: 'park', dest: 'pyramid', params: { glass: true, h: 21 }, hour: 11,
    links: [L('루브르 박물관', 'https://www.louvre.fr', '전시와 예약.'), L('파리 관광청', 'https://parisjetaime.com', '파리 여행 안내.', '여행 정보')] },
  { id: 'tokyotower', names: ['도쿄타워', '도쿄 타워', '동경타워'], title: '도쿄타워', country: '일본 도쿄', env: 'city', dest: 'lattice', params: { h: 66, color: '#e3492f', secondColor: '#f1efe9' }, hour: 19,
    links: [L('도쿄타워', 'https://www.tokyotower.co.jp', '전망대와 조명 안내.'), L('GO TOKYO', 'https://www.gotokyo.org', '도쿄 관광 공식 안내.', '여행 정보')] },
  { id: 'skytree', names: ['스카이트리', '스카이 트리'], title: '도쿄 스카이트리', country: '일본 도쿄', env: 'city', dest: 'needle', params: { h: 130, color: '#dfe3ea', discColor: '#8fb7d8' }, hour: 18.5,
    links: [L('도쿄 스카이트리', 'https://www.skytree.jp', '전망 데크 안내.'), L('GO TOKYO', 'https://www.gotokyo.org', '도쿄 관광 공식 안내.', '여행 정보')] },
  { id: 'fuji', names: ['후지산', '후지 산', '富士'], title: '후지산', country: '일본', env: 'meadow', dest: 'peak', params: { r: 160, h: 110, snow: true, color: '#4a5a6a' }, hour: 6.5,
    links: [L('후지산 등산 공식', 'https://www.fujisan-climb.jp', '등산 시즌과 안전 안내.'), L('일본정부관광국', 'https://www.japan.travel/ko', '일본 여행 안내.', '여행 정보')] },
  { id: 'inari', names: ['후시미이나리', '후시미 이나리', '이나리', '천 개의 토리이'], title: '후시미이나리 토리이 길', country: '일본 교토', env: 'forest', dest: 'torii', params: { count: 16 }, hour: 7,
    links: [L('후시미이나리 신사', 'https://inari.jp', '신사와 참배길 안내.'), L('교토 관광', 'https://ja.kyoto.travel', '교토 여행 안내.', '여행 정보')] },
  { id: 'kinkaku', names: ['금각사', '킨카쿠지', '킨카쿠'], title: '금각사', country: '일본 교토', env: 'forest', dest: 'templehall', params: { tiers: 3, gold: true, pond: true }, hour: 10,
    links: [L('금각사(로쿠온지)', 'https://www.shokoku-ji.jp/kinkakuji/', '관람 안내.'), L('교토 관광', 'https://ja.kyoto.travel', '교토 여행 안내.', '여행 정보')] },
  { id: 'osaka', names: ['오사카성', '오사카 성'], title: '오사카성', country: '일본 오사카', env: 'park', dest: 'castle', params: { japan: true }, hour: 15,
    links: [L('오사카성 천수각', 'https://www.osakacastle.net', '천수각 관람 안내.'), L('오사카 관광국', 'https://osaka-info.jp', '오사카 여행 안내.', '여행 정보')] },
  { id: 'greatwall', names: ['만리장성', '장성'], title: '만리장성', country: '중국', env: 'mountain', dest: 'wall', params: {}, hour: 9,
    links: [L('유네스코 세계유산', 'https://whc.unesco.org/en/list/438', '만리장성 세계유산 소개.', '세계유산')] },
  { id: 'forbidden', names: ['자금성', '고궁', '천안문'], title: '자금성 오문', country: '중국 베이징', env: 'city', dest: 'palacegate', params: { w: 34, d: 14, tiers: 2, wood: '#9a2a1a', wall: '#a8321f', tile: '#c9a24a', stone: '#9a3a2a', baseH: 10 }, hour: 10,
    links: [L('고궁박물원', 'https://www.dpm.org.cn', '자금성(고궁박물원) 공식.'), L('유네스코 세계유산', 'https://whc.unesco.org/en/list/439', '세계유산 소개.', '세계유산')] },
  { id: 'taj', names: ['타지마할', '타지 마할'], title: '타지마할', country: '인도 아그라', env: 'park', dest: 'mosque', params: { color: '#f4f1ea', domeColor: '#f4f1ea', pool: true }, hour: 6.5,
    links: [L('타지마할 공식', 'https://www.tajmahal.gov.in', '관람 시간과 입장권.'), L('Incredible India', 'https://www.incredibleindia.gov.in', '인도 관광 공식.', '여행 정보')] },
  { id: 'angkor', names: ['앙코르와트', '앙코르 와트', '앙코르'], title: '앙코르와트', country: '캄보디아', env: 'forest', dest: 'angkor', params: {}, hour: 6,
    links: [L('유네스코 세계유산', 'https://whc.unesco.org/en/list/668', '앙코르 세계유산 소개.', '세계유산')] },
  { id: 'giza', names: ['피라미드', '기자', '스핑크스'], title: '기자 피라미드', country: '이집트', env: 'desert', dest: 'pyramid', params: { h: 70 }, hour: 16.5,
    links: [L('Experience Egypt', 'https://www.egypt.travel', '이집트 관광 공식.'), L('유네스코 세계유산', 'https://whc.unesco.org/en/list/86', '멤피스와 피라미드 지대.', '세계유산')] },
  { id: 'petra', names: ['페트라'], title: '페트라 알카즈네', country: '요르단', env: 'desert', dest: 'petra', params: {}, hour: 9,
    links: [L('비짓 페트라', 'https://www.visitpetra.jo', '페트라 관람 안내.'), L('유네스코 세계유산', 'https://whc.unesco.org/en/list/326', '세계유산 소개.', '세계유산')] },
  { id: 'colosseum', names: ['콜로세움', '콜로세오', '로마'], title: '콜로세움', country: '이탈리아 로마', env: 'city', dest: 'colosseum', params: {}, hour: 17,
    links: [L('콜로세움 고고학공원', 'https://colosseo.it', '입장권과 관람 안내.'), L('이탈리아 관광청', 'https://www.italia.it', '이탈리아 여행 안내.', '여행 정보')] },
  { id: 'pisa', names: ['피사의 사탑', '피사', '사탑'], title: '피사의 사탑', country: '이탈리아', env: 'park', dest: 'leaning', params: {}, hour: 11,
    links: [L('피사 두오모 광장', 'https://www.opapisa.it', '사탑 오르기 예약.'), L('이탈리아 관광청', 'https://www.italia.it', '이탈리아 여행 안내.', '여행 정보')] },
  { id: 'santorini', names: ['산토리니', '이아 마을', '이아'], title: '산토리니 이아 마을', country: '그리스', env: 'beach', dest: 'whitevillage', params: {}, hour: 18.3,
    links: [L('Visit Greece', 'https://www.visitgreece.gr', '그리스 관광 공식.'), L('유네스코', 'https://whc.unesco.org', '세계유산 목록.', '세계유산')] },
  { id: 'sagrada', names: ['사그라다 파밀리아', '사그라다', '성가족 성당'], title: '사그라다 파밀리아', country: '스페인 바르셀로나', env: 'city', dest: 'spires', params: {}, hour: 10,
    links: [L('사그라다 파밀리아', 'https://sagradafamilia.org', '입장권과 탑 오르기.'), L('바르셀로나 관광', 'https://www.barcelonaturisme.com', '바르셀로나 여행 안내.', '여행 정보')] },
  { id: 'bigben', names: ['빅벤', '빅 벤', '웨스트민스터'], title: '빅벤', country: '영국 런던', env: 'city', dest: 'clocktower', params: { h: 50 }, hour: 16, over: { water: { level: -0.3, base: 0.6, slope: 0.1, color: '#5a6f7f' } },
    links: [L('영국 의회', 'https://www.parliament.uk/visiting', '의사당과 빅벤 투어.'), L('Visit London', 'https://www.visitlondon.com', '런던 관광 공식.', '여행 정보')] },
  { id: 'londoneye', names: ['런던아이', '런던 아이'], title: '런던아이', country: '영국 런던', env: 'park', dest: 'wheel', params: { r: 24 }, hour: 19, over: { water: { level: -0.3, base: 0.6, slope: 0.1, color: '#5a6f7f' } },
    links: [L('런던아이', 'https://www.londoneye.com', '탑승권과 운영 시간.'), L('Visit London', 'https://www.visitlondon.com', '런던 관광 공식.', '여행 정보')] },
  { id: 'towerbridge', names: ['타워브리지', '타워 브리지'], title: '타워브리지', country: '영국 런던', env: 'park', dest: 'bridge', params: { gothic: true, color: '#8fb7d8', len: 120, h: 40 }, hour: 17, over: { water: { level: -0.3, base: 0.6, slope: 0.1, color: '#5a6f7f' } },
    links: [L('타워브리지', 'https://www.towerbridge.org.uk', '전시와 유리 바닥 통로.'), L('Visit London', 'https://www.visitlondon.com', '런던 관광 공식.', '여행 정보')] },
  { id: 'neuschwanstein', names: ['노이슈반슈타인', '노이슈반슈타인 성', '백조의 성'], title: '노이슈반슈타인 성', country: '독일 바이에른', env: 'mountain', dest: 'castle', params: { color: '#efe9dc' }, hour: 9,
    links: [L('노이슈반슈타인 성', 'https://www.neuschwanstein.de', '관람 예약.'), L('독일관광청', 'https://www.germany.travel', '독일 여행 안내.', '여행 정보')] },
  { id: 'brandenburg', names: ['브란덴부르크', '브란덴부르크 문', '베를린'], title: '브란덴부르크 문', country: '독일 베를린', env: 'city', dest: 'arch', params: { w: 26, h: 22, d: 8, columns: true, color: '#cfc4ad' }, hour: 17,
    links: [L('Visit Berlin', 'https://www.visitberlin.de', '베를린 관광 공식.'), L('독일관광청', 'https://www.germany.travel', '독일 여행 안내.', '여행 정보')] },
  { id: 'liberty', names: ['자유의 여신상', '자유의여신상', '리버티'], title: '자유의 여신상', country: '미국 뉴욕', env: 'beach', dest: 'statue', params: { h: 30, color: '#6fa08a', crown: true }, hour: 16, over: { props: ['rocks'], ground: '#7a8a6a', water: { level: -0.3, base: 0.6, slope: 0.12, color: '#3f6f8f' } },
    links: [L('미국 국립공원 자유의 여신상', 'https://www.nps.gov/stli', '페리와 관람 안내.'), L('NYC Tourism', 'https://www.nyctourism.com', '뉴욕 관광 공식.', '여행 정보')] },
  { id: 'empire', names: ['엠파이어 스테이트', '엠파이어스테이트', '맨해튼'], title: '엠파이어 스테이트 빌딩', country: '미국 뉴욕', env: 'city', dest: 'skyscraper', params: { h: 150, w: 18, segments: 4, taper: 0.15, cap: true, crown: '#ffd166' }, hour: 20,
    links: [L('엠파이어 스테이트 빌딩', 'https://www.esbnyc.com', '전망대 입장권.'), L('NYC Tourism', 'https://www.nyctourism.com', '뉴욕 관광 공식.', '여행 정보')] },
  { id: 'timessquare', names: ['타임스퀘어', '타임 스퀘어', '타임스 스퀘어'], title: '타임스퀘어', country: '미국 뉴욕', env: 'city', dest: 'skyscraper', params: { h: 90, w: 14, segments: 2, cluster: true, screens: true, crown: '#ff3ea5' }, hour: 21, over: { crowd: true },
    links: [L('타임스퀘어 공식', 'https://www.timessquarenyc.org', '행사와 새해 카운트다운.'), L('NYC Tourism', 'https://www.nyctourism.com', '뉴욕 관광 공식.', '여행 정보')] },
  { id: 'goldengate', names: ['금문교', '골든게이트', '골든 게이트', '샌프란시스코'], title: '금문교', country: '미국 샌프란시스코', env: 'beach', dest: 'bridge', params: { color: '#c0392b', len: 180, h: 60 }, hour: 17, over: { fogD: 0.02, fog: true },
    links: [L('금문교 공식', 'https://www.goldengate.org', '다리 통행과 전망 포인트.'), L('SF Travel', 'https://www.sftravel.com', '샌프란시스코 관광 공식.', '여행 정보')] },
  { id: 'grandcanyon', names: ['그랜드캐니언', '그랜드 캐니언', '캐니언'], title: '그랜드캐니언 전망대', country: '미국 애리조나', env: 'desert', dest: 'canyon', params: {}, hour: 17.5,
    links: [L('그랜드캐니언 국립공원', 'https://www.nps.gov/grca', '전망대와 트레일 안내.'), L('Visit Arizona', 'https://www.visitarizona.com', '애리조나 관광 공식.', '여행 정보')] },
  { id: 'machupicchu', names: ['마추픽추', '마추 픽추'], title: '마추픽추', country: '페루', env: 'mountain', dest: 'terraces', params: {}, hour: 7, over: { fogD: 0.018 },
    links: [L('마추픽추 공식 예매', 'https://www.machupicchu.gob.pe', '입장권 예매.'), L('유네스코 세계유산', 'https://whc.unesco.org/en/list/274', '세계유산 소개.', '세계유산')] },
  { id: 'rio', names: ['리우 예수상', '예수상', '코르코바두', '리우'], title: '코르코바두 예수상', country: '브라질 리우', env: 'mountain', dest: 'statue', params: { h: 30, color: '#d9d3c4', arms: 'wide' }, hour: 17,
    links: [L('유네스코 세계유산 리우', 'https://whc.unesco.org/en/list/1100', '리우 경관 세계유산.', '세계유산'), L('Visit Brasil', 'https://www.visitbrasil.com', '브라질 관광 공식.', '여행 정보')] },
  { id: 'sydney', names: ['시드니 오페라하우스', '오페라하우스', '오페라 하우스', '시드니'], title: '시드니 오페라하우스', country: '호주 시드니', env: 'beach', dest: 'opera', params: {}, hour: 18,
    links: [L('시드니 오페라하우스', 'https://www.sydneyoperahouse.com', '공연과 투어.'), L('Sydney.com', 'https://www.sydney.com', '시드니 관광 공식.', '여행 정보')] },
  { id: 'stonehenge', names: ['스톤헨지'], title: '스톤헨지', country: '영국', env: 'meadow', dest: 'stones', params: {}, hour: 6,
    links: [L('English Heritage', 'https://www.english-heritage.org.uk/visit/places/stonehenge/', '스톤헨지 관람 안내.'), L('유네스코 세계유산', 'https://whc.unesco.org/en/list/373', '세계유산 소개.', '세계유산')] },
  { id: 'moai', names: ['모아이', '이스터섬', '이스터 섬'], title: '이스터섬 모아이', country: '칠레', env: 'meadow', dest: 'stones', params: { moai: true, color: '#7a7f78' }, hour: 17.5, over: { water: { level: -0.3, base: 0.6, slope: 0.1, color: '#2f7f9f' }, props: ['rocks'] },
    links: [L('유네스코 세계유산', 'https://whc.unesco.org/en/list/715', '라파누이 국립공원.', '세계유산')] },
  { id: 'burj', names: ['부르즈 할리파', '부르즈칼리파', '두바이'], title: '부르즈 할리파', country: 'UAE 두바이', env: 'desert', dest: 'skyscraper', params: { h: 200, w: 16, segments: 6, taper: 0.14, crown: '#ffffff' }, hour: 18, over: { props: ['buildings-far'], density: 0, street: null },
    links: [L('부르즈 할리파', 'https://www.burjkhalifa.ae', 'At the Top 전망대.'), L('Visit Dubai', 'https://www.visitdubai.com', '두바이 관광 공식.', '여행 정보')] },
  { id: 'mongolia', names: ['몽골 초원', '몽골', '게르'], title: '몽골 초원의 게르', country: '몽골', env: 'meadow', dest: 'yurt', params: {}, hour: 17,
    links: [L('대한민국 구석구석', 'https://korean.visitkorea.or.kr', '여행 준비 정보.', '여행 정보'), L('National Geographic', 'https://www.nationalgeographic.com', '초원과 유목 문화 기사.', '읽을거리')] },
];

// 문장에 들어 있는 랜드마크 찾기 (긴 이름부터)
const INDEX = LANDMARKS.flatMap(lm => lm.names.map(n => ({ n: n.toLowerCase(), lm }))).sort((a, b) => b.n.length - a.n.length);
export function findLandmark(prompt) {
  const p = prompt.toLowerCase().replace(/\s+/g, ' ');
  const hit = INDEX.find(e => p.includes(e.n) || p.replace(/ /g, '').includes(e.n.replace(/ /g, '')));
  return hit ? hit.lm : null;
}

// 선택지용: "노을 지는 에펠탑" 같은 문장 만들기
const MOODS = ['', '', '아침의 ', '노을 지는 ', '밤의 ', '비 오는 ', '안개 낀 ', '해 질 녘 '];
export function randomLandmarkPrompt(rng = Math.random) {
  const lm = LANDMARKS[Math.floor(rng() * LANDMARKS.length)];
  const mood = MOODS[Math.floor(rng() * MOODS.length)];
  return { prompt: `${mood}${lm.title}`, landmark: lm };
}
