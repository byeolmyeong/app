import { useEffect, useState } from 'react';

import { api, type Account } from '@/lib/api';

/**
 * 홈 별명 카드의 닉네임 · 프로필 그림(`GET /account`, 결정 047). 카드가 뜰 때 한 번 묻는다(홈은 로그인한 사람만 온다 — 루트 가드).
 * 받지 못하면(끊김 · 서버 오류) null — 카드는 이름 줄 없이 그린다. 기기에 보관하지 않는다.
 */
export function useAccount(): Account | null {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let alive = true;
    void api.getAccount().then((res) => {
      if (alive && res.ok) setAccount(res.data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return account;
}
