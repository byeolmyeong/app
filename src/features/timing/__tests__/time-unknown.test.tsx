import { render, screen } from '@testing-library/react-native';

import { HomeTimingCards } from '@/features/timing/home-timing-card';
import { LifeView } from '@/features/timing/life-view';
import { MonthView } from '@/features/timing/month-view';
import { shownMonth, shownTiming } from '@/features/timing/time-known';
import { YearView, mainInterval } from '@/features/timing/year-view';
import type { MonthSky, TimingInterval, TimingReport } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

// 계획 "전역 제약" · 골든 룰(이중 안전): 시각 "모름" 이면 받았더라도 돈 구간 · 운명적 만남 · 상승점 · 중천 · 하우스가 어디에도 없다
const base = fixtures.timingReport;
const written = { summary: '한 줄', detail: { changes: 'a', howTo: 'b', after: 'c' }, practices: [{ title: '돈 하기' }, { title: '둘 하기' }, { title: '셋 하기' }] };
const money: TimingInterval = { id: 'm1', kind: 'OPPORTUNITY', from: '2026-10-01', to: '2027-02-01', area: 'MONEY', title: '돈 구간 이름', body: '본문', ...written };
const fated: TimingInterval = { id: 'f1', kind: 'FATED', from: '2027-01-10', to: '2027-05-01', area: 'PEOPLE', title: '다가오는 만남 구간', body: '본문', ...written };
/** 시각 모름인데 서버가 실수로 돈 · 운명적 만남을 준 응답(대표 구간이 돈) */
const leaky: TimingReport = {
  ...base,
  timeKnown: false,
  intervals: [...base.intervals, money, fated],
  current: { ...base.current, intervals: [money, ...base.current.intervals], mainId: 'm1', nextInterval: fated },
};
const noop = () => {};

describe('시각 "모름" 이중 안전 — 거르는 함수 하나(shownTiming · shownMonth)', () => {
  it('시각을 알면 그대로, 모르면 돈 · 운명적 만남 구간을 목록 · 지금 · 다음 구간에서 빼고, 빠진 대표 구간은 없앤다', () => {
    expect(shownTiming(base)).toBe(base);
    const shown = shownTiming(leaky);
    expect(shown.intervals.some((i) => i.area === 'MONEY' || i.kind === 'FATED')).toBe(false);
    expect(shown.current.intervals.map((i) => i.id)).toEqual(base.current.intervals.map((i) => i.id));
    expect(shown.current.mainId).toBeUndefined();
    expect(shown.current.nextInterval).toBeUndefined();
    expect(mainInterval(shown)).toBeNull();
  });

  it('이번 달: 시각을 모르면 돈 영역의 "이번 달 내내" 줄과 상승점 · 중천 · 하우스가 근거인 눈여겨볼 날을 뺀다', () => {
    const nov = fixtures.monthSky;
    const asc = { ...nov.days[0], date: '2026-11-23', reason: { when: 'DAY', items: [{ kind: 'TRANSIT', mover: 'MARS', target: 'ASC', type: 'SQUARE' }] } };
    const sky: MonthSky = { ...nov, timeKnown: false, themes: [...nov.themes, { area: 'MONEY', title: '돈 이번 달', from: '2026-11-01', to: '2026-12-01' }], days: [...nov.days, asc] };
    const shown = shownMonth(sky);
    expect(shown.themes.map((t) => t.title)).toEqual(nov.themes.map((t) => t.title));
    expect(shown.days.map((d) => d.date)).toEqual(nov.days.map((d) => d.date));
    expect(shownMonth(nov)).toBe(nov);
  });
});

describe('시각 "모름" — 화면 어디에도 돈 · 운명적 만남이 없다', () => {
  it('올해: 띠 · 지금 지나는 중 · 다가오는 시기 · 작은 실천', async () => {
    await render(<YearView report={leaky} onPeriod={noop} />);
    expect(screen.queryByTestId('year-row-MONEY')).toBeNull();
    expect(screen.queryByText('돈 구간 이름')).toBeNull();
    expect(screen.queryByText('다가오는 만남 구간')).toBeNull();
    expect(screen.queryByText('돈')).toBeNull();
    expect(screen.queryByText('돈 하기')).toBeNull();
  });

  it('인생: 대표 구간이 돈이면 작은 실천이 없다', async () => {
    await render(<LifeView report={leaky} />);
    expect(screen.queryByText('돈 하기')).toBeNull();
  });

  it('홈 시기 칸: 대표 구간이 돈이면 칸을 그리지 않는다', async () => {
    await render(<HomeTimingCards state={{ status: 'done', report: leaky }} skeleton={false} online onOpen={noop} onRetry={noop} />);
    expect(screen.queryByText('돈 구간 이름')).toBeNull();
    expect(screen.queryByText('돈 하기')).toBeNull();
  });

  it('이번 달: 돈 영역의 "이번 달 내내" 줄이 없다', async () => {
    const nov = fixtures.monthSky;
    const sky: MonthSky = { ...nov, timeKnown: false, themes: [{ area: 'MONEY', title: '돈 이번 달', from: '2026-11-01', to: '2026-12-01' }, ...nov.themes] };
    await render(<MonthView base="2026-11" shown="2026-11" state={{ status: 'done', sky }} canPrev canNext onMove={noop} onRetry={noop} today="2026-11-19" onDay={noop} />);
    expect(screen.queryByText(/돈 이번 달/)).toBeNull();
    expect(screen.getAllByTestId('month-theme')).toHaveLength(nov.themes.length);
  });
});
