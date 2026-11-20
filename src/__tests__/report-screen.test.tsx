import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import ReportScreen from '@/app/report';
import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { REPORT_POLL_MS } from '@/features/report/use-report';
import {
  api,
  type ApiResult,
  type Direction,
  type Report,
  type ReportState,
  type TimingCurrent,
  type TimingInterval,
  type TimingMilestone,
} from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { requestReport: jest.fn(), getReport: jest.fn(), saveProfile: jest.fn(), createDirection: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockParams = useLocalSearchParams as jest.Mock;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const R = strings.report;
const report = fixtures.report;
const [personality, relationship, work, emotion] = report.sections;
const got = (status: 'NONE' | 'WRITING' | 'FAILED'): ApiResult<ReportState> => ({ ok: true, data: { status } });
const done: ApiResult<ReportState> = { ok: true, data: { status: 'DONE', report } };
/** 영역 탭 다섯(`Tabs`). 화면 아래에는 앱의 아래 탭 넷(`BottomTabs`)이 따로 있다(결정 046 의 4 · 055) */
const areas = () => within(screen.getByTestId('tabs'));
const selectedTabs = () => areas().getAllByRole('tab').map((t) => t.props.accessibilityState.selected);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockUseSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
  mockParams.mockReturnValue({});
  mockApi.getReport.mockResolvedValue(done);
  mockApi.requestReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
  mockApi.createDirection.mockResolvedValue({ ok: true, data: fixtures.directionFuture });
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
  await saveBirth({ profile, chart: fixtures.chart });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('심층 리포트 화면', () => {
  it('아직 없으면 한 줄 설명과 "리포트 받기" 를 보여 주고, 누르면 쓰는 중이 되었다가 다 쓰이면 글을 보여 준다', async () => {
    jest.useFakeTimers();
    mockApi.getReport.mockResolvedValueOnce(got('NONE')).mockResolvedValueOnce(got('WRITING'));
    await render(<ReportScreen />);
    expect(await screen.findByText(R.intro)).toBeTruthy();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(mockApi.requestReport).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText(R.request));
    expect(await screen.findByText(R.writing)).toBeTruthy();
    // 1~2분 걸리고, 나갔다가 돌아와도 된다고 알린다
    expect(screen.getByText(R.writingNote)).toBeTruthy();
    expect(R.writingNote).toMatch(/1~2분/);
    expect(screen.queryByText(R.request)).toBeNull();
    expect(mockApi.requestReport).toHaveBeenCalledTimes(1);

    await act(async () => void (await jest.advanceTimersByTimeAsync(REPORT_POLL_MS)));
    expect(screen.getByText(R.writing)).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(REPORT_POLL_MS)));
    expect(screen.getByText(personality.title)).toBeTruthy();
    expect(screen.queryByText(R.writing)).toBeNull();
  });

  it('열었을 때 쓰는 중이면 쓰는 중을 보여 준다', async () => {
    mockApi.getReport.mockResolvedValue(got('WRITING'));
    const view = await render(<ReportScreen />);
    expect(await screen.findByText(R.writing)).toBeTruthy();
    expect(mockApi.requestReport).not.toHaveBeenCalled();
    await view.unmount();
  });

  it('다 쓰였으면 영역 탭 다섯(성격 · 관계 · 일 · 감정 · 시기)과 첫 영역의 제목 · 문단을 서버가 준 그대로 보여 준다', async () => {
    await render(<ReportScreen />);
    expect(await screen.findByText(personality.title)).toBeTruthy();
    const tabs = areas().getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    ['성격', '관계', '일', '감정', '시기'].forEach((label, i) => expect(within(tabs[i]).getByText(label)).toBeTruthy());
    // 탭 다섯이 폭을 똑같이 나눠 쓴다
    for (const tab of tabs) expect(StyleSheet.flatten(tab.props.style).flex).toBe(1);
    expect(selectedTabs()).toEqual([true, false, false, false, false]);
    for (const paragraph of personality.paragraphs) {
      expect(screen.getByText(paragraph.title)).toBeTruthy();
      expect(screen.getByText(paragraph.body)).toBeTruthy();
    }
    // 문단마다 근거가 된 차트 요소를 작게 적는다
    expect(screen.getByText('근거 · 태양 · 쌍둥이 · 6하우스')).toBeTruthy();
    // 고르지 않은 영역의 글은 그리지 않는다
    expect(screen.queryByText(relationship.title)).toBeNull();
    // 요약 해석과 같은 면책 문구
    expect(screen.getByText(strings.reading.disclaimer)).toBeTruthy();
  });

  it('탭을 누르면 그 영역의 글로 바뀐다', async () => {
    await render(<ReportScreen />);
    await screen.findByText(personality.title);
    for (const [label, section, other] of [
      ['관계', relationship, personality],
      ['일', work, relationship],
      ['감정', emotion, work],
      ['성격', personality, emotion],
    ] as const) {
      await fireEvent.press(screen.getByText(label));
      expect(screen.getByText(section.title)).toBeTruthy();
      expect(screen.getByText(section.paragraphs[0].body)).toBeTruthy();
      expect(screen.queryByText(other.title)).toBeNull();
    }
  });

  it('주소의 area 로 처음 보일 탭을 고른다(/report?area=RELATIONSHIP)', async () => {
    mockParams.mockReturnValue({ area: 'RELATIONSHIP' });
    await render(<ReportScreen />);
    expect(await screen.findByText(relationship.title)).toBeTruthy();
    expect(selectedTabs()).toEqual([false, true, false, false, false]);
    expect(screen.queryByText(personality.title)).toBeNull();
  });

  it('area 가 모르는 값이면 첫 영역을 보여 준다', async () => {
    mockParams.mockReturnValue({ area: 'FUTURE' });
    await render(<ReportScreen />);
    expect(await screen.findByText(personality.title)).toBeTruthy();
    expect(selectedTabs()).toEqual([true, false, false, false, false]);
  });

  it('글 아래에 앱의 아래 탭 넷이 있고, area=TIMING 이면 시기 · 아니면 나가 골라져 있다(결정 046 의 4 · 055 의 2)', async () => {
    const bottom = () => within(screen.getByTestId('bottom-tabs')).getAllByRole('tab');
    const view = await render(<ReportScreen />);
    await screen.findByText(personality.title);
    expect(bottom().map((t) => t.props.accessibilityLabel)).toEqual(['홈', '나', '시기', '마이']);
    expect(bottom().map((t) => t.props.accessibilityState.selected)).toEqual([false, true, false, false]);
    await view.unmount();
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    await screen.findByTestId('timing-view');
    expect(bottom().map((t) => t.props.accessibilityState.selected)).toEqual([false, false, true, false]);
  });

  it('글 영역에서 누를 수 있는 것은 뒤로 가기와 탭 다섯뿐이다(공유·다시 생성 없음)', async () => {
    await render(<ReportScreen />);
    await screen.findByText(personality.title);
    expect(areas().getAllByRole('tab')).toHaveLength(5);
    expect(screen.queryAllByRole('button')).toHaveLength(1);
    expect(screen.getByLabelText(strings.common.backLabel)).toBeTruthy();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('실패하면 안내와 "다시 시도" 를 보여 주고, 누르면 요청부터 다시 한다', async () => {
    mockApi.getReport.mockResolvedValueOnce(got('FAILED'));
    mockApi.requestReport.mockResolvedValue({ ok: true, data: { status: 'DONE' } });
    await render(<ReportScreen />);
    expect(await screen.findByText(R.failed.OTHER)).toBeTruthy();
    expect(mockApi.requestReport).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(R.retry));
    expect(await screen.findByText(personality.title)).toBeTruthy();
    expect(mockApi.requestReport).toHaveBeenCalledTimes(1);
  });

  it('인터넷이 끊겼을 때와 요청이 많을 때는 그에 맞는 안내를 보여 준다', async () => {
    mockApi.getReport.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const first = await render(<ReportScreen />);
    expect(await screen.findByText(R.failed.NETWORK)).toBeTruthy();
    await first.unmount();
    mockApi.getReport.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<ReportScreen />);
    expect(await screen.findByText(R.failed.LIMIT)).toBeTruthy();
  });

  it('같은 날 다시 열면 보관된 리포트를 보여 주고 서버를 부르지 않는다', async () => {
    // "지금 나의 구간" 이 오늘(한국 날짜) 것인 리포트. 오늘 것이 아니면 한 번 다시 받는다(use-report 테스트)
    const date = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = { ...report, timing: { ...report.timing, current: { ...report.timing.current, date } } };
    mockApi.getReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: today } });
    const first = await render(<ReportScreen />);
    await screen.findByText(personality.title);
    await first.unmount();
    await render(<ReportScreen />);
    expect(await screen.findByText(personality.title)).toBeTruthy();
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
  });

  it('세션 확인이 끝나기 전에는 서버를 부르지 않는다', async () => {
    mockUseSession.mockReturnValue({ status: 'checking' as const, token: null, ready: false, lastError: null });
    await render(<ReportScreen />);
    expect(await screen.findByText(R.checking)).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getReport).not.toHaveBeenCalled();
  });

  it('출생 정보가 없으면 입력으로 가는 안내를 보여 주고 서버를 부르지 않는다', async () => {
    await AsyncStorage.clear();
    await render(<ReportScreen />);
    expect(await screen.findByText(strings.chart.empty)).toBeTruthy();
    await waitFor(() => expect(mockApi.getReport).not.toHaveBeenCalled());
    await fireEvent.press(screen.getByText(strings.chart.goHome));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

/** 화면에 그려진 순서대로의 글자 */
const drawn = () => JSON.stringify(screen.toJSON());
/** 그려진 글자에서 a 가 b 보다 앞에 있는가 */
const before = (a: string, b: string) => {
  const text = drawn();
  const [ia, ib] = [text.indexOf(JSON.stringify(a)), text.indexOf(JSON.stringify(b))];
  return ia > -1 && ib > -1 && ia < ib;
};
type Part = 'now' | 'near' | 'ahead' | 'past';
const part = (name: Part) => within(screen.getByTestId(`timing-section-${name}`));
const titlesIn = (root: ReturnType<typeof within>) =>
  root
    .queryAllByTestId('timing-interval')
    .map((row) => within(row).getByTestId('timing-interval-title').props.children);

describe('심층 리포트 화면: 시기 탭', () => {
  const T = strings.report.timing;
  const { timing } = report;
  const [i1] = timing.intervals;
  const byId = (id: string) => timing.intervals.find((i) => i.id === id)!;
  const titles = (...ids: string[]) => ids.map((id) => byId(id).title);
  const made = (id: string, from: string, to: string, more: Partial<TimingInterval> = {}): TimingInterval => ({
    ...i1,
    id,
    from,
    to,
    title: id,
    body: `${id} 본문`,
    ...more,
  });
  /** 받은 순서(시작 순서)를 지키며 구간을 끼워 넣는다 */
  const withIntervals = (...extra: TimingInterval[]) =>
    [...timing.intervals, ...extra].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  /** 시기만 바꾼 리포트를 서버가 주게 하고 시기 탭을 연다 */
  async function openTiming(changed: Partial<Report['timing']> = {}, source: Report = report) {
    const data: ReportState = { status: 'DONE', report: { ...source, timing: { ...source.timing, ...changed } } };
    mockApi.getReport.mockResolvedValue({ ok: true, data });
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    await screen.findByTestId('timing-view');
  }
  const press = async (root: ReturnType<typeof within>, label: string) =>
    fireEvent.press(root.getByText(label, { exact: false }));
  const openPast = () => fireEvent.press(screen.getByRole('button', { name: T.pastShow }));
  /** 접어 둔 것(지나온 시기, 작은 변화 · 기회, 더 보기)을 모두 편다 */
  async function openEverything() {
    await openPast();
    for (const name of ['ahead', 'past'] as const) {
      if (part(name).queryByText(T.showAll, { exact: false })) await press(part(name), T.showAll);
    }
    while (part('ahead').queryByText(T.later, { exact: false })) await press(part('ahead'), T.later);
    while (part('past').queryByText(T.earlier, { exact: false })) await press(part('past'), T.earlier);
  }

  it('주소의 area=TIMING 으로 시기 탭을 바로 열고, 탭을 눌러서도 오간다', async () => {
    await openTiming();
    expect(selectedTabs()).toEqual([false, false, false, false, true]);
    expect(screen.queryByText(personality.title)).toBeNull();
    await fireEvent.press(areas().getByText('성격'));
    expect(screen.getByText(personality.title)).toBeTruthy();
    expect(screen.queryByTestId('timing-view')).toBeNull();
    await fireEvent.press(areas().getByText('시기'));
    expect(screen.getByTestId('timing-view')).toBeTruthy();
  });

  it('네 부분이 지금 → 올해 · 내년 → 앞으로 → 지나온 시기 순서로 있고, 저마다 제목과 한 줄 설명이 있다', async () => {
    await openTiming();
    expect(screen.getAllByTestId('timing-heading').map((h) => h.props.children)).toEqual([
      '지금',
      '올해 · 내년',
      '앞으로',
      '지나온 시기',
    ]);
    for (const name of ['now', 'near', 'ahead', 'past'] as const) {
      expect(part(name).getByText(T.sections[name].heading)).toBeTruthy();
      expect(part(name).getByText(T.sections[name].intro)).toBeTruthy();
    }
    const view = screen.getByTestId('timing-view');
    const order = ['now', 'near', 'ahead', 'past'].map((name) =>
      view.children.indexOf(screen.getByTestId(`timing-section-${name}`)),
    );
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // 고지 문구는 네 부분보다 앞, 면책 문구는 맨 아래
    expect(before(T.notice, T.sections.now.intro)).toBe(true);
    expect(before(T.sections.past.intro, strings.reading.disclaimer)).toBe(true);
  });

  it('"지금" 은 오늘에 걸친 구간마다 제목 · 본문 · 언제까지를 보여 준다', async () => {
    await openTiming();
    const now = within(screen.getByTestId('timing-now'));
    expect(part('now').getByTestId('timing-now')).toBeTruthy();
    expect(timing.current.intervals.map((i) => i.id)).toEqual(['i11', 'i12']);
    for (const interval of timing.current.intervals) {
      expect(now.getByText(interval.title)).toBeTruthy();
      expect(now.getByText(interval.body)).toBeTruthy();
    }
    expect(now.getByText('2027년 2월까지')).toBeTruthy();
    expect(now.getByText('2026년 12월까지')).toBeTruthy();
    // 걸친 구간이 있으면 "없어요" 와 다음 구간은 적지 않는다
    expect(now.queryByText(T.nowNone)).toBeNull();
    expect(now.queryByText(T.nextIntervalLabel)).toBeNull();
    expect(now.queryByText(timing.current.nextInterval!.title)).toBeNull();
    // 다음 변곡점은 "앞으로" 에 있다
    expect(part('now').queryByText(T.nextMilestoneLabel)).toBeNull();
    expect(part('now').queryByText(timing.current.nextMilestone!.title)).toBeNull();
  });

  it('오늘이 변곡점의 기간 안이면 그 변곡점도 "지금" 에 보여 준다', async () => {
    const milestone = timing.milestones[1];
    await openTiming({ current: { ...timing.current, milestone } });
    const now = within(screen.getByTestId('timing-now'));
    expect(now.getByText(T.milestoneNow)).toBeTruthy();
    expect(now.getByText(milestone.title)).toBeTruthy();
    expect(now.getByText(milestone.body)).toBeTruthy();
    expect(now.getByText('2030년 4월까지')).toBeTruthy();
  });

  it('지금 걸친 구간이 없으면 없다고 알리고 다음에 오는 구간을 가리킨다', async () => {
    const { date, nextInterval, nextMilestone, nearestMilestone } = timing.current;
    const intervals = timing.intervals.filter((i) => i.id !== 'i11' && i.id !== 'i12');
    await openTiming({ intervals, current: { date, intervals: [], nextInterval, nextMilestone, nearestMilestone } });
    const now = within(screen.getByTestId('timing-now'));
    expect(now.getByText(T.nowNone)).toBeTruthy();
    expect(now.getByText(T.nextIntervalLabel)).toBeTruthy();
    expect(now.getByText(nextInterval!.title)).toBeTruthy();
    expect(now.getByText('2027년 3월부터')).toBeTruthy();
    expect(now.queryByText(byId('i11').title)).toBeNull();
    // 올해 · 내년에도 "지금 지나는 중" 묶음이 없다
    expect(part('near').queryByText(T.nearOngoing)).toBeNull();
    expect(titlesIn(part('near'))).toEqual(titles('i13'));
  });

  it('올해 · 내년은 오늘부터 내년 끝까지에 걸친 구간을 빠짐없이, 세 묶음으로 보여 준다', async () => {
    await openTiming();
    const near = part('near');
    expect(near.getAllByTestId('timing-near-label').map((l) => l.props.children)).toEqual([
      '지금 지나는 중',
      '2026년 남은 기간에 시작',
      '2027년에 시작',
    ]);
    // 오늘(2026-11-11)부터 2027년 끝까지에 걸친 구간 전부. 종류 · 크기를 가리지 않는다
    const overlapping = timing.intervals.filter((i) => i.to >= '2026-11-11' && i.from <= '2027-12-31');
    expect(overlapping.map((i) => i.id)).toEqual(['i11', 'i12', 'i13']);
    expect(titlesIn(near)).toEqual(overlapping.map((i) => i.title));
    const [ongoing, thisYear, nextYear] = near.getAllByTestId('timing-near-group').map((g) => within(g));
    expect(titlesIn(ongoing)).toEqual(titles('i11', 'i12'));
    expect(titlesIn(thisYear)).toEqual([]);
    expect(thisYear.getByText('2026년 남은 기간에 새로 시작하는 구간은 없어요.')).toBeTruthy();
    expect(titlesIn(nextYear)).toEqual(titles('i13'));
    expect(nextYear.queryByText('2027년에 새로 시작하는 구간은 없어요.')).toBeNull();
  });

  it('올해 · 내년의 줄은 기간 · 종류 · 영역 · 크기 · 제목이고, 지금 지나는 것은 언제까지인지가 보인다. 누르면 본문이 펼쳐진다', async () => {
    await openTiming();
    const rows = part('near').getAllByTestId('timing-interval');
    const work = byId('i11');
    const row = rows[0];
    expect(within(row).getByText('2025년 4월 ~ 2027년 2월')).toBeTruthy();
    expect(within(row).getByText('변화')).toBeTruthy();
    expect(within(row).getByText('일')).toBeTruthy();
    expect(within(row).getByText('큰 변화')).toBeTruthy();
    expect(within(row).getByText(work.title)).toBeTruthy();
    // 오늘에 걸친 구간에는 "지금" 딱지
    expect(rows.map((r) => within(r).queryByText(T.now) !== null)).toEqual([true, true, false]);
    // 본문은 접혀 있다가 누르면 펼쳐지고, 다시 누르면 접힌다
    expect(within(row).queryByText(work.body)).toBeNull();
    expect(row.props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(row);
    expect(within(row).getByText(work.body)).toBeTruthy();
    await fireEvent.press(row);
    expect(within(row).queryByText(work.body)).toBeNull();
  });

  it('올해 · 내년은 작은 변화 · 기회 · 만남도 모두 보여 주고, 시작하는 해로 가른다(내후년에 시작하면 "앞으로")', async () => {
    const intervals = withIntervals(
      made('올해 작은 변화', '2026-12-01', '2027-01-10', { kind: 'CHANGE', size: 'SMALL' }),
      made('올해 마지막 날', '2026-12-31', '2031-01-01', { kind: 'OPPORTUNITY' }),
      made('내년 만남', '2027-06-01', '2027-07-01', { kind: 'FATED', area: 'PEOPLE' }),
      made('내년 큰 변화', '2027-12-31', '2029-02-01', { kind: 'CHANGE', size: 'BIG' }),
      made('내후년 첫날', '2028-01-01', '2028-01-20', { kind: 'OPPORTUNITY' }),
    );
    await openTiming({ intervals });
    const [ongoing, thisYear, nextYear] = part('near')
      .getAllByTestId('timing-near-group')
      .map((g) => within(g));
    expect(titlesIn(ongoing)).toEqual(titles('i11', 'i12'));
    expect(titlesIn(thisYear)).toEqual(['올해 작은 변화', '올해 마지막 날']);
    expect(titlesIn(nextYear)).toEqual([byId('i13').title, '내년 만남', '내년 큰 변화']);
    expect(thisYear.getByText('작은 변화')).toBeTruthy();
    expect(nextYear.getByText('운명처럼 느껴지는 만남')).toBeTruthy();
    expect(thisYear.queryByText('2026년 남은 기간에 새로 시작하는 구간은 없어요.')).toBeNull();
    expect(titlesIn(part('near'))).not.toContain('내후년 첫날');
    await press(part('ahead'), T.showAll);
    expect(titlesIn(part('ahead'))[0]).toBe('내후년 첫날');
    // 가까운 때의 구간은 "앞으로" 에 다시 나오지 않는다
    expect(titlesIn(part('ahead'))).not.toContain('내년 큰 변화');
  });

  it('올해에도 내년에도 새로 시작하는 구간이 없으면 해마다 없다고 적는다', async () => {
    await openTiming({ intervals: timing.intervals.filter((i) => i.id !== 'i13') });
    const [, thisYear, nextYear] = part('near')
      .getAllByTestId('timing-near-group')
      .map((g) => within(g));
    expect(thisYear.getByText('2026년 남은 기간에 새로 시작하는 구간은 없어요.')).toBeTruthy();
    expect(nextYear.getByText('2027년에 새로 시작하는 구간은 없어요.')).toBeTruthy();
    expect(titlesIn(part('near'))).toEqual(titles('i11', 'i12'));
  });

  it('다음 변곡점이 내년 안에 걸치면 올해 · 내년에 눈에 띄는 줄로 나오고, "앞으로" 의 카드에도 그대로 있다', async () => {
    // 서버가 해와 만 나이를 이렇게 준 사람
    const soon: TimingMilestone = {
      ...timing.milestones[1],
      from: '2027-06-28',
      to: '2028-04-12',
      year: 2027,
      age: 29,
    };
    const milestones = [timing.milestones[0], soon, timing.milestones[2], timing.milestones[3]];
    await openTiming({ milestones, current: { ...timing.current, nextMilestone: soon } });
    const [, thisYear, nextYear] = part('near')
      .getAllByTestId('timing-near-group')
      .map((g) => within(g));
    expect(thisYear.queryByTestId('timing-milestone-near')).toBeNull();
    const row = nextYear.getByTestId('timing-milestone-near');
    expect(within(row).getByText(T.milestoneKinds.SATURN_RETURN)).toBeTruthy();
    expect(within(row).getByText('2027년 · 만 29세')).toBeTruthy();
    expect(within(row).getByText('2027년 6월 ~ 2028년 4월')).toBeTruthy();
    expect(within(row).getByText(soon.title)).toBeTruthy();
    expect(nextYear.queryByText('2027년에 새로 시작하는 구간은 없어요.')).toBeNull();
    // 묶음의 맨 위, 구간 줄보다 앞
    expect(before(soon.title, byId('i13').title)).toBe(true);
    await fireEvent.press(row);
    expect(within(row).getByText(soon.body)).toBeTruthy();
    const card = within(part('ahead').getByTestId('timing-milestone-next'));
    expect(card.getByText('2027년 · 만 29세')).toBeTruthy();
    expect(card.getByText(soon.body)).toBeTruthy();
  });

  it('지금 지나는 변곡점은 올해 · 내년의 "지금 지나는 중" 에도 나온다', async () => {
    const going: TimingMilestone = {
      ...timing.milestones[1],
      from: '2026-06-28',
      to: '2027-04-12',
      year: 2026,
      age: 28,
    };
    const milestones = [timing.milestones[0], going, timing.milestones[2], timing.milestones[3]];
    await openTiming({
      milestones,
      current: { ...timing.current, milestone: going, nextMilestone: timing.milestones[2] },
    });
    const [ongoing] = part('near')
      .getAllByTestId('timing-near-group')
      .map((g) => within(g));
    const row = ongoing.getByTestId('timing-milestone-near');
    expect(within(row).getByText('2026년 · 만 28세')).toBeTruthy();
    expect(within(row).getByText('2026년 6월 ~ 2027년 4월')).toBeTruthy();
    // 지나는 중인 변곡점은 지난 것도 뒤의 것도 아니다
    expect(part('ahead').queryAllByTestId('timing-milestone-later')).toHaveLength(1);
    await openPast();
    expect(part('past').queryAllByTestId('timing-milestone-past')).toHaveLength(1);
  });

  it('"앞으로" 는 다음 변곡점을 큰 카드 하나로, 더 뒤의 변곡점은 작은 줄로 보여 준다(해와 만 나이는 서버가 준 그대로)', async () => {
    // 앱이 계산하지 않는다는 것을 보이려고 있을 수 없는 값을 넣는다
    const [first, second, third, fourth] = timing.milestones;
    await openTiming({ milestones: [first, second, { ...third, year: 1234, age: 99 }, fourth] });
    const ahead = part('ahead');
    expect(ahead.getAllByTestId('timing-milestone-next')).toHaveLength(1);
    const card = within(ahead.getByTestId('timing-milestone-next'));
    expect(ahead.getByText(T.nextMilestoneLabel)).toBeTruthy();
    expect(card.getByText(T.milestoneKinds.SATURN_RETURN)).toBeTruthy();
    expect(card.getByText('2029년 · 만 29세')).toBeTruthy();
    expect(card.getByText('2029년 6월 ~ 2030년 4월')).toBeTruthy();
    expect(card.getByText(second.title)).toBeTruthy();
    expect(card.getByText(second.body)).toBeTruthy();
    // 더 뒤의 둘은 작은 줄이고 본문은 눌러야 보인다
    const later = ahead.getAllByTestId('timing-milestone-later');
    expect(later).toHaveLength(2);
    expect(within(later[0]).getByText(T.milestoneKinds.URANUS_OPPOSITION)).toBeTruthy();
    expect(within(later[0]).getByText('1234년 · 만 99세')).toBeTruthy();
    expect(within(later[0]).getByText(third.title)).toBeTruthy();
    expect(within(later[1]).getByText('2059년 · 만 58세')).toBeTruthy();
    expect(within(later[0]).queryByText(third.body)).toBeNull();
    await fireEvent.press(later[0]);
    expect(within(later[0]).getByText(third.body)).toBeTruthy();
    // 지난 변곡점은 "앞으로" 에 없다
    expect(ahead.queryByText(first.title)).toBeNull();
    // 카드가 작은 줄들보다 앞
    expect(before(second.body, third.title)).toBe(true);
  });

  it('변곡점이 누구에게나 비슷한 나이에 온다는 것과 해는 내 차트로 계산했다는 것을 한 번 적는다', async () => {
    await openTiming();
    expect(T.milestonesNote).toMatch(/누구나/);
    expect(T.milestonesNote).toMatch(/만 21 · 29 · 42 · 58세 무렵/);
    expect(T.milestonesNote).toMatch(/내 차트/);
    expect(screen.getAllByText(T.milestonesNote)).toHaveLength(1);
    expect(part('ahead').getByText(T.milestonesNote)).toBeTruthy();
  });

  it('가장 가까운 변곡점의 딱지는 서버의 nearestMilestone 을 따른다', async () => {
    await openTiming({ current: { ...timing.current, nearestMilestone: 'URANUS_OPPOSITION' } });
    expect(within(part('ahead').getByTestId('timing-milestone-next')).queryByText(T.nearest)).toBeNull();
    const later = part('ahead').getAllByTestId('timing-milestone-later');
    expect(later.map((row) => within(row).queryByText(T.nearest) !== null)).toEqual([true, false]);
  });

  it('"앞으로" 의 구간은 큰 변화만 먼저 보여 주고, 나머지는 접어 두었다가 누르면 편다', async () => {
    await openTiming();
    const ahead = part('ahead');
    // 내년 뒤에 시작하는 큰 변화: i17(2033) · i21(2051). i21 은 오늘부터 10년 밖이라 "이후" 에 있다
    expect(titlesIn(ahead)).toEqual(titles('i17'));
    expect(ahead.getByText(`${T.later} (1${T.countSuffix})`)).toBeTruthy();
    await fireEvent.press(ahead.getByText(`${T.showAll} (8${T.countSuffix})`));
    expect(titlesIn(ahead)).toEqual(titles('i14', 'i15', 'i16', 'i17', 'i18'));
    expect(ahead.getAllByTestId('timing-year').map((y) => y.props.children)).toEqual([
      '2028년',
      '2029년',
      '2031년',
      '2033년',
      '2036년',
    ]);
    await fireEvent.press(ahead.getByText(`${T.later} (5${T.countSuffix})`));
    expect(titlesIn(ahead)).toEqual(titles('i14', 'i15', 'i16', 'i17', 'i18', 'i19', 'i20', 'i21', 'i22', 'i23'));
    expect(ahead.queryByText(T.later, { exact: false })).toBeNull();
    // 다시 접을 수 있다
    await fireEvent.press(ahead.getByText(T.showBig));
    expect(titlesIn(ahead)).toEqual(titles('i17', 'i21'));
  });

  it('"앞으로" 에 큰 변화가 하나도 없으면 접지 않고 전부 보여 준다', async () => {
    const small = timing.intervals.filter((i) => !(i.kind === 'CHANGE' && i.size === 'BIG'));
    await openTiming({ intervals: small });
    expect(titlesIn(part('ahead'))).toEqual(titles('i14', 'i15', 'i16', 'i18'));
    expect(part('ahead').queryByText(T.showAll, { exact: false })).toBeNull();
  });

  it('"앞으로" 의 구간이 많으면 "더 보기" 는 가까운 쪽부터 30개씩 연다', async () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const far = Array.from({ length: 40 }, (_, n) => made(`먼 구간 ${n}`, `21${pad(n)}-01-01`, `21${pad(n)}-03-01`));
    await openTiming({ intervals: [...timing.intervals, ...far] });
    const ahead = part('ahead');
    await press(ahead, T.showAll);
    expect(titlesIn(ahead)).toHaveLength(5);
    await fireEvent.press(ahead.getByText(`${T.later} (45${T.countSuffix})`));
    expect(titlesIn(ahead)).toHaveLength(5 + 30);
    expect(titlesIn(ahead)[34]).toBe('먼 구간 24');
    await fireEvent.press(ahead.getByText(`${T.later} (15${T.countSuffix})`));
    expect(titlesIn(ahead)).toHaveLength(5 + 45);
    expect(titlesIn(ahead)[49]).toBe('먼 구간 39');
  });

  it('오늘부터 10년 안에 시작하는 큰 변화가 없으면 그 뒤의 가장 가까운 것부터 보여 준다(빈 목록을 두지 않는다)', async () => {
    await openTiming({ intervals: timing.intervals.filter((i) => i.id !== 'i17') });
    expect(titlesIn(part('ahead'))).toEqual(titles('i21'));
    expect(part('ahead').queryByText(T.later, { exact: false })).toBeNull();
  });

  it('"지나온 시기" 는 처음에는 접혀 있고, "지나온 시기 보기" 를 누르면 지난 변곡점과 큰 변화를 새것부터 보여 준다', async () => {
    await openTiming();
    const past = part('past');
    expect(past.queryAllByTestId('timing-interval')).toHaveLength(0);
    expect(past.queryAllByTestId('timing-milestone-past')).toHaveLength(0);
    expect(screen.queryByText(byId('i4').title)).toBeNull();
    const toggle = screen.getByRole('button', { name: T.pastShow });
    expect(toggle.props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(toggle);
    expect(screen.getByRole('button', { name: T.pastHide }).props.accessibilityState.expanded).toBe(true);

    // 지난 변곡점: 끝(2022-12)이 오늘보다 앞인 첫 번째뿐. 서버가 준 해와 만 나이, 흐린 글씨
    const milestones = past.getAllByTestId('timing-milestone-past');
    expect(milestones).toHaveLength(1);
    expect(within(milestones[0]).getByText(T.milestoneKinds.SATURN_SQUARE)).toBeTruthy();
    expect(within(milestones[0]).getByText('2022년 · 만 21세')).toBeTruthy();
    const title = within(milestones[0]).getByText(timing.milestones[0].title);
    expect(StyleSheet.flatten(title.props.style).color).toBe(Colors.gray);
    await fireEvent.press(milestones[0]);
    expect(within(milestones[0]).getByText(timing.milestones[0].body)).toBeTruthy();

    // 지난 구간: 큰 변화(i4)만 먼저
    expect(titlesIn(past)).toEqual(titles('i4'));
    await fireEvent.press(past.getByText(`${T.showAll} (9${T.countSuffix})`));
    // 지난 10년 안의 것을 새것부터, 그 앞은 "이전 구간 더 보기"
    expect(titlesIn(past)).toEqual(titles('i10', 'i9', 'i8', 'i7', 'i6'));
    expect(past.getAllByTestId('timing-year').map((y) => y.props.children)).toEqual([
      '2023년',
      '2022년',
      '2020년',
      '2018년',
      '2016년',
    ]);
    await fireEvent.press(past.getByText(`${T.earlier} (5${T.countSuffix})`));
    expect(titlesIn(past)).toEqual(titles('i10', 'i9', 'i8', 'i7', 'i6', 'i5', 'i4', 'i3', 'i2', 'i1'));
    expect(past.queryByText(T.earlier, { exact: false })).toBeNull();
    // 지금 지나는 것 · 앞으로 올 것은 여기에 없다
    expect(titlesIn(past)).not.toContain(byId('i11').title);

    await fireEvent.press(screen.getByRole('button', { name: T.pastHide }));
    expect(past.queryAllByTestId('timing-interval')).toHaveLength(0);
  });

  it('"지나온 시기" 의 구간이 많으면 "더 보기" 는 지금에 가까운 쪽부터 30개씩 연다', async () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const old = Array.from({ length: 40 }, (_, n) =>
      made(`옛 구간 ${n}`, `19${pad(60 + n)}-01-01`, `19${pad(60 + n)}-03-01`),
    );
    await openTiming({ intervals: [...old, ...timing.intervals] });
    await openPast();
    const past = part('past');
    await press(past, T.showAll);
    expect(titlesIn(past)).toHaveLength(5);
    await fireEvent.press(past.getByText(`${T.earlier} (45${T.countSuffix})`));
    expect(titlesIn(past)).toHaveLength(5 + 30);
    expect(titlesIn(past)[34]).toBe('옛 구간 15');
    await fireEvent.press(past.getByText(`${T.earlier} (15${T.countSuffix})`));
    expect(titlesIn(past)).toHaveLength(5 + 45);
    expect(titlesIn(past)[49]).toBe('옛 구간 0');
  });

  it('변곡점을 모두 지난 사람: "앞으로" 에 모두 지나왔다고 적고, 지나온 시기에 넷을 새것부터 보여 준다', async () => {
    const current: TimingCurrent = { date: '2081-01-01', intervals: [], nearestMilestone: 'SECOND_SATURN_RETURN' };
    await openTiming({ current });
    const now = within(screen.getByTestId('timing-now'));
    expect(now.getByText(T.nowNone)).toBeTruthy();
    expect(now.queryByText(T.nextIntervalLabel)).toBeNull();
    const ahead = part('ahead');
    expect(ahead.getByText(T.milestonesDone)).toBeTruthy();
    expect(ahead.queryByText(T.nextMilestoneLabel)).toBeNull();
    expect(ahead.queryAllByTestId('timing-milestone-next')).toHaveLength(0);
    expect(ahead.queryAllByTestId('timing-milestone-later')).toHaveLength(0);
    expect(ahead.getByText(T.aheadNone)).toBeTruthy();
    expect(part('near').getByText('2081년 남은 기간에 새로 시작하는 구간은 없어요.')).toBeTruthy();
    expect(part('near').getByText('2082년에 새로 시작하는 구간은 없어요.')).toBeTruthy();
    await openPast();
    const milestones = part('past').getAllByTestId('timing-milestone-past');
    expect(milestones.map((m) => within(m).queryByText(/만 \d+세/)!.props.children)).toEqual([
      '2059년 · 만 58세',
      '2043년 · 만 43세',
      '2029년 · 만 29세',
      '2022년 · 만 21세',
    ]);
    expect(within(milestones[0]).getByText(T.nearest)).toBeTruthy();
  });

  it('지나온 것이 하나도 없으면 열었을 때 없다고 적는다', async () => {
    const current: TimingCurrent = { date: '2001-01-01', intervals: [], nearestMilestone: 'SATURN_SQUARE' };
    await openTiming({ current });
    await openPast();
    expect(part('past').getByText(T.pastNone)).toBeTruthy();
  });

  it('"오늘" 은 서버가 준 current.date 다(기기의 시계를 쓰지 않는다)', async () => {
    // 기기의 오늘과 한참 다른 날짜
    const current: TimingCurrent = {
      date: '2041-03-03',
      intervals: [],
      nextInterval: byId('i20'),
      nextMilestone: timing.milestones[2],
      nearestMilestone: 'URANUS_OPPOSITION',
    };
    await openTiming({ current });
    expect(
      part('near')
        .getAllByTestId('timing-near-label')
        .map((l) => l.props.children),
    ).toEqual(['2041년 남은 기간에 시작', '2042년에 시작']);
    const deviceYear = String(new Date().getFullYear());
    expect(
      JSON.stringify(
        part('near')
          .getAllByTestId('timing-near-label')
          .map((l) => l.props.children),
      ),
    ).not.toContain(deviceYear);
    expect(within(screen.getByTestId('timing-now')).getByText('2044년 6월부터')).toBeTruthy();
    await openEverything();
    // i1~i19 는 2041-03-03 보다 앞에 끝났고, i20~i23 은 2042년 뒤에 시작한다
    expect(titlesIn(part('past'))).toEqual(
      timing.intervals
        .slice(0, 19)
        .map((i) => i.title)
        .reverse(),
    );
    expect(titlesIn(part('ahead'))).toEqual(titles('i20', 'i21', 'i22', 'i23'));
    expect(part('past').getAllByTestId('timing-milestone-past')).toHaveLength(2);
    expect(part('ahead').getAllByTestId('timing-milestone-later')).toHaveLength(1);
    // 시기를 그리는 코드는 기기의 날짜를 읽지 않는다
    const fs = jest.requireActual('fs') as { readFileSync: (path: string, encoding: 'utf8') => string };
    for (const file of ['src/features/report/timing-view.tsx', 'src/features/report/timing.ts']) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(/\bDate\b/);
    }
  });

  it('앱이 셈한 "몇 년 뒤" · "몇 달 남음" 같은 숫자를 적지 않는다', async () => {
    await openTiming();
    await openEverything();
    // 해의 이름(네 자리: "2026년 남은 기간")은 받은 글자이고, 셈한 숫자는 한~세 자리다
    const derived = /(?<!\d)\d{1,3}\s*(년|해|개월|달|주|일)\s*(뒤|후|남|전)/;
    expect(drawn()).not.toMatch(derived);
    expect(JSON.stringify(T)).not.toMatch(derived);
    // 숫자 뒤에 붙이려고 "년 뒤" · "개월" 로 시작하는 낱말도 두지 않는다("내년 뒤에" 는 숫자가 아니다)
    expect(JSON.stringify(T)).not.toMatch(/"(년|해|달) (뒤|후|전)|개월|남았|남음/);
  });

  it('모두 펴면 구간이 하나도 빠지거나 겹치지 않고, 종류와 영역을 쉬운 말로 적는다', async () => {
    await openTiming();
    await openEverything();
    const rows = screen.getAllByTestId('timing-interval');
    expect(rows).toHaveLength(timing.intervals.length);
    const kinds = { CHANGE: '변화', OPPORTUNITY: '기회', FATED: '운명처럼 느껴지는 만남' };
    const areas = { PEOPLE: '사람·인연', WORK: '일', MONEY: '돈', SELF: '나 자신' };
    for (const interval of timing.intervals) {
      const row = rows.find((r) => within(r).queryByText(interval.title))!;
      expect(within(row).getByText(kinds[interval.kind])).toBeTruthy();
      expect(within(row).getByText(areas[interval.area])).toBeTruthy();
      // 크기(큰 변화 · 작은 변화)는 변화 구간에만 적는다
      const big = within(row).queryByText('큰 변화') !== null;
      const small = within(row).queryByText('작은 변화') !== null;
      expect([big, small]).toEqual([interval.size === 'BIG', interval.size === 'SMALL']);
      if (interval.kind !== 'CHANGE') expect(big || small).toBe(false);
    }
    expect(timing.intervals.some((i) => i.kind !== 'CHANGE')).toBe(true);
    // 단정하는 말을 쓰지 않는다
    expect(JSON.stringify(T)).not.toMatch(/귀인|만난다|일어난다|생긴다|예정/);
  });

  it('고지 문구와 종류 설명을 보여 주고, 시각을 알면 시각 모름 안내는 없다', async () => {
    await openTiming();
    expect(T.notice).toBe('시기는 행성의 주기를 계산한 것이고, 무슨 일이 일어날지를 말하지 않습니다.');
    expect(screen.getByText(T.notice)).toBeTruthy();
    expect(screen.queryByText(T.timeUnknownNotice)).toBeNull();
    for (const kind of ['CHANGE', 'OPPORTUNITY', 'FATED'] as const)
      expect(screen.getByText(T.kindNotes[kind])).toBeTruthy();
    // 행성 · 각도 이름을 화면 문구에 쓰지 않는다
    expect(JSON.stringify(T)).not.toMatch(/토성|천왕성|목성|해왕성|명왕성|버텍스|사각|귀환|대립|합|충/);
  });

  it('시각 모름이면 상승점 · 운명적 만남 구간을 뺐다는 안내를 보여 주고, 운명적 만남 줄과 설명이 없다', async () => {
    await openTiming({}, fixtures.reportTimeUnknown);
    expect(screen.getByText(T.notice)).toBeTruthy();
    expect(screen.getByText(T.timeUnknownNotice)).toBeTruthy();
    expect(T.timeUnknownNotice).toMatch(/상승점/);
    expect(T.timeUnknownNotice).toMatch(/운명처럼 느껴지는 만남/);
    await openEverything();
    expect(screen.getAllByTestId('timing-interval')).toHaveLength(fixtures.reportTimeUnknown.timing.intervals.length);
    expect(screen.queryAllByText(T.kinds.FATED)).toHaveLength(0);
    expect(screen.queryByText(T.kindNotes.FATED)).toBeNull();
    expect(screen.getByText(T.kindNotes.CHANGE)).toBeTruthy();
  });

  it('다음 변곡점 공유 버튼은 "앞으로" 의 다음 변곡점 카드 바로 아래에 있다', async () => {
    await openTiming();
    expect(part('ahead').getByRole('button', { name: strings.share.openNextTurn })).toBeTruthy();
    expect(before(timing.current.nextMilestone!.body, strings.share.openNextTurn)).toBe(true);
    expect(before(strings.share.openNextTurn, T.milestonesNote)).toBe(true);
  });

  it('면책 문구는 시기 탭에서도 맨 아래에 있다', async () => {
    await openTiming();
    expect(screen.getByText(strings.reading.disclaimer)).toBeTruthy();
  });
});

describe('심층 리포트 화면: 시기 탭 "지금" 아래의 방향성 제시(미래)', () => {
  const T = strings.report.timing;
  const F = strings.direction.future;
  const future = fixtures.directionFuture;
  const ok: ApiResult<Direction> = { ok: true, data: future };
  const failed: ApiResult<Direction> = { ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' };
  const headings = () => screen.getAllByTestId('timing-heading').map((h) => h.props.children);
  const allHeadings = ['지금', '올해 · 내년', '앞으로', '지나온 시기'];

  it('다른 탭을 보는 동안에는 부르지 않고, 시기 탭을 열 때 미래 주제로 부른다', async () => {
    await render(<ReportScreen />);
    expect(await screen.findByText(personality.title)).toBeTruthy();
    await fireEvent.press(areas().getByText('관계'));
    await act(async () => {});
    expect(mockApi.createDirection).not.toHaveBeenCalled();
    expect(screen.queryByText(F.heading)).toBeNull();

    await fireEvent.press(areas().getByText('시기'));
    expect(await screen.findByText(future.title)).toBeTruthy();
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
    expect(mockApi.createDirection).toHaveBeenCalledWith('FUTURE');
  });

  it('"지금" 바로 아래(지금의 구간 뒤, 올해 · 내년 앞)에 제목과 해 볼 만한 것 3개를 근거와 함께 그대로 보여 준다', async () => {
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    expect(await screen.findByText(future.title)).toBeTruthy();
    expect(screen.getByText(F.heading)).toBeTruthy();
    for (const item of future.items) {
      expect(screen.getByText(item.title)).toBeTruthy();
      expect(screen.getByText(item.body)).toBeTruthy();
      expect(screen.getByText(['근거', ...item.basis].join(' · '))).toBeTruthy();
    }
    // "지금" 부분 안에 있고, 지금의 구간 카드 다음이다
    const now = screen.getByTestId('timing-section-now');
    expect(within(now).getByTestId('future-direction')).toBeTruthy();
    const currentIntervals = report.timing.current.intervals;
    expect(before(currentIntervals[currentIntervals.length - 1].body, F.heading)).toBe(true);
    expect(before(future.items[2].body, T.sections.near.intro)).toBe(true);
    expect(before(future.items[2].body, strings.reading.disclaimer)).toBe(true);
  });

  it('글을 기다리는 동안에도 시기는 그대로 보이고, 그 칸에만 기다리는 문구가 있다', async () => {
    let resolve: (r: ApiResult<Direction>) => void = () => {};
    mockApi.createDirection.mockReturnValue(new Promise((r) => (resolve = r)));
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    expect(await screen.findByText(F.generating)).toBeTruthy();
    expect(within(screen.getByTestId('future-direction')).getByText(F.generating)).toBeTruthy();
    expect(headings()).toEqual(allHeadings);
    expect(screen.getByTestId('timing-now')).toBeTruthy();
    expect(screen.queryByText(future.title)).toBeNull();
    await act(async () => resolve(ok));
    expect(await screen.findByText(future.title)).toBeTruthy();
    expect(screen.queryByText(F.generating)).toBeNull();
  });

  it('실패해도 시기(지금 · 올해 · 내년 · 앞으로 · 지나온 시기)는 그대로 보이고, "다시 시도" 를 누르면 한 번 더 요청해 글을 보여 준다', async () => {
    mockApi.createDirection.mockResolvedValueOnce(failed);
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    expect(await screen.findByText(F.failed.OTHER)).toBeTruthy();
    expect(headings()).toEqual(allHeadings);
    for (const interval of report.timing.current.intervals) {
      expect(within(screen.getByTestId('timing-now')).getByText(interval.body)).toBeTruthy();
    }
    expect(screen.getAllByTestId('timing-milestone-next')).toHaveLength(1);
    expect(screen.getAllByTestId('timing-milestone-later')).toHaveLength(2);
    expect(titlesIn(part('near'))).toHaveLength(3);
    expect(titlesIn(part('ahead')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: T.pastShow })).toBeTruthy();
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText(F.retry));
    expect(await screen.findByText(future.title)).toBeTruthy();
    expect(screen.queryByText(F.retry)).toBeNull();
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
  });

  it('인터넷이 끊겼을 때는 그에 맞는 안내를 보여 준다', async () => {
    mockApi.createDirection.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    expect(await screen.findByText(F.failed.NETWORK)).toBeTruthy();
  });

  it('서버에 출생 정보가 없으면(404 NO_PROFILE) 내 출생 정보를 저장하고 한 번만 다시 요청한다', async () => {
    mockApi.createDirection.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    expect(await screen.findByText(future.title)).toBeTruthy();
    expect(mockApi.saveProfile).toHaveBeenCalledWith({ date: profile.date, time: profile.time, placeId: 1841277 });
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
  });

  it('글을 기기에 두지 않는다: 다시 열면 다시 불러, 그사이 시기가 바뀌었으면 서버가 준 새 글을 보여 준다', async () => {
    mockParams.mockReturnValue({ area: 'TIMING' });
    const first = await render(<ReportScreen />);
    expect(await screen.findByText(future.title)).toBeTruthy();
    await first.unmount();
    const stored = await AsyncStorage.multiGet(await AsyncStorage.getAllKeys());
    expect(JSON.stringify(stored)).not.toContain(future.title);
    mockApi.createDirection.mockResolvedValue({ ok: true, data: { ...future, title: '새 시기의 글' } });
    await render(<ReportScreen />);
    expect(await screen.findByText('새 시기의 글')).toBeTruthy();
    expect(screen.queryByText(future.title)).toBeNull();
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
  });

  it('세션 확인이 끝나기 전에는 부르지 않는다(보관된 리포트의 시기 탭이 먼저 보여도)', async () => {
    mockParams.mockReturnValue({ area: 'TIMING' });
    const first = await render(<ReportScreen />);
    expect(await screen.findByText(future.title)).toBeTruthy();
    await first.unmount();
    mockApi.createDirection.mockClear();
    mockUseSession.mockReturnValue({ status: 'checking' as const, token: null, ready: false, lastError: null });
    await render(<ReportScreen />);
    await act(async () => {});
    expect(mockApi.createDirection).not.toHaveBeenCalled();
  });
});
