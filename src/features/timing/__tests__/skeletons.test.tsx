import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { DaySkeleton, DayView } from '@/features/timing/day-view';
import { LifeSkeleton, LifeView } from '@/features/timing/life-view';
import { MonthSkeleton, MonthView } from '@/features/timing/month-view';
import { PeriodSkeleton, PeriodView } from '@/features/timing/period-view';
import { DetailCard, DetailCardSkeleton } from '@/features/timing/timing-parts';
import { YearSkeleton, YearView } from '@/features/timing/year-view';
import { fixtures } from '@/lib/fixtures';

type Node = { props?: { testID?: string }; children?: (Node | string)[] | null };

/** 그린 나무에서 testID 를 차례대로(깊이 우선) 모은다 */
async function ids(element: ReactElement): Promise<string[]> {
  const out: string[] = [];
  const walk = (n: Node | Node[] | string | null) => {
    if (!n || typeof n === 'string') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.props?.testID) out.push(n.props.testID);
    (n.children ?? []).forEach(walk);
  };
  const view = await render(element);
  walk(view.toJSON() as Node);
  await view.unmount();
  return out;
}

/** 다 그려진 화면의 칸 차례와, 뼈대가 본뜬 칸(testID "sk-…")의 차례 */
async function layouts(real: ReactElement, skeleton: ReactElement, blocks: string[]) {
  return {
    real: (await ids(real)).filter((id) => blocks.includes(id)),
    skeleton: (await ids(skeleton))
      .filter((id) => id.startsWith('sk-'))
      .map((id) => id.slice(3))
      .filter((id) => blocks.includes(id)),
  };
}

const report = fixtures.timingReport;
const main = report.intervals.find((i) => i.id === report.current.mainId)!;
const nov = fixtures.monthSky;
const noop = () => {};

// 결정 071(065 의 2 구체화): 처음 불러올 때 뼈대는 그 화면이 다 그려졌을 때의 배치를 그대로 본뜬다 — 같은 칸 · 같은 차례 · 같은 줄 수
describe('뼈대 = 다 그려진 화면의 배치(결정 071)', () => {
  it('이번 달(받기 전): 달 머리 · 달력 · 눈여겨볼 날 제목 · 줄 셋 · 자세한 풀이 카드, 달력의 날 수도 같다', async () => {
    const real = (
      <>
        <MonthView base="2026-11" shown="2026-11" state={{ status: 'done', sky: nov }} canPrev canNext onMove={noop} onRetry={noop} today="2026-11-19" onDay={noop} />
        <DetailCard blocked={false} onRequest={noop} />
      </>
    );
    const skeleton = (
      <>
        <MonthSkeleton month="2026-11" />
        <DetailCardSkeleton />
      </>
    );
    const l = await layouts(real, skeleton, ['month-head', 'month-calendar', 'timing-section-title', 'month-day', 'timing-detail-card']);
    expect(l.skeleton).toEqual(l.real);
    expect(l.real).toEqual(['month-head', 'month-calendar', 'timing-section-title', 'month-day', 'month-day', 'month-day', 'timing-detail-card']);
    expect((await ids(skeleton)).filter((id) => id === 'sk-day')).toHaveLength((await ids(real)).filter((id) => /^day-\d/.test(id)).length);
  });

  it('올해: 흐름 제목 · 띠 카드 · 지금 지나는 중 둘 · 다가오는 시기 하나 · 작은 실천 셋', async () => {
    const l = await layouts(<YearView report={report} onPeriod={noop} />, <YearSkeleton />, ['timing-section-title', 'year-flow', 'timing-interval', 'timing-practice']);
    expect(l.skeleton).toEqual(l.real);
    expect(l.real.filter((id) => id === 'timing-interval')).toHaveLength(3);
  });

  it('인생: 제목 · 다음 큰 변화 · 네 줄의 길 · 작은 실천 셋', async () => {
    const l = await layouts(<LifeView report={report} />, <LifeSkeleton />, ['timing-section-title', 'life-next', 'life-path', 'timing-practice']);
    expect(l.skeleton).toEqual(l.real);
    const steps = (await ids(<LifeView report={report} />)).filter((id) => id.startsWith('life-step'));
    expect((await ids(<LifeSkeleton />)).filter((id) => id === 'sk-life-step')).toHaveLength(steps.length);
  });

  it('시기 자세히: 머리 카드 · 이유 · 01 ~ 03 · 작은 실천 셋', async () => {
    const l = await layouts(
      <PeriodView interval={main} detail={main.detail!} today="2026-11-19" chart={fixtures.chart} />,
      <PeriodSkeleton />,
      ['period-hero', 'period-reason', 'period-section', 'timing-section-title', 'timing-practice'],
    );
    expect(l.skeleton).toEqual(l.real);
  });

  it('그날의 하늘: 머리 카드 · 흐름 셋 · 이유 · 실천 셋', async () => {
    const l = await layouts(<DayView sky={fixtures.daySky} chart={fixtures.chart} today="2026-11-19" />, <DaySkeleton />, [
      'day-hero',
      'day-section-title',
      'day-flow',
      'day-reason',
      'timing-todo',
    ]);
    expect(l.skeleton).toEqual(l.real);
  });
});
