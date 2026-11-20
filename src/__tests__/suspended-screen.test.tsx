import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AppState } from 'react-native';

import NewInquiryScreen from '@/app/my/inquiries/new';
import SuspendedScreen from '@/app/suspended';
import { strings } from '@/content/strings';
import { clearSuspended, isSuspended, markSuspended } from '@/features/auth/suspension';
import { SuspensionGate } from '@/features/auth/suspension-gate';
import { signOutSession } from '@/features/auth/use-session';
import { api, type MyAccount } from '@/lib/api';

const mockSegments = { value: [] as string[] };
const mockSession = { status: 'signedIn' as string };
/** lib/api 가 403 · suspended 를 받으면 부르는 것 — 문이 건다 */
const mockHandler: { current: (() => void) | null } = { current: null };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => true), dismissAll: jest.fn(), dismissTo: jest.fn() },
  useSegments: jest.fn(() => mockSegments.value),
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: mockSession.status })),
  signOutSession: jest.fn(async () => {}),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  setSuspendedHandler: jest.fn((handler: (() => void) | null) => {
    mockHandler.current = handler;
  }),
  api: { getMyAccount: jest.fn(), createInquiry: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const T = strings.suspended;
const account: MyAccount = { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false };
/** 진짜 lib/api 처럼: 계정이 정지면 정지 알림을 부르고 돌려준다 */
const answerAccount = (suspended: boolean) =>
  mockApi.getMyAccount.mockImplementation(async () => {
    if (suspended) mockHandler.current?.();
    return { ok: true, data: { ...account, suspended } };
  });

let appStateHandler: (state: string) => void = () => {};
beforeEach(() => {
  jest.clearAllMocks();
  clearSuspended();
  mockSegments.value = [];
  mockSession.status = 'signedIn';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler as (state: string) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});
afterEach(() => jest.restoreAllMocks());

describe('이용 정지 문(결정 065 의 5)', () => {
  it('로그인이 확인되면 계정을 한 번 묻고, 정지면 쌓인 화면을 걷고 정지 화면으로 바꾼다', async () => {
    answerAccount(true);
    await render(<SuspensionGate />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/suspended'));
    expect(router.dismissAll).toHaveBeenCalled();
    expect(mockApi.getMyAccount).toHaveBeenCalledTimes(1);
    expect(isSuspended()).toBe(true);
  });

  it('정지가 아니면 아무 데로도 보내지 않는다', async () => {
    answerAccount(false);
    await render(<SuspensionGate />);
    await waitFor(() => expect(mockApi.getMyAccount).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('어느 요청이든 403 ACCOUNT_SUSPENDED 가 오면(lib/api 의 알림) 정지 화면으로', async () => {
    answerAccount(false);
    mockSegments.value = ['my', 'account'];
    await render(<SuspensionGate />);
    await waitFor(() => expect(mockHandler.current).not.toBeNull());
    await act(async () => mockHandler.current?.());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/suspended'));
  });

  it('정지 중에도 새 문의 · 문의 내역에는 머문다(서버가 열어 둔다)', async () => {
    answerAccount(true);
    mockSegments.value = ['my', 'inquiries', 'new'];
    await render(<SuspensionGate />);
    await waitFor(() => expect(isSuspended()).toBe(true));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('정지 중에 앱이 앞으로 돌아와 풀렸으면 표시를 끄고 홈으로', async () => {
    answerAccount(true);
    mockSegments.value = ['suspended'];
    const view = await render(<SuspensionGate />);
    await waitFor(() => expect(isSuspended()).toBe(true));
    answerAccount(false);
    await act(async () => appStateHandler('active'));
    await waitFor(() => expect(isSuspended()).toBe(false));
    await view.rerender(<SuspensionGate />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('로그인 전이 되면(로그아웃 · 탈퇴) 표시를 끄고 묻지 않는다', async () => {
    markSuspended();
    mockSession.status = 'signedOut';
    await render(<SuspensionGate />);
    expect(isSuspended()).toBe(false);
    expect(mockApi.getMyAccount).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('이용이 정지된 계정(/suspended, 보드 22)', () => {
  it('제목 · 두 줄 설명 · 맨 아래 "문의하기" · 그 위 "로그아웃". 머리 · 뒤로는 없다', async () => {
    await render(<SuspendedScreen />);
    expect(screen.getByText(T.title)).toBeTruthy();
    expect(screen.getByText(T.body)).toBeTruthy();
    expect(screen.queryByRole('button', { name: strings.common.backLabel })).toBeNull();
    expect(screen.queryByTestId('nav-bar')).toBeNull();
    const shown = JSON.stringify(screen.toJSON());
    expect(shown.indexOf(T.logout)).toBeLessThan(shown.indexOf(T.inquiry));
  });

  it('"문의하기" 는 새 문의로 간다', async () => {
    await render(<SuspendedScreen />);
    await fireEvent.press(screen.getByText(T.inquiry));
    expect(router.push).toHaveBeenCalledWith('/my/inquiries/new');
  });

  it('"로그아웃" 은 세션을 지우고 정지 표시를 끈 뒤 로그인 화면만 남긴다', async () => {
    markSuspended();
    await render(<SuspendedScreen />);
    await fireEvent.press(screen.getByText(T.logout));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(signOutSession).toHaveBeenCalledTimes(1);
    expect(isSuspended()).toBe(false);
    expect(router.dismissAll).toHaveBeenCalled();
  });

  it('정지 중에 새 문의를 보내면 "확인" 으로 정지 화면에 돌아간다', async () => {
    markSuspended();
    mockApi.createInquiry.mockResolvedValue({ ok: true, data: { id: 'c' } });
    await render(<NewInquiryScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: strings.inquiry.categories.ACCOUNT }));
    await fireEvent.changeText(screen.getByLabelText(strings.inquiry.form.bodyLabel), '정지된 이유가 궁금해요. 확인해 주세요.');
    await fireEvent.press(screen.getByRole('button', { name: strings.inquiry.form.submit }));
    await fireEvent.press(await screen.findByText(strings.inquiry.sent.back));
    expect(router.dismissTo).toHaveBeenCalledWith('/suspended');
    expect(screen.queryByText(strings.inquiry.sent.toList)).toBeNull();
  });
});
