import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler, StyleSheet } from 'react-native';

import AccountScreen from '@/app/my/account';
import DeleteAccountScreen from '@/app/my/delete';
import NicknameScreen from '@/app/my/nickname';
import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { clearSession, signOutSession } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api, type MyAccount } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => true), dismissAll: jest.fn() },
  Stack: { Screen: () => null },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
  clearSession: jest.fn(async () => {}),
  signOutSession: jest.fn(async () => {}),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getMyAccount: jest.fn(), updateAccount: jest.fn(), deleteAccount: jest.fn(), checkMyNickname: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const A = strings.my.account;
const LO = strings.my.logout;
const N = strings.nickname;
const D = strings.my.delete;
const account: MyAccount = { nickname: '새벽별', avatar: 3, email: 'dawnstar@kakao.com', provider: 'KAKAO', marketingConsent: false, suspended: false };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: account });
  mockApi.checkMyNickname.mockResolvedValue({ ok: true, data: { available: true } });
});

describe('내 정보(/my/account, 보드 16-1 · 결정 084)', () => {
  it('제목은 "내 정보", 프로필 · 출생 정보 · 연결된 계정 · 로그아웃 · 계정 삭제 순서다(결정 084)', async () => {
    await saveBirth({ profile: { date: '1999-03-08', time: '14:10', place: { id: 1, name: '서울특별시 강남구' } }, chart: fixtures.chart });
    await render(<AccountScreen />);
    expect(await screen.findByText('1999년 3월 8일 · 오후 2:10 · 서울 강남구')).toBeTruthy();
    expect(screen.getByText('내 정보')).toBeTruthy();
    expect(screen.queryByText('계정')).toBeNull();
    const labels = [N.avatars[2], A.nickname, '출생 정보', '1999년 3월 8일 · 오후 2:10 · 서울 강남구', '수정', A.linked, A.logout, A.delete];
    const shown = JSON.stringify(screen.toJSON());
    const places = labels.map((label) => shown.indexOf(`"${label}"`));
    expect(places.every((p) => p >= 0)).toBe(true);
    expect(places).toEqual([...places].sort((a, b) => a - b));
  });

  it('출생 정보 줄(지금 값 한 줄 + "수정 ›")을 누르면 출생 정보 수정(/my/birth)으로 간다. 시각을 모르면 "시각 모름"', async () => {
    await saveBirth({ profile: { date: '1999-03-08', time: null, place: null }, chart: fixtures.chartTimeUnknown });
    await render(<AccountScreen />);
    expect(await screen.findByText('1999년 3월 8일 · 시각 모름')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '출생 정보' }));
    expect(router.push).toHaveBeenLastCalledWith('/my/birth');
  });

  it('기기에 출생 정보가 없어도 출생 정보 줄은 이름과 "수정 ›" 으로 남아 들어갈 수 있다', async () => {
    await render(<AccountScreen />);
    await screen.findByText('새벽별');
    const row = screen.getByRole('button', { name: '출생 정보' });
    expect(within(row).getByText('수정')).toBeTruthy();
    expect(within(row).queryByText(/년 .*월/)).toBeNull();
    await fireEvent.press(row);
    expect(router.push).toHaveBeenLastCalledWith('/my/birth');
  });

  it('프로필 그림 · 닉네임 · 연결된 계정(공급자 + 가린 이메일) / 로그아웃 / 맨 아래 계정 삭제를 보인다', async () => {
    await render(<AccountScreen />);
    expect(await screen.findByText('새벽별')).toBeTruthy();
    expect(screen.getByLabelText(N.avatars[2])).toBeTruthy();
    expect(screen.getByText(A.linked)).toBeTruthy();
    expect(screen.getByText('dawn****@kakao.com')).toBeTruthy();
    // 이메일이 길어도 이름은 한 줄 · 이메일은 한 줄에 가운데 말줄임, 화면 읽기는 전체(소유자 2026-11-21)
    expect(screen.getByText(A.linked).props.numberOfLines).toBe(1);
    const email = screen.getByText('dawn****@kakao.com');
    expect(email.props.numberOfLines).toBe(1);
    expect(email.props.ellipsizeMode).toBe('middle');
    expect(email.props.accessibilityLabel).toBe('dawn****@kakao.com');
    expect(screen.getByTestId('provider-badge-KAKAO', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('dawnstar@kakao.com')).toBeNull();
    expect(screen.getByText(A.logout)).toBeTruthy();
    expect(screen.getByText(A.delete)).toBeTruthy();
  });

  it('이메일이 없는(옛) 계정은 공급자 이름만 적는다', async () => {
    mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { ...account, email: null, provider: 'APPLE' } });
    await render(<AccountScreen />);
    expect(await screen.findByText(A.providers.APPLE)).toBeTruthy();
  });

  it('계정을 받지 못해도(끊김) 로그아웃 · 계정 삭제는 보인다', async () => {
    mockApi.getMyAccount.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<AccountScreen />);
    await waitFor(() => expect(mockApi.getMyAccount).toHaveBeenCalledTimes(1));
    expect(screen.getByText(A.logout)).toBeTruthy();
    expect(screen.getByText(A.delete)).toBeTruthy();
    expect(screen.queryByText(A.linked)).toBeNull();
  });

  it('닉네임 줄은 닉네임 화면으로, 계정 삭제는 계정 삭제 화면으로 간다', async () => {
    await render(<AccountScreen />);
    await fireEvent.press(await screen.findByText(A.nickname));
    expect(router.push).toHaveBeenLastCalledWith('/my/nickname');
    await fireEvent.press(screen.getByText(A.delete));
    expect(router.push).toHaveBeenLastCalledWith('/my/delete');
  });

  it('프로필 그림 버튼의 읽기 이름은 "프로필 수정"(소유자 2026-11-21)', async () => {
    await render(<AccountScreen />);
    await screen.findByText('새벽별');
    expect(screen.getByRole('button', { name: '프로필 수정' })).toBeTruthy();
  });

  it('프로필 그림을 누르면 고르기 시트(제목 없음), 다른 그림을 확인하면 PATCH 하고 바뀐 그림만 — 성공 알림은 없다(소유자 2026-11-21)', async () => {
    mockApi.updateAccount.mockResolvedValue({ ok: true, data: { ...account, avatar: 5 } });
    await render(<AccountScreen />);
    await screen.findByText('새벽별');
    await fireEvent.press(screen.getByRole('button', { name: A.editAvatar }));
    await fireEvent.press(await screen.findByRole('radio', { name: N.avatars[4] }));
    await fireEvent.press(screen.getByText(N.confirm));
    await waitFor(() => expect(mockApi.updateAccount).toHaveBeenCalledWith({ avatar: 5 }));
    expect(await screen.findByLabelText(N.avatars[4])).toBeTruthy();
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('같은 그림을 확인하면 서버를 부르지 않고, 저장에 실패하면 그림은 그대로 두고 실패 알림', async () => {
    await render(<AccountScreen />);
    await screen.findByText('새벽별');
    await fireEvent.press(screen.getByRole('button', { name: A.editAvatar }));
    await fireEvent.press(await screen.findByText(N.confirm));
    expect(mockApi.updateAccount).not.toHaveBeenCalled();

    mockApi.updateAccount.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await fireEvent.press(screen.getByRole('button', { name: A.editAvatar }));
    await fireEvent.press(await screen.findByRole('radio', { name: N.avatars[0] }));
    await fireEvent.press(screen.getByText(N.confirm));
    expect(await screen.findByText(A.saveFailed)).toBeTruthy();
    expect(screen.getByTestId('toast-icon-error', { includeHiddenElements: true })).toBeTruthy();
  });

  it('로그아웃은 가운데 창으로 묻고, 취소하면 그대로, 로그아웃하면 기기의 것을 비우고 로그인 화면만 남긴다', async () => {
    await AsyncStorage.setItem('byeolmyeong.birth.v1', '{}');
    await render(<AccountScreen />);
    await fireEvent.press(await screen.findByText(A.logout));
    expect(screen.getByText(LO.title)).toBeTruthy();
    await fireEvent.press(screen.getByText(LO.cancel));
    expect(screen.queryByText(LO.title)).toBeNull();
    expect(signOutSession).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText(A.logout));
    await fireEvent.press(within(screen.getByTestId('dialog')).getByRole('button', { name: LO.confirm }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(signOutSession).toHaveBeenCalledTimes(1);
    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('byeolmyeong.birth.v1')).toBeNull();
  });
});

