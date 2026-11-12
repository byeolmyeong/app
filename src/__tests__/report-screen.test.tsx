import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import ReportScreen from '@/app/report';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { REPORT_POLL_MS } from '@/features/report/use-report';
import { api, type ApiResult, type Report, type ReportState, type TimingCurrent } from '@/lib/api';
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
  api: { requestReport: jest.fn(), getReport: jest.fn(), saveProfile: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ token: 'dev-token', ready: true })),
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
const selectedTabs = () => screen.getAllByRole('tab').map((t) => t.props.accessibilityState.selected);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockUseSession.mockReturnValue({ token: 'dev-token', ready: true });
  mockParams.mockReturnValue({});
  mockApi.getReport.mockResolvedValue(done);
  mockApi.requestReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
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
    const tabs = screen.getAllByRole('tab');
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

  it('글 영역에서 누를 수 있는 것은 뒤로 가기와 탭 다섯뿐이다(공유·다시 생성 없음)', async () => {
    await render(<ReportScreen />);
    await screen.findByText(personality.title);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
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
    mockUseSession.mockReturnValue({ token: null, ready: false });
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

describe('심층 리포트 화면: 시기 탭', () => {
  const T = strings.report.timing;
  const { timing } = report;
  const [i1] = timing.intervals;
  const byId = (id: string) => timing.intervals.find((i) => i.id === id)!;
  /** 시기만 바꾼 리포트를 서버가 주게 하고 시기 탭을 연다 */
  async function openTiming(changed: Partial<Report['timing']> = {}, source: Report = report) {
    const data: ReportState = { status: 'DONE', report: { ...source, timing: { ...source.timing, ...changed } } };
    mockApi.getReport.mockResolvedValue({ ok: true, data });
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    await screen.findByText(T.nowHeading);
  }
  const rowTitles = () =>
    screen
      .queryAllByTestId('timing-interval')
      .map((row) => within(row).getByTestId('timing-interval-title').props.children);
  const titlesOf = (from: number, to: number) => timing.intervals.slice(from, to).map((i) => i.title);

  it('주소의 area=TIMING 으로 시기 탭을 바로 열고, 탭을 눌러서도 오간다', async () => {
    await openTiming();
    expect(selectedTabs()).toEqual([false, false, false, false, true]);
    expect(screen.queryByText(personality.title)).toBeNull();
    await fireEvent.press(screen.getByText('성격'));
    expect(screen.getByText(personality.title)).toBeTruthy();
    expect(screen.queryByText(T.nowHeading)).toBeNull();
    await fireEvent.press(screen.getByText('시기'));
    expect(screen.getByText(T.nowHeading)).toBeTruthy();
  });

  it('"지금 나의 구간" 이 맨 위에 있고, 오늘에 걸친 구간마다 제목 · 본문 · 언제까지와 다음 변곡점을 보여 준다', async () => {
    await openTiming();
    expect(screen.getByTestId('timing-view').children[0]).toBe(screen.getByTestId('timing-now'));
    const now = within(screen.getByTestId('timing-now'));
    expect(timing.current.intervals.map((i) => i.id)).toEqual(['i11', 'i12']);
    for (const interval of timing.current.intervals) {
      expect(now.getByText(interval.title)).toBeTruthy();
      expect(now.getByText(interval.body)).toBeTruthy();
    }
    expect(now.getByText('2027년 2월까지')).toBeTruthy();
    expect(now.getByText('2026년 12월까지')).toBeTruthy();
    // 다음 변곡점: 서버가 준 해와 만 나이, 제목
    expect(now.getByText(T.nextMilestoneLabel)).toBeTruthy();
    expect(now.getByText('2029년 · 만 29세')).toBeTruthy();
    expect(now.getByText(timing.current.nextMilestone!.title)).toBeTruthy();
    // 걸친 구간이 있으면 "없어요" 와 다음 구간은 적지 않는다
    expect(now.queryByText(T.nowNone)).toBeNull();
    expect(now.queryByText(T.nextIntervalLabel)).toBeNull();
    expect(now.queryByText(timing.current.nextInterval!.title)).toBeNull();
  });

  it('오늘이 변곡점의 기간 안이면 그 변곡점도 "지금" 에 보여 준다', async () => {
    const milestone = timing.milestones[1];
    await openTiming({ current: { ...timing.current, milestone } });
    const now = within(screen.getByTestId('timing-now'));
    expect(now.getByText(T.milestoneNow)).toBeTruthy();
    expect(now.getByText(milestone.body)).toBeTruthy();
    expect(now.getByText('2030년 4월까지')).toBeTruthy();
  });

  it('지금 걸친 구간이 없으면 없다고 알리고 다음에 오는 구간을 보여 준다', async () => {
    const { date, nextInterval, nextMilestone, nearestMilestone } = timing.current;
    await openTiming({ current: { date, intervals: [], nextInterval, nextMilestone, nearestMilestone } });
    const now = within(screen.getByTestId('timing-now'));
    expect(now.getByText(T.nowNone)).toBeTruthy();
    expect(now.getByText(T.nextIntervalLabel)).toBeTruthy();
    expect(now.getByText(nextInterval!.title)).toBeTruthy();
    expect(now.getByText('2027년 3월부터')).toBeTruthy();
    expect(now.getByText('2029년 · 만 29세')).toBeTruthy();
    expect(now.queryByText(byId('i11').title)).toBeNull();
  });

  it('다음 구간도 다음 변곡점도 없으면(마지막 변곡점 뒤) 없는 대로 그린다', async () => {
    const current: TimingCurrent = { date: '2081-01-01', intervals: [], nearestMilestone: 'SECOND_SATURN_RETURN' };
    await openTiming({ current });
    const now = within(screen.getByTestId('timing-now'));
    expect(now.getByText(T.nowNone)).toBeTruthy();
    expect(now.queryByText(T.nextIntervalLabel)).toBeNull();
    expect(now.queryByText(T.nextMilestoneLabel)).toBeNull();
    expect(now.getByText(T.milestonesDone)).toBeTruthy();
  });

  it('변곡점 넷을 서버가 준 해와 만 나이 그대로 보여 주고, 가장 가까운 것을 강조한다', async () => {
    // 앱이 계산하지 않는다는 것을 보이려고 있을 수 없는 값을 넣는다
    const [first, ...rest] = timing.milestones;
    await openTiming({ milestones: [{ ...first, year: 1234, age: 99 }, ...rest] });
    const cards = screen.getAllByTestId('timing-milestone');
    expect(cards).toHaveLength(4);
    expect(within(cards[0]).getByText('1234년 · 만 99세')).toBeTruthy();
    expect(within(cards[1]).getByText('2029년 · 만 29세')).toBeTruthy();
    expect(within(cards[2]).getByText('2043년 · 만 43세')).toBeTruthy();
    expect(within(cards[3]).getByText('2059년 · 만 58세')).toBeTruthy();
    timing.milestones.forEach((m, i) => {
      expect(within(cards[i]).getByText(m.title)).toBeTruthy();
      expect(within(cards[i]).getByText(m.body)).toBeTruthy();
    });
    expect(within(cards[0]).getByText(T.milestoneKinds.SATURN_SQUARE)).toBeTruthy();
    // nearestMilestone 은 SATURN_RETURN(둘째)
    expect(cards.map((card) => within(card).queryByText(T.nearest) !== null)).toEqual([false, true, false, false]);
    expect(cards.map((card) => card.props.accessibilityState?.selected === true)).toEqual([false, true, false, false]);
  });

  it('강조할 변곡점은 서버의 nearestMilestone 을 따른다', async () => {
    await openTiming({ current: { ...timing.current, nearestMilestone: 'URANUS_OPPOSITION' } });
    const cards = screen.getAllByTestId('timing-milestone');
    expect(cards.map((card) => within(card).queryByText(T.nearest) !== null)).toEqual([false, false, true, false]);
  });

  it('타임라인은 지금 앞뒤 10년의 구간을 먼저 보여 주고, 나머지는 "더 보기" 로 연다', async () => {
    await openTiming();
    expect(rowTitles()).toEqual(titlesOf(5, 18));
    await fireEvent.press(screen.getByText(`${T.earlier} (5${T.countSuffix})`));
    expect(rowTitles()).toEqual(titlesOf(0, 18));
    expect(screen.queryByText(T.earlier, { exact: false })).toBeNull();
    await fireEvent.press(screen.getByText(`${T.later} (5${T.countSuffix})`));
    expect(rowTitles()).toEqual(titlesOf(0, 23));
    expect(screen.queryByText(T.later, { exact: false })).toBeNull();
  });

  it('구간이 많으면 "더 보기" 는 지금에 가까운 쪽부터 30개씩 연다', async () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const old = Array.from({ length: 40 }, (_, n) => ({
      ...i1,
      id: `old${n}`,
      from: `19${pad(60 + n)}-01-01`,
      to: `19${pad(60 + n)}-03-01`,
      title: `옛 구간 ${n}`,
    }));
    await openTiming({ intervals: [...old, ...timing.intervals] });
    expect(rowTitles()).toEqual(titlesOf(5, 18));
    await fireEvent.press(screen.getByText(`${T.earlier} (45${T.countSuffix})`));
    expect(rowTitles()).toHaveLength(13 + 30);
    expect(rowTitles()[0]).toBe('옛 구간 15');
    await fireEvent.press(screen.getByText(`${T.earlier} (15${T.countSuffix})`));
    expect(rowTitles()).toHaveLength(13 + 45);
    expect(rowTitles()[0]).toBe('옛 구간 0');
  });

  it('구간은 시작한 해로 묶고, 줄마다 기간 · 종류 · 영역 · 제목을 보여 준다. 누르면 본문이 펼쳐진다', async () => {
    await openTiming();
    const years = screen.getAllByTestId('timing-year').map((y) => y.props.children);
    expect(years).toEqual([
      '2016년',
      '2018년',
      '2020년',
      '2022년',
      '2023년',
      '2025년',
      '2026년',
      '2027년',
      '2028년',
      '2029년',
      '2031년',
      '2033년',
      '2036년',
    ]);
    const rows = screen.getAllByTestId('timing-interval');
    const work = byId('i11');
    const row = rows[timing.intervals.indexOf(work) - 5];
    expect(within(row).getByText('2025년 4월 ~ 2027년 2월')).toBeTruthy();
    expect(within(row).getByText('변화')).toBeTruthy();
    expect(within(row).getByText('일')).toBeTruthy();
    expect(within(row).getByText('큰 변화')).toBeTruthy();
    expect(within(row).getByText(work.title)).toBeTruthy();
    // 오늘에 걸친 구간에는 "지금" 딱지
    expect(rows.map((r) => within(r).queryByText(T.now) !== null).filter(Boolean)).toHaveLength(2);
    expect(within(row).getByText(T.now)).toBeTruthy();
    // 본문은 접혀 있다가 누르면 펼쳐지고, 다시 누르면 접힌다
    expect(within(row).queryByText(work.body)).toBeNull();
    await fireEvent.press(row);
    expect(within(row).getByText(work.body)).toBeTruthy();
    await fireEvent.press(row);
    expect(within(row).queryByText(work.body)).toBeNull();
  });

  it('종류와 영역은 쉬운 말로 적는다: 변화 · 기회 · 운명처럼 느껴지는 만남, 사람·인연 · 일 · 돈 · 나 자신', async () => {
    await openTiming();
    await fireEvent.press(screen.getByText(T.earlier, { exact: false }));
    await fireEvent.press(screen.getByText(T.later, { exact: false }));
    const rows = screen.getAllByTestId('timing-interval');
    const kinds = { CHANGE: '변화', OPPORTUNITY: '기회', FATED: '운명처럼 느껴지는 만남' };
    const areas = { PEOPLE: '사람·인연', WORK: '일', MONEY: '돈', SELF: '나 자신' };
    timing.intervals.forEach((interval, i) => {
      expect(within(rows[i]).getByText(kinds[interval.kind])).toBeTruthy();
      expect(within(rows[i]).getByText(areas[interval.area])).toBeTruthy();
    });
    // 단정하는 말을 쓰지 않는다
    expect(JSON.stringify(T)).not.toMatch(/귀인|만난다|일어난다|생긴다/);
  });

  it('크기(큰 변화 · 작은 변화)는 변화 구간에만 적는다', async () => {
    await openTiming();
    await fireEvent.press(screen.getByText(T.earlier, { exact: false }));
    await fireEvent.press(screen.getByText(T.later, { exact: false }));
    const rows = screen.getAllByTestId('timing-interval');
    expect(rows).toHaveLength(timing.intervals.length);
    timing.intervals.forEach((interval, i) => {
      const big = within(rows[i]).queryByText('큰 변화') !== null;
      const small = within(rows[i]).queryByText('작은 변화') !== null;
      expect([big, small]).toEqual([interval.size === 'BIG', interval.size === 'SMALL']);
      if (interval.kind !== 'CHANGE') expect(big || small).toBe(false);
    });
    expect(timing.intervals.some((i) => i.kind !== 'CHANGE')).toBe(true);
  });

  it('고지 문구를 보여 주고, 시각을 알면 시각 모름 안내는 없다', async () => {
    await openTiming();
    expect(T.notice).toBe('시기는 행성의 주기를 계산한 것이고, 무슨 일이 일어날지를 말하지 않습니다.');
    expect(screen.getByText(T.notice)).toBeTruthy();
    expect(screen.queryByText(T.timeUnknownNotice)).toBeNull();
    expect(screen.getAllByText(T.kinds.FATED).length).toBeGreaterThan(0);
    // 행성 · 각도 이름을 화면 문구에 쓰지 않는다
    expect(JSON.stringify(T)).not.toMatch(/토성|천왕성|목성|해왕성|명왕성|버텍스|사각|귀환|대립|합|충/);
  });

  it('시각 모름이면 상승점 · 운명적 만남 구간을 뺐다는 안내를 보여 주고, 운명적 만남 줄과 설명이 없다', async () => {
    await openTiming({}, fixtures.reportTimeUnknown);
    expect(screen.getByText(T.notice)).toBeTruthy();
    expect(screen.getByText(T.timeUnknownNotice)).toBeTruthy();
    expect(T.timeUnknownNotice).toMatch(/상승점/);
    expect(T.timeUnknownNotice).toMatch(/운명처럼 느껴지는 만남/);
    await fireEvent.press(screen.getByText(T.earlier, { exact: false }));
    await fireEvent.press(screen.getByText(T.later, { exact: false }));
    expect(screen.getAllByTestId('timing-interval')).toHaveLength(fixtures.reportTimeUnknown.timing.intervals.length);
    expect(screen.queryAllByText(T.kinds.FATED)).toHaveLength(0);
    expect(screen.queryByText(T.kindNotes.FATED)).toBeNull();
    expect(screen.getByText(T.kindNotes.CHANGE)).toBeTruthy();
  });

  it('면책 문구는 시기 탭에서도 맨 아래에 있다', async () => {
    await openTiming();
    expect(screen.getByText(strings.reading.disclaimer)).toBeTruthy();
  });
});
