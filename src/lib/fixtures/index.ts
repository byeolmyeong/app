/**
 * 서버 응답 예시. 테스트와 개발용 가짜 서버(EXPO_PUBLIC_USE_FIXTURES)가 함께 쓴다.
 * 모양은 서버 저장소 docs/architecture.md "API 계약" 을 따른다. 서버 태스크가 끝나면 실제 응답으로 바꾼다.
 *
 * - chart.json: 행성 10개의 별자리·도·분은 2000-06-15 12:00 UT(한국 시각 오후 9시)의 실제 값이다
 *   (docs/raw/2026-11-10-jpl-horizons-reference.md 의 황경을 분 단위로 반올림).
 *   하우스 경계·상승점·중천·북쪽 교점·릴리스·행운점·각 천체의 하우스 번호·각도의 applying 은 계산값이 아닌 예시다.
 * - chart-time-unknown.json: 같은 날짜의 "시각 모름" 예시. 하우스·상승점·중천·행운점이 없다.
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
