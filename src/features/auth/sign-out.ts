/**
 * 로그아웃(결정 034). 서버 세션을 지우고(실패해도 기기에서는 로그아웃한다) 이 앱이 기기에 둔 것을 비운다 —
 * 같은 기기로 다른 사람이 로그인하면 앞사람의 출생 정보 · 글이 보이면 안 된다. 다시 로그인하면 홈이 서버의 출생 정보로 되살린다.
 * 세션을 지우기 전에 이 기기의 푸시 등록을 지운다(앞사람의 알림이 오지 않게, 결정 057) — 세션이 있어야 지울 수 있다.
 * 이 기기의 구글 로그인도 끊는다 — 안드로이드는 끊지 않으면 다음 구글 로그인이 계정 고르기 없이 앞사람 계정으로 들어간다.
 */
import { clearDeviceData } from '@/features/auth/delete-account';
import { signOutGoogle } from '@/features/auth/providers/google';
import { signOutSession } from '@/features/auth/use-session';
import { unregisterPushDevice } from '@/features/push/push';

export async function signOut(): Promise<void> {
  await unregisterPushDevice();
  await signOutGoogle();
  await clearDeviceData();
  await signOutSession();
}
