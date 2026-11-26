import { act, render, screen, waitFor } from '@testing-library/react-native';
import { router, useSegments } from 'expo-router';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import RootLayout, { ErrorBoundary } from '@/app/_layout';
import { strings } from '@/content/strings';
import { recheckSession, useSession } from '@/features/auth/use-session';
import { markHomeReady, resetHomeReady } from '@/features/home/home-ready';
import { useIntroSeen } from '@/features/onboarding/intro-seen';
import { api } from '@/lib/api';

// Stack.Screen 은 받은 화면 옵션을 mockScreen 에 남긴다(약관 글이 아래에서 올라오는지 본다). Stack 은 화면 쌓기 기본 옵션을 mockStack 에
const mockScreen = jest.fn();
const mockStack = jest.fn();
jest.mock('expo-router', () => ({
  Stack: Object.assign((props: { children?: ReactNode }) => {
    mockStack(props);
    return props.children ?? null;
  }, {
    Screen: (props: unknown) => {
      mockScreen(props);
      return null;
    },
  }),
  useSegments: jest.fn(() => []),
  usePathname: () => '/',
  router: { replace: jest.fn(), push: jest.fn(), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
}));
// 글꼴을 받았는지는 시험이 정한다(기본: 받음)
let mockFontsLoaded = true;
jest.mock('@/components/use-app-fonts', () => ({ useAppFonts: () => [mockFontsLoaded, null] }));
// 스플래시가 몇 번 새로 그려졌는지 센다(걷는 때 판단 useSplashDone 은 진짜)
let mockSplashMounts = 0;
jest.mock('@/components/splash-view', () => {
  const actual = jest.requireActual('@/components/splash-view');
  const { useEffect } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    SplashView: () => {
      useEffect(() => {
        mockSplashMounts += 1;
      }, []);
      return <View testID="splash" />;
    },
  };
});
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('@/features/auth/use-session', () => {
  const current = jest.fn(() => ({ status: 'checking' as const, token: null, ready: false, lastError: null }));
  // 정지 알림이 왔을 때 문이 지금 로그인 상태인지 보는 곳(getSession) — 화면이 받는 세션과 같다
  return { useSession: current, getSession: () => current(), recheckSession: jest.fn(async () => {}) };
});
// 이용 정지 문(결정 065 의 5)이 로그인 뒤 계정을 묻는다. lib/api 가 403 · suspended 를 받으면 부르는 알림은 문이 건 것을 잡아 둔다
const mockSuspendedHandler: { current: (() => void) | null } = { current: null };
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    setSuspendedHandler: (handler: (() => void) | null) => {
      mockSuspendedHandler.current = handler;
    },
    api: { ...actual.api, getMyAccount: jest.fn() },
  };
});
jest.mock('@/features/onboarding/intro-seen', () => ({ useIntroSeen: jest.fn(() => true) }));

const mockSegments = useSegments as jest.Mock;
const mockGetMyAccount = api.getMyAccount as jest.Mock;
const myAccount = { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false };
/** 진짜 lib/api 처럼: 정지면 문이 건 알림을 부른 뒤 답한다 */
const accountAnswer = (suspended: boolean) => {
  if (suspended) mockSuspendedHandler.current?.();
  return { ok: true as const, data: { ...myAccount, suspended } };
};
beforeEach(() => mockGetMyAccount.mockImplementation(async () => accountAnswer(false)));

describe('루트 레이아웃의 세션', () => {
  it('공유 페이지(/s/…)에서는 세션을 시작하지 않는다', async () => {
    mockSegments.mockReturnValue(['s', '[shareId]']);
    await render(<RootLayout />);
    expect(useSession).toHaveBeenLastCalledWith(false);
  });

  it('그 밖의 화면에서는 켜질 때 세션을 시작한다', async () => {
    for (const segments of [[], ['reading'], ['synastry', '[id]'], ['settings']]) {
      mockSegments.mockReturnValue(segments);
      const view = await render(<RootLayout />);
      expect(useSession).toHaveBeenLastCalledWith(true);
      await view.unmount();
    }
  });
});

const mockUseSession = useSession as jest.Mock;
const session = (status: 'checking' | 'signedOut' | 'signingUp' | 'signedIn' | 'offline') => ({ status, token: null, ready: status !== 'checking', lastError: null });

