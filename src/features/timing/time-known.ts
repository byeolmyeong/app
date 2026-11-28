/**
 * 시각 "모름" 의 이중 안전(골든 룰 · 계획 "전역 제약" · 결정 049 의 8): 서버는 시각을 모르면 상승점 · 중천 · 하우스 · 버텍스가 대상인 구간
 * (돈 구간 · 운명적 만남 전부)과 그런 날을 주지 않는다. 그래도 받았다면 그리지 않는다 — 시기의 모든 화면(올해 · 인생 · 지금 나의 시기 · 시기 자세히 ·
 * 홈의 시기 칸 · 이번 달 · 홈의 눈여겨볼 날)이 이 두 함수를 거친 값만 그린다. 시각을 알면 받은 것을 그대로 돌려준다.
 */
import { isKnown, needsTime } from '@/features/reason/reason-sentence';
import type { MonthSky, TimingInterval, TimingReport } from '@/lib/api';

/** 시각을 몰라도 그릴 수 있는 구간: 돈 영역도 운명적 만남도 아니다 */
const drawable = (i: TimingInterval) => i.area !== 'MONEY' && i.kind !== 'FATED';

export function shownTiming(report: TimingReport): TimingReport {
  if (report.timeKnown) return report;
  const { mainId, nextInterval, ...current } = report.current;
  const intervals = current.intervals.filter(drawable);
  return {
    ...report,
    intervals: report.intervals.filter(drawable),
    current: {
      ...current,
      intervals,
      // 대표 구간이 빠졌으면 대표 구간이 없다(앱이 다른 구간을 고르지 않는다 — 서버 결정 033)
      ...(mainId !== undefined && intervals.some((i) => i.id === mainId) ? { mainId } : {}),
      ...(nextInterval && drawable(nextInterval) ? { nextInterval } : {}),
    },
  };
}

export function shownMonth(sky: MonthSky): MonthSky {
  if (sky.timeKnown) return sky;
  return {
    ...sky,
    themes: sky.themes.filter((t) => t.area !== 'MONEY'),
    // 근거가 상승점 · 중천 · 하우스인 날(시각을 알아야 셀 수 있는 날)은 뺀다
    days: sky.days.filter((d) => !d.reason.items.some((item) => isKnown(item) && needsTime(item))),
  };
}
