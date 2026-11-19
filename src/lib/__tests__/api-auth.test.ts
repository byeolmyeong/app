import { createApi } from '@/lib/api';

const BASE = 'https://api.example.test';

function fakeFetch(status: number, body?: unknown) {
  return jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.MockedFunction<typeof fetch>;
}

const initOf = (fetchFn: jest.MockedFunction<typeof fetch>, i = 0) => fetchFn.mock.calls[i][1] ?? {};
const headersOf = (fetchFn: jest.MockedFunction<typeof fetch>, i = 0) => (initOf(fetchFn, i).headers ?? {}) as Record<string, string>;
const bodyOf = (fetchFn: jest.MockedFunction<typeof fetch>, i = 0) => JSON.parse(String(initOf(fetchFn, i).body));

const birth = { date: '1995-05-05', time: '14:30', placeId: 1841277 };

// 소셜 로그인 · 가입 · 세션(결정 034, 서버 결정 021)
describe('api: 웹은 쿠키 세션이라 토큰을 만지지 않는다', () => {
  const web = (fetchFn: jest.MockedFunction<typeof fetch>) =>
    createApi({ baseUrl: BASE, fetchFn, getToken: () => 'leftover-token', cookieSession: true });

  it('모든 요청에 쿠키를 싣고 Authorization 헤더는 붙이지 않는다', async () => {
    const fetchFn = fakeFetch(200, { timeKnown: false, houseSystem: 'PLACIDUS', positions: [], points: [], aspects: [] });
    await web(fetchFn).createChart(birth);
    expect(initOf(fetchFn).credentials).toBe('include');
    expect(headersOf(fetchFn)).not.toHaveProperty('Authorization');
  });

  it('로그인 · 가입 · 개발용 로그인에 cookie: true 를 보내고, 서버가 토큰을 줘도 버린다', async () => {
    const login = fakeFetch(200, { status: 'SIGNED_IN', token: 'should-not-be-kept' });
    expect(await web(login).login({ provider: 'GOOGLE', idToken: 'g' })).toEqual({ ok: true, data: { status: 'SIGNED_IN', token: null } });
    expect(bodyOf(login)).toEqual({ provider: 'GOOGLE', idToken: 'g', cookie: true });

    const signup = fakeFetch(201, {});
    expect(await web(signup).signup('ticket', birth)).toEqual({ ok: true, data: { token: null } });
    expect(bodyOf(signup)).toEqual({ signupToken: 'ticket', ...birth, cookie: true });

    const dev = fakeFetch(200, {});
    expect(await web(dev).createDevSession()).toEqual({ ok: true, data: { token: null } });
    expect(bodyOf(dev)).toEqual({ cookie: true });
  });
});

