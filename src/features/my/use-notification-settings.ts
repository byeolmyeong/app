import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSession } from '@/features/auth/use-session';
import { notificationSettingsOf, type NotificationSettings } from '@/features/my/notification-settings';
import { accountEpoch, refreshAccount, setAccountLocal, useStoredAccount } from '@/lib/account-store';
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
 * 알림 설정(16-2): 첫 그림은 기기 · 메모리에 둔 내 계정(`account-store`, #96)으로 그리고 — 뼈대는 둔 계정이 없을 때만(소유자 "하위 화면이
 * 깨지는 느낌") — 로그인이 확인된 뒤 화면이 보일 때마다 내 계정(`GET /account`, 계정 보관과 같은 요청)을 다시 묻는다. 바꾼 답은 계정 보관에도 둔다.
 * 바꾸기(`change`)는 누른 즉시 화면에 보이고(`PATCH /account` 에는 바꾼 칸만), 답이 오면 서버가 준 값으로 다시 그린다 — 직접 정한 적 없는
 * 오늘의 하늘은 서버가 푸시 동의를 따라 바꿔 주기 때문이다. 못 바꾸면 마지막으로 서버가 준 값으로 되돌리고 false 를 돌려준다(화면이 짧은 알림).
 * 바꾸기가 여럿 겹치면 모두 답이 온 뒤에 서버가 가장 나중에 준 값으로 맞춘다 — 뒤 요청이 먼저 실패해도 앞 요청의 성공이 화면에 남고,
 * 늦게 온 앞 요청의 답이 뒤 것을 덮지 않는다(요청 번호, #59 리뷰). 기다리는 동안 온 읽기의 답도 화면을 바꾸지 않는다.
 */
export function useNotificationSettings() {
  const signedIn = useSession().status === 'signedIn';
  /** 기기 · 메모리에 둔 내 계정 — 서버 답이 오기 전의 첫 그림(알림 칸이 없는 옛 계정이면 쓰지 않는다) */
  const stored = useStoredAccount();
  const storedSettings = signedIn && stored ? notificationSettingsOf(stored) : null;
  const [state, setState] = useState<NotificationState>(() => (storedSettings ? { status: 'ready', settings: storedSettings } : { status: 'loading' }));
  // 로그아웃한 뒤 같은 화면이 살아남아도 앞사람의 설정이 보이지 않게
  if (!signedIn && state.status !== 'loading') setState({ status: 'loading' });
  // 둔 계정이 늦게(기기 읽기) 오면 서버 답 전이라도 그것으로 먼저 그린다
  else if (state.status === 'loading' && storedSettings) setState({ status: 'ready', settings: storedSettings });
  /** 마지막으로 보낸 요청(읽기 · 바꾸기)의 번호 */
  const latest = useRef(0);
  /** 서버가 마지막으로 준 계정과 그 요청의 번호 — 못 바꿨을 때 되돌릴 곳 */
  const confirmed = useRef<Confirmed | null>(null);
  /** 답을 기다리는 바꾸기의 수 */
  const inflight = useRef(0);
  // 로그아웃하면 앞사람의 서버 값을 되돌릴 곳으로 남기지 않는다
  useEffect(() => {
    if (!signedIn) confirmed.current = null;
  }, [signedIn]);

  const load = useCallback(() => {
    if (!signedIn) return;
    const mine = ++latest.current;
    void refreshAccount().then((res) => {
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
    // 서버 답 전이면 둔 계정이 되돌릴 곳
    const base = confirmed.current?.account ?? stored ?? null;
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
    const since = accountEpoch();
    inflight.current++;
    const res = await api.updateAccount(patch);
    inflight.current--;
    if (res.ok) keepNewer(confirmed, mine, res.data);
    // 기다리는 바꾸기가 없을 때만 서버가 마지막으로 준 값으로 맞춘다(못 바꾼 것은 이때 되돌아간다). 계정 보관도 그 값으로
    if (inflight.current === 0) {
      setState(readyOf(confirmed.current?.account ?? base));
      if (confirmed.current) void setAccountLocal(confirmed.current.account, since);
    }
    return res.ok;
  }, [stored]);

  return { state, retry, change };
}
