/**
 * 서버 응답 예시. 테스트와 개발용 가짜 서버(EXPO_PUBLIC_USE_FIXTURES)가 함께 쓴다.
 * 모양은 서버 저장소 docs/architecture.md "API 계약" 을 따른다. 서버 태스크가 끝나면 실제 응답으로 바꾼다.
 *
 * - places.json: 서버의 국내 시·군·구 229곳 전체(서버 저장소 src/main/resources/places/kr-sigungu.csv 를 옮김).
 * - chart.json: 서버(계획 태스크 15)가 2000-06-15 21:00 · 서울특별시 마포구로 준 실제 응답이다(2026-11-11).
 * - chart-time-unknown.json: 같은 날짜·장소에 시각 null 로 받은 실제 응답. 하우스·상승점·중천·행운점·버텍스가 없다.
 * - reading.json: 글은 시안의 예시 문장이다.
 * - 궁합(`Synastry`)·리포트(`Report`)·공유 응답은 계약에 모양이 다 적혀 있지 않아 아직 예시를 두지 않는다.
 */
import type { Chart, Place, Reading } from '@/lib/api';

import chartTimeUnknown from './chart-time-unknown.json';
import chart from './chart.json';
import places from './places.json';
import reading from './reading.json';

export const fixtures = {
  places: places as Place[],
  chart: chart as Chart,
  chartTimeUnknown: chartTimeUnknown as Chart,
  reading: reading as Reading,
};
