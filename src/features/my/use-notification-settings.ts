import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useSession } from '@/features/auth/use-session';
import { notificationSettingsOf, type NotificationSettings } from '@/features/my/notification-settings';
import { api, type AccountPatch, type ApiErrorKind, type MyAccount } from '@/lib/api';

export type NotificationState =
  | { status: 'loading' }
  | { status: 'ready'; settings: NotificationSettings }
  | { status: 'failed'; error: ApiErrorKind };

type Confirmed = { seq: number; account: MyAccount };

/** 서버가 준 계정을 되돌릴 곳으로 둔다 — 늦게 온 옛 요청의 답이 더 새 답을 덮지 않게 번호가 더 클 때만 */
function keepNewer(ref: { current: Confirmed | null }, seq: number, account: MyAccount) {
  if (!ref.current || seq > ref.current.seq) ref.current = { seq, account };
}

const readyOf = (account: MyAccount): NotificationState => {
  const settings = notificationSettingsOf(account);
  // 푸시 동의 칸이 없는 옛 서버 — 바꿀 수 없으니 받지 못한 것과 같게
  return settings ? { status: 'ready', settings } : { status: 'failed', error: 'INVALID' };
};

/**
 * 알림 설정(16-2): 로그인이 확인된 뒤, 화면이 보일 때마다 내 계정(`GET /account`)을 다시 묻는다. 기기에 보관하지 않는다.
 * 바꾸기(`change`)는 누른 즉시 화면에 보이고(`PATCH /account` 에는 바꾼 칸만), 답이 오면 서버가 준 값으로 다시 그린다 — 직접 정한 적 없는
 * 오늘의 하늘은 서버가 푸시 동의를 따라 바꿔 주기 때문이다. 못 바꾸면 마지막으로 서버가 준 값으로 되돌리고 false 를 돌려준다(화면이 짧은 알림).
 * 바꾸기가 여럿 겹치면 모두 답이 온 뒤에 서버가 가장 나중에 준 값으로 맞춘다 — 뒤 요청이 먼저 실패해도 앞 요청의 성공이 화면에 남고,
 * 늦게 온 앞 요청의 답이 뒤 것을 덮지 않는다(요청 번호, #59 리뷰). 기다리는 동안 온 읽기의 답도 화면을 바꾸지 않는다.
 */
export function useNotificationSettings() {
  const signedIn = useSession().status === 'signedIn';
  const [state, setState] = useState<NotificationState>({ status: 'loading' });
  // 로그아웃한 뒤 같은 화면이 살아남아도 앞사람의 설정이 보이지 않게
  if (!signedIn && state.status !== 'loading') setState({ status: 'loading' });
  /** 마지막으로 보낸 요청(읽기 · 바꾸기)의 번호 */
  const latest = useRef(0);
  /** 서버가 마지막으로 준 계정과 그 요청의 번호 — 못 바꿨을 때 되돌릴 곳 */
  const confirmed = useRef<Confirmed | null>(null);
  /** 답을 기다리는 바꾸기의 수 */
  const inflight = useRef(0);

  const load = useCallback(() => {
    if (!signedIn) return;
    const mine = ++latest.current;
    void api.getMyAccount().then((res) => {
      if (res.ok) keepNewer(confirmed, mine, res.data);
      if (latest.current !== mine || inflight.current > 0) return;
      if (res.ok) setState(readyOf(res.data));
      // 받아 둔 것이 있으면 실패해도 그대로 둔다(다시 볼 때의 끊김)
      else setState((prev) => (prev.status === 'ready' ? prev : { status: 'failed', error: res.error }));
    });
    return () => {
      // 화면을 떠나면 그 읽기의 답을 버린다
      if (latest.current === mine) latest.current++;
    };
  }, [signedIn]);

  useFocusEffect(load);

  /** 실패 화면의 "다시 보기" · 연결이 돌아왔을 때 */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  const change = useCallback(async (patch: AccountPatch): Promise<boolean> => {
    const base = confirmed.current;
    if (!base) return false;
    setState((prev) => {
      if (prev.status !== 'ready') return prev;
      const s = prev.settings;
      return {
        status: 'ready',
        settings: {
          pushConsent: patch.pushConsent ?? s.pushConsent,
          marketingConsent: patch.marketingConsent ?? s.marketingConsent,
          todaySky: s.todaySky && { on: patch.todaySkyPush ?? s.todaySky.on, time: patch.todaySkyTime ?? s.todaySky.time },
        },
      };
    });
    const mine = ++latest.current;
    inflight.current++;
    const res = await api.updateAccount(patch);
    inflight.current--;
    if (res.ok) keepNewer(confirmed, mine, res.data);
    // 기다리는 바꾸기가 없을 때만 서버가 마지막으로 준 값으로 맞춘다(못 바꾼 것은 이때 되돌아간다)
    const last = confirmed.current?.account;
    if (inflight.current === 0 && last) setState(readyOf(last));
    return res.ok;
  }, []);

  return { state, retry, change };
}
