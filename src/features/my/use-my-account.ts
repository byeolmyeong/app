import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSession } from '@/features/auth/use-session';
import { api, type MyAccount } from '@/lib/api';

/**
 * 마이 · 계정 화면의 내 계정(`GET /account`). 로그인이 확인된 뒤, 화면이 보일 때마다 새로 묻는다 — 닉네임 화면에서 바꾸고 돌아오면
 * 계정 · 마이가 새 닉네임을 보인다. 묻는 동안과 받지 못했을 때는 받아 둔 것을 그대로 둔다(처음이면 null). 기기에 보관하지 않는다.
 * 화면이 저장(`PATCH /account`)의 응답으로 바로 바꿀 때는 `setAccount` 를 쓴다.
 */
export function useMyAccount() {
  const signedIn = useSession().status === 'signedIn';
  const [account, setAccount] = useState<MyAccount | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!signedIn) return;
      let alive = true;
      void api.getMyAccount().then((res) => {
        if (alive && res.ok) setAccount(res.data);
      });
      return () => {
        alive = false;
      };
    }, [signedIn]),
  );

  return { account: signedIn ? account : null, setAccount };
}
