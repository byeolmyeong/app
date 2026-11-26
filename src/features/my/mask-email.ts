/** 보이는 글자의 최대 수 — 긴 아이디도 앞 4자만 보인다 */
const SHOWN_MAX = 4;

/** 글의 앞 절반(많아야 4자)만 두고 나머지를 같은 수의 * 로 바꾼다. 적어도 한 글자는 가린다 */
const hideTail = (text: string) => {
  const chars = Array.from(text);
  const shown = Math.min(SHOWN_MAX, Math.floor(chars.length / 2));
  return chars.slice(0, shown).join('') + '*'.repeat(chars.length - shown);
};

/**
 * 연결된 계정 줄의 가린 이메일(결정 056 의 3, 보드 16-1 "dawn****@kakao.com"): `@` 앞의 앞 절반(많아야 4자)만 보이고 도메인은 그대로.
 * 이메일 모양이 아니면(@ 가 없거나 맨 앞) 글 전체를 같은 규칙으로 가린다. 원문은 화면에만 쓰고 어디에도 남기지 않는다.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return hideTail(email);
  return hideTail(email.slice(0, at)) + email.slice(at);
}
