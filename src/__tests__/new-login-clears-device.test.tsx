import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import { LAST_PROVIDER_KEY } from '@/features/auth/last-provider';
import { clearDeviceData } from '@/features/auth/delete-account';
import { createSessionStore, type Session, type SessionStoreDeps } from '@/features/auth/session-store';
import { BIRTH_STORAGE_KEY, loadBirth, saveBirth } from '@/features/chart/use-birth-profile';
import { resetHomeReady } from '@/features/home/home-ready';
import { INTRO_SEEN_KEY } from '@/features/onboarding/intro-seen';
import { DAY_SKY_STORAGE_KEY } from '@/features/timing/use-today-sky';
import { api, type ApiResult, type BirthInput, type SessionInfo } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

// 리뷰(개인정보): 세션 만료(401 → 로그인 전) 뒤 같은 기기에서 다른 계정이 로그인하면 앞사람의 출생 정보 · 풀이가 기기에 남아
// 홈이 서버에서 되살리지 않고 B 가 A 의 것을 봤다. 새 로그인(로그인 · 가입 완료)은 로그인 상태가 되기 전에 기기의 사람 것을 비운다

const mockSession: { current: Session } = {
  current: { status: 'signedIn' as const, token: 'tB', ready: true, lastError: null },
};

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  Stack: { Screen: () => null },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    getProfile: jest.fn(),
    createChart: jest.fn(),
    listPlaces: jest.fn(),
    saveProfile: jest.fn(),
    deleteAccount: jest.fn(),
    getMyAccount: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getTimingReport: jest.fn(async () => ({ ok: true, data: { status: 'NONE' } })),
    getNotifications: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    postDaySky: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getMonth: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getMeReport: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => mockSession.current),
  getSession: jest.fn(() => mockSession.current),
  clearSession: jest.fn(async () => {}),
  recheckSession: jest.fn(async () => {}),
}));

const mockApi = api as jest.Mocked<typeof api>;
const ok = <T,>(data: T) => ({ ok: true as const, data });
const unauthorized = { ok: false as const, error: 'LOGIN_REQUIRED' as const, status: 401 };
const birthA = { profile: { date: '1990-01-01', time: null, place: null }, chart: fixtures.chartTimeUnknown };
const birthB: BirthInput = { date: '2001-02-03', time: null, placeId: null };

/** 앞사람(A)이 기기에 남긴 것 + 사람과 무관한 기기 설정 */
async function leaveA() {
  await saveBirth(birthA);
  await AsyncStorage.setItem(DAY_SKY_STORAGE_KEY, '{"a":"앞사람의 하늘"}');
  await AsyncStorage.setItem(LAST_PROVIDER_KEY, 'KAKAO');
  await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
}
const hasA = async () => (await AsyncStorage.getItem(BIRTH_STORAGE_KEY)) !== null || (await AsyncStorage.getItem(DAY_SKY_STORAGE_KEY)) !== null;

function setupStore(over: Partial<SessionStoreDeps> = {}) {
  let kept: string | null = 'tA';
  const deps = {
    devSession: false,
    cookieSession: false,
    createDevSession: jest.fn(async () => ok({ token: 'dev' as string | null })),
    login: jest.fn(async () => ok({ status: 'SIGNED_IN' as const, token: 'tB' as string | null })),
    signup: jest.fn(async () => ok({ token: 'tB' as string | null })),
    checkNickname: jest.fn(async () => ok({ available: true })),
    getSession: jest.fn(async (): Promise<ApiResult<SessionInfo>> => ok({ analyticsId: null })),
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
    clearDeviceData,
    ...over,
  } satisfies SessionStoreDeps;
  const store = createSessionStore(deps);
  /** 로그인 상태가 되는 순간 기기에 A 의 것이 있었는가 */
  const atSignedIn: Promise<boolean>[] = [];
  store.subscribe(() => {
    if (store.getSnapshot().status === 'signedIn') atSignedIn.push(hasA());
  });
  return { deps, store, atSignedIn };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  resetHomeReady();
  mockApi.getProfile.mockResolvedValue({ ok: true, data: birthB });
  mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
});

