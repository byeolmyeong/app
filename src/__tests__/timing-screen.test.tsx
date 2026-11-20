import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import TimingScreen from '@/app/timing';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { TIMING_REPORT_POLL_MS, TIMING_REPORT_STORAGE_KEY } from '@/features/timing/use-timing-report';
import { api, type ApiResult, type MonthSky, type TimingReportState } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getMonth: jest.fn(), getTimingReport: jest.fn(), requestTimingReport: jest.fn(), saveProfile: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockParams = useLocalSearchParams as jest.Mock;
const T = strings.timing;
const ST = strings.states;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const birthKey = JSON.stringify([profile.date, profile.time, profile.place.id]);
const report = fixtures.timingReport;
const main = report.intervals.find((i) => i.id === report.current.mainId)!;
const month = fixtures.monthSky;
const got = (status: 'NONE' | 'WRITING' | 'FAILED'): ApiResult<TimingReportState> => ({ ok: true, data: { status } });
const done: ApiResult<TimingReportState> = { ok: true, data: { status: 'DONE', report } };
const storeReport = (r = report) => AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, report: r }));
const tick = (ms = TIMING_REPORT_POLL_MS) => act(async () => void (await jest.advanceTimersByTimeAsync(ms)));
const bottomTabs = () => screen.queryAllByRole('tab').filter((t) => !t.props.testID?.startsWith('timing-chip-'));
const chip = (c: string) => screen.getByTestId(`timing-chip-${c}`);
type NetListener = (state: { isConnected: boolean; isInternetReachable: boolean }) => void;
let netListener: NetListener | null = null;
const goOffline = () => act(async () => netListener?.({ isConnected: false, isInternetReachable: false }));
const goOnline = () => act(async () => netListener?.({ isConnected: true, isInternetReachable: true }));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockParams.mockReturnValue({});
  mockApi.getMonth.mockImplementation(async (m?: string): Promise<ApiResult<MonthSky>> => ({ ok: true, data: m ? { ...month, month: m, days: [] } : month }));
  mockApi.getTimingReport.mockResolvedValue(got('NONE'));
  mockApi.requestTimingReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
  await saveBirth({ profile, chart: fixtures.chart });
  netListener = null;
  (NetInfo.addEventListener as jest.Mock).mockImplementation((cb: NetListener) => {
    netListener = cb;
    return () => {};
  });
});

afterEach(() => jest.useRealTimers());