describe('닉네임(/my/nickname, 보드 16-5)', () => {
  const box = () => screen.getByLabelText(strings.my.nickname.title);
  const save = () => screen.getByRole('button', { name: strings.my.nickname.save });
  const disabled = () => save().props.accessibilityState?.disabled;

  it('칸에 지금 닉네임과 글자 수, 아래에 규칙. 이름표는 없고, 바꾸기 전에는 저장이 꺼져 있다', async () => {
    await render(<NicknameScreen />);
    await waitFor(() => expect(box().props.value).toBe('새벽별'));
    expect(screen.getByText('3/10')).toBeTruthy();
    expect(screen.getByText(N.rule)).toBeTruthy();
    // "닉네임" 은 화면 제목 하나뿐 — 칸 위 이름표가 없다(056 의 7)
    expect(screen.getAllByText(N.label)).toHaveLength(1);
    expect(disabled()).toBe(true);
  });

  it('바꾸면 PATCH 하고, 이 화면에 머물며 바뀐 닉네임만 — 성공 알림은 없다(소유자 2026-11-21)', async () => {
    mockApi.updateAccount.mockResolvedValue({ ok: true, data: { ...account, nickname: '별빛' } });
    await render(<NicknameScreen />);
    await waitFor(() => expect(box().props.value).toBe('새벽별'));
    await fireEvent.changeText(box(), '별빛');
    expect(disabled()).toBe(false);
    await fireEvent.press(save());
    await waitFor(() => expect(mockApi.updateAccount).toHaveBeenCalledWith({ nickname: '별빛' }));
    await waitFor(() => expect(box().props.value).toBe('별빛'));
    expect(screen.queryByTestId('toast')).toBeNull();
    expect(disabled()).toBe(true);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('규칙에 어긋나면 칸 아래 안내, 저장이 꺼진다(서버를 부르지 않는다)', async () => {
    await render(<NicknameScreen />);
    await waitFor(() => expect(box().props.value).toBe('새벽별'));
    await fireEvent.changeText(box(), '별1');
    expect(screen.getByText(N.invalidChar)).toBeTruthy();
    expect(disabled()).toBe(true);
    await fireEvent.changeText(box(), '별');
    expect(disabled()).toBe(true);
    expect(mockApi.updateAccount).not.toHaveBeenCalled();
  });

  it.each([
    [409, 'NICKNAME_TAKEN', N.taken],
    [400, 'INVALID_NICKNAME', N.invalidChar],
  ])('서버가 %i %s 면 칸 아래 그 안내, 글을 고치면 지운다', async (status, code, message) => {
    mockApi.updateAccount.mockResolvedValue({ ok: false, error: 'SERVER', status, code });
    await render(<NicknameScreen />);
    await waitFor(() => expect(box().props.value).toBe('새벽별'));
    await fireEvent.changeText(box(), '별빛');
    await fireEvent.press(save());
    expect(await screen.findByText(message)).toBeTruthy();
    expect(disabled()).toBe(true);
    await fireEvent.changeText(box(), '별빛나');
    expect(screen.queryByText(message)).toBeNull();
    expect(disabled()).toBe(false);
  });

  describe('치기를 멈추면 쓸 수 있는지 묻는다(가입처럼, 소유자 2026-11-21)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());
    const typed = async (text: string) => {
      await render(<NicknameScreen />);
      await act(async () => {});
      await fireEvent.changeText(box(), text);
    };

    it('0.5초 멈추면 한 번 묻고, 쓸 수 있으면 칸 아래 초록 안내', async () => {
      await typed('별빛');
      expect(mockApi.checkMyNickname).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(500));
      expect(mockApi.checkMyNickname).toHaveBeenCalledWith('별빛');
      expect(screen.getByText(N.available)).toBeTruthy();
      expect(disabled()).toBe(false);
    });

    it('이미 있으면 빨강 "이미 있는 닉네임" 이고 저장이 꺼진다', async () => {
      mockApi.checkMyNickname.mockResolvedValue({ ok: true, data: { available: false } });
      await typed('별빛');
      await act(async () => jest.advanceTimersByTime(500));
      expect(screen.getByText(N.taken)).toBeTruthy();
      expect(disabled()).toBe(true);
    });

    it('지금 닉네임 그대로거나 규칙에 어긋나면 묻지 않는다', async () => {
      await typed('새벽별');
      await act(async () => jest.advanceTimersByTime(500));
      await fireEvent.changeText(box(), '별1');
      await act(async () => jest.advanceTimersByTime(500));
      expect(mockApi.checkMyNickname).not.toHaveBeenCalled();
    });

    it('"이미 있는 닉네임" 뒤에 공백만 더하면 빨강 · 꺼진 저장을 그대로 둔다(다시 묻지 않으니, #77 리뷰)', async () => {
      mockApi.checkMyNickname.mockResolvedValue({ ok: true, data: { available: false } });
      await typed('별빛');
      await act(async () => jest.advanceTimersByTime(500));
      await fireEvent.changeText(box(), '별빛 ');
      await act(async () => jest.advanceTimersByTime(500));
      expect(screen.getByText(N.taken)).toBeTruthy();
      expect(disabled()).toBe(true);
      expect(mockApi.checkMyNickname).toHaveBeenCalledTimes(1);
    });

    it('앞서 초록이던 값으로 돌아와도 다시 물을 때까지 초록을 보이지 않는다', async () => {
      await typed('별빛');
      await act(async () => jest.advanceTimersByTime(500));
      await fireEvent.changeText(box(), '별빛달');
      await fireEvent.changeText(box(), '별빛');
      expect(screen.queryByText(N.available)).toBeNull();
      await act(async () => jest.advanceTimersByTime(500));
      expect(screen.getByText(N.available)).toBeTruthy();
    });

    it('묻지 못하면(끊김 · 옛 서버) 아무것도 적지 않고 저장할 수 있다 — 판정은 저장 때 서버', async () => {
      mockApi.checkMyNickname.mockResolvedValue({ ok: false, error: 'NETWORK' });
      await typed('별빛');
      await act(async () => jest.advanceTimersByTime(500));
      expect(screen.getByText(N.rule)).toBeTruthy();
      expect(disabled()).toBe(false);
    });
  });

  it('그 밖의 실패는 짧은 알림이고 적던 글은 그대로다(결정 065 의 1)', async () => {
    mockApi.updateAccount.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<NicknameScreen />);
    await waitFor(() => expect(box().props.value).toBe('새벽별'));
    await fireEvent.changeText(box(), '별빛');
    await fireEvent.press(save());
    expect(await screen.findByText(A.saveFailed)).toBeTruthy();
    expect(box().props.value).toBe('별빛');
  });
});

