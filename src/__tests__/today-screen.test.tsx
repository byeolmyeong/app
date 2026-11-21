import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import TodayScreen from '@/app/today';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { koreaToday } from '@/features/timing/dates';
import { DAY_SKY_MADE_STORAGE_KEY } from '@/features/timing/day-sky-made';
import { DAY_SKY_STORAGE_KEY } from '@/features/timing/use-today-sky';
import { api, type DaySky } from '@/lib/api';
import { forgetMemory } from '@/lib/device-memory';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/features/auth/use-session', () => ({
  ...jest.requireActual('@/features/auth/use-session'),
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { postDaySky: jest.fn(), saveProfile: jest.fn(), createShare: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const T = strings.today;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const KEY = JSON.stringify([profile.date, profile.time, profile.place.id]);
/** 보드 11-4 의 글 — 한국 날짜 2026-11-19 */
const sky: DaySky = {
  ...fixtures.daySky,
  date: '2026-11-19',
  title: '마음이 가는 사람에게 먼저 안부를 건네 보기 좋은 날',
  reason: { when: 'DAY', items: [{ kind: 'TRANSIT', mover: 'MOON', target: 'VENUS', type: 'CONJUNCTION' }] },
};

type NetListener = (s: { isConnected: boolean; isInternetReachable: boolean }) => void;
let netListener: NetListener | null = null;
let nowSpy: jest.SpyInstance;
beforeEach(async () => {
  netListener = null;
  (NetInfo.addEventListener as jest.Mock).mockImplementation((cb: NetListener) => {
    netListener = cb;
    return () => {};
  });
  await AsyncStorage.clear();
  jest.clearAllMocks();
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T01:00:00Z'));
  await saveBirth({ profile, chart: fixtures.chart });
  mockApi.postDaySky.mockResolvedValue({ ok: true, data: sky });
});
afterEach(() => {
  nowSpy.mockRestore();
  jest.useRealTimers();
});

describe('오늘의 하늘 /today(결정 051, 보드 11-4 · 11-5)', () => {
  it('날짜 · 요일 · 제목 · 오늘의 흐름 셋 · 이유(오늘 …) · 오늘의 작은 실천 셋, 머리 오른쪽에 공유 자리 · 아래 탭(홈). 면책 문구는 없다(결정 064)', async () => {
    await render(<TodayScreen />);
    expect(await screen.findByText(sky.title)).toBeTruthy();
    expect(screen.getByText(T.title)).toBeTruthy();
    expect(screen.getByText('11월 19일 목요일')).toBeTruthy();
    expect(screen.getByText(T.flow)).toBeTruthy();
    expect(screen.getByText(T.practices)).toBeTruthy();
    expect(screen.getAllByTestId('day-flow')).toHaveLength(3);
    expect(screen.getByText(/^오늘 /)).toBeTruthy();
    for (const p of sky.practices) expect(screen.getByText(p.title)).toBeTruthy();
    // 머리 오른쪽의 공유 아이콘(결정 053) — 여는 것만으로는 공유를 만들지 않는다
    expect(screen.getByRole('button', { name: strings.share.open })).toBeTruthy();
    expect(mockApi.createShare).not.toHaveBeenCalled();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.queryByText(/재미|참고/)).toBeNull();
  });

  it('공유 아이콘을 누르면 오늘의 하늘 카드 시트(제목 없음) — 열 때 받은 글의 날짜로 한 번 만든다(결정 053, 보드 11-6 · 11-7)', async () => {
    mockApi.createShare.mockResolvedValue({ ok: true, data: { shareId: 's1', card: { ...fixtures.shareCards.daySky, date: sky.date } } });
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: strings.share.open }));
    const panel = await screen.findByTestId('sheet-panel');
    expect(await within(panel).findByTestId('share-card')).toBeTruthy();
    expect(within(panel).queryByText(strings.share.open)).toBeNull();
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'DAY_SKY', date: '2026-11-19' });
  });

  it('보던 중 연결이 끊기면 받은 글은 그대로 두고 머리 아래 띠(결정 061 의 4)', async () => {
    await render(<TodayScreen />);
    expect(await screen.findByText(sky.title)).toBeTruthy();
    expect(screen.queryByText(strings.states.offline.title)).toBeNull();
    await act(async () => netListener?.({ isConnected: false, isInternetReachable: false }));
    expect(screen.getByText(strings.states.offline.title)).toBeTruthy();
    expect(screen.getByText(sky.title)).toBeTruthy();
  });

  it('기기에 출생 정보가 없으면 홈으로(되살리기 · 입력은 홈이 맡는다, 리뷰 #66)', async () => {
    await AsyncStorage.clear();
    // 앱에서 기기를 지우는 일(clearDeviceData)은 이번 실행의 메모리도 함께 비운다
    forgetMemory();
    await render(<TodayScreen />);
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(mockApi.postDaySky).not.toHaveBeenCalled();
  });

  it('기기에 둔 오늘 것을 바로 그리고 뒤에서 한 번 새로 받는다', async () => {
    await AsyncStorage.setItem(DAY_SKY_STORAGE_KEY, JSON.stringify({ key: KEY, sky }));
    let answer: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValueOnce(new Promise((r) => (answer = r)));
    await render(<TodayScreen />);
    expect(await screen.findByText(sky.title)).toBeTruthy();
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
    // 기다리던 요청을 끝내 둔다(다음 시험이 같은 요청을 함께 기다리지 않게)
    await act(async () => answer({ ok: true, data: sky }));
  });

  it('오늘을 이 기기에서 한 번도 받지 않았으면 뼈대 없이 곧바로 쓰는 중(머리만 · 탭 없음) — 받으면 글(결정 075)', async () => {
    jest.useFakeTimers();
    let finish: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValue(new Promise((r) => (finish = r)));
    await render(<TodayScreen />);
    await act(async () => {});
    expect(screen.getByText(T.making.title)).toBeTruthy();
    await act(async () => jest.advanceTimersByTime(400));
    expect(screen.queryAllByTestId(/^sk-/)).toHaveLength(0);
    await act(async () => finish({ ok: true, data: sky }));
    expect(screen.getByText(sky.title)).toBeTruthy();
  });

  it('오늘의 하늘 푸시를 눌러 열면(그날이 오늘) 서버가 미리 만든 날이라 만드는 중을 비추지 않는다 — 늦을 때만 뼈대(리뷰 #87 의 4)', async () => {
    jest.useFakeTimers();
    (useLocalSearchParams as jest.Mock).mockReturnValueOnce({ date: koreaToday() }).mockReturnValue({ date: koreaToday() });
    let finish: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValue(new Promise((r) => (finish = r)));
    await render(<TodayScreen />);
    await act(async () => {});
    expect(screen.queryByText(T.making.title)).toBeNull();
    await act(async () => jest.advanceTimersByTime(300));
    expect(screen.getByTestId('sk-day-hero')).toBeTruthy();
    await act(async () => finish({ ok: true, data: sky }));
    expect(screen.getByText(sky.title)).toBeTruthy();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
  });

  it('오늘을 받은 적 있는데 보관본이 없으면: 0.3초 뒤 뼈대(다 그려진 배치 — 탭 있음), 3초가 넘으면 쓰는 중(머리만 · 탭 없음, 결정 061 의 2)', async () => {
    jest.useFakeTimers();
    await AsyncStorage.setItem(DAY_SKY_MADE_STORAGE_KEY, JSON.stringify({ key: KEY, dates: [koreaToday()] }));
    let finish: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValue(new Promise((r) => (finish = r)));
    await render(<TodayScreen />);
    await act(async () => jest.advanceTimersByTime(300));
    // 머리 카드: 날짜 한 줄 + 제목 세 줄(보드 11-4) — 다 그려진 카드와 같은 높이
    expect(within(screen.getByTestId('sk-day-hero')).getAllByTestId('skeleton-line')).toHaveLength(4);
    expect(screen.getAllByTestId('sk-day-flow')).toHaveLength(3);
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    await act(async () => jest.advanceTimersByTime(3000));
    expect(screen.getByText(T.making.title)).toBeTruthy();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    await act(async () => finish({ ok: true, data: sky }));
    expect(screen.getByText(sky.title)).toBeTruthy();
  });

  it('못 썼으면 실패 틀 — 다시 쓰기를 누르면 다시 부르고, 나중에 하기는 뒤로', async () => {
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' });
    await render(<TodayScreen />);
    expect(await screen.findByText(T.fail)).toBeTruthy();
    expect(screen.getByText(strings.states.writeFail.body)).toBeTruthy();
    await fireEvent.press(screen.getByText(strings.timing.later));
    expect(router.back).toHaveBeenCalled();
    await fireEvent.press(screen.getByText(strings.states.writeFail.retry));
    expect(await screen.findByText(sky.title)).toBeTruthy();
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
  });

  it('생성 한도(429)면 실패 틀에 한도 안내', async () => {
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<TodayScreen />);
    expect(await screen.findByText(T.limit)).toBeTruthy();
  });
});
