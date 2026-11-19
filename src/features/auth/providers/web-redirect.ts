/**
 * 웹 로그인의 주소 만들기와 돌아온 값 읽기(결정 034). 앞의 셋은 화면 없는 순수 함수이고,
 * 뒤의 셋은 웹에서만 쓰는 저장(sessionStorage)과 주소 읽기다. 코드 · state 를 로그에 남기지 않는다.
 */

/** 카카오 웹 로그인이 돌아오는 경로. 카카오 콘솔의 리디렉트 URI 는 `<웹 주소>/auth/kakao` 다 */
export const KAKAO_RETURN_PATH = '/auth/kakao';

/** 애플 웹 로그인의 돌아올 주소 경로. 팝업이라 실제로 오지는 않지만 Services ID 에 등록한 것과 같아야 한다 */
export const APPLE_RETURN_PATH = '/auth/apple';

const KAKAO_AUTHORIZE = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_STATE_KEY = 'byeolmyeong.kakaoState.v1';

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

/** 애플 웹 로그인을 쓸 수 있는가: Services ID 가 있고 https 다(애플은 localhost · http 를 받지 않는다) */
export function appleWebAvailable(servicesId: string | undefined, protocol: string): boolean {
  return Boolean(servicesId?.trim()) && protocol === 'https:';
}

/** 웹: 추측할 수 없는 state 를 만들어 이 탭에 둔다 */
export function newKakaoState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const state = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
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

/** 웹: 지금 열린 주소의 출처(`https://byeolmyeong.com`). 웹이 아니면 빈 글자 */
export function webOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}
