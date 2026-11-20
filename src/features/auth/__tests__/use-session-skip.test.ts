import { renderHook, waitFor } from '@testing-library/react-native';

import { useSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn() }));
// 세션은 최근 로그인(결정 044)을 기기 저장소에 적는다
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => {
  // use-session 은 읽힐 때 환경 변수를 본다. 이 모듈이 그보다 먼저 읽히므로 여기서 개발용 세션을 켠다.
  process.env.EXPO_PUBLIC_DEV_SESSION = '1';
  return {
    ...jest.requireActual('@/lib/api'),
    api: { createDevSession: jest.fn(async () => ({ ok: true, data: { token: 'dev-token' } })) },
  };
});

afterAll(() => {
  delete process.env.EXPO_PUBLIC_DEV_SESSION;
});

describe('useSession(false): 세션을 시작하지 않는다(공유 페이지)', () => {
  it('개발용 세션이 켜져 있어도 /auth/dev 를 부르지 않고, 켜는 순간에 시작한다', async () => {
    const { result, rerender } = await renderHook(({ start }: { start: boolean }) => useSession(start), {
      initialProps: { start: false },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(api.createDevSession).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ status: 'checking', token: null, ready: false });

    await rerender({ start: true });
    await waitFor(() => expect(result.current).toMatchObject({ status: 'signedIn', token: 'dev-token', ready: true }));
    expect(api.createDevSession).toHaveBeenCalledTimes(1);
  });
});
