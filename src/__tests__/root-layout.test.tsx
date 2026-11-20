import { render, screen, waitFor } from '@testing-library/react-native';
import { router, useSegments } from 'expo-router';
import type { ReactNode } from 'react';

import RootLayout from '@/app/_layout';
import { useSession } from '@/features/auth/use-session';
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
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('@/features/auth/use-session', () => ({ useSession: jest.fn(() => ({ status: 'checking' as const, token: null, ready: false, lastError: null })) }));
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
