import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { login as kakaoLogin } from '@react-native-seoul/kakao-login';
import * as AppleAuthentication from 'expo-apple-authentication';

import { strings } from '@/content/strings';
import { AppleLoginButton } from '@/features/auth/providers/apple';
import { GoogleLoginButton } from '@/features/auth/providers/google';
import { KakaoLoginButton } from '@/features/auth/providers/kakao';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(async () => true), signIn: jest.fn() },
  isSuccessResponse: (r: { type: string }) => r.type === 'success',
  isErrorWithCode: (e: unknown) => typeof e === 'object' && e !== null && 'code' in e,
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));
jest.mock('@react-native-seoul/kakao-login', () => ({ login: jest.fn() }));
jest.mock('expo-apple-authentication', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    isAvailableAsync: jest.fn(async () => true),
    signInAsync: jest.fn(),
    AppleAuthenticationButton: (props: { onPress: () => void }) => <Pressable testID="apple-button" onPress={props.onPress} />,
    AppleAuthenticationButtonType: { CONTINUE: 1 },
    AppleAuthenticationButtonStyle: { BLACK: 2 },
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  };
});

const onCredential = jest.fn();
const onError = jest.fn();
const props = { onCredential, onError };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client';
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client';
  process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY = 'kakao-key';
});

afterAll(() => {
  delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  delete process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
});

// 앱(iOS · Android)의 공급자 버튼(결정 034). 라이브러리는 흉내 낸다.
describe('구글(앱)', () => {
  it('웹 클라이언트 ID 로 설정하고 받은 ID 토큰을 넘긴다', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ type: 'success', data: { idToken: 'g-id' } });
    await render(<GoogleLoginButton {...props} />);
    await fireEvent.press(screen.getByText(strings.login.google));
    await waitFor(() => expect(onCredential).toHaveBeenCalledWith({ provider: 'GOOGLE', idToken: 'g-id' }));
    expect(GoogleSignin.configure).toHaveBeenCalledWith({ webClientId: 'web-client', iosClientId: 'ios-client' });
  });

  it('사용자가 닫으면 아무것도 하지 않고, ID 토큰이 없거나 다른 오류면 실패를 알린다', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({ type: 'cancelled', data: null });
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'SIGN_IN_CANCELLED' }));
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({ type: 'success', data: { idToken: null } });
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(new Error('network'));
    await render(<GoogleLoginButton {...props} />);
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(screen.getByText(strings.login.google));
      await waitFor(() => expect(GoogleSignin.signIn).toHaveBeenCalledTimes(i + 1));
    }
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2));
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('클라이언트 ID 가 없으면 그리지 않는다', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    await render(<GoogleLoginButton {...props} />);
    expect(screen.queryByText(strings.login.google)).toBeNull();
  });
});

describe('애플(iOS)', () => {
  it('시스템 버튼 대신 공급자 버튼 모양(16px, 결정 041)으로 그리고 누르면 signInAsync 를 부른다', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 'a-id' });
    await render(<AppleLoginButton {...props} />);
    await fireEvent.press(await screen.findByText(strings.login.apple));
    expect(screen.queryByTestId('apple-button')).toBeNull();
    expect(screen.getByTestId('social-button-APPLE')).toBeTruthy();
    await waitFor(() => expect(AppleAuthentication.signInAsync).toHaveBeenCalledTimes(1));
  });

  it('이메일만 묻고(이름은 묻지 않는다, 결정 039) ID 토큰과 authorization code 를 넘긴다', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 'a-id', authorizationCode: 'a-code' });
    await render(<AppleLoginButton {...props} />);
    await fireEvent.press(await screen.findByText(strings.login.apple));
    await waitFor(() => expect(onCredential).toHaveBeenCalledWith({ provider: 'APPLE', idToken: 'a-id', authorizationCode: 'a-code' }));
    expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL] });
  });

  it('취소는 조용히, 다른 오류는 실패를 알린다', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValueOnce({ code: 'ERR_REQUEST_CANCELED' });
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValueOnce({ code: 'ERR_REQUEST_FAILED' });
    await render(<AppleLoginButton {...props} />);
    const button = await screen.findByText(strings.login.apple);
    await fireEvent.press(button);
    await fireEvent.press(button);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('이 기기에서 애플 로그인을 쓸 수 없으면 그리지 않는다', async () => {
    (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    await render(<AppleLoginButton {...props} />);
    await waitFor(() => expect(AppleAuthentication.isAvailableAsync).toHaveBeenCalled());
    expect(screen.queryByText(strings.login.apple)).toBeNull();
  });
});

describe('카카오(앱)', () => {
  it('카카오 SDK 로 로그인하고 ID 토큰을 넘긴다', async () => {
    (kakaoLogin as jest.Mock).mockResolvedValue({ accessToken: 'a', idToken: 'k-id' });
    await render(<KakaoLoginButton {...props} />);
    await fireEvent.press(screen.getByText(strings.login.kakao));
    await waitFor(() => expect(onCredential).toHaveBeenCalledWith({ provider: 'KAKAO', idToken: 'k-id' }));
  });

  it('취소는 조용히, ID 토큰이 없거나(OpenID Connect 꺼짐) 다른 오류면 실패를 알린다', async () => {
    (kakaoLogin as jest.Mock).mockRejectedValueOnce(new Error('user cancelled'));
    (kakaoLogin as jest.Mock).mockResolvedValueOnce({ accessToken: 'a' });
    (kakaoLogin as jest.Mock).mockRejectedValueOnce(new Error('KakaoTalk not installed'));
    await render(<KakaoLoginButton {...props} />);
    for (let i = 0; i < 3; i++) {
      await fireEvent.press(screen.getByText(strings.login.kakao));
      await waitFor(() => expect(kakaoLogin).toHaveBeenCalledTimes(i + 1));
    }
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2));
  });

  it('네이티브 앱 키가 없으면 그리지 않는다', async () => {
    delete process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
    await render(<KakaoLoginButton {...props} />);
    expect(screen.queryByText(strings.login.kakao)).toBeNull();
  });
});
