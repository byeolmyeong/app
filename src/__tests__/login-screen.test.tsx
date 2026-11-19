import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/app/login';
import { strings } from '@/content/strings';
import { useAuth } from '@/features/auth/use-session';

const S = strings.login;

jest.mock('@/features/auth/use-session', () => ({ useAuth: jest.fn() }));
// 공급자 버튼은 누르면 자격 증명을 넘기는 가짜로 바꾼다(진짜는 providers 테스트가 본다).
jest.mock('@/features/auth/providers/google', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    GoogleLoginButton: ({ onCredential, onError }: { onCredential: (c: unknown) => void; onError: () => void }) => (
      <>
        <Pressable onPress={() => onCredential({ provider: 'GOOGLE', idToken: 'g' })}>
          <Text>google</Text>
        </Pressable>
        <Pressable onPress={onError}>
          <Text>google-error</Text>
        </Pressable>
      </>
    ),
  };
});
jest.mock('@/features/auth/providers/apple', () => ({ AppleLoginButton: () => null }));
jest.mock('@/features/auth/providers/kakao', () => ({ KakaoLoginButton: () => null }));

const signIn = jest.fn();
const devSignIn = jest.fn();
function auth(over: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as jest.Mock).mockReturnValue({ status: 'signedOut', lastError: null, signIn, devSignIn, devSessionEnabled: false, ...over });
}

beforeEach(() => {
  jest.clearAllMocks();
  auth();
});

// 로그인 화면(결정 009 · 034)
describe('로그인 화면', () => {
  it('공급자 버튼의 자격 증명으로 로그인한다. 어디로 갈지는 가드가 정한다', async () => {
    signIn.mockResolvedValue('signedIn');
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByText('google'));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ provider: 'GOOGLE', idToken: 'g' }));
    expect(screen.getByText(S.ageNotice)).toBeTruthy();
  });

  it('로그인에 실패하거나 공급자에서 실패하면 다시 해 보라고 안내한다', async () => {
    signIn.mockResolvedValue('failed');
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByText('google'));
    expect(await screen.findByText(S.failed)).toBeTruthy();

    await render(<LoginScreen />);
    await fireEvent.press(screen.getAllByText('google-error')[0]);
    expect((await screen.findAllByText(S.failed)).length).toBeGreaterThan(0);
  });

  it('만 14세 미만으로 가입을 못 했거나 가입 시간이 지났으면 그 이유를 보여 준다', async () => {
    auth({ lastError: 'UNDER_AGE' });
    await render(<LoginScreen />);
    expect(screen.getByText(S.underAge)).toBeTruthy();

    auth({ lastError: 'SIGNUP_EXPIRED' });
    await render(<LoginScreen />);
    expect(screen.getByText(S.expired)).toBeTruthy();
  });

  it('개발용 세션이 켜진 빌드에만 개발용으로 들어가는 버튼이 있다', async () => {
    await render(<LoginScreen />);
    expect(screen.queryByText(S.dev)).toBeNull();

    auth({ devSessionEnabled: true });
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByText(S.dev));
    expect(devSignIn).toHaveBeenCalledTimes(1);
  });
});
