/**
 * 문의를 보내기 전에 서버와 같은 규칙으로 확인한다(결정 024). 판정은 서버가 한다 — 여기서는 뻔히 틀린 것만 미리 막는다.
 * 적은 내용과 이메일은 로그에 남기지 않는다(이 파일은 아무것도 기록하지 않는다).
 */
import type { InquiryCategory, InquiryInput } from '@/lib/api';

/** 내용의 길이(앞뒤 공백을 뗀 뒤의 글자 수) */
export const INQUIRY_BODY_MIN = 10;
export const INQUIRY_BODY_MAX = 2000;

/**
 * 앞뒤 공백을 뗀 내용의 글자 수. 서버와 같이 유니코드 코드 포인트로 센다(한글 한 글자 = 1, 이모지 하나 = 1).
 * `.length` 는 이모지를 2 로 세어 서버와 어긋난다. 화면의 글자 수와 확인이 함께 쓴다.
 */
export const inquiryLength = (text: string) => [...text.trim()].length;

/** 화면에서 적고 있는 값. category 는 아직 고르지 않았으면 null, email 은 비워도 된다 */
export type InquiryDraft = { category: InquiryCategory | null; body: string; email: string };

export type InquiryProblems = { category?: 'REQUIRED'; body?: 'TOO_SHORT' | 'TOO_LONG'; email?: 'FORMAT' };

export type InquiryCheck = { ok: true; input: InquiryInput } | { ok: false; problems: InquiryProblems };

/** 이메일의 모양만 본다: 공백 없이 `@` 하나, 그 뒤(도메인)에 점이 있고 점의 앞뒤가 비지 않는다 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** 맞으면 서버에 보낼 본문(내용은 앞뒤 공백을 떼고, 빈 이메일은 null)을, 틀리면 틀린 칸을 모두 돌려준다 */
export function checkInquiry(draft: InquiryDraft): InquiryCheck {
  const body = draft.body.trim();
  const email = draft.email.trim();
  const problems: InquiryProblems = {};
  if (!draft.category) problems.category = 'REQUIRED';
  const length = inquiryLength(body);
  if (length < INQUIRY_BODY_MIN) problems.body = 'TOO_SHORT';
  else if (length > INQUIRY_BODY_MAX) problems.body = 'TOO_LONG';
  if (email && !EMAIL_SHAPE.test(email)) problems.email = 'FORMAT';
  if (!draft.category || problems.body || problems.email) return { ok: false, problems };
  return { ok: true, input: { category: draft.category, body, replyEmail: email || null } };
}
