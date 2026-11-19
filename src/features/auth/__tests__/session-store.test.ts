import { createSessionStore, type SessionStoreDeps } from '@/features/auth/session-store';
import type { ApiResult, LoginResult } from '@/lib/api';

type Overrides = Partial<SessionStoreDeps> & { stored?: string | null };

const ok = <T,>(data: T) => ({ ok: true as const, data });
const fail = (error: 'LOGIN_REQUIRED' | 'SERVER' | 'NETWORK', status?: number, code?: string) =>
  ({ ok: false as const, error, ...(status ? { status } : {}), ...(code ? { code } : {}) });

function setup({ stored = null, ...overrides }: Overrides = {}) {
  let kept: string | null = stored;
  const deps = {
    devSession: false,
    cookieSession: false,
    createDevSession: jest.fn(async () => ok({ token: 'dev-token' as string | null })),
    login: jest.fn(async (): Promise<ApiResult<LoginResult>> => ok({ status: 'SIGNED_IN' as const, token: 'session-token' })),
    signup: jest.fn(async () => ok({ token: 'new-session' as string | null })),
    checkNickname: jest.fn(async () => ok({ available: true })),
    getSession: jest.fn(async (): Promise<ApiResult<null>> => ok(null)),
    logout: jest.fn(async (): Promise<ApiResult<null>> => ok(null)),
    loadToken: jest.fn(async () => kept),
    saveToken: jest.fn(async (token: string) => {
      kept = token;
    }),
    deleteToken: jest.fn(async () => {
      kept = null;
    }),
    setApiToken: jest.fn(),
    ...overrides,
  } satisfies SessionStoreDeps;
  return { deps, store: createSessionStore(deps), kept: () => kept };
}

const birth = { date: '1995-05-05', time: null, placeId: null };
const values = {
  nickname: '새벽별',
  avatar: 2 as const,
  termsVersion: '2026-11-19',
  privacyVersion: '2026-11-19',
  pushConsent: false,
  marketingConsent: true,
};
/** 가입 단계에서 모은 것 전부(결정 041) */
const signupInput = { birth, ...values };
const google = { provider: 'GOOGLE' as const, idToken: 'g' };

describe('개발용 세션(결정 017)', () => {
  it('켜져 있으면 시작할 때 토큰을 받아 보안 저장소에 두고 api 에 건넨다', async () => {
    const { deps, store, kept } = setup({ devSession: true });
    expect(store.getSnapshot()).toMatchObject({ status: 'checking', token: null, ready: false });
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn', token: 'dev-token', ready: true });
    expect(deps.createDevSession).toHaveBeenCalledTimes(1);
    expect(kept()).toBe('dev-token');
    expect(deps.setApiToken).toHaveBeenLastCalledWith('dev-token');
  });

  it('보관된 토큰이 있으면 그것을 쓰고 새로 받지 않는다', async () => {
    const { deps, store } = setup({ devSession: true, stored: 'kept-token' });
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn', token: 'kept-token' });
    expect(deps.createDevSession).not.toHaveBeenCalled();
  });

  it('여러 번 시작해도 한 번만 받는다', async () => {
    const { deps, store } = setup({ devSession: true });
    await Promise.all([store.start(), store.start()]);
    await store.start();
    expect(deps.createDevSession).toHaveBeenCalledTimes(1);
  });

  it('받지 못하면 로그인 전으로 준비가 끝난다', async () => {
    const { deps, store } = setup({ devSession: true, createDevSession: jest.fn(async () => fail('SERVER', 404)) });
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', token: null, ready: true });
    expect(deps.saveToken).not.toHaveBeenCalled();
  });

  it('401 이면 새로 받아 바꿔 둔다. 동시에 여러 번 불러도 한 번만 받는다', async () => {
    const { deps, store, kept } = setup({ devSession: true, stored: 'expired-token' });
    await store.start();
    expect(await Promise.all([store.refresh(), store.refresh()])).toEqual([true, true]);
    expect(deps.createDevSession).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn', token: 'dev-token' });
    expect(kept()).toBe('dev-token');
  });

  it('웹은 쿠키로 받아 토큰 없이 로그인 상태가 된다', async () => {
    const { deps, store } = setup({ devSession: true, cookieSession: true, createDevSession: jest.fn(async () => ok({ token: null })) });
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn', token: null });
    expect(deps.saveToken).not.toHaveBeenCalled();
    expect(deps.loadToken).not.toHaveBeenCalled();
  });
});

