/**
 * 로그인 전 가드(결정 009 · 034 · 042). 첫 경로 조각 · 세션 상태 · 소개를 봤는지로 보낼 곳을 정한다(보낼 필요가 없으면 null).
 * 공유 페이지(`/s/…`)와 로그인에서 돌아오는 화면(`/auth/…`)은 언제나 열린다. 가입 화면은 로그인 상태일 때 그 화면이 정한다
 * (가입을 마치는 순간 상태가 바뀌는데, 그 화면이 차트를 받아 풀이 글로 가는 중이다).
 * 소개(`/intro`)는 로그인 전에 아직 안 본 기기에서만 보낸다. 로그인한 사람은 소개로 가지 않는다.
 */
import type { SessionStatus } from '@/features/auth/session-store';
import type { SignupStepName } from '@/features/auth/signup-resume';

export type GuardTarget = '/login' | '/signup/terms' | '/signup/nickname' | '/signup/birth' | '/intro' | '/';

/**
 * 가입 중에도 열리는 화면: 약관 단계의 "보기" 가 여는 이용약관 · 개인정보 수집 · 이용 동의 · 마케팅 수신 동의 약관(결정 042 · 043 · 045)과,
 * 동의 글이 가리키는 처리방침(주소로 열어 읽기만)
 */
const SIGNUP_READABLE = new Set(['terms', 'privacy-consent', 'privacy', 'marketing']);

/** 세션과 상관없이 열리는 첫 경로 조각 */
const ALWAYS_OPEN = new Set(['s', 'auth']);

/**
 * introSeen: 이 기기에서 소개를 봤는가(null 은 읽는 중). 소개 화면은 뜨는 순간 본 것으로 적으므로,
 * 소개 화면에 있는 동안은 값이 바뀌어도 그대로 둔다.
 */
export function guardRedirect(
  status: SessionStatus,
  first: string | undefined,
  introSeen: boolean | null = true,
  second?: string,
  /** 이어 하는 가입의 하던 단계(결정 068). 없으면 약관 단계 */
  signupStep: SignupStepName | null = null,
): GuardTarget | null {
  if (first !== undefined && ALWAYS_OPEN.has(first)) return null;
  switch (status) {
    case 'checking':
      return null;
    case 'signingUp':
      if (first === 'signup') return null;
      if (first === 'settings' && second !== undefined && SIGNUP_READABLE.has(second)) return null;
      return `/signup/${signupStep ?? 'terms'}`;
    case 'signedOut':
      if (first === 'intro' || introSeen === null) return null;
      if (!introSeen) return '/intro';
      return first === 'login' ? null : '/login';
    case 'signedIn':
      return first === 'login' || first === 'intro' ? '/' : null;
  }
}

/** 화면을 가려야 하는가: 확인 중(세션 · 소개)이거나 다른 곳으로 보내는 중인 보호된 화면 */
export function guardCovers(
  status: SessionStatus,
  first: string | undefined,
  introSeen: boolean | null = true,
  second?: string,
): boolean {
  if (first !== undefined && ALWAYS_OPEN.has(first)) return false;
  if (status === 'checking') return true;
  if (status === 'signedOut' && introSeen === null && first !== 'intro') return true;
  return guardRedirect(status, first, introSeen, second) !== null;
}
