import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import BirthStep from '@/app/signup/birth';
import { strings } from '@/content/strings';
import { createSessionStore, type SessionStoreDeps } from '@/features/auth/session-store';
import { clearDraft, setDraft } from '@/features/auth/signup-draft';
import { useAuth } from '@/features/auth/use-session';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), api: { listPlaces: jest.fn(), createChart: jest.fn() } }));

const H = strings.home;
const ok = <T,>(data: T) => ({ ok: true as const, data });
const draft = {
  termsVersion: '2026-11-19',
  privacyVersion: '2026-11-19',
  pushConsent: false,
  marketingConsent: false,
  nickname: '새벽별',
  avatar: 2 as const,
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  clearDraft();
  setDraft(draft);
  (api.listPlaces as jest.Mock).mockResolvedValue({ ok: true, data: fixtures.places });
  (api.createChart as jest.Mock).mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
});

function Stub(name: string) {
  function StubScreen() {
    return <Text>{name}</Text>;
  }
  return StubScreen;
}

/** 실제 라우터에서 약관 → 닉네임 → 출생 정보로 들어와 가입을 마친다(리뷰 A1 재현) */
async function finishSignup(createChart: { ok: boolean }) {
  (api.createChart as jest.Mock).mockResolvedValue(createChart.ok ? { ok: true, data: fixtures.chartTimeUnknown } : { ok: false, error: 'NETWORK' });
  const completeSignup = jest.fn(async () => ok({ token: 't' }));
  (useAuth as jest.Mock).mockReturnValue({ status: 'signingUp', lastError: null, completeSignup });
  await renderRouter(
    {
      index: Stub('home'),
      login: Stub('login'),
      'signup/terms': Stub('terms'),
      'signup/nickname': Stub('nickname'),
      'signup/birth': BirthStep,
      reading: Stub('reading'),
    },
    { initialUrl: '/signup/terms' },
  );
  await act(async () => router.push('/signup/nickname'));
  await act(async () => router.push('/signup/birth'));
  await fireEvent.changeText(await screen.findByLabelText(H.dateLabel), '19990308');
  await fireEvent.press(screen.getByRole('checkbox', { name: H.timeUnknown }));
  await fireEvent.press(screen.getByRole('button', { name: H.submit }));
  return completeSignup;
}

// 리뷰 A1: 가입을 마친 뒤 뒤로 가기로 약관 · 닉네임 단계에 돌아가 누르면 방금 가입한 사람이 로그아웃되던 것
describe('가입을 마친 뒤의 스택', () => {
  it('성공하면 스택을 비우고 풀이 글로 — 뒤로 가도 가입 단계가 없다', async () => {
    await finishSignup({ ok: true });
    await waitFor(() => expect(screen).toHavePathname('/reading'));
    expect(router.canGoBack()).toBe(false);
  });

  it('차트를 받지 못해 홈으로 갈 때도 스택을 비운다', async () => {
    await finishSignup({ ok: false });
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(router.canGoBack()).toBe(false);
  });
});

function setupStore(over: Partial<SessionStoreDeps> = {}) {
  let kept: string | null = null;
  const deps = {
    devSession: false,
    cookieSession: false,
    createDevSession: jest.fn(async () => ok({ token: 'dev' as string | null })),
    login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })),
    signup: jest.fn(async () => ok({ token: 'new-session' as string | null })),
    checkNickname: jest.fn(async () => ok({ available: true })),
    getSession: jest.fn(async () => ok(null)),
    logout: jest.fn(async () => ok(null)),
    loadToken: jest.fn(async () => kept),
    saveToken: jest.fn(async (t: string) => {
      kept = t;
    }),
    deleteToken: jest.fn(async () => {
      kept = null;
    }),
    setApiToken: jest.fn(),
    saveLastProvider: jest.fn(async () => {}),
    loadSignup: jest.fn(async () => null),
    saveSignup: jest.fn(async () => {}),
    clearSignup: jest.fn(async () => {}),
    clearDeviceData: jest.fn(async () => {}),
    ...over,
  } satisfies SessionStoreDeps;
  return { deps, store: createSessionStore(deps), kept: () => kept };
}
const input = { birth: { date: '1995-05-05', time: null, placeId: null }, ...draft };

describe('가입을 마친 뒤의 세션', () => {
  it('닉네임 확인(남은 닉네임 단계의 "다음")은 아무것도 하지 않는다 — 로그인 상태 · 토큰 그대로', async () => {
    const { deps, store, kept } = setupStore();
    await store.start();
    await store.signIn({ provider: 'GOOGLE', idToken: 'g' });
    await store.completeSignup(input);
    await store.checkNickname('새벽별');
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn' });
    expect(kept()).toBe('new-session');
    expect(deps.checkNickname).not.toHaveBeenCalled();
  });

  it('가입 그만두기(남은 약관 단계의 뒤로)도 아무것도 하지 않는다', async () => {
    const { store, kept } = setupStore();
    await store.start();
    await store.signIn({ provider: 'GOOGLE', idToken: 'g' });
    await store.completeSignup(input);
    await store.cancelSignup();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn' });
    expect(kept()).toBe('new-session');
  });

  it('같은 가입을 두 번 보내도(두 번 누르기) 서버에는 한 번 — 진행 중인 요청을 함께 쓴다(리뷰 A9)', async () => {
    let resolve: (v: unknown) => void = () => {};
    const signup = jest.fn(() => new Promise((r) => (resolve = r)));
    const { store, kept } = setupStore({ signup: signup as unknown as SessionStoreDeps['signup'] });
    await store.start();
    await store.signIn({ provider: 'GOOGLE', idToken: 'g' });
    const first = store.completeSignup(input);
    const second = store.completeSignup(input);
    expect(signup).toHaveBeenCalledTimes(1);
    resolve(ok({ token: 'new-session' }));
    expect(await first).toEqual(await second);
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn' });
    expect(kept()).toBe('new-session');
  });
});
