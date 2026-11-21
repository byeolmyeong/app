import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import TimingDayScreen from '@/app/timing/day';
import TimingPeriodScreen from '@/app/timing/period';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { koreaToday } from '@/features/timing/dates';
import { DAY_SKY_MADE_STORAGE_KEY } from '@/features/timing/day-sky-made';
import { DAY_SKY_MAX_WAIT_MS } from '@/features/timing/use-day-sky';
import { TIMING_REPORT_STORAGE_KEY } from '@/features/timing/use-timing-report';
import { api, type ApiResult, type DaySky } from '@/lib/api';
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
  api: { getTimingReport: jest.fn(), postDaySky: jest.fn(), saveProfile: jest.fn(), createShare: jest.fn() },
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
const day = fixtures.daySky;
const tabs = () => screen.queryAllByRole('tab');
const tick = (ms: number) => act(async () => void (await jest.advanceTimersByTimeAsync(ms)));
type NetListener = (state: { isConnected: boolean; isInternetReachable: boolean }) => void;
let netListener: NetListener | null = null;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockParams.mockReturnValue({});
  mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report } });
  mockApi.postDaySky.mockResolvedValue({ ok: true, data: day });
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
  await saveBirth({ profile, chart: fixtures.chart });
  netListener = null;
  (NetInfo.addEventListener as jest.Mock).mockImplementation((cb: NetListener) => {
    netListener = cb;
    return () => {};
  });
});

afterEach(() => jest.useRealTimers());

describe('시기 자세히 /timing/period(결정 049 의 5, 캔버스 14-3)', () => {
  it('머리 카드(지금 지나는 중 · 이름 · 영역 · 기간 · 시작 ~ 끝의 "지금") · 이유 · 01 ~ 03 · 작은 실천, 뒤로 가기와 아래 탭', async () => {
    mockParams.mockReturnValue({ id: main.id });
    await AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, report }));
    await render(<TimingPeriodScreen />);
    const hero = await screen.findByTestId('period-hero');
    expect(within(hero).getByText(T.period.ongoing)).toBeTruthy();
    expect(within(hero).getByText(main.title)).toBeTruthy();
    expect(within(hero).getByText('2026년 9월 ~ 2027년 1월')).toBeTruthy();
    expect(within(hero).getByText('9월 시작')).toBeTruthy();
    expect(within(hero).getByText('1월 끝')).toBeTruthy();
    expect(screen.getByTestId('period-now')).toBeTruthy();
    expect(screen.getByText(/지금 책임을 맡은 별\(토성\)이 내 나의 중심\(해\)과 부딪히는 각도\(사분\)를 지나요/)).toBeTruthy();
    const sections = screen.getAllByTestId('period-section');
    expect(sections.map((s) => within(s).getByText(/^0\d$/).props.children)).toEqual(['01', '02', '03']);
    expect(within(sections[0]).getByText(main.detail!.changes)).toBeTruthy();
    expect(within(sections[2]).getByText(main.detail!.after)).toBeTruthy();
    expect(screen.getAllByTestId('timing-practice')).toHaveLength(3);
    expect(tabs().map((t) => t.props.accessibilityState.selected)).toEqual([false, false, true, false]);
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(router.back).toHaveBeenCalled();
  });

  it('처음 불러올 때 0.3초가 넘으면 시기 자세히의 배치를 본뜬 뼈대(결정 071)', async () => {
    jest.useFakeTimers();
    mockParams.mockReturnValue({ id: main.id });
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    await render(<TimingPeriodScreen />);
    await tick(400);
    expect(screen.getByTestId('sk-period-hero')).toBeTruthy();
    expect(screen.getByTestId('sk-period-reason')).toBeTruthy();
    expect(screen.getAllByTestId('sk-period-section')).toHaveLength(3);
  });

  it('다가오는 구간은 "다가오는 시기" 딱지이고 "지금" 점이 없다', async () => {
    mockParams.mockReturnValue({ id: 'i12' });
    await render(<TimingPeriodScreen />);
    expect(within(await screen.findByTestId('period-hero')).getByText(T.period.upcoming)).toBeTruthy();
    expect(screen.queryByTestId('period-now')).toBeNull();
  });

  it('자세한 글이 없는 구간 · 시기 풀이가 없으면 시기 탭으로 가는 안내', async () => {
    mockParams.mockReturnValue({ id: 'i1' });
    await render(<TimingPeriodScreen />);
    expect(await screen.findByText(T.period.missing.title)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: T.period.missing.back }));
    expect(router.replace).toHaveBeenCalledWith('/timing');
  });
});