describe('시작할 때 세션 확인(소셜 로그인)', () => {
  it('앱: 보관된 토큰이 살아 있으면 로그인 상태다', async () => {
    const { deps, store } = setup({ stored: 'kept-token' });
    await store.start();
    expect(deps.setApiToken).toHaveBeenCalledWith('kept-token');
    expect(deps.getSession).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn', token: 'kept-token', ready: true });
    expect(deps.createDevSession).not.toHaveBeenCalled();
  });

  it('앱: 서버가 401 이면 보관된 토큰을 지우고 로그인 전이다', async () => {
    const { store, kept } = setup({ stored: 'expired', getSession: jest.fn(async () => fail('LOGIN_REQUIRED', 401)) });
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', token: null });
    expect(kept()).toBeNull();
  });

  it('앱: 서버에 닿지 못하면 보관된 토큰을 믿는다(다음 401 에서 로그인 전이 된다)', async () => {
    const { store } = setup({ stored: 'kept-token', getSession: jest.fn(async () => fail('NETWORK')) });
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn', token: 'kept-token' });
  });

  it('앱: 보관된 토큰이 없으면 서버를 부르지 않고 로그인 전이다', async () => {
    const { deps, store } = setup();
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', token: null, ready: true });
    expect(deps.getSession).not.toHaveBeenCalled();
  });

  it('웹: 쿠키 세션이 살아 있으면 토큰 없이 로그인 상태, 아니면 로그인 전이다', async () => {
    const alive = setup({ cookieSession: true });
    await alive.store.start();
    expect(alive.store.getSnapshot()).toMatchObject({ status: 'signedIn', token: null });
    expect(alive.deps.loadToken).not.toHaveBeenCalled();

    const gone = setup({ cookieSession: true, getSession: jest.fn(async () => fail('LOGIN_REQUIRED', 401)) });
    await gone.store.start();
    expect(gone.store.getSnapshot()).toMatchObject({ status: 'signedOut' });
  });
});

