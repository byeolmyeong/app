import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import TimingScreen from '@/app/timing';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { MONTH_SKY_STORAGE_KEY, prefetchMonth } from '@/features/timing/use-month';
import { TIMING_REPORT_MAX_WRITING_MS, TIMING_REPORT_POLL_MS, TIMING_REPORT_STORAGE_KEY } from '@/features/timing/use-timing-report';
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
  api: { getMonth: jest.fn(), getTimingReport: jest.fn(), requestTimingReport: jest.fn(), saveProfile: jest.fn(), createShare: jest.fn() },
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
/** 칩 줄의 자리: 칩 줄 칸의 위 여백(칩 줄 위에는 맨 위 카드 · 시각 모름 줄뿐이고 둘은 칩마다 같다) */
const chipsTop = () => StyleSheet.flatten(screen.getByTestId('timing-chips-slot').props.style)?.marginTop;
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
    expect(screen.getByText(`${T.month.thisMonth}${T.month.daysSuffix}`)).toBeTruthy();
    expect(screen.getByText(T.detail.title)).toBeTruthy();
    // 받기 전에는 작은 실천이 없다(대표 구간이 없다)
    expect(screen.queryByText(T.practices)).toBeNull();
    expect(bottomTabs().map((t) => t.props.accessibilityState.selected)).toEqual([false, false, true, false]);
    // 탭의 첫 화면이라 뒤로 가기가 없고, 면책 문구도 없다(결정 046 의 2 · 064)
    expect(screen.queryByRole('button', { name: strings.common.backLabel })).toBeNull();
  });

  it('잠긴 칩을 누르면 그 자리에 자물쇠 카드만(뒤에 비치는 뼈대 없이 — 소유자 지적 2), 그 카드에서 받기를 누를 수 있다', async () => {
    await render(<TimingScreen />);
    await fireEvent.press(await screen.findByTestId('timing-chip-year'));
    expect(screen.getByTestId('timing-locked')).toBeTruthy();
    expect(screen.queryAllByTestId('skeleton', { includeHiddenElements: true })).toHaveLength(0);
    expect(screen.getByText(T.locked.year.title)).toBeTruthy();
    expect(chip('year').props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(chip('life'));
    expect(screen.getByText(T.locked.life.title)).toBeTruthy();
    await fireEvent.press(within(screen.getByTestId('timing-locked')).getByRole('button', { name: T.detail.request }));
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(1);
  });

  it('칩 줄은 이번 달 · 올해 · 인생에서 같은 자리 — 잠긴 칩을 골라도 내려가지 않는다(이번 달 기준, 소유자 지적 1)', async () => {
    await render(<TimingScreen />);
    await screen.findByTestId('timing-detail-card');
    const top = chipsTop();
    expect(top).toBeDefined();
    await fireEvent.press(chip('year'));
    expect(chipsTop()).toBe(top);
    await fireEvent.press(chip('life'));
    expect(chipsTop()).toBe(top);
  });

  it('받기 전인 것을 기기가 기억하면 뼈대 없이 곧바로 받기 화면 — 이번 달이 늦으면 달력 자리만 0.3초 뒤 뼈대(소유자 지적 3)', async () => {
    jest.useFakeTimers();
    await AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, status: 'NONE' }));
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    mockApi.getMonth.mockReturnValue(new Promise(() => {}));
    await render(<TimingScreen />);
    await tick(0);
    expect(screen.getByTestId('timing-detail-card')).toBeTruthy();
    expect(screen.getByTestId('timing-chips')).toBeTruthy();
    expect(screen.queryByTestId('timing-skeleton')).toBeNull();
    // 0.3초 전에는 달력 자리만 비워 둔다(달이 와도 아래 카드가 밀리지 않게)
    expect(screen.queryByTestId('timing-month-skeleton')).toBeNull();
    expect(screen.getByTestId('timing-month-pending', { includeHiddenElements: true })).toBeTruthy();
    await tick(400);
    expect(screen.queryByTestId('timing-skeleton')).toBeNull();
    expect(screen.getByTestId('timing-month-skeleton')).toBeTruthy();
    expect(screen.getByTestId('timing-detail-card')).toBeTruthy();
    // 받기는 곧바로 누를 수 있다(뒤의 확인을 기다리지 않는다)
    await fireEvent.press(screen.getByRole('button', { name: T.detail.request }));
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(1);
  });

  it('기기에 둔 이번 달이 있으면 달력도 기다리지 않고 바로 — 시각 "모름" 거르기는 보관본도 거친다(결정 074)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-19T12:00:00+09:00'));
    const sky: MonthSky = { ...month, timeKnown: false, themes: [...month.themes, { area: 'MONEY', title: '돈 이번 달', from: '2026-11-01', to: '2026-12-01' }] };
    await AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, status: 'NONE' }));
    await AsyncStorage.setItem(MONTH_SKY_STORAGE_KEY, JSON.stringify({ key: birthKey, sky }));
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    mockApi.getMonth.mockReturnValue(new Promise(() => {}));
    await render(<TimingScreen />);
    await tick(0);
    expect(screen.getByTestId('month-calendar')).toBeTruthy();
    expect(screen.queryByTestId('timing-month-pending', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText(new RegExp(month.themes[0].title))).toBeTruthy();
    expect(screen.queryByText(/돈 이번 달/)).toBeNull();
    expect(screen.getByTestId('timing-detail-card')).toBeTruthy();
  });

  it('쓰는 중인 것을 기기가 기억하면 곧바로 쓰는 중(머리 · 아래 탭이 있는 틀 안)', async () => {
    jest.useFakeTimers();
    await AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, status: 'WRITING' }));
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    await render(<TimingScreen />);
    await tick(0);
    expect(screen.getByText(T.making.title)).toBeTruthy();
    expect(bottomTabs()).toHaveLength(4);
    expect(screen.queryByTestId('timing-skeleton')).toBeNull();
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

  it('다른 곳에서 받기를 눌러 쓰는 중인 채로 열면 머리 · 아래 탭이 있는 틀 안의 쓰는 중(다른 탭으로 갈 수 있게, #49 의 나 탭과 같이)', async () => {
    mockApi.getTimingReport.mockResolvedValue(got('WRITING'));
    await render(<TimingScreen />);
    expect(await screen.findByText(T.making.title)).toBeTruthy();
    expect(bottomTabs()).toHaveLength(4);
    expect(within(screen.getByTestId('nav-bar')).getByText(T.title)).toBeTruthy();
    expect(mockApi.requestTimingReport).not.toHaveBeenCalled();
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

  it('쓰는 중 확인이 끊기면 보드 19(아래 탭 있음) — 다시 보기는 상태만 다시 묻는다(만들기는 다시 하지 않는다)', async () => {
    jest.useFakeTimers();
    await render(<TimingScreen />);
    await tick(0);
    mockApi.getTimingReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 500 });
    await fireEvent.press(await screen.findByRole('button', { name: T.detail.request }));
    await tick();
    expect(screen.getByText(T.loadFail.report)).toBeTruthy();
    expect(bottomTabs()).toHaveLength(4);
    mockApi.getTimingReport.mockResolvedValueOnce(got('WRITING'));
    const before = mockApi.getTimingReport.mock.calls.length;
    await fireEvent.press(screen.getByRole('button', { name: ST.loadFail.retry }));
    await tick(0);
    expect(mockApi.getTimingReport.mock.calls.length).toBe(before + 1);
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(1);
    expect(screen.getByText(T.making.title)).toBeTruthy();
  });

  it('쓰는 중이 3분을 넘으면 확인을 멈추고 보드 19 — 다시 보기는 상태만', async () => {
    jest.useFakeTimers();
    await render(<TimingScreen />);
    await tick(0);
    mockApi.getTimingReport.mockResolvedValue(got('WRITING'));
    await fireEvent.press(await screen.findByRole('button', { name: T.detail.request }));
    await tick(TIMING_REPORT_MAX_WRITING_MS + TIMING_REPORT_POLL_MS);
    expect(screen.getByText(T.loadFail.report)).toBeTruthy();
    expect(bottomTabs()).toHaveLength(4);
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(1);
  });

  it('받기가 생성 한도(429)에 걸리면 14-8 에 한도 문구 — 다시 쓰기는 다시 요청한다', async () => {
    mockApi.requestTimingReport.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<TimingScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: T.detail.request }));
    expect(await screen.findByText(T.writeFail)).toBeTruthy();
    expect(screen.getByText(T.limit)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ST.writeFail.retry }));
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(2);
  });

  it('받기를 누른 채 연결이 끊겼으면 보드 20-1 — 다시 시도는 받기(POST)를 다시 한다', async () => {
    await render(<TimingScreen />);
    const request = await screen.findByRole('button', { name: T.detail.request });
    await goOffline();
    mockApi.requestTimingReport.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await fireEvent.press(request);
    expect(await screen.findByText(ST.offlineEmpty.title)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ST.offlineEmpty.retry }));
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(2);
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
  it('받은 뒤에도 칩 줄은 세 칩에서 같은 자리(소유자 지적 1)', async () => {
    await storeReport();
    await render(<TimingScreen />);
    await screen.findByTestId('timing-now-card');
    const top = chipsTop();
    expect(top).toBeDefined();
    await fireEvent.press(chip('month'));
    expect(chipsTop()).toBe(top);
    await fireEvent.press(chip('life'));
    expect(chipsTop()).toBe(top);
  });

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
    // 달력의 오늘(한국 날짜 2026-11-20) — 누르는 날(11-21)이 오늘이 아니게
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-20T03:00:00Z'));
    mockParams.mockReturnValue({ tab: 'month' });
    await storeReport();
    mockApi.getTimingReport.mockResolvedValue(done);
    await render(<TimingScreen />);
    expect(await screen.findByText(`${T.month.thisMonth}${T.month.daysSuffix}`)).toBeTruthy();
    expect(chip('month').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getAllByTestId('timing-practice')).toHaveLength(3);
    expect(screen.queryByTestId('timing-detail-card')).toBeNull();
    await fireEvent.press(screen.getAllByTestId('month-day')[0]);
    expect(router.push).toHaveBeenCalledWith('/timing/day?date=2026-11-21');
    await fireEvent.press(chip('life'));
    expect(screen.getByText(T.life.title)).toBeTruthy();
    nowSpy.mockRestore();
  });

  it('달력에서 오늘을 누르면 오늘의 하늘 /today(결정 051 의 3, 계획 A④)', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-21T03:00:00Z'));
    mockParams.mockReturnValue({ tab: 'month' });
    await storeReport();
    mockApi.getTimingReport.mockResolvedValue(done);
    await render(<TimingScreen />);
    expect(await screen.findByText(`${T.month.thisMonth}${T.month.daysSuffix}`)).toBeTruthy();
    await fireEvent.press(screen.getAllByTestId('month-day')[0]);
    expect(router.push).toHaveBeenCalledWith('/today');
    nowSpy.mockRestore();
  });

  it('인생 칩: 다음 큰 변화 카드 오른쪽 위 공유 아이콘 → 다음 큰 변화 카드 시트(제목 없음), 열 때 한 번 만든다(결정 053 — 보드 14 인생 · 14-5)', async () => {
    mockParams.mockReturnValue({ tab: 'life' });
    await storeReport();
    mockApi.getTimingReport.mockResolvedValue(done);
    mockApi.createShare.mockResolvedValue({ ok: true, data: { shareId: 's1', card: fixtures.shareCards.nextBig } });
    await render(<TimingScreen />);
    const icon = await screen.findByRole('button', { name: strings.share.openNextBig });
    expect(within(screen.getByTestId('life-share-spot')).getByRole('button', { name: strings.share.openNextBig })).toBeTruthy();
    expect(mockApi.createShare).not.toHaveBeenCalled();
    await fireEvent.press(icon);
    const panel = await screen.findByTestId('sheet-panel');
    expect(await within(panel).findByTestId('share-card')).toBeTruthy();
    expect(within(panel).queryByText(strings.share.open)).toBeNull();
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'NEXT_BIG' });
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

