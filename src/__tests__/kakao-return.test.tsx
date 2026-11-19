import { render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import KakaoReturn from '@/app/auth/kakao';
import { takeKakaoState, webOrigin } from '@/features/auth/providers/web-redirect';
import { useAuth } from '@/features/auth/use-session';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/features/auth/providers/web-redirect', () => ({
  ...jest.requireActual('@/features/auth/providers/web-redirect'),
  takeKakaoState: jest.fn(() => 'st-1'),
  webOrigin: jest.fn(() => 'https://byeolmyeong.com'),
}));
const mockSignIn = jest.fn();
jest.mock('@/features/auth/use-session', () => ({
  useAuth: jest.fn(() => ({ status: 'signedOut', lastError: null, signIn: mockSignIn })),
}));

const mockParams = useLocalSearchParams as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (takeKakaoState as jest.Mock).mockReturnValue('st-1');
  (webOrigin as jest.Mock).mockReturnValue('https://byeolmyeong.com');
  (useAuth as jest.Mock).mockReturnValue({ status: 'signedOut', lastError: null, signIn: mockSignIn });
});

// 카카오 웹 로그인에서 돌아오는 화면(결정 034)
describe('/auth/kakao', () => {
  it('코드를 서버에 한 번만 보내고 처음 온 사람이면 가입 화면으로 간다', async () => {
    mockParams.mockReturnValue({ code: 'c-new', state: 'st-1' });
    mockSignIn.mockResolvedValue('signingUp');
    const { rerender } = await render(<KakaoReturn />);
    await rerender(<KakaoReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/signup'));
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith({ provider: 'KAKAO', code: 'c-new', redirectUri: 'https://byeolmyeong.com/auth/kakao' });
  });

  it('계정이 있으면 홈으로, 실패하면 로그인 화면으로 간다', async () => {
    mockParams.mockReturnValue({ code: 'c-old', state: 'st-1' });
    mockSignIn.mockResolvedValue('signedIn');
    await render(<KakaoReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));

    jest.clearAllMocks();
    mockParams.mockReturnValue({ code: 'c-bad', state: 'st-1' });
    mockSignIn.mockResolvedValue('failed');
    await render(<KakaoReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  });

  it('state 가 다르거나 취소했으면 서버를 부르지 않고 로그인 화면으로 간다', async () => {
    mockParams.mockReturnValue({ code: 'c-x', state: 'forged' });
    await render(<KakaoReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));

    mockParams.mockReturnValue({ error: 'access_denied', state: 'st-1' });
    await render(<KakaoReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(2));
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
