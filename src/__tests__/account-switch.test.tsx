import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { createSessionStore, type SessionStoreDeps } from '@/features/auth/session-store';
import { signOut } from '@/features/auth/sign-out';
import { saveBirth, useBirthProfile } from '@/features/chart/use-birth-profile';
import { forgetAccount, setAccountLocal, useStoredAccount } from '@/lib/account-store';
import type { MyAccount } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({ signOutSession: jest.fn(async () => {}) }));
jest.mock('@/features/push/push', () => ({ unregisterPushDevice: jest.fn(async () => {}) }));
jest.mock('@/features/auth/signup-resume', () => ({ clearResume: jest.fn(async () => {}) }));

const A: MyAccount = { nickname: '앞사람', avatar: 3, email: 'a@x.com', provider: 'KAKAO', marketingConsent: false, suspended: false };
const birthA = { date: '1990-01-01', time: '12:00', place: { id: 1841277, name: '서울특별시 마포구' } };

/** 세션 저장소(로그인 · 401) — 계정 기억 잊기는 진짜(lib/account-store) */
function sessionStore(overrides: Partial<SessionStoreDeps> = {}) {
  const ok = <T,>(data: T) => ({ ok: true as const, data });
  return createSessionStore({
    devSession: false,
    cookieSession: false,
    createDevSession: jest.fn(),
    login: jest.fn(async () => ok({ status: 'SIGNED_IN' as const, token: 'token-B' })),
    signup: jest.fn(),
    checkNickname: jest.fn(),
    getSession: jest.fn(async () => ok(null)),
    logout: jest.fn(async () => ok(null)),
    loadToken: jest.fn(async () => null),
    saveToken: jest.fn(async () => {}),
    deleteToken: jest.fn(async () => {}),
    setApiToken: jest.fn(),
    saveLastProvider: jest.fn(async () => {}),
    loadSignup: jest.fn(async () => null),
    saveSignup: jest.fn(async () => {}),
    clearSignup: jest.fn(async () => {}),
    forgetAccount,
    ...overrides,
  } as SessionStoreDeps);
}

/** 화면이 붙을 때부터 그린 모든 값(첫 그림 포함) */
async function renders() {
  const seen: { nickname: string | null | undefined; birthDate: string | undefined }[] = [];
  const view = await renderHook(() => {
    const account = useStoredAccount();
    const { profile } = useBirthProfile();
    seen.push({ nickname: account === undefined ? undefined : (account?.nickname ?? null), birthDate: profile?.date });
  });
  await act(async () => {});
  return { seen, view };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('같은 기기에서 계정이 바뀔 때 — 앞사람의 이름 · 출생 정보가 다음 사람의 첫 그림에 없다', () => {
  it('A 가 보던 화면 → 로그아웃 → B 로그인 → B 의 첫 그림에 A 의 이름 · 출생 정보가 없다', async () => {
    await setAccountLocal(A);
    await saveBirth({ profile: birthA, chart: fixtures.chart });
    const a = await renders();
    expect(a.seen.at(-1)).toEqual({ nickname: '앞사람', birthDate: '1990-01-01' });
    await a.view.unmount();

    await signOut();
    const store = sessionStore();
    await store.start();
    await store.signIn({ provider: 'APPLE', idToken: 'b' });
    expect(store.getSnapshot().status).toBe('signedIn');

    const b = await renders();
    expect(b.seen.length).toBeGreaterThan(0);
    for (const frame of b.seen) {
      expect(frame.nickname).not.toBe('앞사람');
      expect(frame.birthDate).not.toBe('1990-01-01');
    }
  });

  it('세션이 끝나(401) 기기를 지우지 않은 채 B 가 로그인해도 B 의 첫 그림에 A 의 이름이 없다(로그인이 계정 기억을 잊는다)', async () => {
    await setAccountLocal(A);
    const a = await renders();
    expect(a.seen.at(-1)?.nickname).toBe('앞사람');
    await a.view.unmount();

    const store = sessionStore({
      loadToken: jest.fn(async () => 'token-A'),
      getSession: jest.fn(async () => ({ ok: false as const, error: 'LOGIN_REQUIRED' as const, status: 401 })),
    });
    await store.start();
    expect(store.getSnapshot().status).toBe('signedOut');
    await store.signIn({ provider: 'APPLE', idToken: 'b' });
    expect(store.getSnapshot().status).toBe('signedIn');

    const b = await renders();
    for (const frame of b.seen) expect(frame.nickname).not.toBe('앞사람');
  });
});