describe('들어가면 바로 — 한 번만 바뀌기(결정 075, 소유자: 뼈대 → 만들고 있어요 → 내용)', () => {
  /** 기기 시계: 한국 2026-11-19(예시 이번 달 2026-11) */
  let nowSpy: jest.SpyInstance;
  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T01:00:00Z'));
  });
  afterEach(() => nowSpy.mockRestore());

  it('보관한 풀이 + 쓰는 중 기억이면 첫 그림부터 내용 — 만들고 있어요를 보이지 않고, 서버가 다 썼다고 하면 그대로', async () => {
    await AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, report, status: 'WRITING' }));
    let answer: (v: ApiResult<TimingReportState>) => void = () => {};
    mockApi.getTimingReport.mockReturnValueOnce(new Promise((r) => (answer = r)));
    await render(<TimingScreen />);
    expect(await screen.findByTestId('timing-now-card')).toBeTruthy();
    expect(screen.queryByText(T.making.title)).toBeNull();
    await act(async () => answer(done));
    expect(screen.getByTestId('timing-now-card')).toBeTruthy();
    expect(screen.queryByText(T.making.title)).toBeNull();
  });

  it('홈을 거쳐(앱을 켤 때 받아 둔 시기 풀이 · 이번 달) 시기 탭을 열면 서버 답을 기다리지 않고 첫 그림부터 내용 · 달력', async () => {
    // 홈이 앱을 켤 때 한 일: 시기 풀이 상태(다 씀)를 보관하고 이번 달을 받아 둔다
    await storeReport();
    await prefetchMonth({ date: profile.date, time: profile.time, placeId: profile.place.id });
    expect(JSON.parse((await AsyncStorage.getItem(MONTH_SKY_STORAGE_KEY))!).sky.month).toBe(month.month);
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    mockApi.getMonth.mockReturnValue(new Promise(() => {}));
    mockParams.mockReturnValue({ tab: 'month' });
    await render(<TimingScreen />);
    expect(await screen.findByTestId('timing-now-card')).toBeTruthy();
    expect(screen.getByTestId('month-calendar')).toBeTruthy();
    expect(screen.queryAllByTestId(/^sk-/)).toHaveLength(0);
  });

  it('앱을 켤 때 이번 달 받아 두기는 이번 실행에 한 번 — 못 받았어도(끊김) 다시 붙은 홈이 또 묻지 않는다(리뷰 #87 의 5)', async () => {
    mockApi.getMonth.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await prefetchMonth({ date: profile.date, time: profile.time, placeId: profile.place.id });
    await prefetchMonth({ date: profile.date, time: profile.time, placeId: profile.place.id });
    expect(mockApi.getMonth).toHaveBeenCalledTimes(1);
  });

  it('이번 달을 기기에 받아 둔 것이 있으면 앱을 켤 때 다시 부르지 않는다', async () => {
    await prefetchMonth({ date: profile.date, time: profile.time, placeId: profile.place.id });
    await prefetchMonth({ date: profile.date, time: profile.time, placeId: profile.place.id });
    expect(mockApi.getMonth).toHaveBeenCalledTimes(1);
  });
});
