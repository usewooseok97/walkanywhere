// 장소에 어울리는 웹사이트. 길가의 건물·표지판에 간판으로 붙고, 두 번 클릭하면 새 탭으로 열린다.
// 테마별 목록 + 시간대/날씨 태그에 따라 더해지는 목록. 자유롭게 고쳐 쓰세요.

const BY_THEME = {
  beach: [
    { name: '비짓제주', url: 'https://www.visitjeju.net', desc: '제주 관광 공식 안내. 해변, 오름, 올레길 정보.', tag: '여행 정보' },
    { name: '대한민국 구석구석', url: 'https://korean.visitkorea.or.kr', desc: '한국관광공사의 국내 여행지 안내.', tag: '여행 정보' },
    { name: 'Windy', url: 'https://www.windy.com', desc: '바람과 파도, 날씨를 지도 위에서 보는 곳.', tag: '바다 날씨' },
    { name: '국립해양박물관', url: 'https://www.knmm.or.kr', desc: '바다와 배, 해양 문화를 다루는 박물관.', tag: '박물관' },
  ],
  forest: [
    { name: '국립공원공단', url: 'https://www.knps.or.kr', desc: '국립공원 탐방로와 예약, 안전 정보.', tag: '탐방 안내' },
    { name: '숲나들e', url: 'https://www.foresttrip.go.kr', desc: '산림청 휴양림 예약과 숲길 안내.', tag: '휴양림' },
    { name: '두루누비', url: 'https://www.durunubi.kr', desc: '전국 걷기 여행길 지도와 코스.', tag: '걷기길' },
    { name: '국립수목원', url: 'https://kna.forest.go.kr', desc: '광릉숲의 수목원. 나무와 식물 이야기.', tag: '수목원' },
  ],
  snow: [
    { name: '강원관광', url: 'https://www.gangwon.to', desc: '강원도 겨울 여행과 축제 안내.', tag: '여행 정보' },
    { name: '하이원리조트', url: 'https://www.high1.com', desc: '정선의 스키장과 리조트.', tag: '스키장' },
    { name: '용평리조트', url: 'https://www.yongpyong.co.kr', desc: '평창의 스키장. 발왕산 케이블카.', tag: '스키장' },
    { name: '기상청 날씨누리', url: 'https://www.weather.go.kr', desc: '오늘의 날씨와 눈 소식.', tag: '날씨' },
  ],
  desert: [
    { name: 'Visit Dubai', url: 'https://www.visitdubai.com', desc: '사막 사파리와 두바이 여행 안내.', tag: '여행 정보' },
    { name: 'National Geographic', url: 'https://www.nationalgeographic.com', desc: '사막과 자연을 담은 사진과 기사.', tag: '읽을거리' },
    { name: '구글 어스', url: 'https://earth.google.com', desc: '지구 어디든 위에서 내려다보기.', tag: '지도' },
  ],
  city: [
    { name: '비짓서울', url: 'https://www.visitseoul.net', desc: '서울 관광 공식 안내. 야경 명소와 행사.', tag: '여행 정보' },
    { name: '서울문화포털', url: 'https://culture.seoul.go.kr', desc: '서울의 공연과 전시, 문화 행사.', tag: '문화 행사' },
    { name: '네이버 지도', url: 'https://map.naver.com', desc: '길 찾기와 주변 가게 찾기.', tag: '지도' },
    { name: '카카오맵', url: 'https://map.kakao.com', desc: '로드뷰로 실제 거리 둘러보기.', tag: '지도' },
  ],
  village: [
    { name: '국가유산청', url: 'https://www.khs.go.kr', desc: '옛 마을과 문화유산 안내.', tag: '문화유산' },
    { name: '서울역사박물관', url: 'https://museum.seoul.go.kr', desc: '서울의 옛 동네와 생활사를 보여주는 박물관.', tag: '박물관' },
    { name: '대한민국 구석구석', url: 'https://korean.visitkorea.or.kr', desc: '전통시장과 마을 여행지 안내.', tag: '여행 정보' },
    { name: '한국민속촌', url: 'https://www.koreanfolk.co.kr', desc: '옛 마을의 집과 장터를 재현한 곳.', tag: '민속촌' },
  ],
  mars: [
    { name: 'NASA Mars', url: 'https://science.nasa.gov/mars/', desc: '화성 탐사 로버와 최신 사진.', tag: '우주 탐사' },
    { name: '한국천문연구원', url: 'https://www.kasi.re.kr', desc: '별과 행성, 천문 현상 안내.', tag: '천문' },
    { name: 'ESA', url: 'https://www.esa.int', desc: '유럽우주국의 탐사 소식.', tag: '우주 탐사' },
    { name: 'Stellarium Web', url: 'https://stellarium-web.org', desc: '지금 하늘의 별자리를 브라우저에서.', tag: '별 지도' },
  ],
  meadow: [
    { name: '웰촌', url: 'https://www.welchon.com', desc: '농촌 여행과 체험 마을 안내.', tag: '농촌 여행' },
    { name: '두루누비', url: 'https://www.durunubi.kr', desc: '전국 걷기 여행길 지도와 코스.', tag: '걷기길' },
    { name: '국립수목원', url: 'https://kna.forest.go.kr', desc: '나무와 들꽃 이야기.', tag: '수목원' },
    { name: '대한민국 구석구석', url: 'https://korean.visitkorea.or.kr', desc: '국내 여행지 안내.', tag: '여행 정보' },
  ],
};

const BY_TAG = {
  night: [{ name: '한국천문연구원', url: 'https://www.kasi.re.kr', desc: '오늘 밤 보이는 별과 달.', tag: '별 보기' }],
  rain: [{ name: '기상청 날씨누리', url: 'https://www.weather.go.kr', desc: '비 소식과 레이더 영상.', tag: '날씨' }],
  crowd: [{ name: '전통시장 가는 날', url: 'https://korean.visitkorea.or.kr', desc: '전국 전통시장과 먹거리.', tag: '시장' }],
};

export function pickLinks(theme) {
  const out = [...(BY_THEME[theme.key] ?? BY_THEME.meadow)];
  if (theme.startHour >= 20 || theme.startHour < 5) out.push(...BY_TAG.night);
  if (theme.rain) out.push(...BY_TAG.rain);
  if (theme.crowd && theme.key !== 'city') out.push(...BY_TAG.crowd);
  // 같은 주소 중복 제거
  const seen = new Set();
  return out.filter(l => (seen.has(l.url) ? false : (seen.add(l.url), true)));
}
