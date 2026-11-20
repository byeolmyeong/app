import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { strings } from '@/content/strings';
import { LifeView } from '@/features/timing/life-view';
import { YearView } from '@/features/timing/year-view';
import type { TimingReport } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const T = strings.timing;
const report = fixtures.timingReport;
const main = report.intervals.find((i) => i.id === report.current.mainId)!;

describe('올해(결정 049 의 3, 캔버스 14)', () => {
  it('"2026년의 흐름" 띠 그래프: 영역 넷 · 그해에 걸친 구간만(지난 것은 흐린 띠) · 지금 표시 · 달 눈금', async () => {
    await render(<YearView report={report} onPeriod={jest.fn()} />);
    expect(screen.getByText('2026년의 흐름')).toBeTruthy();
    for (const area of ['WORK', 'PEOPLE', 'SELF', 'MONEY']) expect(screen.getByTestId(`year-row-${area}`)).toBeTruthy();
    expect(within(screen.getByTestId('year-row-WORK')).getAllByTestId('year-band')).toHaveLength(1);
    expect(within(screen.getByTestId('year-row-PEOPLE')).getAllByTestId('year-band')).toHaveLength(1);
    expect(within(screen.getByTestId('year-row-SELF')).getAllByTestId('year-band-past')).toHaveLength(1);
    expect(within(screen.getByTestId('year-row-MONEY')).queryAllByTestId(/year-band/)).toHaveLength(0);
    expect(screen.getByTestId('year-now')).toBeTruthy();
    for (const t of T.year.ticks) expect(screen.getByText(t)).toBeTruthy();
  });

  it('지금 지나는 중(대표 구간 먼저 · "~ 2027년 1월") · 다가오는 시기(1년 안) · 대표 구간의 작은 실천 셋', async () => {
    await render(<YearView report={report} onPeriod={jest.fn()} />);
    expect(screen.getByText(T.year.ongoing)).toBeTruthy();
    const rows = screen.getAllByTestId('timing-interval');
    expect(within(rows[0]).getByText(main.title)).toBeTruthy();
    expect(within(rows[0]).getByText('~ 2027년 1월')).toBeTruthy();
    expect(within(rows[1]).getByText('도움이 되는 사람을 만나기 쉬운 시기')).toBeTruthy();
    expect(screen.getByText(T.year.upcoming)).toBeTruthy();
    expect(within(rows[2]).getByText('인연이 열리기 쉬운 시기')).toBeTruthy();
    expect(within(rows[2]).getByText('2027년 3월 ~ 8월')).toBeTruthy();
    expect(rows).toHaveLength(3);
    expect(screen.getAllByTestId('timing-practice').map((p) => within(p).getByText(/기$/).props.children)).toEqual(main.practices!.map((p) => p.title));
  });

  it('자세한 글이 있는 줄만 누를 수 있고, 누르면 그 구간의 시기 자세히', async () => {
    const onPeriod = jest.fn();
    const noDetail: TimingReport = {
      ...report,
      current: { ...report.current, intervals: report.current.intervals.map(({ detail: _d, ...i }) => (i.id === 'i10' ? i : { ...i, detail: main.detail })) },
    };
    await render(<YearView report={noDetail} onPeriod={onPeriod} />);
    const rows = screen.getAllByTestId('timing-interval');
    await fireEvent.press(rows[0]);
    expect(onPeriod).toHaveBeenLastCalledWith(main.id);
    expect(rows[1].props.accessibilityRole).toBeUndefined();
  });

  it('시각 "모름" 이면 돈 줄이 없다', async () => {
    await render(<YearView report={fixtures.timingReportTimeUnknown} onPeriod={jest.fn()} />);
    expect(screen.queryByTestId('year-row-MONEY')).toBeNull();
    expect(screen.getByTestId('year-row-WORK')).toBeTruthy();
  });

  it('대표 구간 · 걸친 구간이 없으면 지금 지나는 중과 작은 실천이 없다', async () => {
    const { mainId: _m, ...current } = report.current;
    await render(<YearView report={{ ...report, current: { ...current, intervals: [] } }} onPeriod={jest.fn()} />);
    expect(screen.queryByText(T.year.ongoing)).toBeNull();
    expect(screen.queryByText(T.practices)).toBeNull();
    expect(screen.getByText('2026년의 흐름')).toBeTruthy();
  });
});

describe('인생(결정 049 의 4, 캔버스 14-2)', () => {
  it('안내 · 다음 큰 변화 카드(서버의 해 · 만 나이 · 제목 · 본문) · 공유 아이콘 자리만(공유는 A⑤)', async () => {
    await render(<LifeView report={report} />);
    expect(screen.getByText(T.life.title)).toBeTruthy();
    expect(screen.getByText(T.life.note)).toBeTruthy();
    const card = screen.getByTestId('life-next');
    expect(within(card).getByText('2028')).toBeTruthy();
    expect(within(card).getByText('만 29세 무렵')).toBeTruthy();
    expect(within(card).getByText('나만의 기준을 세우는 시기')).toBeTruthy();
    expect(screen.getByTestId('life-share-spot')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('큰 변화 네 줄의 길: 지난 것 · 다음 큰 변화(표시) · 그 뒤', async () => {
    await render(<LifeView report={report} />);
    expect(screen.getAllByTestId('life-step-past')).toHaveLength(1);
    expect(within(screen.getByTestId('life-step-next')).getByText('나만의 기준을 세우는 시기 · 다음 큰 변화')).toBeTruthy();
    expect(within(screen.getByTestId('life-step-next')).getByText('2028 · 만 29세 무렵')).toBeTruthy();
    expect(screen.getAllByTestId('life-step')).toHaveLength(2);
    expect(screen.getByText('2020 · 만 21세 무렵')).toBeTruthy();
    expect(screen.getAllByTestId('timing-practice')).toHaveLength(3);
  });

  it('네 번을 모두 지났으면(다음 큰 변화 없음) 카드 대신 한 줄, 길은 모두 지난 것', async () => {
    const { nextMilestone: _n, ...current } = report.current;
    await render(<LifeView report={{ ...report, current }} />);
    expect(screen.queryByTestId('life-next')).toBeNull();
    expect(screen.getByText(T.life.done)).toBeTruthy();
    expect(screen.getAllByTestId('life-step-past')).toHaveLength(4);
  });
});
