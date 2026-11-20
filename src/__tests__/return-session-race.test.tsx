import { render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import GoogleReturn from '@/app/auth/google';
import KakaoReturn from '@/app/auth/kakao';
import type { Session } from '@/features/auth/session-store';
import { takeGoogleRequest, takeUrlFragment } from '@/features/auth/providers/web-redirect';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), setParams: jest.fn() }, useLocalSearchParams: jest.fn(() => ({})) }));
jest.mock('@/features/auth/providers/web-redirect', () => ({
  ...jest.requireActual('@/features/auth/providers/web-redirect'),
  takeUrlFragment: jest.fn(() => ''),
  takeGoogleRequest: jest.fn(() => ({ state: 'st-1', nonce: 'n-1' })),
  takeKakaoState: jest.fn(() => 'k-st'),
  webOrigin: jest.fn(() => 'https://byeolmyeong.com'),
}));

/** 서버 흉내: 세션 확인은 시험이 정한 때에 401, 로그인은 바로 성공 */
const mockServer = { getSession: jest.fn(), login: jest.fn() };
// 진짜 세션 저장소에 서버만 바꿔 끼운다(웹 — 쿠키 세션)
jest.mock('@/features/auth/use-session', () => {
  const { createSessionStore } = jest.requireActual('@/features/auth/session-store');
  const make = () => createSessionStore({
    devSession: false,
    cookieSession: true,
    createDevSession: jest.fn(),
    login: (credential: unknown) => mockServer.login(credential),
    signup: jest.fn(),
    checkNickname: jest.fn(),
    getSession: () => mockServer.getSession(),
    logout: jest.fn(),
    loadToken: jest.fn(async () => null),
    saveToken: jest.fn(async () => {}),
    deleteToken: jest.fn(async () => {}),
    setApiToken: jest.fn(),
    saveLastProvider: jest.fn(async () => {}),
    loadSignup: jest.fn(async () => null),
    saveSignup: jest.fn(async () => {}),
    clearSignup: jest.fn(async () => {}),
  });
  let store = make();
  return {
    /** 시험마다 새 저장소(켤 때의 확인은 저장소마다 한 번만 돈다) */
    mockNewStore: () => (store = make()),
    mockStore: () => store,
    getSession: () => store.getSnapshot(),
    useAuth: () => ({ status: store.getSnapshot().status, lastError: null, signIn: (c: never) => store.signIn(c) }),
    whenSessionChecked: () => store.start(),
  };
});
const { mockNewStore, mockStore } = jest.requireMock('@/features/auth/use-session') as {
  mockNewStore: () => void;
  mockStore: () => { start: () => Promise<void>; getSnapshot: () => Session };
};
beforeEach(() => {
  jest.clearAllMocks();
  mockNewStore();
});

const idToken = (nonce: string) =>
  `h.${btoa(JSON.stringify({ nonce }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}.s`;

// 돌아오는 화면은 페이지를 새로 열어 세션 확인(GET /auth/session)과 로그인(POST /auth/login)이 거의 함께 나간다(리뷰 #58).
// 로그인 응답이 먼저 오고 세션의 401 이 늦게 와도 로그인 상태여야 한다 — 화면이 세션 시작 확인이 끝난 뒤에 로그인한다.
describe('돌아오는 화면 · 세션 시작 확인 경합', () => {
  it('구글: 세션의 401 이 로그인 응답보다 늦게 와도 로그인 상태로 홈에 간다', async () => {
    let answerSession: (r: unknown) => void = () => {};
    mockServer.getSession.mockImplementation(() => new Promise((resolve) => (answerSession = resolve)));
    mockServer.login.mockResolvedValue({ ok: true, data: { status: 'SIGNED_IN', token: null } });
    (takeUrlFragment as jest.Mock).mockReturnValue(`#id_token=${idToken('n-1')}&state=st-1`);
    (takeGoogleRequest as jest.Mock).mockReturnValue({ state: 'st-1', nonce: 'n-1' });

    void mockStore().start(); // 루트 레이아웃이 켤 때 시작한 세션 확인(아직 응답 없음)
    await render(<GoogleReturn />);
    await new Promise((r) => setTimeout(r, 0));
    answerSession({ ok: false, error: 'LOGIN_REQUIRED', status: 401 });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(mockStore().getSnapshot().status).toBe('signedIn');
    expect(mockServer.login).toHaveBeenCalledTimes(1);
  });

  it('카카오: 세션의 401 이 로그인 응답보다 늦게 와도 로그인 상태로 홈에 간다(같은 원인)', async () => {
    let answerSession: (r: unknown) => void = () => {};
    mockServer.getSession.mockImplementation(() => new Promise((resolve) => (answerSession = resolve)));
    mockServer.login.mockResolvedValue({ ok: true, data: { status: 'SIGNED_IN', token: null } });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ code: 'k-code', state: 'k-st' });

    void mockStore().start();
    await render(<KakaoReturn />);
    await new Promise((r) => setTimeout(r, 0));
    answerSession({ ok: false, error: 'LOGIN_REQUIRED', status: 401 });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(mockStore().getSnapshot().status).toBe('signedIn');
  });

  // 서버는 웹 구글 토큰의 jti 를 한 번만 받는다(서버 결정 047) — 두 번째로 보내면 401 이 성공한 로그인을 덮는다
  it('구글: 처리한 뒤 다시 마운트돼도(조각은 이미 지워짐) 토큰은 한 번만 보내고 실패 안내로 가지 않는다', async () => {
    mockServer.getSession.mockResolvedValue({ ok: false, error: 'LOGIN_REQUIRED', status: 401 });
    mockServer.login
      .mockResolvedValueOnce({ ok: true, data: { status: 'SIGNED_IN', token: null } })
      .mockResolvedValue({ ok: false, error: 'LOGIN_REQUIRED', status: 401, code: 'INVALID_ID_TOKEN' });
    (takeUrlFragment as jest.Mock).mockReturnValueOnce(`#id_token=${idToken('n-1')}&state=st-1&again=1`).mockReturnValue('');
    (takeGoogleRequest as jest.Mock).mockReturnValueOnce({ state: 'st-1', nonce: 'n-1' }).mockReturnValue(null);

    void mockStore().start();
    const first = await render(<GoogleReturn />);
    await first.unmount();
    await render(<GoogleReturn />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(mockServer.login).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalledWith('/login?failed=1');
    expect(mockStore().getSnapshot().status).toBe('signedIn');
  });
});
