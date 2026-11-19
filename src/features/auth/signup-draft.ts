/**
 * 단계식 가입의 초안(결정 041): 약관 동의 → 닉네임 · 프로필 → 출생 정보의 앞 단계 값. 마지막 "내 별명 읽기" 에서 `POST /auth/signup` 한 번으로 보낸다.
 * **메모리에만** 둔다 — 기기 저장소 · 로그 · 분석에 두지 않는다(닉네임은 개인정보). 앱을 껐다 켜면 비어 있고, 가입을 그만두거나 마치면 지운다.
 */
import type { AvatarId } from '@/components/avatar';

export type SignupDraft = {
  termsVersion: string;
  privacyVersion: string;
  pushConsent: boolean;
  marketingConsent: boolean;
  nickname?: string;
  /** 닉네임 단계에서 고른 프로필 그림(처음엔 무작위) */
  avatar?: AvatarId;
};

let draft: Partial<SignupDraft> = {};

/** 받은 값만 덮어쓴다 */
export function setDraft(patch: Partial<SignupDraft>): void {
  draft = { ...draft, ...patch };
}

/** 약관 단계를 거친 초안. 버전이 없으면(약관 단계 전) null — 앞 단계를 건너뛰고 들어온 것이다 */
export function getDraft(): SignupDraft | null {
  const { termsVersion, privacyVersion, pushConsent, marketingConsent } = draft;
  if (!termsVersion || !privacyVersion || pushConsent === undefined || marketingConsent === undefined) return null;
  return { ...draft, termsVersion, privacyVersion, pushConsent, marketingConsent };
}

export function clearDraft(): void {
  draft = {};
  rejection = null;
}

/** 마지막 단계에서 서버가 닉네임을 거절한 이유. 닉네임 단계로 돌아가 한 번 보여 준다 */
export type NicknameRejection = 'INVALID_NICKNAME' | 'NICKNAME_TAKEN';
let rejection: NicknameRejection | null = null;

export function rejectNickname(code: NicknameRejection): void {
  rejection = code;
}

/** 거절된 이유를 꺼낸다(한 번만 — 꺼내면 비운다) */
export function takeNicknameRejection(): NicknameRejection | null {
  const taken = rejection;
  rejection = null;
  return taken;
}

/** 약관 동의를 다시 받는다(서버가 `TERMS_REQUIRED` 로 거절했을 때). 닉네임 · 프로필은 남긴다 */
export function dropTerms(): void {
  const { nickname, avatar } = draft;
  draft = { nickname, avatar };
}
