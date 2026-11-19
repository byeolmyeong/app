/**
 * 닉네임 규칙(결정 041): 앞뒤 공백을 뗀 한글(완성형 가~힣) · 영문(a~z A~Z)만 2~10자. 숫자 · 공백 · 기호 · 이모지 · 낱자는 안 된다.
 * 판정은 서버가 한다(`POST /auth/signup` · `POST /auth/nickname-check`의 400 `INVALID_NICKNAME`). 앱은 같은 규칙으로 먼저 안내만 한다.
 * 중복(영문 대소문자는 같은 이름)은 서버만 안다.
 */

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 10;

export type NicknameCheck = { ok: true; value: string } | { ok: false; reason: 'TOO_SHORT' | 'TOO_LONG' | 'INVALID_CHAR' };

const ALLOWED = /^[가-힣a-zA-Z]*$/;
/** 한글을 치는 동안 잠깐 생기는 낱자(호환 자모 ㄱ~ㅣ) */
const JAMO = /[ㄱ-ㅣ]/;
const JAMO_ALL = /[ㄱ-ㅣ]/g;

/** 글자 수(이모지 같은 겹친 글자도 하나로 센다) */
export const nicknameLength = (raw: string) => Array.from(raw).length;

export function checkNickname(raw: string): NicknameCheck {
  const value = raw.trim();
  if (!ALLOWED.test(value)) return { ok: false, reason: 'INVALID_CHAR' };
  const length = nicknameLength(value);
  if (length < NICKNAME_MIN) return { ok: false, reason: 'TOO_SHORT' };
  if (length > NICKNAME_MAX) return { ok: false, reason: 'TOO_LONG' };
  return { ok: true, value };
}

/** 어긋난 글자가 치는 중의 낱자뿐인가. 그럴 때는 오류를 바로 띄우지 않는다(한 글자 칠 때마다 빨강이 깜빡이지 않게) */
export function isComposingOnly(raw: string): boolean {
  const value = raw.trim();
  return JAMO.test(value) && ALLOWED.test(value.replace(JAMO_ALL, ''));
}
