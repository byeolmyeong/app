import { render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import GoogleReturn from '@/app/auth/google';
import { clearUrlFragment, takeGoogleRequest, urlFragment } from '@/features/auth/providers/web-redirect';
import { useAuth } from '@/features/auth/use-session';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/features/auth/providers/web-redirect', () => ({
  ...jest.requireActual('@/features/auth/providers/web-redirect'),
  urlFragment: jest.fn(() => ''),
  clearUrlFragment: jest.fn(),
  takeGoogleRequest: jest.fn(() => ({ state: 'st-1', nonce: 'n-1' })),
}));
const mockSignIn = jest.fn();
jest.mock('@/features/auth/use-session', () => ({
  useAuth: jest.fn(() => ({ status: 'signedOut', lastError: null, signIn: mockSignIn })),
}));

const mockFragment = urlFragment as jest.Mock;
/** 시험용 ID 토큰(가운데 조각만 진짜 모양 — 앱은 nonce 만 읽고 서명은 서버가 본다). tag 로 토큰마다 다른 주소를 만든다 */
const idToken = (nonce: string, tag: string) =>
  `h.${btoa(JSON.stringify({ nonce, tag }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}.s`;
const FAILED = '/login?failed=1';

beforeEach(() => {
  jest.clearAllMocks();
  (takeGoogleRequest as jest.Mock).mockReturnValue({ state: 'st-1', nonce: 'n-1' });
  (useAuth as jest.Mock).mockReturnValue({ status: 'signedOut', lastError: null, signIn: mockSignIn });
});

// 구글 웹 로그인에서 돌아오는 화면(결정 070): 주소 조각의 ID 토큰을 state · nonce 로 확인하고 지금과 같은 길(signIn)로 보낸다
describe('/auth/google', () => {
  it('state · nonce 가 맞으면 ID 토큰을 서버에 한 번만 보내고, 처음 온 사람이면 가입 화면으로 간다', async () => {
    const token = idToken('n-1', 'new');
    mockFragment.mockReturnValue(`#id_token=${token}&state=st-1`);
    mockSignIn.mockResolvedValue('signingUp');
    const { rerender } = await render(<GoogleReturn />);
    await rerender(<GoogleReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/signup/terms'));
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith({ provider: 'GOOGLE', idToken: token });
  });

  it('계정이 있으면 홈으로, 서버가 받지 않으면 실패 안내와 함께 로그인 화면으로 간다', async () => {
    mockFragment.mockReturnValue(`#id_token=${idToken('n-1', 'old')}&state=st-1`);
    mockSignIn.mockResolvedValue('signedIn');
    await render(<GoogleReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));

    jest.clearAllMocks();
    mockFragment.mockReturnValue(`#id_token=${idToken('n-1', 'bad')}&state=st-1`);
    mockSignIn.mockResolvedValue('failed');
    await render(<GoogleReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(FAILED));
  });

  it('state 가 다르거나 ID 토큰의 nonce 가 다르면 서버를 부르지 않고 실패 안내와 함께 로그인 화면으로 간다', async () => {
    mockFragment.mockReturnValue(`#id_token=${idToken('n-1', 'forged-state')}&state=forged`);
    await render(<GoogleReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(FAILED));

    mockFragment.mockReturnValue(`#id_token=${idToken('someone-else', 'forged-nonce')}&state=st-1`);
    await render(<GoogleReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(2));
    expect(router.replace).toHaveBeenLastCalledWith(FAILED);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('사용자가 거부했으면(access_denied) 오류가 아니다 — 안내 없이 로그인 화면으로', async () => {
    mockFragment.mockReturnValue('#error=access_denied&state=st-1');
    await render(<GoogleReturn />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('읽은 주소 조각은 서버를 부르기 전에 기록에서 지운다(토큰이 주소 · 뒤로 가기에 남지 않게)', async () => {
    mockFragment.mockReturnValue(`#id_token=${idToken('n-1', 'clear')}&state=st-1`);
    mockSignIn.mockImplementation(() => {
      expect(clearUrlFragment).toHaveBeenCalledTimes(1);
      return new Promise(() => {});
    });
    await render(<GoogleReturn />);
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    expect(takeGoogleRequest).toHaveBeenCalledTimes(1);
  });
});

// 서버를 기다리는 동안은 카카오와 같은 스플래시 모양(결정 067 의 2 · 3)
describe('/auth/google: 기다리는 동안', () => {
  it('스플래시 모양이고, 화면 읽기에는 "로그인하는 중이에요" 와 기다리는 중(busy)을 알린다', async () => {
    mockFragment.mockReturnValue(`#id_token=${idToken('n-1', 'wait')}&state=st-1`);
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    await render(<GoogleReturn />);
    expect(screen.getByTestId('splash')).toBeTruthy();
    expect(screen.getByLabelText('로그인하는 중이에요').props.accessibilityState).toMatchObject({ busy: true });
  });
});
