import { act, render, screen, waitFor } from '@testing-library/react-native';
import { router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import RootLayout, { ErrorBoundary } from '@/app/_layout';
import { strings } from '@/content/strings';
import { recheckSession, useSession } from '@/features/auth/use-session';
import { useSplashHold } from '@/components/splash-hold';
import { markHomeReady, resetHomeReady } from '@/features/home/home-ready';
import { useIntroSeen } from '@/features/onboarding/intro-seen';

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
  router: { replace: jest.fn() },
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
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'checking' as const, token: null, ready: false, lastError: null })),
  recheckSession: jest.fn(async () => {}),
}));
jest.mock('@/features/onboarding/intro-seen', () => ({ useIntroSeen: jest.fn(() => true) }));

const mockSegments = useSegments as jest.Mock;

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

// 루트에 걸린 문(예: 이용 정지 확인 — 6a 가 꽂는다)이 준비될 때까지 스플래시를 둔다(useSplashHold)
describe('스플래시를 붙잡는 문', () => {
  const original = Platform.OS;
  beforeEach(() => {
    jest.useFakeTimers();
    mockSegments.mockReturnValue(['login']);
    mockUseSession.mockReturnValue(session('signedOut'));
  });
  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = original;
  });

  it('문이 붙잡는 동안은 걷지 않고, 놓으면 걷는다', async () => {
    Platform.OS = 'web';
    let setHeld: (v: boolean) => void = () => {};
    function Gate() {
      const [held, set] = jest.requireActual('react').useState(true);
      setHeld = set;
      useSplashHold(held);
      return null;
    }
    await render(
      <>
        <Gate />
        <RootLayout />
      </>,
    );
    await act(async () => jest.advanceTimersByTime(2000));
    expect(screen.getByTestId('splash')).toBeTruthy();
    await act(async () => setHeld(false));
    expect(screen.queryByTestId('splash')).toBeNull();
  });
});
