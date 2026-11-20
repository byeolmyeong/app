import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { DAY_SKY_STORAGE_KEY, useTodaySky } from '@/features/timing/use-today-sky';
import { api, type BirthInput, type DaySky } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
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
  it('기기에 둔 오늘 것이 있으면 그것을 그리고 서버를 부르지 않는다', async () => {
    await store(sky('2026-11-19'));
    const { result } = await renderHook(() => useTodaySky(birth));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: sky('2026-11-19') }));
    expect(mockApi.postDaySky).not.toHaveBeenCalled();
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
    expect(mockApi.postDaySky).not.toHaveBeenCalled();
    nowSpy.mockReturnValue(Date.parse('2026-11-19T15:30:00Z')); // 한국 11-20 00:30
    mockApi.postDaySky.mockResolvedValue({ ok: true, data: sky('2026-11-20') });
    await act(async () => listener?.('active'));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: sky('2026-11-20') }));
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
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

  it('출생 정보를 읽는 중(null)이면 부르지 않는다', async () => {
    const { result } = await renderHook(() => useTodaySky(null));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockApi.postDaySky).not.toHaveBeenCalled();
  });
});