describe('새 로그인은 앞사람이 기기에 남긴 것을 비운다', () => {
  it('A 세션 만료(401) 뒤 B 로그인: 로그인 상태가 되기 전에 A 의 출생 정보 · 하늘이 없다, 기기 설정(최근 로그인 · 소개 봄)은 남는다 → 홈이 B 를 되살린다', async () => {
    await leaveA();
    const { store, atSignedIn } = setupStore();
    await store.start();
    // 켤 때 살아 있는 세션을 확인하는 길은 비우지 않는다
    expect(await hasA()).toBe(true);
    await store.refresh();
    expect(store.getSnapshot().status).toBe('signedOut');
    // 만료 전에 남았던 것 · 늦게 온 답이 다시 써 넣은 것도 로그인이 비운다
    await leaveA();
    atSignedIn.length = 0;

    await store.signIn({ provider: 'APPLE', idToken: 'b' });
    expect(store.getSnapshot().status).toBe('signedIn');
    expect(await Promise.all(atSignedIn)).toEqual([false]);
    expect(await AsyncStorage.getItem(LAST_PROVIDER_KEY)).toBe('KAKAO');
    expect(await AsyncStorage.getItem(INTRO_SEEN_KEY)).toBe('1');

    // 홈은 기기가 비었으니 서버에서 B 의 출생 정보를 되살린다(결정 029)
    await render(<HomeScreen />);
    expect(await screen.findByTestId('nickname-card')).toBeTruthy();
    expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
    expect((await loadBirth())?.profile.date).toBe(birthB.date);
  });

  it('A 세션 만료 뒤 B 가 가입을 마치면: 로그인 상태가 되기 전에 A 의 것이 없고, 가입 직후 둔 B 의 출생 정보는 지우지 않는다', async () => {
    await leaveA();
    const { store, atSignedIn } = setupStore({
      login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })) as SessionStoreDeps['login'],
    });
    await store.start();
    await store.refresh();
    await leaveA();
    atSignedIn.length = 0;

    expect(await store.signIn({ provider: 'GOOGLE', idToken: 'b' })).toBe('signingUp');
    const r = await store.completeSignup({
      birth: birthB,
      nickname: '다음사람',
      avatar: 2,
      termsVersion: 't',
      privacyVersion: 'p',
      pushConsent: false,
      marketingConsent: false,
    });
    expect(r.ok).toBe(true);
    expect(await Promise.all(atSignedIn)).toEqual([false]);
    // 가입 화면(/signup/birth)은 가입을 마친 뒤 차트를 받아 B 의 출생 정보를 둔다 — 그 뒤에 지우지 않는다
    await saveBirth({ profile: { date: birthB.date, time: null, place: null }, chart: fixtures.chartTimeUnknown });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await loadBirth())?.profile.date).toBe(birthB.date);
  });
});

// 401 로 로그인 전이 될 때도 비운다: 다음 로그인이 어차피 비우니(같은 사람이 다시 들어와도 되살리기 한 번은 같다) 그 사이 기기에 남기지 않는다
describe('401 로 로그인 전이 되면 기기의 사람 것도 비운다', () => {
  it('쓰는 중의 401(refresh)', async () => {
    await leaveA();
    const { store } = setupStore();
    await store.start();
    await store.refresh();
    expect(store.getSnapshot().status).toBe('signedOut');
    expect(await hasA()).toBe(false);
    expect(await AsyncStorage.getItem(LAST_PROVIDER_KEY)).toBe('KAKAO');
  });

  it('앱을 켤 때 보관한 토큰이 401', async () => {
    await leaveA();
    const { store } = setupStore({ getSession: jest.fn(async () => unauthorized) });
    await store.start();
    expect(store.getSnapshot().status).toBe('signedOut');
    expect(await hasA()).toBe(false);
  });

  it('웹을 켤 때 쿠키 세션이 401(이어 할 가입이 없음) · 닿지 못했다가 다시 확인이 401', async () => {
    await leaveA();
    const web = setupStore({ cookieSession: true, getSession: jest.fn(async () => unauthorized) });
    await web.store.start();
    expect(web.store.getSnapshot().status).toBe('signedOut');
    expect(await hasA()).toBe(false);

    await leaveA();
    const getSession = jest.fn(async (): Promise<ApiResult<SessionInfo>> => ({ ok: false, error: 'NETWORK' }));
    const offline = setupStore({ cookieSession: true, getSession });
    await offline.store.start();
    expect(offline.store.getSnapshot().status).toBe('offline');
    // 확인하지 못한 동안은 비우지 않는다(로그인했다고도 안 했다고도 정하지 않는다, 결정 068 의 4)
    expect(await hasA()).toBe(true);
    getSession.mockResolvedValue(unauthorized);
    await offline.store.recheck();
    expect(offline.store.getSnapshot().status).toBe('signedOut');
    expect(await hasA()).toBe(false);
  });

  it('켤 때의 확인 중에 온 401 은 start 가 판정한다 — 살아 있으면 비우지 않는다', async () => {
    await leaveA();
    const { store } = setupStore();
    expect(await store.refresh()).toBe(false);
    await store.start();
    expect(store.getSnapshot().status).toBe('signedIn');
    expect(await hasA()).toBe(true);
  });
});
