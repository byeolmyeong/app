import { useEffect } from 'react';

import { useSession } from '@/features/auth/use-session';
import { ensureAccount, useStoredAccount } from '@/lib/account-store';
import type { MyAccount } from '@/lib/api';

/**
 * 홈 별명 카드 · 알림함의 닉네임 · 프로필 그림(`GET /account`, 결정 047). 계정 보관 · 메모리(`lib/account-store`)의 것을 첫 그림부터 쓰고,
 * 이번 로그인에서 아직 묻지 않았을 때만 묻는다 — 정지 문이 로그인 때 묻는 답을 같이 써서 /account 를 한 번 더 부르지 않는다.
 * 로그인이 확인된 뒤에 묻는다(세션 확인 전의 401 이 보관 토큰을 지우지 않게 — 리뷰 PR #41). 받지 못하면 연결이 돌아올 때 한 번 더(결정 061 의 4).
 * 아직 모르면 undefined(카드는 같은 자리에 흐린 자리표), 받지 못했으면 null(이름 줄 · 그림 없이). 로그인 전이면 null.
 */
export function useAccount(online = true): MyAccount | null | undefined {
  const signedIn = useSession().status === 'signedIn';
  const account = useStoredAccount();

  useEffect(() => {
    if (signedIn && online) void ensureAccount();
  }, [signedIn, online]);

  return signedIn ? account : null;
}