describe('계정 삭제(/my/delete, 보드 16-10)', () => {
  const confirm = () => screen.getByRole('button', { name: D.confirm });

  it('지워지는 것 넷 · 확인 체크 · 위험 버튼(검은 바탕 + 붉은 글자). 체크 전에는 버튼이 꺼져 있다', async () => {
    await render(<DeleteAccountScreen />);
    for (const item of D.items) expect(screen.getByText(item)).toBeTruthy();
    expect(confirm().props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(confirm());
    expect(mockApi.deleteAccount).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(confirm().props.accessibilityState?.disabled).toBe(false);
    expect(StyleSheet.flatten(confirm().props.style).backgroundColor).toBe(Colors.fill);
  });

  it('지우면 기기의 것을 비우고 "계정을 지웠어요", 확인을 누를 때 세션을 비우고 로그인 화면만 남긴다', async () => {
    mockApi.deleteAccount.mockResolvedValue({ ok: true, data: null });
    await AsyncStorage.setItem('byeolmyeong.birth.v1', '{}');
    await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(confirm());
    expect(await screen.findByText(D.doneTitle)).toBeTruthy();
    expect(mockApi.deleteAccount).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('byeolmyeong.birth.v1')).toBeNull();
    // 세션을 먼저 비우면 루트 가드가 이 화면을 로그인으로 바꿔 버린다
    expect(clearSession).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(D.doneConfirm));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(router.dismissAll).toHaveBeenCalledTimes(1);
  });

  it('지운 뒤 뒤로 가기(안드로이드)도 확인과 같다', async () => {
    const handlers: (() => boolean)[] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, handler) => {
      handlers.push(handler as () => boolean);
      return { remove: jest.fn() };
    });
    mockApi.deleteAccount.mockResolvedValue({ ok: true, data: null });
    await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(confirm());
    await screen.findByText(D.doneTitle);
    let handled = false;
    await act(async () => {
      handled = handlers[handlers.length - 1]();
    });
    expect(handled).toBe(true);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(clearSession).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('지우는 동안에는 뒤로 갈 수 없다(머리 꺾쇠 · 안드로이드 뒤로)', async () => {
    const handlers: (() => boolean)[] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, handler) => {
      handlers.push(handler as () => boolean);
      return { remove: jest.fn() };
    });
    let finish: (r: { ok: true; data: null }) => void = () => {};
    mockApi.deleteAccount.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(confirm());
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(router.back).not.toHaveBeenCalled();
    expect(handlers.length).toBeGreaterThan(0);
    expect(handlers[handlers.length - 1]()).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
    await act(async () => finish({ ok: true, data: null }));
    expect(await screen.findByText(D.doneTitle)).toBeTruthy();
    spy.mockRestore();
  });

  it('지우는 중에 화면을 떠났어도(웹의 뒤로 등) 지우기가 끝나면 곧바로 세션을 비우고 로그인으로 간다', async () => {
    let finish: (r: { ok: true; data: null }) => void = () => {};
    mockApi.deleteAccount.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const view = await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(confirm());
    await view.unmount();
    await act(async () => finish({ ok: true, data: null }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it('주소로 바로 열어 돌아갈 곳이 없으면 뒤로 가기는 계정 화면으로 바꾼다', async () => {
    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(router.replace).toHaveBeenCalledWith('/my/account');
  });

  it('지우는 동안에는 다시 누를 수 없다', async () => {
    let finish: (r: { ok: true; data: null }) => void = () => {};
    mockApi.deleteAccount.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(confirm());
    await fireEvent.press(confirm());
    expect(mockApi.deleteAccount).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ok: true, data: null }));
    expect(await screen.findByText(D.doneTitle)).toBeTruthy();
  });

  it.each([
    ['NETWORK', D.failed.NETWORK],
    ['SERVER', D.failed.OTHER],
  ] as const)('지우지 못하면(%s) 짧은 알림, 기기의 것은 그대로, 다시 누르면 다시 요청한다', async (error, message) => {
    mockApi.deleteAccount.mockResolvedValue({ ok: false, error });
    await AsyncStorage.setItem('byeolmyeong.birth.v1', '{}');
    await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(confirm());
    expect(await screen.findByText(message)).toBeTruthy();
    expect(await AsyncStorage.getItem('byeolmyeong.birth.v1')).toBe('{}');
    expect(screen.queryByText(D.doneTitle)).toBeNull();
    mockApi.deleteAccount.mockResolvedValue({ ok: true, data: null });
    await fireEvent.press(confirm());
    expect(await screen.findByText(D.doneTitle)).toBeTruthy();
    expect(mockApi.deleteAccount).toHaveBeenCalledTimes(2);
  });
});
