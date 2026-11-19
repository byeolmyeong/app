/**
 * 가입 때 동의받는 약관 · 처리방침의 버전(결정 041). 서버가 이 문자열 그대로만 받는다(`POST /auth/signup` 의 `termsVersion` · `privacyVersion`).
 * 약관이나 처리방침을 고쳐 다시 동의받을 때 이 한 곳만 바꾼다. 화면 문구가 아니라 `strings` 에 두지 않는다.
 */
export const LEGAL_VERSIONS = {
  terms: '2026-11-19',
  privacy: '2026-11-19',
} as const;
