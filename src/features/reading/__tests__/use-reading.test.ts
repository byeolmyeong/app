import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { READING_STORAGE_KEY, useReading } from '@/features/reading/use-reading';
import { api, type ApiResult, type Reading } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createReading: jest.fn(), saveProfile: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const input = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const ok: ApiResult<Reading> = { ok: true, data: fixtures.reading };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.createReading.mockResolvedValue(ok);
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
});

describe('useReading', () => {
  it('생성 중이다가 글을 받으면 완료가 된다', async () => {
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useReading(input));
    expect(result.current.state).toEqual({ status: 'loading' });
    await act(async () => resolve(ok));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', reading: fixtures.reading }));
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
    expect(mockApi.saveProfile).not.toHaveBeenCalled();
  });

  it('출생 정보가 아직 없으면 서버를 부르지 않고 기다린다', async () => {
    const { result } = await renderHook(() => useReading(null));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockApi.createReading).not.toHaveBeenCalled();
  });

  it('받은 글을 기기에 두어, 같은 출생 정보로 다시 열면 서버를 부르지 않는다', async () => {
    const first = await renderHook(() => useReading(input));
    await waitFor(() => expect(first.result.current.state.status).toBe('done'));
    await first.unmount();
    const second = await renderHook(() => useReading({ ...input }));
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'done', reading: fixtures.reading }));
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
  });

  it('출생 정보가 달라지면 보관된 글을 쓰지 않고 새로 받는다', async () => {
    const first = await renderHook(() => useReading(input));
    await waitFor(() => expect(first.result.current.state.status).toBe('done'));
    await first.unmount();
    const other = { ...fixtures.reading, headline: '다른 사람의 글' };
    mockApi.createReading.mockResolvedValue({ ok: true, data: other });
    const second = await renderHook(() => useReading({ ...input, time: null }));
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'done', reading: other }));
    expect(mockApi.createReading).toHaveBeenCalledTimes(2);
  });

  it('보관된 값이 깨졌으면 버리고 새로 받는다', async () => {
    await AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ input, reading: { headline: 1 } }));
    const { result } = await renderHook(() => useReading(input));
    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
  });

  it('실패하면 스스로 다시 부르지 않고, 실패한 것은 보관하지 않는다', async () => {
    mockApi.createReading.mockResolvedValue({ ok: false, error: 'SERVER', status: 502 });
    const { result } = await renderHook(() => useReading(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER' }));
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(READING_STORAGE_KEY)).toBeNull();
  });

  it('다시 시도를 누르면 생성 중으로 돌아가 한 번 더 부른다', async () => {
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const { result } = await renderHook(() => useReading(input));
    await waitFor(() => expect(result.current.state.status).toBe('failed'));
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await act(async () => result.current.retry());
    expect(result.current.state).toEqual({ status: 'loading' });
    await act(async () => resolve(ok));
    expect(result.current.state).toEqual({ status: 'done', reading: fixtures.reading });
    expect(mockApi.createReading).toHaveBeenCalledTimes(2);
  });

  it('서버에 출생 정보가 없다고 하면(404) 저장한 뒤 한 번만 더 요청한다', async () => {
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404 });
    const { result } = await renderHook(() => useReading(input));
    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(mockApi.saveProfile).toHaveBeenCalledWith(input);
    expect(mockApi.createReading).toHaveBeenCalledTimes(2);
  });

  it('저장한 뒤에도 404 이면 거기서 멈춘다', async () => {
    mockApi.createReading.mockResolvedValue({ ok: false, error: 'SERVER', status: 404 });
    const { result } = await renderHook(() => useReading(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER' }));
    expect(mockApi.saveProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.createReading).toHaveBeenCalledTimes(2);
  });

  it('같은 출생 정보의 요청이 진행 중이면 겹쳐 부르지 않는다', async () => {
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    const a = await renderHook(() => useReading(input));
    const b = await renderHook(() => useReading(input));
    await act(async () => {});
    await act(async () => resolve(ok));
    await waitFor(() => expect(a.result.current.state.status).toBe('done'));
    await waitFor(() => expect(b.result.current.state.status).toBe('done'));
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
  });
});
