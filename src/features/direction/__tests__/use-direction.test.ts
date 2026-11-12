import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { DIRECTION_STORAGE_KEY, useDirection } from '@/features/direction/use-direction';
import { api, type ApiResult, type Direction } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createDirection: jest.fn(), saveProfile: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const input = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const direction = fixtures.direction;
const ok: ApiResult<Direction> = { ok: true, data: direction };
const noProfile: ApiResult<Direction> = { ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' };
const failed: ApiResult<Direction> = { ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.createDirection.mockResolvedValue(ok);
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
});

describe('useDirection', () => {
  it('기다리는 중이다가 글을 받으면 완료가 되고, 이성 주제로 한 번만 부른다', async () => {
    let resolve: (r: ApiResult<Direction>) => void = () => {};
    mockApi.createDirection.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useDirection(input, true));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'loading' }));
    await act(async () => resolve(ok));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', direction }));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
    expect(mockApi.createDirection).toHaveBeenCalledWith('LOVE');
    expect(mockApi.saveProfile).not.toHaveBeenCalled();
  });

  it('출생 정보가 아직 없거나 세션이 준비되지 않았으면 서버를 부르지 않는다', async () => {
    const none = await renderHook(() => useDirection(null, true));
    await act(async () => {});
    expect(none.result.current.state).toEqual({ status: 'checking' });
    const noSession = await renderHook(() => useDirection(input, false));
    await waitFor(() => expect(noSession.result.current.state).toEqual({ status: 'loading' }));
    expect(mockApi.createDirection).not.toHaveBeenCalled();
  });

  it('받은 글을 요약 해석과 같은 모양의 키로 기기에 두어, 다시 열면 서버를 부르지 않는다(세션이 없어도 보여 준다)', async () => {
    const first = await renderHook(() => useDirection(input, true));
    await waitFor(() => expect(first.result.current.state.status).toBe('done'));
    await first.unmount();
    const stored = JSON.parse((await AsyncStorage.getItem(DIRECTION_STORAGE_KEY)) as string);
    expect(stored).toEqual({ key: JSON.stringify(['2000-06-15', '21:00', 1841277]), direction });
    const second = await renderHook(() => useDirection({ ...input }, false));
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'done', direction }));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
  });

  it('출생 정보가 달라지면 보관된 글을 쓰지 않고 새로 받는다', async () => {
    const first = await renderHook(() => useDirection(input, true));
    await waitFor(() => expect(first.result.current.state.status).toBe('done'));
    await first.unmount();
    const other = { ...direction, title: '다른 차트의 글' };
    mockApi.createDirection.mockResolvedValue({ ok: true, data: other });
    const second = await renderHook(() => useDirection({ date: '2000-06-15', time: null, placeId: null }, true));
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'done', direction: other }));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
  });

  it('보관된 값이 계약과 다른 모양이면(항목 2개) 버리고 새로 받는다', async () => {
    const key = JSON.stringify([input.date, input.time, input.placeId]);
    const broken = { ...direction, items: direction.items.slice(0, 2) };
    await AsyncStorage.setItem(DIRECTION_STORAGE_KEY, JSON.stringify({ key, direction: broken }));
    const { result } = await renderHook(() => useDirection(input, true));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', direction }));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
  });

  it('생성에 실패하면(502) 스스로 다시 부르지 않고 보관하지 않는다. 다시 시도를 누르면 한 번 더 부른다', async () => {
    mockApi.createDirection.mockResolvedValueOnce(failed);
    const { result } = await renderHook(() => useDirection(input, true));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER' }));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
    expect(mockApi.saveProfile).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(DIRECTION_STORAGE_KEY)).toBeNull();
    let resolve: (r: ApiResult<Direction>) => void = () => {};
    mockApi.createDirection.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await act(async () => result.current.retry());
    expect(result.current.state).toEqual({ status: 'loading' });
    await act(async () => resolve(ok));
    expect(result.current.state).toEqual({ status: 'done', direction });
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
  });

  it('서버에 출생 정보가 없다고 하면(404 NO_PROFILE) 저장한 뒤 한 번만 더 요청한다', async () => {
    mockApi.createDirection.mockResolvedValueOnce(noProfile);
    const { result } = await renderHook(() => useDirection(input, true));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', direction }));
    expect(mockApi.saveProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.saveProfile).toHaveBeenCalledWith(input);
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
  });

  it('저장한 뒤에도 404 이면 거기서 멈추고, 저장에 실패하면 다시 요청하지 않는다', async () => {
    mockApi.createDirection.mockResolvedValue(noProfile);
    const first = await renderHook(() => useDirection(input, true));
    await waitFor(() => expect(first.result.current.state).toEqual({ status: 'failed', error: 'SERVER' }));
    expect(mockApi.saveProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
    await first.unmount();
    mockApi.saveProfile.mockResolvedValue({ ok: false, error: 'NETWORK' });
    const second = await renderHook(() => useDirection(input, true));
    await waitFor(() => expect(second.result.current.state.status).toBe('failed'));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(3);
  });

  it('같은 출생 정보의 요청이 진행 중이면 겹쳐 부르지 않는다', async () => {
    let resolve: (r: ApiResult<Direction>) => void = () => {};
    mockApi.createDirection.mockReturnValue(new Promise((r) => (resolve = r)));
    const a = await renderHook(() => useDirection(input, true));
    const b = await renderHook(() => useDirection(input, true));
    await waitFor(() => expect(b.result.current.state.status).toBe('loading'));
    await act(async () => resolve(ok));
    await waitFor(() => expect(a.result.current.state.status).toBe('done'));
    await waitFor(() => expect(b.result.current.state.status).toBe('done'));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
  });
});
