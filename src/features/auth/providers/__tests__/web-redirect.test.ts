import {
  appleWebAvailable,
  googleAuthorizeUrl,
  kakaoAuthorizeUrl,
  newGoogleRequest,
  readGoogleReturn,
  readKakaoReturn,
  takeGoogleRequest,
} from '@/features/auth/providers/web-redirect';

// 웹 로그인의 주소 만들기 · 돌아온 값 읽기(결정 034)
describe('카카오 웹: 인가 주소', () => {
  it('REST API 키 · 돌아올 주소 · 코드 응답 · openid · 이메일(account_email) · state 를 싣는다(결정 039)', () => {
    const url = new URL(kakaoAuthorizeUrl('rest-key', 'https://byeolmyeong.com/auth/kakao', 'st-1'));
    expect(url.origin + url.pathname).toBe('https://kauth.kakao.com/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'rest-key',
      redirect_uri: 'https://byeolmyeong.com/auth/kakao',
      response_type: 'code',
      scope: 'openid account_email',
      state: 'st-1',
    });
  });
});

describe('카카오 웹: 돌아온 값', () => {
  it('보낸 state 와 같고 코드가 있으면 코드다', () => {
    expect(readKakaoReturn({ code: 'c1', state: 'st-1' }, 'st-1')).toEqual({ kind: 'code', code: 'c1' });
  });

  it('사용자가 동의를 취소하면(error) 취소다', () => {
    expect(readKakaoReturn({ error: 'access_denied', state: 'st-1' }, 'st-1')).toEqual({ kind: 'cancelled' });
  });

  it('state 가 다르거나 보낸 state 가 없거나 코드가 없으면 받지 않는다', () => {
    expect(readKakaoReturn({ code: 'c1', state: 'other' }, 'st-1')).toEqual({ kind: 'invalid' });
    expect(readKakaoReturn({ code: 'c1', state: 'st-1' }, null)).toEqual({ kind: 'invalid' });
    expect(readKakaoReturn({ state: 'st-1' }, 'st-1')).toEqual({ kind: 'invalid' });
    expect(readKakaoReturn({ code: ['c1', 'c2'], state: 'st-1' }, 'st-1')).toEqual({ kind: 'invalid' });
  });
});

describe('애플 웹: 쓸 수 있는가', () => {
  it('Services ID 가 있고 https 일 때만이다(애플은 localhost · http 를 받지 않는다)', () => {
    expect(appleWebAvailable('com.byeolmyeong.web', 'https:')).toBe(true);
    expect(appleWebAvailable('com.byeolmyeong.web', 'http:')).toBe(false);
    expect(appleWebAvailable(undefined, 'https:')).toBe(false);
    expect(appleWebAvailable(' ', 'https:')).toBe(false);
  });
});

/** 시험용 ID 토큰: 가운데 조각만 진짜 모양(base64url JSON)이고 서명은 아무 글자다 — 앱은 서명을 보지 않는다(서버 몫) */
const idToken = (payload: object) => `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
const sent = { state: 'st-1', nonce: 'n-1' };

// 웹 구글은 OpenID Connect 리디렉트(결정 070): 인가 주소로 이동 → /auth/google 로 ID 토큰이 주소 조각에 실려 온다
describe('구글 웹: 인가 주소', () => {
  it('웹 클라이언트 ID · 돌아올 주소 · ID 토큰 응답 · openid email profile · nonce · state · 계정 고르기를 싣는다', () => {
    const url = new URL(googleAuthorizeUrl('web-client', 'https://byeolmyeong.com/auth/google', sent));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'web-client',
      redirect_uri: 'https://byeolmyeong.com/auth/google',
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: 'n-1',
      state: 'st-1',
      prompt: 'select_account',
    });
  });
});

describe('구글 웹: 돌아온 값(주소 조각)', () => {
  it('state 가 같고 ID 토큰 안의 nonce 가 보낸 것과 같으면 그 ID 토큰이다', () => {
    const token = idToken({ iss: 'https://accounts.google.com', nonce: 'n-1', name: '별명 사람' });
    expect(readGoogleReturn(`#id_token=${token}&state=st-1`, sent)).toEqual({ kind: 'idToken', idToken: token });
  });

  it('state 가 다르거나 보낸 요청이 없으면 받지 않는다(다른 사이트가 연 로그인)', () => {
    const token = idToken({ nonce: 'n-1' });
    expect(readGoogleReturn(`#id_token=${token}&state=forged`, sent)).toEqual({ kind: 'failed' });
    expect(readGoogleReturn(`#id_token=${token}`, sent)).toEqual({ kind: 'failed' });
    expect(readGoogleReturn(`#id_token=${token}&state=st-1`, null)).toEqual({ kind: 'failed' });
    expect(readGoogleReturn(`#id_token=${token}&state=st-1&state=st-1`, sent)).toEqual({ kind: 'failed' });
  });

  it('ID 토큰 안의 nonce 가 다르거나 없거나 토큰 모양이 틀리면 받지 않는다(남이 받은 토큰을 끼워 넣지 못하게)', () => {
    expect(readGoogleReturn(`#id_token=${idToken({ nonce: 'other' })}&state=st-1`, sent)).toEqual({ kind: 'failed' });
    expect(readGoogleReturn(`#id_token=${idToken({ sub: '1' })}&state=st-1`, sent)).toEqual({ kind: 'failed' });
    expect(readGoogleReturn('#id_token=not-a-jwt&state=st-1', sent)).toEqual({ kind: 'failed' });
    expect(readGoogleReturn('#id_token=a.%%%.c&state=st-1', sent)).toEqual({ kind: 'failed' });
    expect(readGoogleReturn('#state=st-1', sent)).toEqual({ kind: 'failed' });
    expect(readGoogleReturn('', sent)).toEqual({ kind: 'failed' });
  });

  it('사용자가 거부하면(error=access_denied) 취소, 다른 error 는 실패다 — state 가 다르면 둘 다 실패', () => {
    expect(readGoogleReturn('#error=access_denied&state=st-1', sent)).toEqual({ kind: 'cancelled' });
    expect(readGoogleReturn('#error=interaction_required&state=st-1', sent)).toEqual({ kind: 'failed' });
    expect(readGoogleReturn('#error=access_denied&state=forged', sent)).toEqual({ kind: 'failed' });
  });
});

describe('구글 웹: 요청 한 번의 state · nonce', () => {
  const store = new Map<string, string>();
  const fake = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  beforeEach(() => {
    store.clear();
    (globalThis as { sessionStorage?: unknown }).sessionStorage = fake;
  });
  afterAll(() => {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  });

  it('추측할 수 없는 state · nonce(각 128비트)를 만들어 이 탭에 두고, 꺼내면 지운다(한 번만 쓴다)', () => {
    const a = newGoogleRequest();
    expect(a.state).toMatch(/^[0-9a-f]{32}$/);
    expect(a.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(a.state).not.toBe(a.nonce);
    expect(takeGoogleRequest()).toEqual(a);
    expect(takeGoogleRequest()).toBeNull();
  });

  it('다시 누르면 새 요청이 앞의 것을 바꾼다. 저장된 값의 모양이 틀리면 없는 것으로 본다', () => {
    newGoogleRequest();
    const b = newGoogleRequest();
    expect(takeGoogleRequest()).toEqual(b);
    store.set('byeolmyeong.googleRequest.v1', '{"state":"x"}');
    expect(takeGoogleRequest()).toBeNull();
    store.set('byeolmyeong.googleRequest.v1', 'not json');
    expect(takeGoogleRequest()).toBeNull();
  });
});
