import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import type { PushData } from '@/features/push/push-data';
import { DAY_SKY_STORAGE_KEY, useTodaySky } from '@/features/timing/use-today-sky';
import { api, type BirthInput, type DaySky } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
// 쓰는 중에 온 푸시(결정 066 의 5) — 시험이 직접 보낸다
let mockPush: ((push: PushData) => void) | null = null;
jest.mock('@/features/push/push', () => ({
  onPushReceived: (listener: (push: PushData) => void) => {
    mockPush = listener;
    return () => {
      if (mockPush === listener) mockPush = null;
    };
  },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { postDaySky: jest.fn(), saveProfile: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const birth: BirthInput = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const KEY = JSON.stringify([birth.date, birth.time, birth.placeId]);
/** 한국 날짜 2026-11-19 오전 */
const NOW = Date.parse('2026-11-19T01:00:00Z');
const sky = (date: string): DaySky => ({ ...fixtures.daySky, date, title: `${date} 의 제목` });
const store = (s: DaySky, key = KEY) => AsyncStorage.setItem(DAY_SKY_STORAGE_KEY, JSON.stringify({ key, sky: s }));

let nowSpy: jest.SpyInstance;
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockApi.postDaySky.mockResolvedValue({ ok: true, data: sky('2026-11-19') });
  mockApi.saveProfile.mockResolvedValue({ ok: true, data: birth });
});
afterEach(() => nowSpy.mockRestore());

describe('오늘의 하늘(결정 051 의 2)', () => {
  it('기기에 둔 오늘 것이 있으면 묻는 중 없이 바로 그리고, 뒤에서 한 번 새로 받는다(못 받아도 보관본 그대로)', async () => {
    await store(sky('2026-11-19'));
    let answer: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValueOnce(new Promise((r) => (answer = r)));
    const { result } = await renderHook(() => useTodaySky(birth));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: sky('2026-11-19') }));
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
    await act(async () => answer({ ok: false, error: 'NETWORK' }));
    expect(result.current.state).toEqual({ status: 'done', sky: sky('2026-11-19') });
  });

  it('없으면 날짜 없이 POST /day-sky 를 부르고 받은 것을 기기에 둔다', async () => {
    const { result } = await renderHook(() => useTodaySky(birth));
    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(mockApi.postDaySky).toHaveBeenCalledWith();
    expect(JSON.parse((await AsyncStorage.getItem(DAY_SKY_STORAGE_KEY))!)).toEqual({ key: KEY, sky: sky('2026-11-19') });
  });

  it('지난날 것 · 다른 출생 정보로 받은 것은 그리지 않고 다시 부른다', async () => {
    for (const [stored, key] of [
      [sky('2026-11-18'), KEY],
      [sky('2026-11-19'), JSON.stringify(['1999-01-01', null, null])],
    ] as const) {
      jest.clearAllMocks();
      await store(stored, key);
      const { result, unmount } = await renderHook(() => useTodaySky(birth));
      await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: sky('2026-11-19') }));
      expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
      await unmount();
    }
  });

  it('앱을 켜 둔 채 날이 바뀌면 앱으로 돌아올 때 다시 부른다', async () => {
    let listener: ((s: AppStateStatus) => void) | null = null;
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, l) => {
      listener = l as (s: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    await store(sky('2026-11-19'));
    const { result } = await renderHook(() => useTodaySky(birth));
    await waitFor(() => expect(result.current.state.status).toBe('done'));
    // 보관본 뒤의 한 번(같은 날 것)
    await waitFor(() => expect(mockApi.postDaySky).toHaveBeenCalledTimes(1));
    nowSpy.mockReturnValue(Date.parse('2026-11-19T15:30:00Z')); // 한국 11-20 00:30
    mockApi.postDaySky.mockResolvedValue({ ok: true, data: sky('2026-11-20') });
    await act(async () => listener?.('active'));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: sky('2026-11-20') }));
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
    // RN 의 가짜 AppState 처럼 해지 함수를 돌려주는 것으로 되돌린다(mockRestore 는 구현을 비운다)
    spy.mockImplementation(() => ({ remove: jest.fn() }) as unknown as ReturnType<typeof AppState.addEventListener>);
  });

  it('홈 카드와 오늘의 하늘이 함께 열려도 서버에는 한 번만 묻는다', async () => {
    let resolve: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValue(new Promise((r) => (resolve = r)));
    const a = await renderHook(() => useTodaySky(birth));
    const b = await renderHook(() => useTodaySky(birth));
    await waitFor(() => expect(mockApi.postDaySky).toHaveBeenCalledTimes(1));
    await act(async () => resolve({ ok: true, data: sky('2026-11-19') }));
    await waitFor(() => expect(a.result.current.state.status).toBe('done'));
    expect(b.result.current.state.status).toBe('done');
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
  });

  it('서버에 출생 정보가 없으면(404 NO_PROFILE) 저장하고 한 번만 더 부른다', async () => {
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    const { result } = await renderHook(() => useTodaySky(birth));
    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(mockApi.saveProfile).toHaveBeenCalledWith(birth);
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
  });

  it('못 썼으면 실패를 알리고 스스로 다시 부르지 않는다 — 다시 쓰기(retry)를 누르면 부른다', async () => {
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' });
    const { result } = await renderHook(() => useTodaySky(birth));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER', code: 'GENERATION_FAILED', httpStatus: 502 }));
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
  });

  it('쓰는 사이 로그아웃 · 탈퇴로 기기를 지웠으면 끝난 글을 기기에 다시 두지 않는다(세대 표식, 리뷰 #66)', async () => {
    let resolve: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useTodaySky(birth));
    await waitFor(() => expect(mockApi.postDaySky).toHaveBeenCalledTimes(1));
    await act(async () => AsyncStorage.clear());
    await act(async () => resolve({ ok: true, data: sky('2026-11-19') }));
    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(await AsyncStorage.getItem(DAY_SKY_STORAGE_KEY)).toBeNull();
  });

  it('출생 정보를 읽는 중(null)이면 부르지 않는다', async () => {
    const { result } = await renderHook(() => useTodaySky(null));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockApi.postDaySky).not.toHaveBeenCalled();
  });

  describe('다른 화면이 받아 둔 것 · 아침 푸시(리뷰 #66 의 5 · 8)', () => {
    /** AppState 의 "앱으로 돌아옴" 을 시험이 직접 보낸다(화면이 다시 보일 때와 같은 확인) */
    let appState: ((s: AppStateStatus) => void) | null = null;
    let spy: jest.SpyInstance;
    beforeEach(() => {
      appState = null;
      spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, l) => {
        appState = l as (s: AppStateStatus) => void;
        return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
      });
    });
    afterEach(() => spy.mockImplementation(() => ({ remove: jest.fn() }) as unknown as ReturnType<typeof AppState.addEventListener>));

    it('못 썼던 홈 카드는 다시 보일 때 기기를 다시 읽어, 오늘의 하늘 화면이 다시 쓰기로 받아 둔 오늘 것을 그린다 — 서버는 다시 부르지 않는다', async () => {
      mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' });
      const { result } = await renderHook(() => useTodaySky(birth));
      await waitFor(() => expect(result.current.state.status).toBe('failed'));
      await store(sky('2026-11-19'));
      await act(async () => appState?.('active'));
      await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: sky('2026-11-19') }));
      expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
    });

    it('못 썼고 기기에도 없으면 실패 그대로 — 스스로 서버를 부르지 않는다', async () => {
      mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' });
      const { result } = await renderHook(() => useTodaySky(birth));
      await waitFor(() => expect(result.current.state.status).toBe('failed'));
      await act(async () => appState?.('active'));
      expect(result.current.state.status).toBe('failed');
      expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
    });

    it('오늘의 하늘 푸시가 오면: 못 썼거나 지난날 것이면 새로 묻고, 이미 오늘 것이면 부르지 않는다', async () => {
      mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' });
      const { result } = await renderHook(() => useTodaySky(birth));
      await waitFor(() => expect(result.current.state.status).toBe('failed'));
      await act(async () => mockPush?.({ type: 'TODAY_SKY', date: '2026-11-19' }));
      await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: sky('2026-11-19') }));
      expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
      await act(async () => mockPush?.({ type: 'TODAY_SKY', date: '2026-11-19' }));
      // 다른 종류의 푸시는 오늘의 하늘과 상관없다
      await act(async () => mockPush?.({ type: 'READING_DONE' }));
      expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
    });
  });
});