describe('로그인 전 가드(결정 034)', () => {
  beforeEach(() => jest.clearAllMocks());
  // 소개를 본 기기로 되돌린다(한 시험이 바꾼 가짜 값이 다음 시험으로 새지 않게)
  afterEach(() => (useIntroSeen as jest.Mock).mockReturnValue(true));

  it('로그인 전에 앱 화면을 열면 로그인 화면으로 보내고 그동안 화면을 가린다', async () => {
    mockSegments.mockReturnValue(['reading']);
    mockUseSession.mockReturnValue(session('signedOut'));
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/login');
    expect(screen.getByTestId('guard-cover')).toBeTruthy();
  });

  it('확인 중에도 가리고, 확인이 끝나 로그인 상태면 가리지 않고 보내지도 않는다', async () => {
    mockSegments.mockReturnValue([]);
    mockUseSession.mockReturnValue(session('checking'));
    const view = await render(<RootLayout />);
    expect(screen.getByTestId('guard-cover')).toBeTruthy();
    mockUseSession.mockReturnValue(session('signedIn'));
    await view.rerender(<RootLayout />);
    expect(screen.queryByTestId('guard-cover')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('로그인 전 · 소개를 아직 안 봤으면 소개로 보내고, 읽는 중에는 가리기만 한다(결정 042)', async () => {
    mockSegments.mockReturnValue([]);
    mockUseSession.mockReturnValue(session('signedOut'));
    (useIntroSeen as jest.Mock).mockReturnValue(null);
    const view = await render(<RootLayout />);
    expect(screen.getByTestId('guard-cover')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
    (useIntroSeen as jest.Mock).mockReturnValue(false);
    await view.rerender(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/intro');
  });

  it('공유 페이지는 세션 없이도 가리지 않는다', async () => {
    mockSegments.mockReturnValue(['s', '[shareId]']);
    mockUseSession.mockReturnValue(session('checking'));
    await render(<RootLayout />);
    expect(screen.queryByTestId('guard-cover')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

// 약관 글 네 화면은 아래에서 올라오는 창(결정 067 의 1). 가입 중 "보기" 와 마이가 같은 화면을 연다
describe('약관 글 화면의 열림', () => {
  beforeEach(() => {
    mockSegments.mockReturnValue([]);
    mockUseSession.mockReturnValue(session('signedIn'));
  });

  it('이용약관 · 처리방침 · 개인정보 수집 · 이용 동의 · 마케팅 수신 동의 약관을 아래에서 올라오게 연다', async () => {
    await render(<RootLayout />);
    await waitFor(() => {
      const options = Object.fromEntries(mockScreen.mock.calls.map(([p]) => [p.name, p.options]));
      for (const name of ['settings/terms', 'settings/privacy', 'settings/privacy-consent', 'settings/marketing']) {
        expect(options[name]).toMatchObject({ animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#0D0E12' } });
      }
    });
  });

  // 소유자 빌드 15 "가입 단계도 그냥 바로 넘어가게 해 줘"(결정 094 — 068 의 7 대체)
  it('가입 닉네임 · 출생 정보 단계도 제 옵션 없이 화면 쌓기 기본(animation none)으로 바로 넘어간다', async () => {
    await render(<RootLayout />);
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    const names = mockScreen.mock.calls.map(([p]) => p.name);
    for (const name of ['signup/nickname', 'signup/birth']) expect(names).not.toContain(name);
  });
});

// 소유자 지적(테스트앱): 아래 탭을 바꾸면 화면이 오른쪽에서 미끄러져 들어왔다(탭이 화면 쌓기의 replace) — iOS 탭 막대처럼 바로
describe('아래 탭의 첫 화면', () => {
  beforeEach(() => {
    mockSegments.mockReturnValue([]);
    mockUseSession.mockReturnValue(session('signedIn'));
  });

  it('홈 · 나 · 시기 · 마이의 첫 화면은 미끄러짐 없이 바로 바뀐다(animation none)', async () => {
    await render(<RootLayout />);
    await waitFor(() => {
      const options = Object.fromEntries(mockScreen.mock.calls.map(([p]) => [p.name, p.options]));
      for (const name of ['index', 'me', 'timing/index', 'my/index']) expect(options[name]).toEqual({ animation: 'none' });
    });
  });

  // 소유자 2026-11-21 "뎁스가 있는 화면으로 넘어갈 때 오른쪽에서 왼쪽으로 오는 애니메이션" · 빌드 15 "아직도 … 안 되게 하라니까"(결정 094)
  it('탭 안에서 들어가는 화면(내 별명 · 내 하늘 지도 · 시기 자세히 · 그날의 하늘 · 마이의 하위 화면 · 알림함 · 오늘의 하늘)도 밀려 들어오지 않고 바로 — 화면 쌓기 기본이 animation none', async () => {
    await render(<RootLayout />);
    await waitFor(() => expect(mockStack).toHaveBeenCalled());
    const last = mockStack.mock.calls[mockStack.mock.calls.length - 1][0] as { screenOptions: unknown };
    expect(last.screenOptions).toMatchObject({ headerShown: false, animation: 'none', contentStyle: { backgroundColor: '#0D0E12' } });
    const names = mockScreen.mock.calls.map(([p]) => p.name);
    for (const name of ['reading', 'chart/index', 'timing/period', 'timing/day', 'my/account', 'my/nickname', 'notifications', 'today']) expect(names).not.toContain(name);
  });
});

// 스플래시(결정 067 의 3): 웹은 앱이 보드 1 모양을 그리고, 앱(iOS · 안드로이드)은 네이티브 스플래시를 같은 때까지 둔다
describe('스플래시', () => {
  const original = Platform.OS;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSegments.mockReturnValue([]);
  });
  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = original;
    (useIntroSeen as jest.Mock).mockReturnValue(true);
  });

  it('웹: 세션 확인 중에는 스플래시를 그리고, 확인이 끝나 보낼 곳에 가도 0.8초가 지나기 전에는 걷지 않는다', async () => {
    Platform.OS = 'web';
    mockUseSession.mockReturnValue(session('checking'));
    const view = await render(<RootLayout />);
    expect(screen.getByTestId('splash')).toBeTruthy();

    // 확인이 끝나 로그인 화면에 왔다(0.5초)
    await act(async () => jest.advanceTimersByTime(500));
    mockSegments.mockReturnValue(['login']);
    mockUseSession.mockReturnValue(session('signedOut'));
    await view.rerender(<RootLayout />);
    expect(screen.getByTestId('splash')).toBeTruthy();

    await act(async () => jest.advanceTimersByTime(300));
    expect(screen.queryByTestId('splash')).toBeNull();
  });

  it('웹: 0.8초가 지나도 세션 · 소개 기록 확인이 끝나지 않았으면 그대로 둔다. 한 번 걷히면 다시 그리지 않는다', async () => {
    Platform.OS = 'web';
    mockUseSession.mockReturnValue(session('signedOut'));
    (useIntroSeen as jest.Mock).mockReturnValue(null);
    const view = await render(<RootLayout />);
    await act(async () => jest.advanceTimersByTime(2000));
    expect(screen.getByTestId('splash')).toBeTruthy();

    (useIntroSeen as jest.Mock).mockReturnValue(true);
    mockSegments.mockReturnValue(['login']);
    await view.rerender(<RootLayout />);
    expect(screen.queryByTestId('splash')).toBeNull();

    // 로그아웃처럼 나중에 다시 확인 중이 되어도 스플래시가 아니라 바탕만 가린다
    mockSegments.mockReturnValue([]);
    mockUseSession.mockReturnValue(session('checking'));
    await view.rerender(<RootLayout />);
    expect(screen.queryByTestId('splash')).toBeNull();
    expect(screen.getByTestId('guard-cover')).toBeTruthy();
  });

  it('웹: 글꼴을 받는 동안과 받은 뒤의 스플래시가 같은 자리라 다시 그려지지 않는다(깜빡임 없음)', async () => {
    Platform.OS = 'web';
    mockSplashMounts = 0;
    mockFontsLoaded = false;
    mockUseSession.mockReturnValue(session('checking'));
    try {
      const view = await render(<RootLayout />);
      expect(screen.getByTestId('splash')).toBeTruthy();
      mockFontsLoaded = true;
      await view.rerender(<RootLayout />);
      expect(screen.getByTestId('splash')).toBeTruthy();
      expect(mockSplashMounts).toBe(1);
    } finally {
      mockFontsLoaded = true;
    }
  });

  // 결정 068 의 2(소유자 "스플래시 → 바로 홈"): 로그인한 홈은 홈의 첫 데이터까지 스플래시를 둔다
  it('웹: 로그인한 홈은 홈의 첫 데이터(기기 읽기 · 되살리기)가 끝날 때까지 스플래시를 둔다', async () => {
    Platform.OS = 'web';
    resetHomeReady();
    mockUseSession.mockReturnValue(session('signedIn'));
    await render(<RootLayout />);
    await act(async () => jest.advanceTimersByTime(2000));
    expect(screen.getByTestId('splash')).toBeTruthy();
    await act(async () => markHomeReady());
    expect(screen.queryByTestId('splash')).toBeNull();
  });

  // 결정 068 의 3(소유자 "안 보이게 해"): 공유 링크는 첫 프레임부터 공유 화면
  it('웹: 공유 페이지에는 스플래시가 아예 없고, 거기서 홈으로 가도 다시 그리지 않는다', async () => {
    Platform.OS = 'web';
    mockSegments.mockReturnValue(['s', '[shareId]']);
    mockUseSession.mockReturnValue(session('checking'));
    const view = await render(<RootLayout />);
    expect(screen.queryByTestId('splash')).toBeNull();
    mockSegments.mockReturnValue([]);
    await view.rerender(<RootLayout />);
    expect(screen.queryByTestId('splash')).toBeNull();
  });

  it('앱: 공유 페이지로 열면 글꼴만 받고 네이티브 스플래시를 걷는다', async () => {
    mockSegments.mockReturnValue(['s', '[shareId]']);
    mockUseSession.mockReturnValue(session('checking'));
    await render(<RootLayout />);
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  // 리뷰 PR #57 제안 5: 웹 스플래시에도 상한(문이 붙잡아도)
  it('웹: 세션 확인이나 문이 10초 넘게 끝나지 않아도 스플래시를 걷는다(최대 대기)', async () => {
    Platform.OS = 'web';
    mockUseSession.mockReturnValue(session('checking'));
    await render(<RootLayout />);
    await act(async () => jest.advanceTimersByTime(9_999));
    expect(screen.getByTestId('splash')).toBeTruthy();
    await act(async () => jest.advanceTimersByTime(1));
    expect(screen.queryByTestId('splash')).toBeNull();
  });

  it('앱: 세션 확인이 5초 넘게 끝나지 않아도 네이티브 스플래시를 걷는다(최대 대기)', async () => {
    mockUseSession.mockReturnValue(session('checking'));
    await render(<RootLayout />);
    await act(async () => jest.advanceTimersByTime(4999));
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it('앱: 앱이 그린 스플래시는 없고, 네이티브 스플래시는 세션 확인이 끝나 보낼 곳에 간 뒤에 걷는다(글꼴만으로는 걷지 않는다)', async () => {
    mockUseSession.mockReturnValue(session('checking'));
    const view = await render(<RootLayout />);
    expect(screen.queryByTestId('splash')).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();

    mockSegments.mockReturnValue(['login']);
    mockUseSession.mockReturnValue(session('signedOut'));
    await view.rerender(<RootLayout />);
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });
});

// 결정 068 의 4: 확인하지 못한 세션(offline)은 30초마다 다시 확인한다(서버가 돌아오면 401 이면 로그인으로)
describe('확인하지 못한 세션', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSegments.mockReturnValue([]);
  });
  afterEach(() => jest.useRealTimers());

  it('offline 이면 가리지 않고 30초마다 다시 확인한다. 아니면 다시 확인하지 않는다', async () => {
    mockUseSession.mockReturnValue(session('offline'));
    const view = await render(<RootLayout />);
    expect(screen.queryByTestId('guard-cover')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(30_000));
    expect(recheckSession).toHaveBeenCalledTimes(1);
    mockUseSession.mockReturnValue(session('signedIn'));
    await view.rerender(<RootLayout />);
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(recheckSession).toHaveBeenCalledTimes(1);
  });
});

// 조각 불러오기 실패(배포가 바뀐 뒤 열려 있던 탭): 루트의 오류 경계가 받는다 — 웹은 한 번 새로 고치고, 고칠 수 없으면 20-1
describe('루트의 오류 경계', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
  });

  it('웹의 조각 실패를 받는다(새로 고칠 저장소가 없으면 20-1)', async () => {
    Platform.OS = 'web';
    const error = Object.assign(new Error('Loading module /_expo/static/js/web/terms-1.js failed.'), { name: 'AsyncRequireError' });
    await render(<ErrorBoundary error={error} retry={jest.fn(async () => {})} />);
    expect(screen.getByText(strings.states.offlineEmpty.title)).toBeTruthy();
  });
});


// 리뷰 PR #46 의 9: 웹에서 스플래시 · 가드 가림막이 덮은 동안 아래 화면들은 누름 · 포커스 · 화면 읽기를 받지 않는다
describe('덮인 동안 아래 화면', () => {
  const original = Platform.OS;
  beforeEach(() => {
    jest.useFakeTimers();
    mockSegments.mockReturnValue(['login']);
  });
  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = original;
  });

  it('웹: 덮은 동안 화면들을 화면 읽기에서 숨기고, 걷히면 돌려놓는다', async () => {
    Platform.OS = 'web';
    mockUseSession.mockReturnValue(session('checking'));
    const view = await render(<RootLayout />);
    expect(screen.getByTestId('screens', { includeHiddenElements: true }).props['aria-hidden']).toBe(true);
    mockUseSession.mockReturnValue(session('signedOut'));
    await view.rerender(<RootLayout />);
    await act(async () => jest.advanceTimersByTime(1000));
    expect(screen.getByTestId('screens').props['aria-hidden']).toBe(false);
  });
});

describe('루트 레이아웃의 이용 정지 문(결정 065 의 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSegments.mockReturnValue([]);
    // 로그인한 홈의 첫 데이터(결정 068 의 2)는 이 묶음 밖 — 끝난 것으로 두고 정지 문만 본다
    markHomeReady();
  });
  afterEach(() => {
    jest.requireActual<typeof import('@/features/auth/suspension')>('@/features/auth/suspension').clearSuspended();
    (useSession as jest.Mock).mockReturnValue(session('checking'));
  });

  it('로그인한 계정이 정지면 답이 오기 전에는 가리고, 정지 알림이 오면 정지 화면(/suspended)으로 보낸다', async () => {
    let answer: () => void = () => {};
    mockGetMyAccount.mockReturnValue(new Promise((resolve) => (answer = () => resolve(accountAnswer(true)))));
    (useSession as jest.Mock).mockReturnValue(session('signedIn'));
    await render(<RootLayout />);
    expect(screen.getByTestId('suspension-cover')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalledWith('/suspended');
    await act(async () => answer());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/suspended'));
  });

  it.each([
    ['로그인 전', ['login'], 'signedOut'],
    ['세션 확인 중', [], 'checking'],
    ['가입 중', ['signup', 'terms'], 'signingUp'],
    ['공유 페이지', ['s', '[shareId]'], 'checking'],
  ] as const)('%s 에는 묻지도 가리지도 않는다', async (_, segments, status) => {
    mockSegments.mockReturnValue([...segments]);
    (useSession as jest.Mock).mockReturnValue(session(status));
    await render(<RootLayout />);
    expect(screen.queryByTestId('suspension-cover')).toBeNull();
    expect(mockGetMyAccount).not.toHaveBeenCalled();
  });

  it('앱: 로그인한 채 켜면 네이티브 스플래시는 정지인지 답이 온 뒤에 걷는다(걷고 나서 빈 바탕이 비치지 않게, 결정 067 의 3)', async () => {
    let answer: () => void = () => {};
    mockGetMyAccount.mockReturnValue(new Promise((resolve) => (answer = () => resolve(accountAnswer(false)))));
    (useSession as jest.Mock).mockReturnValue(session('signedIn'));
    await render(<RootLayout />);
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    await act(async () => answer());
    await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('suspension-cover')).toBeNull();
  });

  it('1.0.0 은 루트에서 음악을 틀지 않는다(결정 069)', async () => {
    (useSession as jest.Mock).mockReturnValue(session('signedIn'));
    await render(<RootLayout />);
    await waitFor(() => expect(mockGetMyAccount).toHaveBeenCalledTimes(1));
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(setAudioModeAsync).not.toHaveBeenCalled();
  });
});

describe('루트 레이아웃의 휴대폰 푸시(결정 057 · 066)', () => {
  const N = Notifications as jest.Mocked<typeof Notifications>;
  beforeEach(() => {
    jest.clearAllMocks();
    mockSegments.mockReturnValue([]);
    markHomeReady();
    N.getLastNotificationResponse.mockReturnValue(null);
  });
  afterEach(() => (useSession as jest.Mock).mockReturnValue(session('checking')));

  it('로그인돼 있으면 켤 때 이 기기 등록을 맞춘다(권한부터 본다) — 로그인 전에는 하지 않는다', async () => {
    (useSession as jest.Mock).mockReturnValue(session('signedOut'));
    mockSegments.mockReturnValue(['login']);
    const view = await render(<RootLayout />);
    await act(async () => {});
    expect(N.getPermissionsAsync).not.toHaveBeenCalled();
    (useSession as jest.Mock).mockReturnValue(session('signedIn'));
    mockSegments.mockReturnValue([]);
    await view.rerender(<RootLayout />);
    await waitFor(() => expect(N.getPermissionsAsync).toHaveBeenCalled());
  });

  it('알림으로 켜면 로그인 · 정지 확인이 끝난 뒤에 그 화면으로 간다', async () => {
    N.getLastNotificationResponse.mockReturnValue({
      actionIdentifier: 'default',
      notification: { request: { identifier: 'n1', content: { data: { type: 'TIMING_REPORT_DONE' } } } },
    } as never);
    let answer: () => void = () => {};
    mockGetMyAccount.mockReturnValue(new Promise((resolve) => (answer = () => resolve(accountAnswer(false)))));
    (useSession as jest.Mock).mockReturnValue(session('signedIn'));
    await render(<RootLayout />);
    await act(async () => {});
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => answer());
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/timing'));
  });
});

