import { act, renderHook, waitFor } from '@testing-library/react-native';

import { MONTH_TIMEOUT_MS, useMonth } from '@/features/timing/use-month';
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

beforeEach(() => {
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
