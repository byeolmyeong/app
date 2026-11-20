import { useEffect, useRef, useState } from 'react';

import { useSession } from '@/features/auth/use-session';
import { api, type MyAccount } from '@/lib/api';

/**
 * 홈 별명 카드의 닉네임 · 프로필 그림(`GET /account` — 마이와 같은 호출 getMyAccount, 결정 047). 로그인이 확인된 뒤에 묻는다 —
 * 세션을 확인하기 전에 부르면 앱은 토큰 없이 나가 401 을 받고, 세션 다시 받기가 보관 토큰을 지운다(리뷰 PR #41).
 * 받지 못하면(끊김 · 서버 오류) null — 카드는 이름 줄 없이 그리고, 연결이 돌아오면(online 이 다시 true) 한 번 더 묻는다
 * (띠의 "연결되면 새로 불러올게요", 결정 061 의 4). 받은 뒤에는 다시 묻지 않는다. 기기에 보관하지 않는다.
 */
export function useAccount(online = true): MyAccount | null {
  const signedIn = useSession().status === 'signedIn';
  const [account, setAccount] = useState<MyAccount | null>(null);
  const received = useRef(false);

  useEffect(() => {
    if (!signedIn || !online || received.current) return;
    let alive = true;
    void api.getMyAccount().then((res) => {
      if (!alive || !res.ok) return;
      received.current = true;
      setAccount(res.data);
    });
    return () => {
      alive = false;
    };
  }, [signedIn, online]);

  return signedIn ? account : null;
}
