/**
 * 서버 응답 예시. 테스트와 개발용 가짜 서버(EXPO_PUBLIC_USE_FIXTURES)가 함께 쓴다.
 * 모양은 서버 저장소 docs/architecture.md "API 계약" 을 따른다. 서버 태스크가 끝나면 실제 응답으로 바꾼다.
 *
 * - places.json: 서버의 국내 시·군·구 229곳 전체(서버 저장소 src/main/resources/places/kr-sigungu.csv 를 옮김).
 * - chart.json: 서버(계획 태스크 15)가 2000-06-15 21:00 · 서울특별시 마포구로 준 실제 응답이다(2026-11-11).
 * - chart-time-unknown.json: 같은 날짜·장소에 시각 null 로 받은 실제 응답. 하우스·상승점·중천·행운점·버텍스가 없다.
 * - reading.json: 글은 시안의 예시 문장이다.
 * - report.json: 심층 리포트의 네 영역(성격 · 관계 · 일 · 감정). 글은 계약의 모양에 맞춰 쓴 예시 문장이다. 시기는 아직 없다.
 * - synastry.json: `POST /synastry/direct` 의 응답 예시(겹친 휠 `overlay` 포함). 내 쪽 위치는 chart.json 의 값이고 상대 쪽과 글은 지어낸 예시다.
 * - synastry-list.json: `GET /synastry` 의 예시(새것부터, `overlay` 없음). 60점 미만인 것에만 `scoreLabel` 이 있다.
 * - synastry-report.json: 궁합 리포트의 네 영역(끌림 · 대화 · 갈등 · 오래가기). 글은 예시 문장이고 근거는 내 쪽 요소뿐이다.
 * - 초대·공유 응답은 계약에 모양이 다 적혀 있지 않아 아직 예시를 두지 않는다.
 */
import type { Chart, Place, Reading, Report, Synastry, SynastryReport } from '@/lib/api';

import chartTimeUnknown from './chart-time-unknown.json';
import chart from './chart.json';
import places from './places.json';
import reading from './reading.json';
import report from './report.json';
import synastryList from './synastry-list.json';
import synastryReport from './synastry-report.json';
import synastry from './synastry.json';

export const fixtures = {
  places: places as Place[],
  chart: chart as Chart,
  chartTimeUnknown: chartTimeUnknown as Chart,
  reading: reading as Reading,
  report: report as Report,
  synastry: synastry as Synastry,
  synastryList: synastryList as Synastry[],
  synastryReport: synastryReport as SynastryReport,
};
