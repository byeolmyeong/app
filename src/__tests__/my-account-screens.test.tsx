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
import { api, type MyAccount } from '@/lib/api';

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
  api: { getMyAccount: jest.fn(), updateAccount: jest.fn(), deleteAccount: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const A = strings.my.account;
const LO = strings.my.logout;
const N = strings.nickname;
const D = strings.my.delete;
const account: MyAccount = { nickname: '새벽별', avatar: 3, email: 'dawnstar@kakao.com', provider: 'KAKAO', marketingConsent: false };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: account });
});

describe('계정(/my/account, 보드 16-1)', () => {
  it('프로필 그림 · 닉네임 · 연결된 계정(공급자 + 가린 이메일) / 로그아웃 / 맨 아래 계정 삭제를 보인다', async () => {
    await render(<AccountScreen />);
    expect(await screen.findByText('새벽별')).toBeTruthy();
    expect(screen.getByLabelText(N.avatars[2])).toBeTruthy();
    expect(screen.getByText(A.linked)).toBeTruthy();
    expect(screen.getByText('dawn****@kakao.com')).toBeTruthy();
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

  it('프로필 그림을 누르면 고르기 시트(제목 없음), 다른 그림을 확인하면 PATCH 하고 "프로필을 바꿨어요"', async () => {
    mockApi.updateAccount.mockResolvedValue({ ok: true, data: { ...account, avatar: 5 } });
    await render(<AccountScreen />);
    await screen.findByText('새벽별');
    await fireEvent.press(screen.getByRole('button', { name: A.editAvatar }));
    await fireEvent.press(await screen.findByRole('radio', { name: N.avatars[4] }));
    await fireEvent.press(screen.getByText(N.confirm));
    await waitFor(() => expect(mockApi.updateAccount).toHaveBeenCalledWith({ avatar: 5 }));
    expect(await screen.findByText(A.avatarSaved)).toBeTruthy();
    expect(screen.getByLabelText(N.avatars[4])).toBeTruthy();
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

  it('바꾸면 PATCH 하고, 이 화면에 머물며 "닉네임을 바꿨어요"', async () => {
    mockApi.updateAccount.mockResolvedValue({ ok: true, data: { ...account, nickname: '별빛' } });
    await render(<NicknameScreen />);
    await waitFor(() => expect(box().props.value).toBe('새벽별'));
    await fireEvent.changeText(box(), '별빛');
    expect(disabled()).toBe(false);
    await fireEvent.press(save());
    await waitFor(() => expect(mockApi.updateAccount).toHaveBeenCalledWith({ nickname: '별빛' }));
    expect(await screen.findByText(strings.my.nickname.saved)).toBeTruthy();
    expect(box().props.value).toBe('별빛');
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
