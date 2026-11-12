/**
 * 서버 응답 예시. 테스트와 개발용 가짜 서버(EXPO_PUBLIC_USE_FIXTURES)가 함께 쓴다.
 * 모양은 서버 저장소 docs/architecture.md "API 계약" 을 따른다. 서버 태스크가 끝나면 실제 응답으로 바꾼다.
 *
 * - places.json: 서버의 국내 시·군·구 229곳 전체(서버 저장소 src/main/resources/places/kr-sigungu.csv 를 옮김).
 * - chart.json: 서버(계획 태스크 15)가 2000-06-15 21:00 · 서울특별시 마포구로 준 실제 응답이다(2026-11-11).
 * - chart-time-unknown.json: 같은 날짜·장소에 시각 null 로 받은 실제 응답. 하우스·상승점·중천·행운점·버텍스가 없다.
 * - reading.json: 글은 시안의 예시 문장이다.
 * - report.json: 심층 리포트의 네 영역(성격 · 관계 · 일 · 감정)과 시기(`timing`: 변곡점 넷, 구간 23개, 오늘은 2026-11-11).
 *   글과 날짜는 계약의 모양에 맞춰 쓴 예시다(서버가 계산한 값이 아니다).
 * - report-timing-time-unknown.json: 시각 모름일 때의 시기 예시. 운명적 만남 구간과 돈 영역이 없다. `reportTimeUnknown` 이 쓴다.
 * - synastry.json: `POST /synastry/direct` 의 응답 예시(겹친 휠 `overlay` 포함). 내 쪽 위치는 chart.json 의 값이고 상대 쪽과 글은 지어낸 예시다.
 * - synastry-list.json: `GET /synastry` 의 예시(새것부터, `overlay` 없음). 60점 미만인 것에만 `scoreLabel` 이 있다.
 * - synastry-report.json: 궁합 리포트의 네 영역(끌림 · 대화 · 갈등 · 오래가기). 글은 예시 문장이고 근거는 내 쪽 요소뿐이다.
 * - direction.json: `POST /directions`(이성)의 응답 예시. 한 줄 제목과 해 볼 만한 것 3개. 글은 조언형으로 쓴 예시 문장이다.
 * - faqs.json: `GET /faqs` 의 예시(결정 028). 지어낸 두 줄이다. 실제 질문과 답은 관리 화면이 주인이라 여기에 옮겨 두지 않는다.
 * - share-cards.json: 공유 카드 네 종류의 예시(`ShareCard`, 서버 결정 012). 랭킹은 이니셜(`ranking`)과 이름 그대로(`rankingNames`) 두 가지.
 * - 초대 응답은 계약에 모양이 다 적혀 있지 않아 아직 예시를 두지 않는다.
 */
import type {
  Chart,
  Direction,
  Faq,
  Place,
  Reading,
  Report,
  ReportTiming,
  ShareCard,
  Synastry,
  SynastryReport,
} from '@/lib/api';

import chartTimeUnknown from './chart-time-unknown.json';
import chart from './chart.json';
import direction from './direction.json';
import faqs from './faqs.json';
import places from './places.json';
import reading from './reading.json';
import reportTimingTimeUnknown from './report-timing-time-unknown.json';
import report from './report.json';
import shareCards from './share-cards.json';
import synastryList from './synastry-list.json';
import synastryReport from './synastry-report.json';
import synastry from './synastry.json';

export const fixtures = {
  places: places as Place[],
  chart: chart as Chart,
  chartTimeUnknown: chartTimeUnknown as Chart,
  reading: reading as Reading,
  report: report as Report,
  reportTimeUnknown: { sections: report.sections, timing: reportTimingTimeUnknown as ReportTiming } as Report,
  direction: direction as Direction,
  faqs: faqs as Faq[],
  synastry: synastry as Synastry,
  synastryList: synastryList as Synastry[],
  synastryReport: synastryReport as SynastryReport,
  shareCards: shareCards as {
    reading: Extract<ShareCard, { kind: 'READING' }>;
    score: Extract<ShareCard, { kind: 'SCORE' }>;
    ranking: Extract<ShareCard, { kind: 'RANKING' }>;
    rankingNames: Extract<ShareCard, { kind: 'RANKING' }>;
    nextTurn: Extract<ShareCard, { kind: 'NEXT_TURN' }>;
  },
};
