import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { MONTH_SKY_STORAGE_KEY, MONTH_TIMEOUT_MS, useMonth } from '@/features/timing/use-month';
import { api, type ApiResult, type MonthSky } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getMonth: jest.fn(), saveProfile: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const input = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const nov = fixtures.monthSky;
const monthOf = (month: string): MonthSky => ({ ...nov, month, days: [] });

beforeEach(async () => {
  // 이번 달은 기기에 둔다(결정 074) — 시험마다 비운다
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.getMonth.mockImplementation(async (month?: string): Promise<ApiResult<MonthSky>> => ({ ok: true, data: month ? monthOf(month) : nov }));
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
});

afterEach(() => jest.useRealTimers());

describe('useMonth(결정 049 의 2)', () => {
  it('출생 정보를 읽는 중이면 부르지 않는다', async () => {
    const { result } = await renderHook(() => useMonth(null));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockApi.getMonth).not.toHaveBeenCalled();
  });

  it('처음엔 달 없이(서버의 이번 달), 받은 달이 기준이다', async () => {
    const { result } = await renderHook(() => useMonth(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: nov }));
    expect(mockApi.getMonth).toHaveBeenCalledWith(undefined);
    expect(result.current.base).toBe('2026-11');
    expect(result.current.shown).toBe('2026-11');
  });

  it('‹ › 는 기준의 지난달 · 다음 달에서 멈춘다. 넘길 때 그 달을 부르고, 한 번 받은 달은 다시 부르지 않는다', async () => {
    const { result } = await renderHook(() => useMonth(input));
    await waitFor(() => expect(result.current.base).toBe('2026-11'));
    expect([result.current.canPrev, result.current.canNext]).toEqual([true, true]);
    await act(async () => result.current.go(1));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: monthOf('2026-12') }));
    expect(mockApi.getMonth).toHaveBeenLastCalledWith('2026-12');
    expect([result.current.canPrev, result.current.canNext]).toEqual([true, false]);
    await act(async () => result.current.go(1));
    expect(result.current.shown).toBe('2026-12');
    await act(async () => result.current.go(-1));
    await act(async () => result.current.go(-1));
    await waitFor(() => expect(result.current.shown).toBe('2026-10'));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: monthOf('2026-10') }));
    expect([result.current.canPrev, result.current.canNext]).toEqual([false, true]);
    await act(async () => result.current.go(-1));
    expect(result.current.shown).toBe('2026-10');
    await act(async () => result.current.go(1));
    expect(result.current.state).toEqual({ status: 'done', sky: nov });
    expect(mockApi.getMonth.mock.calls.map((c) => c[0])).toEqual([undefined, '2026-12', '2026-10']);
  });

  it('못 받으면 실패, 다시 부르기(retry)로 그 달을 다시 부른다', async () => {
    mockApi.getMonth.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const { result } = await renderHook(() => useMonth(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'NETWORK' }));
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: nov }));
    expect(mockApi.getMonth).toHaveBeenCalledTimes(2);
  });

  it('서버에 출생 정보가 없으면(404) 저장하고 한 번만 더 부른다', async () => {
    mockApi.getMonth.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    const { result } = await renderHook(() => useMonth(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: nov }));
    expect(mockApi.saveProfile).toHaveBeenCalledWith(input);
    expect(mockApi.getMonth).toHaveBeenCalledTimes(2);
  });

  it('10초 넘게 오지 않으면 실패로 둔다', async () => {
    jest.useFakeTimers();
    mockApi.getMonth.mockReturnValueOnce(new Promise(() => {}));
    const { result } = await renderHook(() => useMonth(input));
    await act(async () => void (await jest.advanceTimersByTimeAsync(MONTH_TIMEOUT_MS)));
    expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER' });
  });
});

// 이번 달 달력도 기기에 하나만 두고 다음에 열면 바로 그린다(결정 074 — 049 의 9 대체)
describe('useMonth · 이번 달 보관(결정 074)', () => {
  const key = JSON.stringify([input.date, input.time, input.placeId]);
  const stored = async () => JSON.parse((await AsyncStorage.getItem(MONTH_SKY_STORAGE_KEY)) ?? 'null');
  const store = (sky: MonthSky, k = key) => AsyncStorage.setItem(MONTH_SKY_STORAGE_KEY, JSON.stringify({ key: k, sky }));
  const later = () => {
    let resolve: (r: ApiResult<MonthSky>) => void = () => {};
    mockApi.getMonth.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    return (r: ApiResult<MonthSky>) => act(async () => resolve(r));
  };
  // 기기의 이번 달(한국 날짜)을 시안의 오늘로 둔다
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-11-19T12:00:00+09:00'));
  });

  it('보관 키는 byeolmyeong.monthSky.v1 — 처음 받은 이번 달만 출생 정보 키와 달력 응답 그대로 둔다(‹ › 로 본 달은 두지 않는다)', async () => {
    expect(MONTH_SKY_STORAGE_KEY).toBe('byeolmyeong.monthSky.v1');
    const { result } = await renderHook(() => useMonth(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: nov }));
    await waitFor(async () => expect(await stored()).toEqual({ key, sky: nov }));
    await act(async () => result.current.go(1));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: monthOf('2026-12') }));
    expect(await stored()).toEqual({ key, sky: nov });
  });

  it('다음에 열면 보관본을 바로 그리고(기준 달도), 뒤에서 새로 받으면 바꾸고 다시 둔다', async () => {
    await store(nov);
    const answer = later();
    const { result } = await renderHook(() => useMonth(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: nov }));
    expect(result.current.base).toBe('2026-11');
    expect(mockApi.getMonth).toHaveBeenCalledWith(undefined);
    const fresh: MonthSky = { ...nov, days: nov.days.slice(0, 1) };
    await answer({ ok: true, data: fresh });
    expect(result.current.state).toEqual({ status: 'done', sky: fresh });
    expect(await stored()).toEqual({ key, sky: fresh });
  });

  it('뒤에서 새로 받지 못하면 보관본 그대로(실패로 바꾸지 않는다)', async () => {
    await store(nov);
    const answer = later();
    const { result } = await renderHook(() => useMonth(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', sky: nov }));
    await answer({ ok: false, error: 'NETWORK' });
    expect(result.current.state).toEqual({ status: 'done', sky: nov });
    expect(await stored()).toEqual({ key, sky: nov });
  });

  it('다른 출생 정보의 것 · 지난달 것(달이 바뀌었다)은 쓰지 않고 처음처럼 기다린다', async () => {
    await store(nov, JSON.stringify(['1990-01-01', '09:00', 1]));
    later();
    const other = await renderHook(() => useMonth(input));
    await act(async () => {});
    expect(other.result.current.state).toEqual({ status: 'loading' });
    expect(other.result.current.base).toBeNull();
    await store(monthOf('2026-10'));
    later();
    const old = await renderHook(() => useMonth(input));
    await act(async () => {});
    expect(old.result.current.state).toEqual({ status: 'loading' });
  });

  it('기다리는 사이 기기를 지웠으면(로그아웃 — 세대 표식도 지워진다) 늦게 온 답을 다시 두지 않는다', async () => {
    const answer = later();
    await renderHook(() => useMonth(input));
    await act(async () => {});
    await AsyncStorage.clear();
    await answer({ ok: true, data: nov });
    expect(await AsyncStorage.getItem(MONTH_SKY_STORAGE_KEY)).toBeNull();
  });
});
