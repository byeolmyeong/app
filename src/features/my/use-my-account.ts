import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useSession } from '@/features/auth/use-session';
import { refreshAccount, setAccountLocal, useStoredAccount } from '@/lib/account-store';
import type { MyAccount } from '@/lib/api';

/**
 * 마이 · 계정 화면의 내 계정(`GET /account`). 계정 보관 · 메모리(`lib/account-store`)의 것을 첫 그림부터 쓰고, 화면이 보일 때마다 새로 묻는다 —
 * 닉네임 화면에서 바꾸고 돌아오면 계정 · 마이가 새 닉네임을 보인다. 묻는 동안과 받지 못했을 때는 아는 것을 그대로 둔다(처음이면 null).
 * 화면이 저장(`PATCH /account`)의 응답으로 바로 바꿀 때는 `setAccount` 를 쓴다(보관 · 메모리도 바꾼다). 로그인 전이면 null.
 */
export function useMyAccount() {
  const signedIn = useSession().status === 'signedIn';
  const stored = useStoredAccount();
  const account = signedIn ? (stored ?? null) : null;

  useFocusEffect(
    useCallback(() => {
      if (signedIn) void refreshAccount();
    }, [signedIn]),
  );

  const setAccount = useCallback((next: MyAccount) => void setAccountLocal(next), []);
  /** 아직 모른다(처음 — 기기에도 없고 받기 전): 카드는 흐린 자리표 */
  const pending = signedIn && stored === undefined;
  return { account, setAccount, pending };
}