describe('시기 탭 · 시기 풀이 받기 전(결정 049 의 1 · 2, 캔버스 14 받기 전)', () => {
  it('이번 달만 열림: 맨 위 카드 없음 · 칩 셋(이번 달 골라짐, 올해 · 인생 잠김) · 이번 달 · "자세한 풀이" 카드 · 아래 탭(시기)', async () => {
    await render(<TimingScreen />);
    expect(await screen.findByTestId('timing-detail-card')).toBeTruthy();
    expect(screen.queryByTestId('timing-now-card')).toBeNull();
    expect(chip('month').props.accessibilityState).toMatchObject({ selected: true });
    expect(chip('year').props.accessibilityLabel).toBe(`${T.chips.year}${T.lockedSuffix}`);
    expect(chip('life').props.accessibilityLabel).toBe(`${T.chips.life}${T.lockedSuffix}`);
    expect(screen.getByText('2026년 11월')).toBeTruthy();
    expect(screen.getByText(T.month.days)).toBeTruthy();
    expect(screen.getByText(T.detail.title)).toBeTruthy();
    // 받기 전에는 작은 실천이 없다(대표 구간이 없다)
    expect(screen.queryByText(T.practices)).toBeNull();
    expect(bottomTabs().map((t) => t.props.accessibilityState.selected)).toEqual([false, false, true, false]);
    // 탭의 첫 화면이라 뒤로 가기가 없고, 면책 문구도 없다(결정 046 의 2 · 064)
    expect(screen.queryByRole('button', { name: strings.common.backLabel })).toBeNull();
  });

  it('잠긴 칩을 누르면 그 자리에 흐린 미리보기와 자물쇠 카드(14 잠긴 칩), 그 카드에서 받기를 누를 수 있다', async () => {
    await render(<TimingScreen />);
    await fireEvent.press(await screen.findByTestId('timing-chip-year'));
    expect(screen.getByTestId('timing-locked')).toBeTruthy();
    expect(screen.getByText(T.locked.year.title)).toBeTruthy();
    expect(chip('year').props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(chip('life'));
    expect(screen.getByText(T.locked.life.title)).toBeTruthy();
    await fireEvent.press(within(screen.getByTestId('timing-locked')).getByRole('button', { name: T.detail.request }));
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(1);
  });

  it('받기 → 쓰는 중(14-7: 머리 · 아래 탭 없이 별명 짓는 중과 같은 그림 · 시기 문구) → 5초마다 확인 → 다 쓰면 올해 칩', async () => {
    jest.useFakeTimers();
    await render(<TimingScreen />);
    await tick(0);
    mockApi.getTimingReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(done);
    await fireEvent.press(await screen.findByRole('button', { name: T.detail.request }));
    expect(screen.getByText(T.making.title)).toBeTruthy();
    expect(screen.getByText(T.making.lines[0], { includeHiddenElements: true })).toBeTruthy();
    expect(bottomTabs()).toHaveLength(0);
    await tick();
    expect(screen.getByText(T.making.title)).toBeTruthy();
    await tick();
    expect(await screen.findByTestId('timing-now-card')).toBeTruthy();
    expect(chip('year').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('2026년의 흐름')).toBeTruthy();
  });

  it('끝까지 못 쓰면(14-8) 머리 · 아래 탭 없이 "다시 쓰기" · 그 위 "나중에 하기"(받기 전으로)', async () => {
    jest.useFakeTimers();
    await render(<TimingScreen />);
    await tick(0);
    mockApi.getTimingReport.mockResolvedValueOnce(got('FAILED'));
    await fireEvent.press(await screen.findByRole('button', { name: T.detail.request }));
    await tick();
    expect(screen.getByText(T.writeFail)).toBeTruthy();
    expect(screen.getByText(ST.writeFail.body)).toBeTruthy();
    expect(bottomTabs()).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: ST.writeFail.retry }));
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(2);
    mockApi.getTimingReport.mockResolvedValueOnce(got('FAILED'));
    await tick();
    await fireEvent.press(screen.getByRole('button', { name: T.later }));
    expect(screen.getByTestId('timing-detail-card')).toBeTruthy();
  });

  it('서버가 지금은 받을 수 없다고 하면(402 PURCHASE_REQUIRED) 버튼 위에 한 줄(결정 050 의 4)', async () => {
    mockApi.requestTimingReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 402, code: 'PURCHASE_REQUIRED' });
    await render(<TimingScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: T.detail.request }));
    expect(await screen.findByText(T.detail.blocked)).toBeTruthy();
  });

  it('시기 풀이 상태만 못 물었으면 그 카드 자리에 안내(19-1) — 이번 달은 그대로', async () => {
    mockApi.getTimingReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 500 });
    await render(<TimingScreen />);
    expect(await screen.findByTestId('card-fail')).toBeTruthy();
    expect(screen.getByText(T.loadFail.report)).toBeTruthy();
    expect(screen.getByText('2026년 11월')).toBeTruthy();
    mockApi.getTimingReport.mockResolvedValueOnce(got('NONE'));
    await fireEvent.press(screen.getByRole('button', { name: ST.loadFail.retry }));
    expect(await screen.findByTestId('timing-detail-card')).toBeTruthy();
    expect(mockApi.requestTimingReport).not.toHaveBeenCalled();
  });
});

describe('시기 탭 · 시기 풀이 받은 뒤(캔버스 14 · 14-1 · 14-2)', () => {
  it('맨 위 "지금 나의 시기"(대표 구간 이름 · 영역 · 기간 · 한 줄) · 처음 고른 칩은 올해 · 누르면 시기 자세히', async () => {
    await storeReport();
    mockApi.getTimingReport.mockResolvedValue(done);
    await render(<TimingScreen />);
    const card = await screen.findByTestId('timing-now-card');
    expect(within(card).getByText(T.now)).toBeTruthy();
    expect(within(card).getByText(main.title)).toBeTruthy();
    expect(within(card).getByText('2026년 9월 ~ 2027년 1월')).toBeTruthy();
    expect(within(card).getByText(main.summary!)).toBeTruthy();
    expect(chip('year').props.accessibilityState).toMatchObject({ selected: true });
    expect(chip('year').props.accessibilityLabel).toBe(T.chips.year);
    await fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith(`/timing/period?id=${main.id}`);
  });

  it('`?tab=month` 로 이번 달을 고르고, 맨 아래에 이 시기의 작은 실천 · 날짜를 누르면 그날의 하늘', async () => {
    mockParams.mockReturnValue({ tab: 'month' });
    await storeReport();
    mockApi.getTimingReport.mockResolvedValue(done);
    await render(<TimingScreen />);
    expect(await screen.findByText(T.month.days)).toBeTruthy();
    expect(chip('month').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getAllByTestId('timing-practice')).toHaveLength(3);
    expect(screen.queryByTestId('timing-detail-card')).toBeNull();
    await fireEvent.press(screen.getAllByTestId('month-day')[0]);
    expect(router.push).toHaveBeenCalledWith('/timing/day?date=2026-11-21');
    await fireEvent.press(chip('life'));
    expect(screen.getByText(T.life.title)).toBeTruthy();
  });

  it('시각 "모름" 이면 위에 안내 한 줄(결정 049 의 8)', async () => {
    await storeReport(fixtures.timingReportTimeUnknown);
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: fixtures.timingReportTimeUnknown } });
    await render(<TimingScreen />);
    expect(await screen.findByText(T.timeUnknown)).toBeTruthy();
  });

  it('다 받은 풀이를 보던 중 연결이 끊기면 띠, 돌아오면 조용히 새로 받는다 — 만들기(POST)는 하지 않는다', async () => {
    await storeReport();
    mockApi.getTimingReport.mockResolvedValue(done);
    await render(<TimingScreen />);
    await screen.findByTestId('timing-now-card');
    await goOffline();
    expect(screen.getByText(ST.offline.title)).toBeTruthy();
    const calls = mockApi.getTimingReport.mock.calls.length;
    await goOnline();
    await waitFor(() => expect(mockApi.getTimingReport.mock.calls.length).toBe(calls + 1));
    expect(mockApi.requestTimingReport).not.toHaveBeenCalled();
    expect(screen.getByTestId('timing-now-card')).toBeTruthy();
  });
});

