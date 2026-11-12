import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFutureDirection } from '@/features/direction/use-future-direction';
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
const direction = fixtures.directionFuture;
const ok: ApiResult<Direction> = { ok: true, data: direction };
const noProfile: ApiResult<Direction> = { ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' };
const failed: ApiResult<Direction> = { ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.createDirection.mockResolvedValue(ok);
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
});

describe('useFutureDirection', () => {
  it('기다리는 중이다가 글을 받으면 완료가 되고, 미래 주제로 한 번만 부른다', async () => {
    let resolve: (r: ApiResult<Direction>) => void = () => {};
    mockApi.createDirection.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useFutureDirection(input));
    expect(result.current.state).toEqual({ status: 'loading' });
    await act(async () => resolve(ok));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', direction }));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
    expect(mockApi.createDirection).toHaveBeenCalledWith('FUTURE');
    expect(mockApi.saveProfile).not.toHaveBeenCalled();
  });

  it('출생 정보가 아직 없으면(세션 · 기기를 읽는 중) 서버를 부르지 않는다', async () => {
    const { result } = await renderHook(() => useFutureDirection(null));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockApi.createDirection).not.toHaveBeenCalled();
  });

  it('받은 글을 기기에 두지 않는다. 다시 열면 다시 불러 그때 서버가 준 글을 보여 준다(지난 날의 글을 다시 쓰지 않는다)', async () => {
    const first = await renderHook(() => useFutureDirection(input));
    await waitFor(() => expect(first.result.current.state).toEqual({ status: 'done', direction }));
    await first.unmount();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    // 시기가 바뀐 날: 같은 요청에 서버가 새 글을 준다
    const next = { ...direction, title: '새 시기의 글' };
    mockApi.createDirection.mockResolvedValue({ ok: true, data: next });
    const second = await renderHook(() => useFutureDirection({ ...input }));
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'done', direction: next }));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('생성에 실패하면(502) 스스로 다시 부르지 않는다. 다시 시도를 누르면 한 번 더 부른다', async () => {
    mockApi.createDirection.mockResolvedValueOnce(failed);
    const { result } = await renderHook(() => useFutureDirection(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER' }));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
    expect(mockApi.saveProfile).not.toHaveBeenCalled();
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
    const { result } = await renderHook(() => useFutureDirection(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', direction }));
    expect(mockApi.saveProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.saveProfile).toHaveBeenCalledWith(input);
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
  });

  it('저장한 뒤에도 404 이면 거기서 멈추고, 저장에 실패하면 다시 요청하지 않는다', async () => {
    mockApi.createDirection.mockResolvedValue(noProfile);
    const first = await renderHook(() => useFutureDirection(input));
    await waitFor(() => expect(first.result.current.state).toEqual({ status: 'failed', error: 'SERVER' }));
    expect(mockApi.saveProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
    await first.unmount();
    mockApi.saveProfile.mockResolvedValue({ ok: false, error: 'NETWORK' });
    const second = await renderHook(() => useFutureDirection(input));
    await waitFor(() => expect(second.result.current.state.status).toBe('failed'));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(3);
  });

  it('같은 출생 정보의 요청이 진행 중이면 겹쳐 부르지 않는다(탭을 빠르게 오갈 때)', async () => {
    let resolve: (r: ApiResult<Direction>) => void = () => {};
    mockApi.createDirection.mockReturnValue(new Promise((r) => (resolve = r)));
    const a = await renderHook(() => useFutureDirection(input));
    await a.unmount();
    const b = await renderHook(() => useFutureDirection(input));
    await act(async () => resolve(ok));
    await waitFor(() => expect(b.result.current.state.status).toBe('done'));
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
  });
});
