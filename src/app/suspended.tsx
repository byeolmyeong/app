import { router } from 'expo-router';
import { useRef } from 'react';

import { StateScreen } from '@/components/state-screen';
import { strings } from '@/content/strings';
import { signOut } from '@/features/auth/sign-out';
import { clearSuspended } from '@/features/auth/suspension';

const T = strings.suspended;

/**
 * 이용이 정지된 계정(결정 065 의 5, 보드 22): 결정 061 의 실패 틀 — 머리 · 아래 탭 · 뒤로 없이 그림 · 제목 · 두 줄 설명,
 * 맨 아래 주 버튼 "문의하기"(정지 중에도 문의는 열려 있다 → 새 문의, 보내면 여기로 돌아온다) · 그 위 글자 버튼 "로그아웃".
 * 정지 사유는 보이지 않는다(서버도 주지 않는다). 이 화면으로 보내는 것은 정지 문(`features/auth/suspension-gate.tsx`)이다.
 */
export default function SuspendedScreen() {
  /** 로그아웃하는 중(두 번 눌러도 한 번만) */
  const leaving = useRef(false);

  async function logout() {
    if (leaving.current) return;
    leaving.current = true;
    try {
      // 서버 세션 지우기가 실패해도 기기에서는 로그아웃한다(결정 034)
      await signOut();
      clearSuspended();
      if (router.canDismiss()) router.dismissAll();
      router.replace('/login');
    } finally {
      leaving.current = false;
    }
  }

  return (
    <StateScreen
      title={T.title}
      body={T.body}
      primary={{ label: T.inquiry, onPress: () => router.push('/my/inquiries/new') }}
      later={{ label: T.logout, onPress: () => void logout() }}
    />
  );
}
