import { renderHook, waitFor } from '@testing-library/react-native';

import { getSession, useSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn() }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createDevSession: jest.fn() },
}));

describe('useSession', () => {
  it('EXPO_PUBLIC_DEV_SESSION 이 없고 보관된 토큰도 없으면 /auth/dev 를 부르지 않고 로그인 전으로 준비된다', async () => {
    expect(process.env.EXPO_PUBLIC_DEV_SESSION).toBeUndefined();
    const { result } = await renderHook(() => useSession());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.token).toBeNull();
    expect(getSession()).toMatchObject({ status: 'signedOut', token: null, ready: true });
    expect(api.createDevSession).not.toHaveBeenCalled();
  });
});
