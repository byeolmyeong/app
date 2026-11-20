/**
 * 웹 로그인의 주소 만들기와 돌아온 값 읽기(결정 034 · 070). 앞쪽은 화면 없는 순수 함수이고,
 * 뒤쪽은 웹에서만 쓰는 저장(sessionStorage)과 주소 읽기 · 지우기다. 코드 · ID 토큰 · state · nonce 를 로그에 남기지 않는다.
 */

/** 카카오 웹 로그인이 돌아오는 경로. 카카오 콘솔의 리디렉트 URI 는 `<웹 주소>/auth/kakao` 다 */
export const KAKAO_RETURN_PATH = '/auth/kakao';

/** 애플 웹 로그인의 돌아올 주소 경로. 팝업이라 실제로 오지는 않지만 Services ID 에 등록한 것과 같아야 한다 */
export const APPLE_RETURN_PATH = '/auth/apple';

/** 구글 웹 로그인이 돌아오는 경로. 구글 클라우드 콘솔 웹 OAuth 클라이언트의 승인된 리디렉션 URI 는 `<웹 주소>/auth/google` 이다(결정 070) */
export const GOOGLE_RETURN_PATH = '/auth/google';

const KAKAO_AUTHORIZE = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_STATE_KEY = 'byeolmyeong.kakaoState.v1';
const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_REQUEST_KEY = 'byeolmyeong.googleRequest.v1';

/** 카카오 인가 주소. 코드는 서버가 ID 토큰으로 바꾼다(서버 결정 021). openid 로 ID 토큰을, account_email 로 그 토큰에 이메일을 받는다(결정 039) */
export function kakaoAuthorizeUrl(restApiKey: string, redirectUri: string, state: string): string {
  const query = new URLSearchParams({ client_id: restApiKey, redirect_uri: redirectUri, response_type: 'code', scope: 'openid account_email', state });
  return `${KAKAO_AUTHORIZE}?${query.toString()}`;
}

type Param = string | string[] | undefined;

export type KakaoReturn = { kind: 'code'; code: string } | { kind: 'cancelled' } | { kind: 'invalid' };

/** 카카오가 돌려준 값. 보낸 state 와 다르거나 보낸 state 가 없으면 받지 않는다(다른 사이트가 연 로그인을 막는다) */
export function readKakaoReturn(params: { code?: Param; state?: Param; error?: Param }, expectedState: string | null): KakaoReturn {
  const one = (v: Param) => (typeof v === 'string' && v.length > 0 ? v : null);
  if (!expectedState || one(params.state) !== expectedState) return { kind: 'invalid' };
  if (one(params.error)) return { kind: 'cancelled' };
  const code = one(params.code);
  return code ? { kind: 'code', code } : { kind: 'invalid' };
}

/** 구글 로그인 요청 한 번: state(돌아온 응답이 이 탭이 보낸 것인가) · nonce(ID 토큰이 이 요청에 발급된 것인가) */
export type GoogleRequest = { state: string; nonce: string };

/**
 * 구글 OpenID Connect 인가 주소(결정 070). ID 토큰을 돌아올 주소의 조각(#)으로 바로 받는다 — 서버 계약(`POST /auth/login` 의 구글 ID 토큰)은 그대로다.
 * 계정은 구글 화면에서 고른다(`prompt=select_account`).
 */
export function googleAuthorizeUrl(clientId: string, redirectUri: string, { state, nonce }: GoogleRequest): string {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce,
    state,
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTHORIZE}?${query.toString()}`;
}

export type GoogleReturn = { kind: 'idToken'; idToken: string } | { kind: 'cancelled' } | { kind: 'failed' };

/** ID 토큰(JWT) 가운데 조각의 nonce. 서명은 보지 않는다(서버 몫). 모양이 틀리면 null */
function idTokenNonce(idToken: string): string | null {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const binary = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0))));
    const nonce = typeof payload === 'object' && payload !== null ? (payload as { nonce?: unknown }).nonce : undefined;
    return typeof nonce === 'string' ? nonce : null;
  } catch {
    return null;
  }
}

/**
 * 구글이 주소 조각(`#id_token=…&state=…` 또는 `#error=…&state=…`)으로 돌려준 값(결정 070).
 * 보낸 요청이 없거나 state 가 다르면 받지 않는다(다른 사이트가 연 로그인을 막는다). 거부(`access_denied`)는 취소이고 다른 error 는 실패다.
 * ID 토큰 안의 nonce 가 보낸 nonce 와 같을 때만 받는다(남이 받은 토큰을 끼워 넣지 못하게). 서명 · 발급자 · 대상 · 만료는 서버가 확인한다.
 */