describe('api: 앱은 토큰을 본문으로 받고 헤더로 보낸다', () => {
  const app = (fetchFn: jest.MockedFunction<typeof fetch>, token: string | null = null) =>
    createApi({ baseUrl: BASE, fetchFn, getToken: () => token });

  it('POST /auth/login 은 세션 헤더 없이 자격 증명만 보내고 계정이 있으면 세션 토큰을 받는다', async () => {
    const fetchFn = fakeFetch(200, { status: 'SIGNED_IN', token: 'session-1' });
    expect(await app(fetchFn, 'old').login({ provider: 'APPLE', idToken: 'a', authorizationCode: 'c' })).toEqual({
      ok: true,
      data: { status: 'SIGNED_IN', token: 'session-1' },
    });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/auth/login`);
    expect(initOf(fetchFn).method).toBe('POST');
    expect(bodyOf(fetchFn)).toEqual({ provider: 'APPLE', idToken: 'a', authorizationCode: 'c' });
    expect(headersOf(fetchFn)).not.toHaveProperty('Authorization');
    expect(initOf(fetchFn).credentials).toBeUndefined();
  });

  it('처음 온 사람은 가입권을 받는다', async () => {
    const fetchFn = fakeFetch(200, { status: 'SIGNUP_REQUIRED', signupToken: 'ticket', expiresAt: '2026-11-18T10:30:00Z' });
    expect(await app(fetchFn).login({ provider: 'KAKAO', code: 'k', redirectUri: 'https://byeolmyeong.com/auth/kakao' })).toEqual({
      ok: true,
      data: { status: 'SIGNUP_REQUIRED', signupToken: 'ticket' },
    });
  });

  it('POST /auth/nickname-check 는 세션 헤더 없이 가입권과 닉네임만 보내고 쓸 수 있는지 받는다(결정 041)', async () => {
    const fetchFn = fakeFetch(200, { available: false });
    expect(await app(fetchFn, 'old').checkNickname('ticket', '새벽별')).toEqual({ ok: true, data: { available: false } });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/auth/nickname-check`);
    expect(initOf(fetchFn).method).toBe('POST');
    expect(bodyOf(fetchFn)).toEqual({ signupToken: 'ticket', nickname: '새벽별' });
    expect(headersOf(fetchFn)).not.toHaveProperty('Authorization');
    expect(await app(fakeFetch(200, { available: 'yes' })).checkNickname('ticket', '새벽별')).toEqual({ ok: false, error: 'INVALID', status: 200 });
    expect(await app(fakeFetch(400, { error: 'INVALID_NICKNAME' })).checkNickname('ticket', '별!')).toEqual({
      ok: false,
      error: 'SERVER',
      status: 400,
      code: 'INVALID_NICKNAME',
    });
  });

  it('POST /auth/signup 은 가입권과 출생 정보를 보내고 201 의 세션 토큰을 받는다', async () => {
    const fetchFn = fakeFetch(201, { token: 'session-2' });
    expect(await app(fetchFn).signup('ticket', birth)).toEqual({ ok: true, data: { token: 'session-2' } });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/auth/signup`);
    expect(bodyOf(fetchFn)).toEqual({ signupToken: 'ticket', ...birth });
  });

  it('응답 모양이 다르면 INVALID 다', async () => {
    expect(await app(fakeFetch(200, { status: 'SIGNED_IN' })).login({ provider: 'GOOGLE', idToken: 'g' })).toEqual({
      ok: false,
      error: 'INVALID',
      status: 200,
    });
    expect(await app(fakeFetch(200, { status: 'SIGNUP_REQUIRED', signupToken: '' })).login({ provider: 'GOOGLE', idToken: 'g' })).toEqual({
      ok: false,
      error: 'INVALID',
      status: 200,
    });
    expect(await app(fakeFetch(201, {})).signup('ticket', birth)).toEqual({ ok: false, error: 'INVALID', status: 201 });
  });
});

describe('api: 로그인 · 가입의 오류 이름', () => {
  it('만 14세 미만은 403 UNDER_AGE 로 돌려준다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(403, { error: 'UNDER_AGE' }), getToken: () => null });
    expect(await api.signup('ticket', birth)).toEqual({ ok: false, error: 'SERVER', status: 403, code: 'UNDER_AGE' });
  });

  it('401 도 오류 이름을 함께 주고, 로그인 · 가입의 401 에는 세션을 다시 받지 않는다', async () => {
    const refreshSession = jest.fn(async () => true);
    const login = createApi({ baseUrl: BASE, fetchFn: fakeFetch(401, { error: 'INVALID_ID_TOKEN' }), getToken: () => null, refreshSession });
    expect(await login.login({ provider: 'GOOGLE', idToken: 'g' })).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401, code: 'INVALID_ID_TOKEN' });
    const signup = createApi({ baseUrl: BASE, fetchFn: fakeFetch(401, { error: 'SIGNUP_EXPIRED' }), getToken: () => null, refreshSession });
    expect(await signup.signup('old', birth)).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401, code: 'SIGNUP_EXPIRED' });
    expect(refreshSession).not.toHaveBeenCalled();
  });
});

describe('api: 세션 확인과 로그아웃', () => {
  it('GET /auth/session 은 204 면 성공이고 401 이면 로그인 필요다', async () => {
    const alive = fakeFetch(204);
    expect(await createApi({ baseUrl: BASE, fetchFn: alive, getToken: () => 't' }).getSession()).toEqual({ ok: true, data: null });
    expect(headersOf(alive).Authorization).toBe('Bearer t');
    expect(await createApi({ baseUrl: BASE, fetchFn: fakeFetch(401), getToken: () => 't' }).getSession()).toEqual({
      ok: false,
      error: 'LOGIN_REQUIRED',
      status: 401,
    });
  });

  it('DELETE /auth/session 으로 로그아웃한다', async () => {
    const fetchFn = fakeFetch(204);
    expect(await createApi({ baseUrl: BASE, fetchFn, getToken: () => 't' }).logout()).toEqual({ ok: true, data: null });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/auth/session`);
    expect(initOf(fetchFn).method).toBe('DELETE');
  });
});

describe('api: 가짜 서버', () => {
  it('로그인 · 가입 · 세션 확인 · 로그아웃이 서버 없이 성공한다', async () => {
    const fetchFn = fakeFetch(500);
    const api = createApi({ baseUrl: BASE, fetchFn, getToken: () => null, useFixtures: true });
    expect(await api.login({ provider: 'GOOGLE', idToken: 'g' })).toEqual({ ok: true, data: { status: 'SIGNED_IN', token: 'fixture-session' } });
    expect(await api.signup('ticket', birth)).toEqual({ ok: true, data: { token: 'fixture-session' } });
    expect(await api.getSession()).toEqual({ ok: true, data: null });
    expect(await api.logout()).toEqual({ ok: true, data: null });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
