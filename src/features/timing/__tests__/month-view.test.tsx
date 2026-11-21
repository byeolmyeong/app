import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TimingLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { MonthView } from '@/features/timing/month-view';
import { useMonth } from '@/features/timing/use-month';
import { api, type ApiResult, type MonthSky } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getMonth: jest.fn(), saveProfile: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const T = strings.timing;
const input = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const nov = fixtures.monthSky;
const quiet = (month: string): MonthSky => ({ ...nov, month, days: [] });

/** 시기 탭과 같은 짝: 이번 달 훅 + 이번 달 화면 */
function Harness({ onDay }: { onDay: (date: string) => void }) {
  const month = useMonth(input);
  if (!month.base || !month.drawn.month) return null;
  return (
    <MonthView
      base={month.base}
      shown={month.drawn.month}
      state={month.drawn.state}
      canPrev={month.canPrev}
      canNext={month.canNext}
      onMove={month.go}
      onRetry={month.retry}
      today="2026-11-19"
      onDay={onDay}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.getMonth.mockImplementation(async (month?: string): Promise<ApiResult<MonthSky>> => ({ ok: true, data: month ? quiet(month) : nov }));
});

describe('이번 달(결정 049 의 2, 캔버스 14-1)', () => {
  it('달 머리 · 달력(1일의 요일부터 그달의 날) · 눈여겨볼 날에 점 · 이번 달 내내 줄 · 눈여겨볼 날 목록(날짜 · 요일 · 칩 · 문구)', async () => {
    await render(<Harness onDay={jest.fn()} />);
    expect(await screen.findByText('2026년 11월')).toBeTruthy();
    for (const w of T.weekdays) expect(screen.getAllByText(w).length).toBeGreaterThan(0);
    expect(screen.getByTestId('day-2026-11-01')).toBeTruthy();
    expect(screen.getByTestId('day-2026-11-30')).toBeTruthy();
    expect(screen.queryByTestId('day-2026-11-31')).toBeNull();
    for (const d of nov.days) expect(screen.getByTestId(`dot-${d.date}`)).toBeTruthy();
    expect(screen.queryByTestId('dot-2026-11-20')).toBeNull();
    expect(screen.getAllByTestId('month-theme')).toHaveLength(2);
    expect(screen.getByText(`이번 달 내내 · ${nov.themes[0].title}`)).toBeTruthy();
    expect(screen.getByText('이번 달 눈여겨볼 날')).toBeTruthy();
    expect(screen.getAllByTestId('month-day')).toHaveLength(3);
    expect(screen.getByText(nov.days[0].text)).toBeTruthy();
    expect(screen.getAllByText(T.categories.PEOPLE).length).toBeGreaterThan(0);
    // 오늘은 읽기 이름에 "오늘", 점이 있는 날은 "눈여겨볼 날"
    expect(screen.getByLabelText(`11월 19일${T.month.today}`)).toBeTruthy();
    expect(screen.getByLabelText(`11월 21일${T.month.notable}`)).toBeTruthy();
  });

  it('날짜나 눈여겨볼 날을 누르면 그날로(그날의 하늘)', async () => {
    const onDay = jest.fn();
    await render(<Harness onDay={onDay} />);
    await fireEvent.press(await screen.findByTestId('day-2026-11-05'));
    expect(onDay).toHaveBeenLastCalledWith('2026-11-05');
    await fireEvent.press(screen.getAllByTestId('month-day')[1]);
    expect(onDay).toHaveBeenLastCalledWith('2026-11-25');
  });

  it('‹ › 는 32 동그라미 한가운데에 — 꺾쇠는 가리키는 쪽으로 1 옮겨 눈으로 보는 가운데를 맞춘다(소유자 지적, 빌드 10)', async () => {
    await render(<Harness onDay={jest.fn()} />);
    const head = StyleSheet.flatten((await screen.findByTestId('month-head')).props.style);
    expect(head).toMatchObject({ flexDirection: 'row', alignItems: 'center' });
    for (const [id, dir] of [['month-prev', -1], ['month-next', 1]] as const) {
      const button = screen.getByTestId(id);
      expect(StyleSheet.flatten(button.props.style)).toMatchObject({
        width: TimingLayout.month.arrow,
        height: TimingLayout.month.arrow,
        borderRadius: TimingLayout.month.arrow / 2,
        alignItems: 'center',
        justifyContent: 'center',
      });
      // 꺾쇠의 테두리 상자는 이미 한가운데 — 열린 쪽에 무게가 실려(삼각형 무게중심 · 진하기 무게중심 둘 다) 가리키는 쪽으로 옮긴다
      const icon = screen.getByTestId(`${id}-icon`);
      expect(icon.props.width).toBe(TimingLayout.month.arrowIcon);
      expect(StyleSheet.flatten(icon.props.style)?.transform).toEqual([{ translateX: dir * TimingLayout.month.arrowNudge }]);
    }
    expect(TimingLayout.month.arrowNudge).toBe(1);
  });

  it('달을 바꿔도 달력 격자와 칸은 다시 붙지 않고 그 자리에서 바뀐다(소유자 지적 — 처음 넘길 때 반짝임, 빌드 11)', async () => {
    const props = { base: '2026-11', canPrev: true, canNext: true, onMove: jest.fn(), onRetry: jest.fn(), today: '2026-11-19', onDay: jest.fn() };
    const view = await render(<MonthView {...props} shown="2026-11" state={{ status: 'done', sky: nov }} />);
    const grid = screen.getByTestId('month-calendar');
    const cells = () => screen.getByTestId('month-grid').children;
    const tenth = cells()[10];
    await view.rerender(<MonthView {...props} shown="2026-12" state={{ status: 'done', sky: quiet('2026-12') }} />);
    expect(screen.getByText('2026년 12월')).toBeTruthy();
    expect(screen.getByTestId('month-calendar')).toBe(grid);
    expect(cells()[10]).toBe(tenth);
  });

  it('‹ › 는 처음 받은 달의 지난달 · 다음 달 끝에서 막힌다', async () => {
    await render(<Harness onDay={jest.fn()} />);
    await screen.findByText('2026년 11월');
    await fireEvent.press(screen.getByTestId('month-next'));
    expect(await screen.findByText('2026년 12월')).toBeTruthy();
    expect(screen.getByTestId('month-next').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('month-next'));
    expect(screen.getByText('2026년 12월')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('month-prev'));
    await fireEvent.press(screen.getByTestId('month-prev'));
    expect(await screen.findByText('2026년 10월')).toBeTruthy();
    expect(screen.getByTestId('month-prev').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('month-prev'));
    expect(screen.getByText('2026년 10월')).toBeTruthy();
    // 앞뒤 달은 이번 달을 그릴 때 미리 한 번씩 받아 둔다(빌드 11) — 넘길 때 다시 부르지 않는다
    expect(mockApi.getMonth.mock.calls.map((c) => c[0]).sort()).toEqual(['2026-10', '2026-12', undefined]);
  });

  it('눈여겨볼 날이 없는 달은 점 없이 안내 한 장(결정 065 의 3)', async () => {
    await render(<Harness onDay={jest.fn()} />);
    await screen.findByText('2026년 11월');
    await fireEvent.press(screen.getByTestId('month-next'));
    expect(await screen.findByTestId('month-quiet')).toBeTruthy();
    // 다른 달을 볼 때는 그 달의 이름으로, 없는 알림을 약속하지 않는다(리뷰 #63)
    expect(screen.getByText('12월은 큰 움직임 없이 흘러가요')).toBeTruthy();
    expect(screen.getByText('12월 눈여겨볼 날')).toBeTruthy();
    expect(screen.getByText('12월 내내 · 일의 방식을 새로 다지는 시기')).toBeTruthy();
    expect(screen.queryByText(/다음 달 1일/)).toBeNull();
    expect(screen.queryAllByTestId('month-day')).toHaveLength(0);
    expect(screen.queryByTestId(/^dot-/)).toBeNull();
  });

  it('범위(처음 받은 달의 지난달 1일 ~ 다음 달 말일) 밖의 날짜는 누를 수 없다', async () => {
    const onDay = jest.fn();
    const jan: MonthSky = { ...nov, month: '2027-01', days: [{ ...nov.days[0], date: '2027-01-05' }] };
    await render(
      <MonthView base="2026-11" shown="2027-01" state={{ status: 'done', sky: jan }} canPrev canNext={false} onMove={jest.fn()} onRetry={jest.fn()} today="2026-11-19" onDay={onDay} />,
    );
    await fireEvent.press(screen.getByTestId('day-2027-01-05'));
    await fireEvent.press(screen.getByTestId('month-day'));
    expect(onDay).not.toHaveBeenCalled();
    expect(screen.getByTestId('day-2027-01-05').props.accessibilityRole).toBeUndefined();
  });

  it('모르는 칩의 날 · 모르는 영역의 줄은 숨긴다(전체를 버리지 않는다)', async () => {
    const odd: MonthSky = {
      ...nov,
      themes: [{ ...nov.themes[0], area: 'HEALTH' }, nov.themes[1]],
      days: [{ ...nov.days[0], category: 'LUCK' }, nov.days[1]],
    };
    await render(<MonthView base="2026-11" shown="2026-11" state={{ status: 'done', sky: odd }} canPrev canNext onMove={jest.fn()} onRetry={jest.fn()} today="2026-11-19" onDay={jest.fn()} />);
    expect(screen.getAllByTestId('month-day')).toHaveLength(1);
    expect(screen.queryByText(nov.days[0].text)).toBeNull();
    expect(screen.queryByTestId('dot-2026-11-21')).toBeNull();
    expect(screen.getAllByTestId('month-theme')).toHaveLength(1);
  });

  it('그달만 못 받으면 그 자리에 안내(19-1), 다시 보기로 다시 부른다', async () => {
    // 그달은 미리 받기도 넘길 때도 못 받는다(미리 받기의 실패는 조용히 — 넘길 때 다시 불러 실패하면 안내)
    mockApi.getMonth.mockImplementation(async (month?: string): Promise<ApiResult<MonthSky>> =>
      month === '2026-12' ? { ok: false, error: 'NETWORK' } : { ok: true, data: month ? quiet(month) : nov },
    );
    await render(<Harness onDay={jest.fn()} />);
    await screen.findByText('2026년 11월');
    await fireEvent.press(screen.getByTestId('month-next'));
    expect(await screen.findByTestId('card-fail')).toBeTruthy();
    mockApi.getMonth.mockImplementation(async (month?: string): Promise<ApiResult<MonthSky>> => ({ ok: true, data: month ? quiet(month) : nov }));
    expect(screen.getByText(T.month.loadFail.title)).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.states.loadFail.retry })));
    await waitFor(() => expect(screen.queryByTestId('card-fail')).toBeNull());
    expect(screen.getByTestId('month-quiet')).toBeTruthy();
    // 다시 본 달은 그 달의 자리(이전 달로 돌아갔다 오지 않는다)
    expect(screen.getByText('2026년 12월')).toBeTruthy();
  });
});