describe('로그인 · 가입 · 로그아웃', () => {
  it('계정이 있으면 토큰을 보관하고 로그인 상태가 된다', async () => {
    const { deps, store, kept } = setup();
    await store.start();
    expect(await store.signIn(google)).toBe('signedIn');
    expect(deps.login).toHaveBeenCalledWith(google);
    expect(kept()).toBe('session-token');
    expect(deps.setApiToken).toHaveBeenLastCalledWith('session-token');
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn', token: 'session-token', lastError: null });
  });

  it('처음 온 사람은 가입 중이 되고, 출생 정보로 가입을 마치면 로그인 상태다', async () => {
    const { deps, store, kept } = setup({ login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })) });
    await store.start();
    expect(await store.signIn(google)).toBe('signingUp');
    expect(store.getSnapshot()).toMatchObject({ status: 'signingUp', token: null });

    expect(await store.completeSignup(signupInput)).toEqual({ ok: true, data: { token: 'new-session' } });
    expect(deps.signup).toHaveBeenCalledWith('ticket', birth, values);
    expect(kept()).toBe('new-session');
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn', token: 'new-session' });
  });

  it('만 14세 미만이면 가입권을 버리되 화면에 이유를 보여 주게 가입 중에 머문다. 다음 동작은 로그인 전으로(이유 그대로)', async () => {
    const { deps, store } = setup({
      login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })),
      signup: jest.fn(async () => fail('SERVER', 403, 'UNDER_AGE')),
    });
    await store.start();
    await store.signIn(google);
    expect(await store.completeSignup(signupInput)).toMatchObject({ ok: false, code: 'UNDER_AGE' });
    expect(store.getSnapshot()).toMatchObject({ status: 'signingUp', token: null, lastError: 'UNDER_AGE' });
    expect(deps.saveToken).not.toHaveBeenCalled();
    // 서버가 가입권을 지웠으니 다시 보내지 않고, 로그인 화면이 만 14세 안내를 보여 주게 이유를 남긴다
    expect(await store.completeSignup(signupInput)).toEqual({ ok: false, error: 'LOGIN_REQUIRED', code: 'SIGNUP_EXPIRED' });
    expect(deps.signup).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', lastError: 'UNDER_AGE' });
  });

  it('만 14세 미만 뒤 닉네임 단계로 돌아가 확인해도 서버를 부르지 않고 로그인 전으로', async () => {
    const { deps, store } = setup({
      login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })),
      signup: jest.fn(async () => fail('SERVER', 403, 'UNDER_AGE')),
    });
    await store.start();
    await store.signIn(google);
    await store.completeSignup(signupInput);
    expect(await store.checkNickname('새벽별')).toMatchObject({ ok: false, code: 'SIGNUP_EXPIRED' });
    expect(deps.checkNickname).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', lastError: 'UNDER_AGE' });
  });

  it('닉네임 · 약관 · 프로필이 거절되면(400 · 409, 가입권은 남는다) 가입 중에 머물러 고쳐 다시 보낼 수 있다', async () => {
    const signup = jest
      .fn()
      .mockResolvedValueOnce(fail('SERVER', 409, 'NICKNAME_TAKEN'))
      .mockResolvedValueOnce(fail('SERVER', 400, 'TERMS_REQUIRED'))
      .mockResolvedValueOnce(ok({ token: 'new-session' }));
    const { store } = setup({ login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })), signup });
    await store.start();
    await store.signIn(google);
    await store.completeSignup(signupInput);
    expect(store.getSnapshot()).toMatchObject({ status: 'signingUp', lastError: 'NICKNAME_TAKEN' });
    await store.completeSignup(signupInput);
    expect(store.getSnapshot()).toMatchObject({ status: 'signingUp', lastError: 'TERMS_REQUIRED' });
    await store.completeSignup(signupInput);
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn' });
    expect(signup).toHaveBeenCalledTimes(3);
    expect(signup).toHaveBeenLastCalledWith('ticket', birth, values);
  });

  it('가입을 그만두면(약관 단계에서 뒤로) 가입권을 버리고 이유 없이 로그인 전으로 간다(결정 041)', async () => {
    const { deps, store } = setup({ login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })) });
    await store.start();
    await store.signIn(google);
    await store.cancelSignup();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', token: null, lastError: null });
    expect(await store.completeSignup(signupInput)).toMatchObject({ ok: false, code: 'SIGNUP_EXPIRED' });
    expect(deps.signup).not.toHaveBeenCalled();
  });

  it('닉네임 확인은 메모리의 가입권으로 묻는다. 가입권이 없거나 만료면 로그인 전으로(결정 041)', async () => {
    const checkNickname = jest
      .fn()
      .mockResolvedValueOnce(ok({ available: false }))
      .mockResolvedValueOnce(fail('LOGIN_REQUIRED', 401, 'SIGNUP_EXPIRED'));
    const { store } = setup({ login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })), checkNickname });
    await store.start();
    expect(await store.checkNickname('새벽별')).toMatchObject({ ok: false, code: 'SIGNUP_EXPIRED' });
    expect(checkNickname).not.toHaveBeenCalled();
    await store.signIn(google);
    expect(await store.checkNickname('새벽별')).toEqual({ ok: true, data: { available: false } });
    expect(checkNickname).toHaveBeenCalledWith('ticket', '새벽별');
    expect(store.getSnapshot()).toMatchObject({ status: 'signingUp' });
    await store.checkNickname('새벽별');
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', lastError: 'SIGNUP_EXPIRED' });
  });

  it('가입권이 만료됐으면 로그인 전으로 돌아간다', async () => {
    const { store } = setup({
      login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })),
      signup: jest.fn(async () => fail('LOGIN_REQUIRED', 401, 'SIGNUP_EXPIRED')),
    });
    await store.start();
    await store.signIn(google);
    await store.completeSignup(signupInput);
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', lastError: 'SIGNUP_EXPIRED' });
  });

  it('출생 정보가 틀렸거나 네트워크가 끊겼으면 가입 중에 머물러 다시 보낼 수 있다', async () => {
    const signup = jest
      .fn()
      .mockResolvedValueOnce(fail('SERVER', 400, 'INVALID_DATE'))
      .mockResolvedValueOnce(fail('NETWORK'))
      .mockResolvedValueOnce(ok({ token: 'new-session' }));
    const { store } = setup({ login: jest.fn(async () => ok({ status: 'SIGNUP_REQUIRED' as const, signupToken: 'ticket' })), signup });
    await store.start();
    await store.signIn(google);
    expect(await store.completeSignup(signupInput)).toMatchObject({ ok: false, code: 'INVALID_DATE' });
    expect(store.getSnapshot()).toMatchObject({ status: 'signingUp' });
    await store.completeSignup(signupInput);
    expect(store.getSnapshot()).toMatchObject({ status: 'signingUp' });
    await store.completeSignup(signupInput);
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn' });
    expect(signup).toHaveBeenCalledTimes(3);
  });

  it('로그인에 실패하면 로그인 전에 머물고 이유를 남긴다', async () => {
    const { store } = setup({ login: jest.fn(async () => fail('LOGIN_REQUIRED', 401, 'INVALID_ID_TOKEN')) });
    await store.start();
    expect(await store.signIn(google)).toBe('failed');
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', lastError: 'INVALID_ID_TOKEN' });
  });

  it('웹은 토큰 없이 로그인 · 가입하고 기기에 아무것도 두지 않는다', async () => {
    const { deps, store } = setup({
      cookieSession: true,
      getSession: jest.fn(async () => fail('LOGIN_REQUIRED', 401)),
      login: jest.fn(async () => ok({ status: 'SIGNED_IN' as const, token: null })),
    });
    await store.start();
    await store.signIn(google);
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn', token: null });
    expect(deps.saveToken).not.toHaveBeenCalled();
  });

  it('로그아웃은 서버 세션을 지우고 보관된 토큰도 지운다. 서버가 실패해도 기기에서는 로그아웃한다', async () => {
    const { deps, store, kept } = setup({ stored: 'kept-token', logout: jest.fn(async () => fail('NETWORK')) });
    await store.start();
    await store.signOut();
    expect(deps.logout).toHaveBeenCalledTimes(1);
    expect(kept()).toBeNull();
    expect(deps.setApiToken).toHaveBeenLastCalledWith(null);
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', token: null });
  });

  it('소셜 로그인 중 서버가 401 을 주면 다시 받지 않고 로그인 전이 된다', async () => {
    const { deps, store, kept } = setup({ stored: 'kept-token' });
    await store.start();
    expect(await store.refresh()).toBe(false);
    expect(deps.createDevSession).not.toHaveBeenCalled();
    expect(kept()).toBeNull();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', token: null });
  });

  it('계정을 지우면 보관된 토큰을 지우고 로그인 전이 된다', async () => {
    const { store, kept } = setup({ stored: 'kept-token' });
    await store.start();
    const listener = jest.fn();
    store.subscribe(listener);
    await store.clear();
    expect(kept()).toBeNull();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedOut', token: null });
    expect(listener).toHaveBeenCalled();
  });
});