export function readGoogleReturn(fragment: string, expected: GoogleRequest | null): GoogleReturn {
  const params = new URLSearchParams(fragment.startsWith('#') ? fragment.slice(1) : fragment);
  const one = (name: string) => {
    const values = params.getAll(name);
    return values.length === 1 && values[0].length > 0 ? values[0] : null;
  };
  if (!expected || one('state') !== expected.state) return { kind: 'failed' };
  const error = one('error');
  if (error) return error === 'access_denied' ? { kind: 'cancelled' } : { kind: 'failed' };
  const idToken = one('id_token');
  return idToken && idTokenNonce(idToken) === expected.nonce ? { kind: 'idToken', idToken } : { kind: 'failed' };
}

/** 애플 웹 로그인을 쓸 수 있는가: Services ID 가 있고 https 다(애플은 localhost · http 를 받지 않는다) */
export function appleWebAvailable(servicesId: string | undefined, protocol: string): boolean {
  return Boolean(servicesId?.trim()) && protocol === 'https:';
}

/** 추측할 수 없는 값(128비트, 16진수 32자) */
function randomHex(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 웹: 추측할 수 없는 state 를 만들어 이 탭에 둔다 */
export function newKakaoState(): string {
  const state = randomHex();
  try {
    sessionStorage.setItem(KAKAO_STATE_KEY, state);
  } catch {
    // 저장하지 못하면 돌아왔을 때 state 가 없어 로그인 화면으로 돌아간다.
  }
  return state;
}

/** 웹: 둔 state 를 꺼내며 지운다(한 번만 쓴다) */
export function takeKakaoState(): string | null {
  try {
    const state = sessionStorage.getItem(KAKAO_STATE_KEY);
    sessionStorage.removeItem(KAKAO_STATE_KEY);
    return state;
  } catch {
    return null;
  }
}

/** 웹: 구글 로그인 요청 한 번의 state · nonce 를 만들어 이 탭에 둔다. 다시 누르면 앞의 것을 바꾼다 */
export function newGoogleRequest(): GoogleRequest {
  const request = { state: randomHex(), nonce: randomHex() };
  try {
    sessionStorage.setItem(GOOGLE_REQUEST_KEY, JSON.stringify(request));
  } catch {
    // 저장하지 못하면 돌아왔을 때 요청이 없어 받지 않고 로그인 화면으로 돌아간다.
  }
  return request;
}

/** 웹: 둔 요청을 꺼내며 지운다(한 번만 쓴다). 없거나 모양이 틀리면 null */
export function takeGoogleRequest(): GoogleRequest | null {
  try {
    const raw = sessionStorage.getItem(GOOGLE_REQUEST_KEY);
    sessionStorage.removeItem(GOOGLE_REQUEST_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (typeof value !== 'object' || value === null) return null;
    const { state, nonce } = value as { state?: unknown; nonce?: unknown };
    return typeof state === 'string' && state && typeof nonce === 'string' && nonce ? { state, nonce } : null;
  } catch {
    return null;
  }
}

/** 웹: 지금 열린 주소의 출처(`https://byeolmyeong.com`). 웹이 아니면 빈 글자 */
export function webOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/** 웹: 지금 열린 주소의 조각(`#…`). 웹이 아니면 빈 글자 */
export function urlFragment(): string {
  return typeof window !== 'undefined' && window.location ? window.location.hash : '';
}

/** 웹: 주소의 조각을 기록에서 지운다(토큰이 주소창 · 뒤로 가기 기록에 남지 않게). 라우터가 둔 기록 상태는 그대로 둔다 */
export function clearUrlFragment(): void {
  if (typeof window === 'undefined' || !window.location?.hash) return;
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
}