describe('그날의 하늘 /timing/day(결정 049 의 6 · 061 의 2, 캔버스 14-4)', () => {
  it('이 기기에서 한 번도 받지 않은 날은 뼈대 없이 곧바로 쓰는 중 — 받으면 그 날을 기억한다(결정 075)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-19T12:00:00+09:00'));
    mockParams.mockReturnValue({ date: '2026-11-21' });
    let resolve: (r: ApiResult<DaySky>) => void = () => {};
    mockApi.postDaySky.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await render(<TimingDayScreen />);
    await tick(0);
    expect(screen.getByText(T.day.making.title)).toBeTruthy();
    await tick(400);
    expect(screen.queryAllByTestId(/^sk-/)).toHaveLength(0);
    await act(async () => resolve({ ok: true, data: day }));
    expect(screen.getByTestId('day-hero')).toBeTruthy();
    expect(JSON.parse((await AsyncStorage.getItem(DAY_SKY_MADE_STORAGE_KEY))!)).toEqual({ key: birthKey, dates: ['2026-11-21'] });
  });

  it('이 기기에서 받은 적 있는 날: 0.3초가 넘으면 다 그려질 배치의 뼈대(아래 탭과 함께), 3초가 넘으면 쓰는 중(머리 · 아래 탭 없이 — 별명 짓는 중처럼, 소유자 지적 5) → 글(날짜 · 요일 · 제목 · 흐름 셋 · 이유 · 실천 셋)과 아래 탭', async () => {
    jest.useFakeTimers();
    // 그날(11월 21일)이 기기의 오늘이 아니게 — 오늘이면 이유가 "오늘" 로 시작한다(아래 시험)
    jest.setSystemTime(new Date('2026-11-19T12:00:00+09:00'));
    await AsyncStorage.setItem(DAY_SKY_MADE_STORAGE_KEY, JSON.stringify({ key: birthKey, dates: ['2026-11-21'] }));
    mockParams.mockReturnValue({ date: '2026-11-21' });
    let resolve: (r: ApiResult<DaySky>) => void = () => {};
    mockApi.postDaySky.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await render(<TimingDayScreen />);
    await tick(400);
    expect(screen.getByTestId('sk-day-hero')).toBeTruthy();
    expect(screen.getAllByTestId('sk-day-flow')).toHaveLength(3);
    expect(screen.queryByText(T.day.making.title)).toBeNull();
    expect(tabs()).toHaveLength(4);
    await tick(3000);
    expect(screen.getByText(T.day.making.title)).toBeTruthy();
    // 만드는 중에는 위 머리(제목 · 뒤로 가기)가 없다 — 뒤로는 기기의 뒤로 · 밀어서 돌아가기로
    expect(screen.queryByText('11월 21일의 하늘')).toBeNull();
    expect(screen.queryByRole('button', { name: strings.common.backLabel })).toBeNull();
    expect(tabs()).toHaveLength(0);
    expect(mockApi.postDaySky).toHaveBeenCalledWith('2026-11-21');
    await act(async () => resolve({ ok: true, data: day }));
    const hero = screen.getByTestId('day-hero');
    expect(within(hero).getByText('11월 21일 토요일')).toBeTruthy();
    expect(within(hero).getByText(day.title)).toBeTruthy();
    expect(screen.getAllByTestId('day-flow')).toHaveLength(3);
    expect(screen.getByText(day.flow.work)).toBeTruthy();
    expect(screen.getByText(/그날 말을 맡은 별\(수성\)이 내 나의 중심\(해\)과 잘 어울리는 자리를 지나요/)).toBeTruthy();
    expect(screen.getAllByTestId('timing-todo')).toHaveLength(3);
    expect(tabs()).toHaveLength(4);
    // 머리 오른쪽의 공유 아이콘(그날의 하늘 카드, 결정 053 — 보드 14-4) — 여는 것만으로는 공유를 만들지 않는다
    expect(screen.getByRole('button', { name: strings.share.open })).toBeTruthy();
    expect(mockApi.createShare).not.toHaveBeenCalled();
  });

  it('만드는 중이 3분을 넘으면 기다리지 않고 못 썼을 때(머리 · 뒤로가 돌아온다) — 다시 쓰기는 다시 부른다(갇히지 않게)', async () => {
    jest.useFakeTimers();
    expect(DAY_SKY_MAX_WAIT_MS).toBe(180_000);
    mockParams.mockReturnValue({ date: '2026-11-21' });
    mockApi.postDaySky.mockReturnValueOnce(new Promise(() => {}));
    await render(<TimingDayScreen />);
    await tick(3000);
    expect(screen.getByText(T.day.making.title)).toBeTruthy();
    await tick(DAY_SKY_MAX_WAIT_MS - 3000 - 1);
    expect(screen.getByText(T.day.making.title)).toBeTruthy();
    await tick(1);
    expect(screen.getByText(T.day.fail)).toBeTruthy();
    expect(screen.getByText('11월 21일의 하늘')).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.common.backLabel })).toBeTruthy();
    mockApi.postDaySky.mockResolvedValueOnce({ ok: true, data: day });
    await fireEvent.press(screen.getByRole('button', { name: strings.states.writeFail.retry }));
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
  });

  it('공유 아이콘을 누르면 그날의 하늘 카드 시트(제목 없음) — 열 때 그 날짜로 한 번 만든다(결정 053 · A7-5)', async () => {
    mockParams.mockReturnValue({ date: '2026-11-21' });
    mockApi.postDaySky.mockResolvedValue({ ok: true, data: day });
    mockApi.createShare.mockResolvedValue({ ok: true, data: { shareId: 's1', card: { ...fixtures.shareCards.daySky, date: '2026-11-21' } } });
    await render(<TimingDayScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: strings.share.open }));
    const panel = await screen.findByTestId('sheet-panel');
    expect(await within(panel).findByTestId('share-card')).toBeTruthy();
    expect(within(panel).queryByText(strings.share.open)).toBeNull();
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'DAY_SKY', date: '2026-11-21' });
  });

  it('오늘 날짜면 이유가 "오늘" 로 시작한다', async () => {
    const today = koreaToday();
    mockParams.mockReturnValue({ date: today });
    mockApi.postDaySky.mockResolvedValueOnce({ ok: true, data: { ...day, date: today } });
    await render(<TimingDayScreen />);
    expect(await screen.findByText(/^오늘 말을 맡은 별/)).toBeTruthy();
  });

  it('못 썼으면(502) 다시 쓰기 · 나중에 하기(뒤로), 머리만 — 다시 쓰기는 다시 부른다', async () => {
    mockParams.mockReturnValue({ date: '2026-11-21' });
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' });
    await render(<TimingDayScreen />);
    expect(await screen.findByText(T.day.fail)).toBeTruthy();
    expect(screen.getByText(ST.writeFail.body)).toBeTruthy();
    expect(tabs()).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: ST.writeFail.retry }));
    expect(await screen.findByTestId('day-hero')).toBeTruthy();
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
  });

  it('생성 한도(429)면 한 줄 안내 — 화면이 깨지지 않는다(리뷰 초점 4)', async () => {
    mockParams.mockReturnValue({ date: '2026-11-22' });
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<TimingDayScreen />);
    expect(await screen.findByText(T.day.limit)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: T.later }));
    expect(router.back).toHaveBeenCalled();
  });

  it('범위 밖(400 DATE_OUT_OF_RANGE)이면 돌아가기 안내, 주소의 날짜가 틀리면 부르지도 않는다', async () => {
    mockParams.mockReturnValue({ date: '2027-03-01' });
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 400, code: 'DATE_OUT_OF_RANGE' });
    const view = await render(<TimingDayScreen />);
    expect(await screen.findByText(T.day.outOfRange.title)).toBeTruthy();
    await view.unmount();
    mockParams.mockReturnValue({ date: '2026-13-01' });
    await render(<TimingDayScreen />);
    expect(screen.getByText(T.day.outOfRange.title)).toBeTruthy();
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
  });

  it('다 받은 그날의 하늘을 보던 중 연결이 끊기면 머리 아래 띠(결정 061 의 4)', async () => {
    mockParams.mockReturnValue({ date: '2026-11-21' });
    await render(<TimingDayScreen />);
    expect(await screen.findByTestId('day-hero')).toBeTruthy();
    await act(async () => netListener?.({ isConnected: false, isInternetReachable: false }));
    expect(screen.getByText(ST.offline.title)).toBeTruthy();
    expect(screen.getByTestId('day-hero')).toBeTruthy();
  });

  it('다른 400(INVALID_REQUEST) · 응답 모양이 틀림(INVALID)은 다시 써도 같으니 다시 쓰기 대신 돌아가기', async () => {
    mockParams.mockReturnValue({ date: '2026-11-21' });
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 400, code: 'INVALID_REQUEST' });
    const view = await render(<TimingDayScreen />);
    expect(await screen.findByText(T.day.cannotOpen.title)).toBeTruthy();
    expect(screen.queryByRole('button', { name: ST.writeFail.retry })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: T.day.cannotOpen.back }));
    expect(router.back).toHaveBeenCalled();
    await view.unmount();
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'INVALID', status: 200 });
    await render(<TimingDayScreen />);
    expect(await screen.findByText(T.day.cannotOpen.title)).toBeTruthy();
  });

  it('서버에 출생 정보가 없으면(404) 저장하고 한 번만 더 부른다', async () => {
    mockParams.mockReturnValue({ date: '2026-11-21' });
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    await render(<TimingDayScreen />);
    expect(await screen.findByTestId('day-hero')).toBeTruthy();
    expect(mockApi.saveProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
  });
});
