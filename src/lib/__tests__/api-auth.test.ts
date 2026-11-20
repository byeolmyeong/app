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
/** 가입 단계에서 모은 값(결정 042): 닉네임 · 프로필 · 약관 버전 · 동의 */
const extra = {
  nickname: '새벽별',
  avatar: 3 as const,
  termsVersion: '2026-11-19',
  privacyVersion: '2026-11-19',
  pushConsent: true,
  marketingConsent: false,
};

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
    expect(await web(signup).signup('ticket', birth, extra)).toEqual({ ok: true, data: { token: null } });
    expect(bodyOf(signup)).toEqual({ signupToken: 'ticket', ...birth, ...extra, cookie: true });

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
      // 가입권 만료 시각(결정 068 — 보관 수명은 min(30분, expiresAt))
      data: { status: 'SIGNUP_REQUIRED', signupToken: 'ticket', expiresAt: Date.parse('2026-11-18T10:30:00Z') },
    });
  });

  it('POST /auth/nickname-check 는 세션 헤더 없이 가입권과 닉네임만 보내고 쓸 수 있는지 받는다(결정 042)', async () => {
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

  it('POST /auth/signup 은 가입권 · 출생 정보 · 닉네임 · 프로필 · 약관 버전 · 동의를 보내고 201 의 세션 토큰을 받는다(결정 042)', async () => {
    const fetchFn = fakeFetch(201, { token: 'session-2' });
    expect(await app(fetchFn).signup('ticket', birth, extra)).toEqual({ ok: true, data: { token: 'session-2' } });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/auth/signup`);
    expect(bodyOf(fetchFn)).toEqual({
      signupToken: 'ticket',
      date: '1995-05-05',
      time: '14:30',
      placeId: 1841277,
      nickname: '새벽별',
      avatar: 3,
      termsVersion: '2026-11-19',
      privacyVersion: '2026-11-19',
      pushConsent: true,
      marketingConsent: false,
    });
    // 서버는 타입을 정확히 본다: 프로필은 정수, 동의는 참거짓
    expect(typeof bodyOf(fetchFn).avatar).toBe('number');
    expect(typeof bodyOf(fetchFn).pushConsent).toBe('boolean');
  });

  it('시각 "모름" 이면 time · placeId 를 null 로 보낸다', async () => {
    const fetchFn = fakeFetch(201, { token: 'session-3' });
    await app(fetchFn).signup('ticket', { date: '1995-05-05', time: null, placeId: null }, extra);
    expect(bodyOf(fetchFn)).toMatchObject({ time: null, placeId: null });
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
    expect(await app(fakeFetch(201, {})).signup('ticket', birth, extra)).toEqual({ ok: false, error: 'INVALID', status: 201 });
  });
});

describe('api: 로그인 · 가입의 오류 이름', () => {
  it('만 14세 미만은 403 UNDER_AGE 로 돌려준다', async () => {
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(403, { error: 'UNDER_AGE' }), getToken: () => null });
    expect(await api.signup('ticket', birth, extra)).toEqual({ ok: false, error: 'SERVER', status: 403, code: 'UNDER_AGE' });
  });

  it('401 도 오류 이름을 함께 주고, 로그인 · 가입의 401 에는 세션을 다시 받지 않는다', async () => {
    const refreshSession = jest.fn(async () => true);
    const login = createApi({ baseUrl: BASE, fetchFn: fakeFetch(401, { error: 'INVALID_ID_TOKEN' }), getToken: () => null, refreshSession });
    expect(await login.login({ provider: 'GOOGLE', idToken: 'g' })).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401, code: 'INVALID_ID_TOKEN' });
    const signup = createApi({ baseUrl: BASE, fetchFn: fakeFetch(401, { error: 'SIGNUP_EXPIRED' }), getToken: () => null, refreshSession });
    expect(await signup.signup('old', birth, extra)).toEqual({ ok: false, error: 'LOGIN_REQUIRED', status: 401, code: 'SIGNUP_EXPIRED' });
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
    expect(await api.signup('ticket', birth, extra)).toEqual({ ok: true, data: { token: 'fixture-session' } });
    expect(await api.getSession()).toEqual({ ok: true, data: null });
    expect(await api.logout()).toEqual({ ok: true, data: null });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

// 마이 · 계정(결정 056, 서버 계약 `GET /account` · `PATCH /account`)
describe('api: 마이의 내 계정', () => {
  const app = (fetchFn: jest.MockedFunction<typeof fetch>) => createApi({ baseUrl: BASE, fetchFn, getToken: () => 't' });
  const account = {
    nickname: '새벽별',
    email: 'dawnstar@kakao.com',
    provider: 'KAKAO',
    marketingConsent: false,
    marketingConsentAt: null,
    pushConsent: true,
    pushConsentAt: '2026-11-20T00:00:00Z',
    avatar: 3,
  };
  const mine = { nickname: '새벽별', avatar: 3, email: 'dawnstar@kakao.com', provider: 'KAKAO', marketingConsent: false, suspended: false };

  it('GET /account 에서 닉네임 · 프로필 · 이메일 · 공급자 · 마케팅 동의만 읽는다(동의 일시 · 푸시 동의는 버린다)', async () => {
    const fetchFn = fakeFetch(200, account);
    const res = await app(fetchFn).getMyAccount();
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/account`);
    expect(initOf(fetchFn).method).toBe('GET');
    expect(res).toEqual({ ok: true, data: mine });
  });

  it('옛 계정의 null(닉네임 · 이메일 · 프로필)과 모르는 공급자도 받는다', async () => {
    const res = await app(fakeFetch(200, { ...account, nickname: null, email: null, avatar: null, provider: 'NAVER' })).getMyAccount();
    expect(res).toEqual({ ok: true, data: { ...mine, nickname: null, email: null, avatar: null, provider: 'NAVER' } });
  });

  // 홈 별명 카드도 이 호출을 쓴다(계정 호출 하나로) — 옛 getAccount 의 검사를 그대로 지킨다
  it('모르는 프로필 번호여도 닉네임은 받는다 — 모르는 그림은 그리는 쪽이 숨긴다(리뷰 PR #41)', async () => {
    const res = await app(fakeFetch(200, { ...account, avatar: 9 })).getMyAccount();
    expect(res).toEqual({ ok: true, data: { ...mine, avatar: 9 } });
  });

  it('프로필이 정수가 아니거나 닉네임이 글자가 아니면 계약과 다른 응답이다', async () => {
    for (const bad of [{ ...account, avatar: 1.5 }, { ...account, avatar: '3' }, { ...account, nickname: 3 }, { ...account, avatar: undefined }]) {
      expect(await app(fakeFetch(200, bad)).getMyAccount()).toMatchObject({ ok: false, error: 'INVALID' });
    }
  });

  it('이메일 · 공급자 · 마케팅 동의의 모양이 계약과 다르면 INVALID', async () => {
    for (const bad of [{ ...account, email: 3 }, { ...account, provider: null }, { ...account, marketingConsent: 'false' }, { ...account, marketingConsent: undefined }]) {
      expect(await app(fakeFetch(200, bad)).getMyAccount()).toMatchObject({ ok: false, error: 'INVALID' });
    }
  });

  it('PATCH /account 에 보낸 칸만 싣고, 바뀐 계정을 받는다', async () => {
    const fetchFn = fakeFetch(200, { ...account, nickname: '별빛' });
    const res = await app(fetchFn).updateAccount({ nickname: '별빛' });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/account`);
    expect(initOf(fetchFn).method).toBe('PATCH');
    expect(bodyOf(fetchFn)).toEqual({ nickname: '별빛' });
    expect(headersOf(fetchFn).Authorization).toBe('Bearer t');
    expect(res).toEqual({ ok: true, data: { ...mine, nickname: '별빛' } });

    const avatar = fakeFetch(200, { ...account, avatar: 5 });
    await app(avatar).updateAccount({ avatar: 5 });
    expect(bodyOf(avatar)).toEqual({ avatar: 5 });
  });

  it.each([
    [409, 'NICKNAME_TAKEN'],
    [400, 'INVALID_NICKNAME'],
    [400, 'INVALID_AVATAR'],
  ])('PATCH /account 의 %i %s 를 code 로 돌려준다', async (status, code) => {
    expect(await app(fakeFetch(status, { error: code })).updateAccount({ nickname: 'x' })).toEqual({ ok: false, error: 'SERVER', status, code });
  });
});

// 이용 정지(앱 결정 065 의 5, 서버 결정 044)
describe('api: 이용 정지', () => {
  const account = { nickname: '새벽별', email: null, provider: 'KAKAO', marketingConsent: false, marketingConsentAt: null, pushConsent: false, pushConsentAt: null, avatar: 3 };

  it('어떤 요청이든 403 ACCOUNT_SUSPENDED 를 받으면 정지 알림을 부르고, 결과는 code 로 돌려준다', async () => {
    const onSuspended = jest.fn();
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(403, { error: 'ACCOUNT_SUSPENDED' }), getToken: () => 't', onSuspended });
    expect(await api.getReport()).toEqual({ ok: false, error: 'SERVER', status: 403, code: 'ACCOUNT_SUSPENDED' });
    expect(onSuspended).toHaveBeenCalledTimes(1);
  });

  it('다른 403(FORBIDDEN_ORIGIN 등)은 정지가 아니다', async () => {
    const onSuspended = jest.fn();
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(403, { error: 'FORBIDDEN_ORIGIN' }), getToken: () => 't', onSuspended });
    await api.getReport();
    expect(onSuspended).not.toHaveBeenCalled();
  });

  it('GET /account 가 suspended: true 면 정지 알림도 부른다(200 이라 403 으로는 알 수 없다)', async () => {
    const onSuspended = jest.fn();
    const api = createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { ...account, suspended: true }), getToken: () => 't', onSuspended });
    await api.getMyAccount();
    expect(onSuspended).toHaveBeenCalledTimes(1);
    const fine = jest.fn();
    await createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, { ...account, suspended: false }), getToken: () => 't', onSuspended: fine }).getMyAccount();
    expect(fine).not.toHaveBeenCalled();
  });

  it('GET /account 의 suspended 를 읽는다 — 없는 옛 서버는 정지가 아닌 것으로, 참거짓이 아니면 INVALID', async () => {
    const app = (body: unknown) => createApi({ baseUrl: BASE, fetchFn: fakeFetch(200, body), getToken: () => 't' });
    expect(await app({ ...account, suspended: true }).getMyAccount()).toMatchObject({ ok: true, data: { suspended: true } });
    expect(await app(account).getMyAccount()).toMatchObject({ ok: true, data: { suspended: false } });
    expect(await app({ ...account, suspended: 'yes' }).getMyAccount()).toMatchObject({ ok: false, error: 'INVALID' });
  });
});
