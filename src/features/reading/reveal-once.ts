/**
 * 출생 정보를 바꾼 뒤 새 풀이가 지어지면 별명 공개(보드 10)를 한 번 보이게 넘겨 두는 닉네임(소유자 2026-11-20 — 별명이 같아도 한 번).
 * 메모리에만 둔다 — 앱을 다시 켜거나 웹을 새로 고치면 없고, 그때는 글로 바로 간다. 가입 직후의 공개는 가입 초안(`signup-draft`)이 맡는다.
 */
let pending: string | null = null;

/** 출생 정보 바꾸기가 `/reading?from=birth` 로 가기 전에 부른다 */
export function revealNextReading(nickname: string): void {
  pending = nickname;
}

export const pendingReveal = (): string | null => pending;

/** 공개 화면에서 "풀이 읽기" 를 누르면 지운다 */
export function clearPendingReveal(): void {
  pending = null;
}
