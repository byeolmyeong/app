/**
 * 로그인 전 가드(결정 009 · 034). 첫 경로 조각과 세션 상태로 보낼 곳을 정한다(보낼 필요가 없으면 null).
 * 공유 페이지(`/s/…`)와 로그인에서 돌아오는 화면(`/auth/…`)은 언제나 열린다. 가입 화면은 로그인 상태일 때 그 화면이 정한다
 * (가입을 마치는 순간 상태가 바뀌는데, 그 화면이 차트를 받아 풀이 글로 가는 중이다).
 */
import type { SessionStatus } from '@/features/auth/session-store';

export type GuardTarget = '/login' | '/signup' | '/';

/** 세션과 상관없이 열리는 첫 경로 조각 */
const ALWAYS_OPEN = new Set(['s', 'auth']);

export function guardRedirect(status: SessionStatus, first: string | undefined): GuardTarget | null {
  if (first !== undefined && ALWAYS_OPEN.has(first)) return null;
  switch (status) {
    case 'checking':
      return null;
    case 'signingUp':
      return first === 'signup' ? null : '/signup';
    case 'signedOut':
      return first === 'login' ? null : '/login';
    case 'signedIn':
      return first === 'login' ? '/' : null;
  }
}

/** 화면을 가려야 하는가: 확인 중이거나 다른 곳으로 보내는 중인 보호된 화면 */
export function guardCovers(status: SessionStatus, first: string | undefined): boolean {
  if (first !== undefined && ALWAYS_OPEN.has(first)) return false;
  return status === 'checking' || guardRedirect(status, first) !== null;
}
