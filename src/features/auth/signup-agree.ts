/**
 * 약관 보기의 "동의하기"(결정 044, 보드 6-2). 가입 약관 단계의 "보기" 로 연 글(`?from=signup`)에만 있고,
 * 누르면 그 항목을 가입 초안(메모리)에 켜고 약관 단계로 돌아간다. 마이에서 연 글에는 없다.
 */
import { router, useLocalSearchParams } from 'expo-router';

import { agreeInDraft, type AgreeItem } from '@/features/auth/signup-draft';

/** 가입 약관 단계가 글을 열 때 붙이는 값 */
export const FROM_SIGNUP = 'signup';

/** 동의하기를 누를 때의 동작. 가입 약관 단계에서 연 글이 아니면 undefined(동의하기를 두지 않는다) */
export function useSignupAgree(item: AgreeItem): (() => void) | undefined {
  const { from } = useLocalSearchParams<{ from?: string }>();
  if (from !== FROM_SIGNUP) return undefined;
  return () => {
    agreeInDraft(item);
    // 주소로 바로 열어 돌아갈 곳이 없으면 약관 단계로
    if (router.canGoBack()) router.back();
    else router.replace('/signup/terms');
  };
}
