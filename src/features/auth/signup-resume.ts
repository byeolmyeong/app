/**
 * 가입 이어 하기(결정 068 의 1). 가입권 · 그 공급자 · 적던 값(약관 동의 · 닉네임 · 프로필) · 지금 단계 · 가입권을 받은 시각을
 * 가입권 수명(받은 때부터 30분 · 서버가 준 만료 중 이른 쪽)만큼만 기기에 둔다 — 앱은 세션 토큰과 같은 보안 저장소, 웹은 sessionStorage(그 탭에만).
 * 출생 정보는 두지 않는다(결정 042 · 044). 가입권 · 닉네임은 로그에 남기지 않는다.
 * 가입을 마치거나 · 로그아웃 · 새 로그인 · 가입을 그만두면 세션이 지운다(session-store 의 clearSignup).
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ProviderCredential } from '@/lib/api';

/** 서버의 가입권 수명(서버가 바꾸면 같이 바꾼다) */
export const SIGNUP_TICKET_MS = 30 * 60 * 1000;
const KEY = 'byeolmyeong.signup.v1';

export type SignupStepName = 'terms' | 'nickname' | 'birth';
type Provider = ProviderCredential['provider'];
/** 기기에 두는 가입 초안(출생 정보는 없다) */
export type ResumeDraft = {
  termsVersion?: string;
  privacyVersion?: string;
  pushConsent?: boolean;
  marketingConsent?: boolean;
  nickname?: string;
  avatar?: number;
};
/** expiresAt: 서버가 준 가입권 만료(ms, 없으면 받은 때부터 30분만 본다) */
export type SignupResume = { signupToken: string; provider: Provider; issuedAt: number; expiresAt?: number; step: SignupStepName; draft: ResumeDraft };

const STEPS: readonly SignupStepName[] = ['terms', 'nickname', 'birth'];
const PROVIDERS: readonly Provider[] = ['KAKAO', 'APPLE', 'GOOGLE'];
const optional = (v: unknown, type: 'string' | 'boolean' | 'number') => v === undefined || typeof v === type;

function isResume(v: unknown): v is SignupResume {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  const d = r.draft as Record<string, unknown> | null;
  return (
    typeof r.signupToken === 'string' &&
    r.signupToken.length > 0 &&
    PROVIDERS.includes(r.provider as Provider) &&
    typeof r.issuedAt === 'number' &&
    (r.expiresAt === undefined || typeof r.expiresAt === 'number') &&
    STEPS.includes(r.step as SignupStepName) &&
    typeof d === 'object' &&
    d !== null &&
    optional(d.termsVersion, 'string') &&
    optional(d.privacyVersion, 'string') &&
    optional(d.pushConsent, 'boolean') &&
    optional(d.marketingConsent, 'boolean') &&
    optional(d.nickname, 'string') &&
    (d.avatar === undefined || Number.isInteger(d.avatar))
  );
}

const web = () => Platform.OS === 'web';
const session = () => (typeof sessionStorage === 'undefined' ? null : sessionStorage);

async function read(): Promise<string | null> {
  try {
    return web() ? (session()?.getItem(KEY) ?? null) : await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

async function write(value: string): Promise<void> {
  try {
    if (web()) session()?.setItem(KEY, value);
    else await SecureStore.setItemAsync(KEY, value);
  } catch {
    // 두지 못하면 이번 실행에서만 이어진다(메모리의 가입권으로 계속 쓴다)
  }
}

async function remove(): Promise<void> {
  try {
    if (web()) session()?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // 남은 가입권은 30분 뒤 버려지고, 서버도 SIGNUP_EXPIRED 로 받지 않는다
  }
}

/** 지금 이어 하는 가입(메모리 사본). 없으면 null */
let current: SignupResume | null = null;
/** 쓰기는 차례대로(늦게 시작한 쓰기가 먼저 끝나 앞의 값으로 덮지 않게) */
let writing: Promise<void> = Promise.resolve();
const enqueue = (job: () => Promise<void>) => {
  writing = writing.then(job, job);
  return writing;
};

/** 가입권을 받았다(처음 온 사람). 약관 단계 · 빈 초안으로 둔다 */
export function startResume(signupToken: string, provider: Provider, now = Date.now(), expiresAt?: number): Promise<void> {
  current = { signupToken, provider, issuedAt: now, ...(expiresAt === undefined ? {} : { expiresAt }), step: 'terms', draft: {} };
  const value = JSON.stringify(current);
  return enqueue(() => write(value));
}

/** 적던 값 · 단계를 따라 적는다. 이어 하는 가입이 없으면 아무것도 하지 않는다 */
function update(patch: Partial<Pick<SignupResume, 'step' | 'draft'>>): void {
  if (!current) return;
  current = { ...current, ...patch };
  const value = JSON.stringify(current);
  void enqueue(() => write(value));
}

/** 가입 초안이 바뀌었다(signup-draft 가 부른다). 출생 정보는 초안에 없다 */
export function saveResumeDraft(draft: ResumeDraft): void {
  update({ draft });
}

/** 지금 단계(가입 단계 화면이 뜰 때 부른다) */
export function markSignupStep(step: SignupStepName): void {
  if (current?.step !== step) update({ step });
}

/** 다시 열었다: 가입권 수명 안의 것만 꺼낸다. 지났거나 모양이 틀리면 지우고 null */
export async function loadResume(now = Date.now()): Promise<SignupResume | null> {
  const raw = await read();
  if (raw === null) return null;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  // 보관 수명: 받은 때부터 30분과 서버의 만료 중 이른 쪽
  const until = isResume(parsed) ? Math.min(parsed.issuedAt + SIGNUP_TICKET_MS, parsed.expiresAt ?? Infinity) : 0;
  if (!isResume(parsed) || now >= until || now < parsed.issuedAt) {
    await clearResume();
    return null;
  }
  current = parsed;
  return parsed;
}

/** 보관한 것을 지운다(가입 마침 · 로그아웃 · 새 로그인 · 그만둠 · 만료) */
export function clearResume(): Promise<void> {
  current = null;
  return enqueue(remove);
}

/** 이어 하는 가입의 지금 단계(가드가 하던 단계로 보낸다). 없으면 null */
export const resumeStep = (): SignupStepName | null => current?.step ?? null;

/** 시험용: 쌓인 쓰기가 끝날 때까지 */
export const waitResumeWrites = (): Promise<void> => writing;
