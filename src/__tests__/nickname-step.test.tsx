import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import NicknameStep from '@/app/signup/nickname';
import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { clearDraft, getDraft, rejectNickname, setDraft } from '@/features/auth/signup-draft';
import { useAuth } from '@/features/auth/use-session';

jest.mock('expo-router', () => ({
  // 가입 단계는 웹에서 오른쪽에서 밀려 들어온다 — 이 시험들은 앱(움직이지 않음)
  useCanGoBack: () => false,
  useIsFocused: () => true,
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  // 화면에 들어올 때 한 번(이 테스트에서는 그리는 때)
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
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

// 가입 2단계: 닉네임 · 프로필(결정 042, 보드 7 · 7-1 · 7-2 · 7-3 · 7-4)
describe('닉네임 단계', () => {
  it('이미 가입을 마친 사람(로그인 상태)이 뒤로 가기로 돌아오면 홈으로 보낸다(리뷰 A1)', async () => {
    (useAuth as jest.Mock).mockReturnValue({ status: 'signedIn', checkNickname });
    await render(<NicknameStep />);
    expect(screen.getByText('redirect:/')).toBeTruthy();
  });

  it('"이미 있는 닉네임" 이 떠 있을 때 엔터를 눌러도 같은 이름으로 서버를 다시 부르지 않는다(리뷰 A9)', async () => {
    checkNickname.mockResolvedValue({ ok: true, data: { available: false } });
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), '새벽별');
    await fireEvent.press(next());
    expect(await screen.findByText(N.taken)).toBeTruthy();
    await fireEvent(input(), 'submitEditing');
    expect(checkNickname).toHaveBeenCalledTimes(1);
  });

  it('다음을 두 번 눌러도 서버에는 한 번 묻는다', async () => {
    let resolve: (v: unknown) => void = () => {};
    checkNickname.mockImplementation(() => new Promise((r) => (resolve = r)));
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), '새벽별');
    await fireEvent.press(next());
    await fireEvent(input(), 'submitEditing');
    expect(checkNickname).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, data: { available: true } }));
    expect(router.push).toHaveBeenCalledTimes(1);
  });

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
    // 적던 닉네임은 이어 하기에 남는다(결정 068) — 다음 단계로는 가지 않는다
    expect(getDraft()?.nickname).toBe('새벽별');
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

  it('마지막 단계에서 서버가 거절하고 돌아오면(NICKNAME_TAKEN) "이미 있는 닉네임" 을 보여 주고 다음을 막는다', async () => {
    setDraft({ nickname: '새벽별', avatar: 3 });
    rejectNickname('NICKNAME_TAKEN');
    await render(<NicknameStep />);
    expect(screen.getByText(N.taken)).toBeTruthy();
    expect(nextDisabled()).toBe(true);
    await fireEvent.changeText(input(), '새벽별빛');
    expect(screen.queryByText(N.taken)).toBeNull();
    expect(nextDisabled()).toBe(false);
  });

  it('돌아오면 초안의 닉네임 · 그림이 그대로다', async () => {
    setDraft({ nickname: '새벽별', avatar: 3 });
    await render(<NicknameStep />);
    expect(input().props.value).toBe('새벽별');
    expect(getDraft()?.avatar).toBe(3);
    expect(nextDisabled()).toBe(false);
  });
});

// 닉네임 중복 안내(결정 068 의 6): 치기를 멈추고 0.5초 뒤 서버에 한 번 묻고 안내 줄에 쓴다. 확인 중엔 다음이 흐리다
describe('닉네임 단계: 멈추면 확인', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const settle = () => act(async () => jest.advanceTimersByTime(500));

  it('규칙에 맞는 닉네임을 치고 멈추면 한 번 묻고, 쓸 수 있으면 초록 "사용할 수 있는 닉네임이에요"', async () => {
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), '새벽');
    await act(async () => jest.advanceTimersByTime(300));
    await fireEvent.changeText(input(), '새벽별');
    await act(async () => jest.advanceTimersByTime(499));
    expect(checkNickname).not.toHaveBeenCalled();
    await settle();
    expect(checkNickname).toHaveBeenCalledTimes(1);
    expect(checkNickname).toHaveBeenCalledWith('새벽별');
    const ok = screen.getByText(N.available);
    expect(StyleSheet.flatten(ok.props.style).color).toBe(Colors.success);
    expect(nextDisabled()).toBe(false);
    // 쓸 수 있다고 확인한 이름이면 다음에서 다시 묻지 않는다
    await fireEvent.press(next());
    expect(checkNickname).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/signup/birth');
  });

  it('겹치면 빨강 "이미 쓰고 있는 닉네임이에요" 와 다음 꺼짐', async () => {
    checkNickname.mockResolvedValue({ ok: true, data: { available: false } });
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), '새벽별');
    await settle();
    expect(N.taken).toBe('이미 쓰고 있는 닉네임이에요');
    expect(StyleSheet.flatten(screen.getByText(N.taken).props.style).color).toBe(Colors.danger);
    expect(nextDisabled()).toBe(true);
  });

  it('확인하는 동안은 다음이 흐리다. 규칙에 어긋나면 묻지 않는다', async () => {
    checkNickname.mockImplementation(() => new Promise(() => {}));
    await render(<NicknameStep />);
    await fireEvent.changeText(input(), '별!');
    await settle();
    expect(checkNickname).not.toHaveBeenCalled();
    await fireEvent.changeText(input(), '새벽별');
    await settle();
    expect(checkNickname).toHaveBeenCalledTimes(1);
    expect(nextDisabled()).toBe(true);
  });
});

// 결정 068 의 1: 웹에서 이 단계 주소로 새로 고치면 세션이 보관한 초안을 되돌리기 전에 화면이 먼저 뜬다 —
// 확인 중에는 약관 단계로 돌려보내지 않고 기다렸다가, 되돌린 초안으로 그린다
describe('닉네임 단계: 새로 고침 직후(세션 확인 중)', () => {
  it('확인 중에는 돌려보내지 않고, 가입 중이 되면 되돌린 초안의 닉네임으로 그린다', async () => {
    clearDraft();
    (useAuth as jest.Mock).mockReturnValue({ status: 'checking', checkNickname });
    const view = await render(<NicknameStep />);
    expect(screen.queryByText(/^redirect:/)).toBeNull();
    setDraft({ ...terms, nickname: '새벽별', avatar: 2 });
    (useAuth as jest.Mock).mockReturnValue({ status: 'signingUp', checkNickname });
    await view.rerender(<NicknameStep />);
    expect(screen.getByDisplayValue('새벽별')).toBeTruthy();
  });
});

// 결정 068 의 1: 적던 닉네임도 이어 하기에 남는다 — 치는 대로 초안에 쓴다(다음을 누르기 전에 나가도)
it('치는 닉네임을 초안에 따라 쓴다', async () => {
  await render(<NicknameStep />);
  await fireEvent.changeText(input(), '새벽');
  expect(getDraft()?.nickname).toBe('새벽');
});
