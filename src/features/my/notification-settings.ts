import { formatClock } from '@/components/time-wheel';
import type { MyAccount } from '@/lib/api';

/** 알림 설정 화면(16-2)이 그리는 값. 오늘의 하늘은 서버가 그 두 칸(S10-2)을 줄 때만 있다 */
export type NotificationSettings = {
  pushConsent: boolean;
  marketingConsent: boolean;
  todaySky: { on: boolean; time: string } | null;
};

/** 계정에서 알림 설정만 꺼낸다. 푸시 동의 칸이 없는 옛 서버면 null — 알림 화면은 받지 못한 것으로 본다 */
export function notificationSettingsOf(account: MyAccount): NotificationSettings | null {
  if (account.pushConsent === undefined) return null;
  const todaySky =
    account.todaySkyPush !== undefined && account.todaySkyTime !== undefined
      ? { on: account.todaySkyPush, time: account.todaySkyTime }
      : null;
  return { pushConsent: account.pushConsent, marketingConsent: account.marketingConsent, todaySky };
}

/**
 * 마이 첫 줄 "알림" 오른쪽의 받는 시간("오전 8:00", 보드 16). 서버가 보내는 조건과 같게 푸시 동의와 오늘의 하늘이 둘 다 켜졌을 때만 —
 * 아니면(끔 · 칸 없는 서버 · 계정을 아직 못 받음) null 이고 줄에 적지 않는다.
 */
export function todaySkyTimeLabel(account: MyAccount | null): string | null {
  if (!account?.pushConsent || !account.todaySkyPush || !account.todaySkyTime) return null;
  return formatClock(account.todaySkyTime) || null;
}