describe('시기 탭 · 불러오기(결정 061 · 065)', () => {
  it('0.3초가 넘으면 뼈대, 10초가 넘으면 보드 19(아래 탭은 남는다) — 다시 보기는 상태 · 이번 달만 다시 묻는다', async () => {
    jest.useFakeTimers();
    mockApi.getMonth.mockReturnValue(new Promise(() => {}));
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    await render(<TimingScreen />);
    await tick(400);
    expect(screen.getByTestId('timing-skeleton')).toBeTruthy();
    // 뼈대는 다 그려질 배치를 본뜬다(결정 071): 받아 둔 풀이가 없으니 받기 전의 이번 달 — 칩 · 달 머리 · 달력 · 눈여겨볼 날 셋 · 자세한 풀이 카드
    expect(screen.queryByTestId('sk-timing-now-card')).toBeNull();
    expect(screen.getByTestId('sk-timing-chips')).toBeTruthy();
    expect(screen.getByTestId('sk-month-calendar')).toBeTruthy();
    expect(screen.getAllByTestId('sk-month-day')).toHaveLength(3);
    expect(screen.getByTestId('sk-timing-detail-card')).toBeTruthy();
    expect(bottomTabs()).toHaveLength(4);
    await tick(10_000);
    expect(screen.getByText(T.loadFail.title)).toBeTruthy();
    expect(bottomTabs()).toHaveLength(4);
    mockApi.getMonth.mockResolvedValue({ ok: true, data: month });
    mockApi.getTimingReport.mockResolvedValue(got('NONE'));
    await fireEvent.press(screen.getByRole('button', { name: ST.loadFail.retry }));
    await tick(0);
    expect(screen.getByTestId('timing-detail-card')).toBeTruthy();
    expect(mockApi.requestTimingReport).not.toHaveBeenCalled();
  });

  it('주소가 올해를 고르면 뼈대도 받은 뒤의 올해 배치(지금 나의 시기 · 칩 · 흐름 · 줄 · 작은 실천)', async () => {
    jest.useFakeTimers();
    mockParams.mockReturnValue({ tab: 'year' });
    mockApi.getMonth.mockReturnValue(new Promise(() => {}));
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    await render(<TimingScreen />);
    await tick(400);
    expect(screen.getByTestId('sk-timing-now-card')).toBeTruthy();
    expect(screen.getByTestId('sk-year-flow')).toBeTruthy();
    expect(screen.getAllByTestId('sk-timing-practice')).toHaveLength(3);
    expect(screen.queryByTestId('sk-month-calendar')).toBeNull();
  });

  it('볼 게 없는데 끊겼으면 보드 20-1, 연결이 돌아오면 다시 묻는다', async () => {
    mockApi.getMonth.mockResolvedValue({ ok: false, error: 'NETWORK' });
    mockApi.getTimingReport.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<TimingScreen />);
    await goOffline();
    expect(await screen.findByText(ST.offlineEmpty.title)).toBeTruthy();
    mockApi.getMonth.mockResolvedValue({ ok: true, data: month });
    mockApi.getTimingReport.mockResolvedValue(got('NONE'));
    await goOnline();
    expect(await screen.findByTestId('timing-detail-card')).toBeTruthy();
    expect(mockApi.requestTimingReport).not.toHaveBeenCalled();
  });

  it('출생 정보가 없으면 입력으로 가는 안내만 — 서버를 부르지 않는다', async () => {
    await AsyncStorage.clear();
    await render(<TimingScreen />);
    await act(async () => {});
    expect(mockApi.getMonth).not.toHaveBeenCalled();
    expect(mockApi.getTimingReport).not.toHaveBeenCalled();
    expect(bottomTabs()).toHaveLength(4);
  });
});
