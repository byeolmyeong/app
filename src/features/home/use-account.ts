import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/use-session';
import { api, type Account } from '@/lib/api';

/**
 * 홈 별명 카드의 닉네임 · 프로필 그림(`GET /account`, 결정 047). 로그인이 확인된 뒤에 한 번 묻는다 —
 * 세션을 확인하기 전에 부르면 앱은 토큰 없이 나가 401 을 받고, 세션 다시 받기가 보관 토큰을 지운다(리뷰 PR #41).
 * 받지 못하면(끊김 · 서버 오류) null — 카드는 이름 줄 없이 그린다. 기기에 보관하지 않는다.
 */
export function useAccount(): Account | null {
  const signedIn = useSession().status === 'signedIn';
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    void api.getAccount().then((res) => {
      if (alive && res.ok) setAccount(res.data);
    });
    return () => {
      alive = false;
    };
  }, [signedIn]);

  return signedIn ? account : null;
}
