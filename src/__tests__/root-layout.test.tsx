import { act, render, screen, waitFor } from '@testing-library/react-native';
import { router, useSegments } from 'expo-router';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import RootLayout from '@/app/_layout';
import { useSession } from '@/features/auth/use-session';
import { useIntroSeen } from '@/features/onboarding/intro-seen';
import { api } from '@/lib/api';

// Stack.Screen 은 받은 화면 옵션을 mockScreen 에 남긴다(약관 글이 아래에서 올라오는지 본다)
const mockScreen = jest.fn();
jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }: { children?: ReactNode }) => children ?? null, {
    Screen: (props: unknown) => {
      mockScreen(props);
      return null;
    },
  }),
  useSegments: jest.fn(() => []),
  router: { replace: jest.fn(), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
}));
// 글꼴을 받았는지는 시험이 정한다(기본: 받음)
let mockFontsLoaded = true;
jest.mock('expo-font', () => ({ useFonts: () => [mockFontsLoaded, null] }));
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
  return { useSession: current, getSession: () => current() };
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
const session = (status: 'checking' | 'signedOut' | 'signingUp' | 'signedIn') => ({ status, token: null, ready: status !== 'checking', lastError: null });

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

  it('웹: 공유 페이지는 세션을 확인하지 않으므로 0.8초만 보인다', async () => {
    Platform.OS = 'web';
    mockSegments.mockReturnValue(['s', '[shareId]']);
    mockUseSession.mockReturnValue(session('checking'));
    await render(<RootLayout />);
    expect(screen.getByTestId('splash')).toBeTruthy();
    await act(async () => jest.advanceTimersByTime(800));
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

describe('루트 레이아웃의 이용 정지 문(결정 065 의 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSegments.mockReturnValue([]);
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
