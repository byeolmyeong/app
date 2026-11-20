import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { clearDraft, getDraft, restoreDraft, setDraft, writeAgreements } from '@/features/auth/signup-draft';
import {
  SIGNUP_TICKET_MS,
  clearResume,
  loadResume,
  markSignupStep,
  resumeStep,
  startResume,
  waitResumeWrites,
} from '@/features/auth/signup-resume';

jest.mock('expo-secure-store', () => {
  const kept = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => kept.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      kept.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      kept.delete(key);
    }),
  };
});

const mockStore = SecureStore as jest.Mocked<typeof SecureStore>;
const KEY = 'byeolmyeong.signup.v1';
const stored = async () => JSON.parse((await mockStore.getItemAsync(KEY)) ?? 'null');
const originalOS = Platform.OS;

beforeEach(async () => {
  await clearResume();
  clearDraft();
  jest.clearAllMocks();
});
afterEach(() => {
  Platform.OS = originalOS;
});

// 가입 이어 하기(결정 068 의 1): 가입권 · 공급자 · 적던 값 · 단계 · 받은 시각을 30분만 기기에(앱은 보안 저장소)
describe('가입 이어 하기 보관', () => {
  it('가입권을 받으면 공급자 · 받은 시각 · 약관 단계로 둔다', async () => {
    await startResume('ticket-1', 'KAKAO', 1_000);
    expect(await stored()).toEqual({ signupToken: 'ticket-1', provider: 'KAKAO', issuedAt: 1_000, step: 'terms', draft: {} });
    expect(resumeStep()).toBe('terms');
  });

  it('적던 값(약관 · 닉네임 · 프로필)과 단계를 따라 적는다. 출생 정보는 초안에 없어 두지 않는다', async () => {
    await startResume('ticket-1', 'GOOGLE', 1_000);
    writeAgreements({ terms: true, privacy: true, push: false, marketing: true });
    setDraft({ nickname: '새벽별', avatar: 3 });
    markSignupStep('birth');
    await waitResumeWrites();
    const saved = await stored();
    expect(saved.step).toBe('birth');
    expect(saved.draft).toMatchObject({ nickname: '새벽별', avatar: 3, pushConsent: false, marketingConsent: true });
    expect(saved.draft.termsVersion).toEqual(expect.any(String));
    expect(Object.keys(saved.draft).sort()).toEqual(['avatar', 'marketingConsent', 'nickname', 'privacyVersion', 'pushConsent', 'termsVersion']);
  });

  it('가입권을 받지 않았으면(이어 할 게 없음) 초안을 바꿔도 적지 않는다', async () => {
    setDraft({ nickname: '새벽별' });
    await waitResumeWrites();
    expect(mockStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('다시 열면 30분 안의 것만 꺼내고 초안을 되돌린다. 30분이 지났으면 지우고 null', async () => {
    await startResume('ticket-1', 'APPLE', 1_000);
    writeAgreements({ terms: true, privacy: true, push: true, marketing: false });
    setDraft({ nickname: '새벽별', avatar: 2 });
    markSignupStep('nickname');
    await waitResumeWrites();
    clearDraft();

    const resumed = await loadResume(1_000 + SIGNUP_TICKET_MS - 1);
    expect(resumed).toMatchObject({ signupToken: 'ticket-1', provider: 'APPLE', step: 'nickname' });
    restoreDraft(resumed!.draft);
    expect(getDraft()).toMatchObject({ nickname: '새벽별', avatar: 2, pushConsent: true });

    expect(await loadResume(1_000 + SIGNUP_TICKET_MS)).toBeNull();
    expect(await mockStore.getItemAsync(KEY)).toBeNull();
  });

  it('모양이 틀린 값은 버린다', async () => {
    await mockStore.setItemAsync(KEY, '{"signupToken":1}');
    expect(await loadResume(1_000)).toBeNull();
  });

  it('웹은 sessionStorage(그 탭에만)에 둔다', async () => {
    Platform.OS = 'web';
    const kept = new Map<string, string>();
    (globalThis as { sessionStorage?: unknown }).sessionStorage = {
      getItem: (k: string) => kept.get(k) ?? null,
      setItem: (k: string, v: string) => void kept.set(k, v),
      removeItem: (k: string) => void kept.delete(k),
    };
    try {
      await startResume('ticket-web', 'GOOGLE', 5);
      expect(JSON.parse(kept.get(KEY)!)).toMatchObject({ signupToken: 'ticket-web' });
      expect(mockStore.setItemAsync).not.toHaveBeenCalled();
      expect(await loadResume(10)).toMatchObject({ signupToken: 'ticket-web' });
      await clearResume();
      expect(kept.has(KEY)).toBe(false);
    } finally {
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }
  });
});
