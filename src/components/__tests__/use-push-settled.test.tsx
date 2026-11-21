import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { PUSH_SETTLE_FALLBACK_MS, usePushSettled } from '@/components/use-push-settled';

type Listener = (e: { data?: { closing: boolean } }) => void;
const listeners: Listener[] = [];
const mockNavigation = {
  addListener: jest.fn((type: string, cb: Listener) => {
    if (type === 'transitionEnd') listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  }),
};
jest.mock('expo-router', () => ({ useNavigation: () => mockNavigation }));

const emit = (closing: boolean) => act(async () => [...listeners].forEach((cb) => cb({ data: { closing } })));

beforeEach(() => {
  listeners.length = 0;
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePushSettled — 밀기가 끝났는가(무거운 그림을 밀기 뒤로)', () => {
  it('처음에는 거짓, 들어오는 밀기가 끝나면(transitionEnd closing: false) 참', async () => {
    const { result } = await renderHook(() => usePushSettled());
    expect(result.current).toBe(false);
    await emit(false);
    expect(result.current).toBe(true);
  });

  it('나가는 밀기의 끝(closing: true)으로는 바뀌지 않는다', async () => {
    const { result } = await renderHook(() => usePushSettled());
    await emit(true);
    expect(result.current).toBe(false);
  });

  it('밀기 끝을 듣지 못해도(첫 화면 · 이벤트 없음) 잠시 뒤에는 참', async () => {
    const { result } = await renderHook(() => usePushSettled());
    await act(() => jest.advanceTimersByTime(PUSH_SETTLE_FALLBACK_MS - 1));
    expect(result.current).toBe(false);
    await act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it('참이 된 뒤에는 더 듣지 않고 거짓으로 돌아가지 않는다', async () => {
    const { result } = await renderHook(() => usePushSettled());
    await emit(false);
    expect(listeners).toHaveLength(0);
    await act(() => jest.advanceTimersByTime(PUSH_SETTLE_FALLBACK_MS));
    expect(result.current).toBe(true);
  });

  it('웹은 밀기 움직임이 없다 — 첫 프레임 다음 프레임에 참, 이벤트는 듣지 않는다', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const { result } = await renderHook(() => usePushSettled());
    expect(result.current).toBe(false);
    expect(mockNavigation.addListener).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(20));
    expect(result.current).toBe(true);
    jest.restoreAllMocks();
  });
});
