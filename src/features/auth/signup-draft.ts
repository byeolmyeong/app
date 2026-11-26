/**
 * 단계식 가입의 초안(결정 042): 약관 동의 → 닉네임 · 프로필 → 출생 정보의 앞 단계 값. 마지막 "내 별명 읽기" 에서 `POST /auth/signup` 한 번으로 보낸다.
 * 메모리에 두고, 가입권이 살아 있는 동안만 이어 하기용으로 기기에도 따라 적는다(signup-resume.ts, 결정 068 — 로그 · 분석에는 두지 않는다).
 * 출생 정보는 초안에 없다. 가입을 그만두거나 마치면 지운다.
 */
import { isAvatarId, type AvatarId } from '@/components/avatar';
import { LEGAL_VERSIONS } from '@/content/legal-versions';
import { saveResumeDraft, type ResumeDraft } from '@/features/auth/signup-resume';

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

/** 받은 값만 덮어쓴다. 이어 하는 가입이면 기기에도 따라 적는다 */
export function setDraft(patch: Partial<SignupDraft>): void {
  draft = { ...draft, ...patch };
  saveResumeDraft(draft);
}

/** 이어 하기(결정 068): 기기에 둔 초안을 메모리로 되돌린다 */
export function restoreDraft(saved: ResumeDraft): void {
  draft = { ...saved, avatar: isAvatarId(saved.avatar) ? saved.avatar : undefined };
}

/** 약관 단계를 거친 초안. 버전이 없으면(약관 단계 전) null — 앞 단계를 건너뛰고 들어온 것이다 */
export function getDraft(): SignupDraft | null {
  const { termsVersion, privacyVersion, pushConsent, marketingConsent } = draft;
  if (!termsVersion || !privacyVersion || pushConsent === undefined || marketingConsent === undefined) return null;
  return { ...draft, termsVersion, privacyVersion, pushConsent, marketingConsent };
}

/** 약관 단계의 체크 넷(결정 042) */
export type Agreements = { terms: boolean; privacy: boolean; push: boolean; marketing: boolean };

/** 초안의 동의를 하나씩 읽는다. 이용약관 · 처리방침은 그 버전이 있으면 켜짐이다(하나만 켠 것도 남는다 — 약관 보기에서 돌아올 때) */
export function draftAgreements(): Agreements {
  return {
    terms: draft.termsVersion !== undefined,
    privacy: draft.privacyVersion !== undefined,
    push: draft.pushConsent ?? false,
    marketing: draft.marketingConsent ?? false,
  };
}

/**
 * 약관 단계의 체크를 초안에 쓴다. 켠 약관 · 처리방침은 지금 버전을, 끈 것은 버전을 지운다 —
 * 필수 하나라도 꺼지면 `getDraft()` 가 null 이라 다음 단계들이 약관 단계로 돌려보낸다.
 */
export function writeAgreements(a: Agreements): void {
  setDraft({
    termsVersion: a.terms ? LEGAL_VERSIONS.terms : undefined,
    privacyVersion: a.privacy ? LEGAL_VERSIONS.privacy : undefined,
    pushConsent: a.push,
    marketingConsent: a.marketing,
  });
}

/** 약관 보기(보드 6-2)의 "동의하기" 가 켜는 항목 */
export type AgreeItem = 'terms' | 'privacy' | 'marketing';

/** 약관 보기에서 동의했다: 그 항목만 켜고 나머지는 그대로 둔다(결정 044) */
export function agreeInDraft(item: AgreeItem): void {
  writeAgreements({ ...draftAgreements(), [item]: true });
}

export function clearDraft(): void {
  draft = {};
  rejection = null;
  termsRejected = false;
  signedUp = null;
}

/** 방금 가입을 마친 사람의 닉네임(서버가 `POST /auth/signup` 으로 받은 값). 별명 공개(보드 10)가 한 번 쓴다 — 메모리에만(결정 044) */
let signedUp: string | null = null;

/** 가입을 마쳤다: 초안을 비우고 닉네임만 별명 공개를 위해 메모리에 남긴다 */
export function finishDraft(): void {
  const nickname = draft.nickname ?? null;
  clearDraft();
  signedUp = nickname;
}

/** 방금 가입한 사람의 닉네임. 가입 직후가 아니면(앱을 다시 켬 · 웹 새로 고침 · 이미 공개함) null */
export function signedUpNickname(): string | null {
  return signedUp;
}

/** 별명 공개를 마쳤다(풀이 읽기) — 다시 열면 풀이 글로 바로 */
export function clearSignedUp(): void {
  signedUp = null;
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

let termsRejected = false;

/** 약관 동의를 다시 받는다(서버가 `TERMS_REQUIRED` 로 거절했을 때). 동의를 지우고 닉네임 · 프로필은 남긴다. 약관 단계가 이유를 한 번 보여 준다 */
export function rejectTerms(): void {
  const { nickname, avatar } = draft;
  draft = { nickname, avatar };
  saveResumeDraft(draft);
  termsRejected = true;
}

/** 약관이 거절됐는지 꺼낸다(한 번만 — 꺼내면 비운다) */
export function takeTermsRejection(): boolean {
  const taken = termsRejected;
  termsRejected = false;
  return taken;
}
