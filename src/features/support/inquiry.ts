/**
 * 문의를 보내기 전에 서버와 같은 규칙으로 확인한다(결정 058). 판정은 서버가 한다 — 여기서는 뻔히 틀린 것만 미리 막는다.
 * 적은 내용은 로그에 남기지 않는다(이 파일은 아무것도 기록하지 않는다).
 */
import { strings } from '@/content/strings';
import type { InquiryCategory, InquiryInput } from '@/lib/api';

/** 내용의 길이(앞뒤 공백을 뗀 뒤의 글자 수) */
export const INQUIRY_BODY_MIN = 10;
export const INQUIRY_BODY_MAX = 1000;

/**
 * 앞뒤 공백을 뗀 내용의 글자 수. 서버와 같이 유니코드 코드 포인트로 센다(한글 한 글자 = 1, 이모지 하나 = 1).
 * `.length` 는 이모지를 2 로 세어 서버와 어긋난다. 화면의 글자 수와 확인이 함께 쓴다.
 */
export const inquiryLength = (text: string) => [...text.trim()].length;

/** 화면에서 적고 있는 값. category 는 아직 고르지 않았으면 null */
export type InquiryDraft = { category: InquiryCategory | null; body: string };

export type InquiryProblems = { category?: 'REQUIRED'; body?: 'TOO_SHORT' | 'TOO_LONG' };

export type InquiryCheck = { ok: true; input: InquiryInput } | { ok: false; problems: InquiryProblems };

/** 맞으면 서버에 보낼 본문(내용은 앞뒤 공백을 뗀다)을, 틀리면 틀린 칸을 모두 돌려준다 */
export function checkInquiry(draft: InquiryDraft): InquiryCheck {
  const body = draft.body.trim();
  const problems: InquiryProblems = {};
  if (!draft.category) problems.category = 'REQUIRED';
  const length = inquiryLength(body);
  if (length < INQUIRY_BODY_MIN) problems.body = 'TOO_SHORT';
  else if (length > INQUIRY_BODY_MAX) problems.body = 'TOO_LONG';
  if (!draft.category || problems.body) return { ok: false, problems };
  return { ok: true, input: { category: draft.category, body } };
}

/** 한국 시각(UTC+9) */
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 문의 · 답의 날짜(보드 16-8): 한국 날짜로 "11월 20일", 올해(지금의 한국 해)가 아니면 "2025년 12월 31일". 읽을 수 없는 시각이면 빈 글자.
 * 날짜를 보이기만 한다 — 셈에 쓰지 않는다.
 */
export function formatInquiryDate(iso: string, now: number): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '';
  const D = strings.inquiry.date;
  const day = new Date(at + KOREA_OFFSET_MS);
  const thisYear = new Date(now + KOREA_OFFSET_MS).getUTCFullYear();
  const md = `${day.getUTCMonth() + 1}${D.month}${day.getUTCDate()}${D.day}`;
  return day.getUTCFullYear() === thisYear ? md : `${day.getUTCFullYear()}${D.year}${md}`;
}
