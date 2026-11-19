import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import NicknameStep from '@/app/signup/nickname';
import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { clearDraft, getDraft, setDraft } from '@/features/auth/signup-draft';
import { useAuth } from '@/features/auth/use-session';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
}));
jest.mock('@/features/auth/use-session', () => ({ useAuth: jest.fn() }));

const N = strings.nickname;
const checkNickname = jest.fn();
const terms = { termsVersion: '2026-11-19', privacyVersion: '2026-11-19', pushConsent: false, marketingConsent: false };

beforeEach(() => {
  jest.clearAllMocks();
  clearDraft();
  setDraft(terms);
  (useAuth as jest.Mock).mockReturnValue({ status: 'signingUp', checkNickname });
  checkNickname.mockResolvedValue({ ok: true, data: { available: true } });
});

const input = () => screen.getByLabelText(N.label);
const next = () => screen.getByRole('button', { name: N.next });
const nextDisabled = () => next().props.accessibilityState?.disabled === true;

// 가입 2단계: 닉네임 · 프로필(결정 041, 보드 7 · 7-1 · 7-2 · 7-3 · 7-4)
describe('닉네임 단계', () => {
  it('약관 단계를 건너뛰고 들어오면(초안 없음) 약관 단계로 돌려보낸다(리뷰 초점 2)', async () => {
    clearDraft();
    await render(<NicknameStep />);
    expect(screen.getByText('redirect:/signup/terms')).toBeTruthy();
  });

  it('처음 들어오면 프로필 그림 하나를 무작위로 골라 초안에 둔다', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.6);
    await render(<NicknameStep />);
    expect(getDraft()?.avatar).toBe(5);
    expect(screen.getByLabelText(N.avatars[4])).toBeTruthy();
    (Math.random as jest.Mock).mockRestore();
  });

  it('빈 칸이면 규칙 안내(회색) · 0/10 · 다음 꺼짐', async () => {
    await render(<NicknameStep />);
    expect(screen.getByText(N.rule)).toBeTruthy();
    expect(screen.getByText('0/10')).toBeTruthy();
    expect(nextDisabled()).toBe(true);
  });

  it('한글 · 영문 말고 다른 글자를 치면 칸 테두리 빨강 + 안내, 다음 꺼짐(보드 7-2)', async () => {
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), '별!');
    expect(screen.getByText(N.invalidChar)).toBeTruthy();
    expect(screen.getByText('2/10')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('nickname-box').props.style).borderColor).toBe(Colors.danger);
    expect(nextDisabled()).toBe(true);
  });

  it('1자 · 숫자 · 공백 · 기호는 다음으로 갈 수 없고, 한글+영문은 갈 수 있다', async () => {
    await render(<NicknameStep />);
    for (const raw of ['별', '별1', '새벽 별', '별#']) {
      await fireEvent.changeText(input(), raw);
      expect(nextDisabled()).toBe(true);
    }
    await fireEvent.changeText(input(), '별Star');
    expect(nextDisabled()).toBe(false);
  });

  it('치는 동안에는 서버에 묻지 않고, 다음을 누를 때 한 번 묻는다', async () => {
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), '새');
    await fireEvent.changeText(input(), '새벽');
    await fireEvent.changeText(input(), '새벽별');
    expect(checkNickname).not.toHaveBeenCalled();
    await fireEvent.press(next());
    await waitFor(() => expect(checkNickname).toHaveBeenCalledTimes(1));
    expect(checkNickname).toHaveBeenCalledWith('새벽별');
  });

  it('이미 있는 닉네임이면 안내하고 다음 단계로 가지 않는다(보드 7-3)', async () => {
    checkNickname.mockResolvedValue({ ok: true, data: { available: false } });
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), '새벽별');
    await fireEvent.press(next());
    expect(await screen.findByText(N.taken)).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
    expect(getDraft()?.nickname).toBeUndefined();
  });

  it('쓸 수 있으면 앞뒤 공백을 뗀 닉네임을 초안에 두고 출생 정보 단계로', async () => {
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), ' 새벽별 ');
    await fireEvent.press(next());
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/signup/birth'));
    expect(checkNickname).toHaveBeenCalledWith('새벽별');
    expect(getDraft()?.nickname).toBe('새벽별');
  });

  it('서버가 규칙에 어긋난다고 하면 같은 안내, 닿지 못하면 다시 누르라고', async () => {
    checkNickname.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 400, code: 'INVALID_NICKNAME' });
    checkNickname.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), '새벽별');
    await fireEvent.press(next());
    expect(await screen.findByText(N.invalidChar)).toBeTruthy();
    await fireEvent.press(next());
    expect(await screen.findByText(strings.home.requestErrors.NETWORK)).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('프로필을 누르면 그림만 있는 시트가 열리고, 고르고 확인하면 초안의 그림이 바뀐다(보드 7-4)', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await render(<NicknameStep />);
    (Math.random as jest.Mock).mockRestore();
    expect(getDraft()?.avatar).toBe(1);
    await fireEvent.press(screen.getByRole('button', { name: N.editAvatar }));
    await fireEvent.press(screen.getByRole('radio', { name: N.avatars[5] }));
    expect(getDraft()?.avatar).toBe(1);
    await fireEvent.press(screen.getByRole('button', { name: N.confirm }));
    expect(getDraft()?.avatar).toBe(6);
    expect(screen.getAllByLabelText(N.avatars[5]).length).toBeGreaterThan(0);
  });

  it('돌아오면 초안의 닉네임 · 그림이 그대로다', async () => {
    setDraft({ nickname: '새벽별', avatar: 3 });
    await render(<NicknameStep />);
    expect(input().props.value).toBe('새벽별');
    expect(getDraft()?.avatar).toBe(3);
    expect(nextDisabled()).toBe(false);
  });
});
