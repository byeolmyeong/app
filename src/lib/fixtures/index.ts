/**
 * 서버 응답 예시. 테스트와 개발용 가짜 서버(EXPO_PUBLIC_USE_FIXTURES)가 함께 쓴다.
 * 모양은 서버 저장소 docs/architecture.md "API 계약" 을 따른다. 서버 태스크가 끝나면 실제 응답으로 바꾼다.
 *
 * - places.json: 서버의 국내 시·군·구 229곳 전체(서버 저장소 src/main/resources/places/kr-sigungu.csv 를 옮김).
 * - chart.json: 서버(계획 태스크 15)가 2000-06-15 21:00 · 서울특별시 마포구로 준 실제 응답이다(2026-11-11).
 * - chart-time-unknown.json: 같은 날짜·장소에 시각 null 로 받은 실제 응답. 하우스·상승점·중천·행운점·버텍스가 없다.
 * - reading.json: 글은 시안의 예시 문장이다. 요약 해석 v2 의 모양(문단마다 근거 구조 `reason` + 옮기는 동안 함께 오는 옛 낱말 `basis`, 보완점 2).
 * - me-report.json: `GET /me-report` 의 다 쓴 나 탭 풀이(다섯 영역). 글은 시안 12-8~12-12 의 예시 문장이고, 근거 · 쓰인 별 · 일 방식 값은
 *   chart.json(쌍둥이자리 해 · 6하우스에 별 셋)에 맞춰 쓴 예시다(서버가 계산한 값이 아니다).
 * - timing-report.json: `GET /timing-report` 의 다 쓴 시기 풀이(결정 049 · 서버 결정 033). 구간 이름 · 기간 · 한 줄 · 자세히 · 실천 · 마디의 해와 나이는
 *   캔버스 14 보드(14 · 14-1 · 14-2 · 14-3)의 글에 맞춘 예시이고(오늘 2026-11-19, 대표 구간 i11), 서버가 계산한 값이 아니다.
 *   timing-report-time-unknown.json 은 같은 것의 시각 모름(운명적 만남 · 돈 · 상승점 · 중천 · 하우스 · 버텍스가 대상인 구간이 없다).
 * - month-sky.json: `GET /timing/month` 의 2026-11(보드 14-1 의 이번 달 내내 둘 · 눈여겨볼 날 셋). day-sky.json: `POST /day-sky` 의 그날(보드 14-4).
 * - synastry.json: `POST /synastry/direct` 의 응답 예시(겹친 휠 `overlay` 포함). 내 쪽 위치는 chart.json 의 값이고 상대 쪽과 글은 지어낸 예시다.
 * - synastry-list.json: `GET /synastry` 의 예시(새것부터, `overlay` 없음). 60점 미만인 것에만 `scoreLabel` 이 있다.
 * - synastry-report.json: 궁합 리포트의 네 영역(끌림 · 대화 · 갈등 · 오래가기). 글은 예시 문장이고 근거는 내 쪽 요소뿐이다.
 * - direction.json: `POST /directions`(이성)의 응답 예시. 한 줄 제목과 해 볼 만한 것 3개. 글은 조언형으로 쓴 예시 문장이다.
 * - faqs.json: `GET /faqs` 의 예시(결정 028). 지어낸 두 줄이다. 실제 질문과 답은 관리 화면이 주인이라 여기에 옮겨 두지 않는다.
 * - share-cards.json: 공유 카드 네 종류의 예시(`ShareCard`, 서버 결정 012). 랭킹은 이니셜(`ranking`)과 이름 그대로(`rankingNames`) 두 가지.
 * - direction-future.json · direction-synastry.json: `POST /directions` 의 미래 · 궁합 주제 응답 예시. 조언형이고 숫자가 없다.
 * - inquiries.json: 내 문의 둘(앱이 읽은 모양 `InquiryItem`, 답 없는 것 · 답 있는 것). 글은 시안 16-8 의 예시 문장이다.
 * - 초대 응답은 계약에 모양이 다 적혀 있지 않아 아직 예시를 두지 않는다.
 */
import type {
  Chart,
  DaySky,
  Direction,
  Faq,
  InquiryItem,
  MeReport,
  MonthSky,
  Place,
  Reading,
  ShareCard,
  Synastry,
  SynastryReport,
  TimingReport,
} from '@/lib/api';

import chartTimeUnknown from './chart-time-unknown.json';
import chart from './chart.json';
import daySky from './day-sky.json';
import directionFuture from './direction-future.json';
import directionSynastry from './direction-synastry.json';
import direction from './direction.json';
import faqs from './faqs.json';
import inquiries from './inquiries.json';
import meReport from './me-report.json';
import monthSky from './month-sky.json';
import places from './places.json';
import reading from './reading.json';
import shareCards from './share-cards.json';
import synastryList from './synastry-list.json';
import synastryReport from './synastry-report.json';
import synastry from './synastry.json';
import timingReportTimeUnknown from './timing-report-time-unknown.json';
import timingReport from './timing-report.json';

export const fixtures = {
  places: places as Place[],
  chart: chart as Chart,
  chartTimeUnknown: chartTimeUnknown as Chart,
  reading: reading as Reading,
  meReport: meReport as MeReport,
  timingReport: timingReport as TimingReport,
  timingReportTimeUnknown: timingReportTimeUnknown as TimingReport,
  monthSky: monthSky as MonthSky,
  daySky: daySky as DaySky,
  direction: direction as Direction,
  faqs: faqs as Faq[],
  inquiries: inquiries as InquiryItem[],
  directionFuture: directionFuture as Direction,
  directionSynastry: directionSynastry as Direction,
  synastry: synastry as Synastry,
  synastryList: synastryList as Synastry[],
  synastryReport: synastryReport as SynastryReport,
  shareCards: shareCards as {
    reading: Extract<ShareCard, { kind: 'READING' }>;
    score: Extract<ShareCard, { kind: 'SCORE' }>;
    ranking: Extract<ShareCard, { kind: 'RANKING' }>;
    rankingNames: Extract<ShareCard, { kind: 'RANKING' }>;
    nextTurn: Extract<ShareCard, { kind: 'NEXT_TURN' }>;
    nickname: Extract<ShareCard, { kind: 'NICKNAME' }>;
    meArea: Extract<ShareCard, { kind: 'ME_AREA' }>;
    daySky: Extract<ShareCard, { kind: 'DAY_SKY' }>;
    nextBig: Extract<ShareCard, { kind: 'NEXT_BIG' }>;
  },
};
