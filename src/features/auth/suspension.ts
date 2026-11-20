/**
 * 이용 정지(앱 결정 065 의 5, 서버 결정 044). 서버가 어떤 요청에든 403 `ACCOUNT_SUSPENDED` 를 주거나 `GET /account` 가 `suspended: true` 면
 * 이 표시가 켜지고, 정지 문(`suspension-gate.tsx`)이 정지 화면(`/suspended`, 보드 22)으로 보낸다. 판정은 서버가 한다 — 앱은 받은 대로만 켠다.
 * 표시는 메모리에만 있다(기기에 두지 않는다 — 다시 켜면 서버가 다시 알려 준다). 로그인 전이 되면 문이 끈다.
 */
import { useSyncExternalStore } from 'react';

let suspended = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function markSuspended(): void {
  if (suspended) return;
  suspended = true;
  emit();
}

export function clearSuspended(): void {
  if (!suspended) return;
  suspended = false;
  emit();
}

export const isSuspended = (): boolean => suspended;

export function subscribeSuspended(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useSuspended(): boolean {
  return useSyncExternalStore(subscribeSuspended, isSuspended, isSuspended);
}

/** 정지 중에도 갈 수 있는 곳: 정지 화면 · 문의(새 문의 · 내역 · 답변 — 서버가 열어 둔다) · 공유 페이지(로그인 없이 열린다) */
const OPEN_WHILE_SUSPENDED = (first: string | undefined, second: string | undefined) =>
  first === 'suspended' || first === 's' || (first === 'my' && second === 'inquiries');

/**
 * 정지 문이 보낼 곳(없으면 null). 로그인했고 정지면 열린 곳 말고는 모두 `/suspended`, 정지가 풀렸는데 정지 화면에 있으면 홈으로.
 * 로그인 전이면 보내지 않는다(로그인 가드가 맡는다).
 */
export function suspensionRedirect(signedIn: boolean, isSuspendedNow: boolean, segments: string[]): '/suspended' | '/' | null {
  const [first, second] = segments;
  if (!signedIn) return null;
  if (isSuspendedNow) return OPEN_WHILE_SUSPENDED(first, second) ? null : '/suspended';
  return first === 'suspended' ? '/' : null;
}
