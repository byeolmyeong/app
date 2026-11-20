import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';

import LoginScreen from '@/app/login';
import { strings } from '@/content/strings';
import { setLastProvider } from '@/features/auth/last-provider';
import { AppleLoginButton } from '@/features/auth/providers/apple';
import { getDraft, setDraft } from '@/features/auth/signup-draft';
import { getSession, useAuth } from '@/features/auth/use-session';

const S = strings.login;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({ useAuth: jest.fn(), getSession: jest.fn(() => ({ lastError: null })) }));
// 공급자 버튼은 누르면 자격 증명을 넘기는 가짜로 바꾼다(진짜는 providers 테스트가 본다). 최근 로그인(recent)을 받으면 "recent:이름" 을 함께 그린다.
jest.mock('@/features/auth/providers/google', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    GoogleLoginButton: ({ onCredential, onError, recent }: { onCredential: (c: unknown) => void; onError: () => void; recent?: boolean }) => (
      <>
        <Pressable onPress={() => onCredential({ provider: 'GOOGLE', idToken: 'g' })}>
          <Text>google</Text>
        </Pressable>
        <Pressable onPress={onError}>
          <Text>google-error</Text>
        </Pressable>
        {recent ? <Text>recent:google</Text> : null}
      </>
    ),
  };
});
// 애플 · 카카오는 이름만 보이는 가짜(안드로이드처럼 애플이 없는 경우는 null 로 바꿔 본다)
jest.mock('@/features/auth/providers/apple', () => ({ AppleLoginButton: jest.fn() }));
jest.mock('@/features/auth/providers/kakao', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    KakaoLoginButton: ({ recent }: { recent?: boolean }) => (
      <>
        <Text>kakao</Text>
        {recent ? <Text>recent:kakao</Text> : null}
      </>
    ),
  };
});

function FakeApple({ recent }: { recent?: boolean }) {
  const { Text } = jest.requireActual('react-native');
  return (
    <>
      <Text>apple</Text>
      {recent ? <Text>recent:apple</Text> : null}
    </>
  );
}

const signIn = jest.fn();
const devSignIn = jest.fn();
function auth(over: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as jest.Mock).mockReturnValue({ status: 'signedOut', lastError: null, signIn, devSignIn, devSessionEnabled: false, ...over });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  auth();
  (getSession as jest.Mock).mockReturnValue({ lastError: null });
  (AppleLoginButton as jest.Mock).mockImplementation(FakeApple);
});

type Json = { children?: (Json | string)[] | null } | string | null;
/** 화면에 나온 순서대로 글자를 모은다(names 에 든 것만) */
function order(names: string[]) {
  const found: string[] = [];
  const walk = (node: Json) => {
    if (node === null) return;
    if (typeof node === 'string') {
      if (names.includes(node)) found.push(node);
      return;
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Json | Json[];
  (Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return found;
}

// 로그인 화면(결정 009 · 034)
describe('로그인 화면', () => {
  it('공급자 버튼의 자격 증명으로 로그인한다. 어디로 갈지는 가드가 정한다', async () => {
    signIn.mockResolvedValue('signedIn');
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByText('google'));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ provider: 'GOOGLE', idToken: 'g' }));
  });

  it('로고 아래 한 줄, 버튼은 카카오 · 애플 · 구글 순서이고 아래 안내 문구(만 14세 · 약관)는 없다(보드 5)', async () => {
    await render(<LoginScreen />);
    expect(screen.getByText(S.tagline)).toBeTruthy();
    expect(order(['kakao', 'apple', 'google'])).toEqual(['kakao', 'apple', 'google']);
    expect(screen.queryByText('만 14세 이상만 가입할 수 있어요.')).toBeNull();
  });

  it('안드로이드처럼 애플 버튼이 없으면 빈칸 없이 카카오 · 구글 둘이 같은 간격으로 붙는다(보드 5-1)', async () => {
    (AppleLoginButton as jest.Mock).mockImplementation(() => null);
    await render(<LoginScreen />);
    expect(order(['kakao', 'apple', 'google'])).toEqual(['kakao', 'google']);
    expect(StyleSheet.flatten(screen.getByTestId('login-buttons').props.style)).toMatchObject({ gap: 12 });
  });

  it('새 사람인데 공급자가 이메일을 주지 않으면(EMAIL_REQUIRED) 시스템 알림 창으로 한 번 알린다', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    signIn.mockImplementation(async () => {
      (getSession as jest.Mock).mockReturnValue({ lastError: 'EMAIL_REQUIRED' });
      return 'failed';
    });
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByText('google'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(S.emailRequired.title, S.emailRequired.body));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(S.failed)).toBeNull();
  });

  it('로그인 화면에 오면 하다 만 가입 초안을 지운다(가입 시간이 지났거나 만 14세 미만으로 돌아온 경우 — 다음 가입은 처음부터)', async () => {
    setDraft({ termsVersion: '2026-11-19', privacyVersion: '2026-11-19', pushConsent: true, marketingConsent: true, nickname: '새벽별' });
    await render(<LoginScreen />);
    expect(getDraft()).toBeNull();
  });

  it('카카오 웹처럼 다른 화면에서 EMAIL_REQUIRED 로 돌아오면 로그인 화면이 뜰 때 알린다', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    auth({ lastError: 'EMAIL_REQUIRED' });
    await render(<LoginScreen />);
    expect(alert).toHaveBeenCalledWith(S.emailRequired.title, S.emailRequired.body);
    expect(alert).toHaveBeenCalledTimes(1);
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

// 최근 로그인(결정 044, 보드 5-2): 이 기기에서 마지막에 쓴 공급자 버튼에만 배지
describe('로그인 화면: 최근 로그인', () => {
  const recents = () => screen.queryAllByText(/^recent:/).map((node) => node.props.children);

  it('기기에 적힌 공급자의 버튼에만 배지를 얹는다', async () => {
    await setLastProvider('KAKAO');
    await render(<LoginScreen />);
    expect(await screen.findByText('recent:kakao')).toBeTruthy();
    expect(recents()).toEqual(['recent:kakao']);
  });

  it('적힌 값이 없으면 배지가 없다', async () => {
    await render(<LoginScreen />);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    expect(recents()).toEqual([]);
  });

  it('안드로이드처럼 애플 버튼이 없으면 마지막이 애플이어도 배지가 없다(다른 버튼에 옮겨 붙지 않는다)', async () => {
    (AppleLoginButton as jest.Mock).mockImplementation(() => null);
    await setLastProvider('APPLE');
    await render(<LoginScreen />);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    expect(order(['kakao', 'apple', 'google'])).toEqual(['kakao', 'google']);
    expect(recents()).toEqual([]);
  });
});
