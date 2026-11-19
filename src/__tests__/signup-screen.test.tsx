import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import SignupScreen from '@/app/signup';
import { strings } from '@/content/strings';
import { useAuth } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/chart/use-birth-profile', () => ({
  ...jest.requireActual('@/features/chart/use-birth-profile'),
  saveBirth: jest.fn(async () => {}),
}));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), api: { createChart: jest.fn() } }));
// 입력 칸은 가짜로: 누르면 검증을 통과한 값으로 submit 을 부르고 돌려받은 안내를 보여 준다.
const input = { date: '1995-05-05', time: null, placeId: null };
const profile = { date: '1995-05-05', time: null, place: null };
jest.mock('@/features/chart/birth-form', () => {
  const { useState } = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    BirthForm: ({ submit }: { submit: (v: unknown) => Promise<string | null> }) => {
      const [message, setMessage] = useState(null as string | null);
      return (
        <>
          <Pressable onPress={async () => setMessage(await submit({ input, profile }))}>
            <Text>submit</Text>
          </Pressable>
          {message ? <Text>{message}</Text> : null}
        </>
      );
    },
  };
});

const S = strings.login;
const completeSignup = jest.fn();
const auth = (status: string) => (useAuth as jest.Mock).mockReturnValue({ status, lastError: null, completeSignup });

beforeEach(() => {
  jest.clearAllMocks();
  auth('signingUp');
  (api.createChart as jest.Mock).mockResolvedValue({ ok: true, data: fixtures.chart });
});

// 가입 마지막 단계: 출생 정보(결정 009 · 034). 만 14세 판정은 서버가 한다.
describe('가입 화면', () => {
  it('출생 정보로 가입을 마친 뒤 차트를 받아 기기에 두고 풀이 글로 간다', async () => {
    completeSignup.mockImplementation(async () => {
      auth('signedIn');
      return { ok: true, data: { token: 't' } };
    });
    await render(<SignupScreen />);
    expect(screen.getByText(S.signupTitle)).toBeTruthy();
    await fireEvent.press(screen.getByText('submit'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/reading'));
    expect(completeSignup).toHaveBeenCalledWith(input);
    expect(api.createChart).toHaveBeenCalledWith(input);
    expect(saveBirth).toHaveBeenCalledWith({ profile, chart: fixtures.chart });
    expect(screen.queryByText('redirect:/')).toBeNull();
  });

  it('차트를 받지 못해도 가입은 끝났으니 홈으로 간다(홈이 서버의 출생 정보로 되살린다)', async () => {
    completeSignup.mockResolvedValue({ ok: true, data: { token: 't' } });
    (api.createChart as jest.Mock).mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<SignupScreen />);
    await fireEvent.press(screen.getByText('submit'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(saveBirth).not.toHaveBeenCalled();
  });

  it('만 14세 미만이면 차트를 받지 않고 이유를 보여 준다(가드가 로그인 화면으로 보낸다)', async () => {
    completeSignup.mockResolvedValue({ ok: false, error: 'SERVER', status: 403, code: 'UNDER_AGE' });
    await render(<SignupScreen />);
    await fireEvent.press(screen.getByText('submit'));
    expect(await screen.findByText(S.underAge)).toBeTruthy();
    expect(api.createChart).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('네트워크가 끊겼으면 다시 보내라고 안내한다', async () => {
    completeSignup.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<SignupScreen />);
    await fireEvent.press(screen.getByText('submit'));
    expect(await screen.findByText(strings.home.requestErrors.NETWORK)).toBeTruthy();
  });

  it('가입 중이 아닌 로그인 상태로 열면 홈으로 보낸다', async () => {
    auth('signedIn');
    await render(<SignupScreen />);
    expect(screen.getByText('redirect:/')).toBeTruthy();
  });
});
