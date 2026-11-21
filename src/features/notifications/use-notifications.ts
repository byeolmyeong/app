/**
 * 알림함의 목록(`GET /notifications`, 결정 052). 홈(종의 점)과 알림함이 함께 쓴다 — 화면이 보일 때마다 다시 묻는다:
 * 홈을 열 때 · 알림함에서 돌아올 때(결정 052 의 4), 알림함을 열 때. 다시 묻는 동안에는 받아 둔 것을 그대로 둔다(처음에만 불러오는 중).
 * 로그인이 확인된 뒤에 묻는다(세션 확인 전의 401 이 보관 토큰을 지우지 않게 — 리뷰 PR #41). 기기에 보관하지 않는다.
 * 실패한 요청을 스스로 다시 하지 않는다("다시 보기" · 연결이 돌아왔을 때만). 요청마다 번호를 매겨 마지막 요청의 답만 쓴다.
 * 휴대폰 푸시가 쓰는 중에 오면(`onPushReceived`, 결정 076) 보이는 화면만 다시 묻는다 — 오늘의 하늘 푸시는 묻지 않는다.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSession } from '@/features/auth/use-session';
import { onPushReceived } from '@/features/push/push';
import { api, type ApiErrorKind, type NotificationList } from '@/lib/api';

export type NotificationsState =
  | { status: 'loading' }
  | { status: 'ready'; list: NotificationList }
  | { status: 'failed'; error: ApiErrorKind; httpStatus?: number };

export function useNotifications() {
  const signedIn = useSession().status === 'signedIn';
  const [state, setState] = useState<NotificationsState>({ status: 'loading' });
  /** 이 화면에서 누른 줄 — 읽음 요청이 서버에 닿기 전에 다시 받아도 읽은 줄로 보인다 */
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());
  const latest = useRef(0);

  const fetchOnce = useCallback(() => {
    if (!signedIn) return;
    const mine = ++latest.current;
    void api.getNotifications().then((res) => {
      if (latest.current !== mine) return;
      if (res.ok) setState({ status: 'ready', list: res.data });
      // 받아 둔 것이 있으면 실패해도 그대로 둔다(다시 볼 때의 끊김)
      else setState((prev) => (prev.status === 'ready' ? prev : { status: 'failed', error: res.error, httpStatus: res.status }));
    });
    return () => {
      // 화면을 떠나면 그 요청의 답을 버린다
      if (latest.current === mine) latest.current++;
    };
  }, [signedIn]);

  /** 이 화면이 보이는가 — 가려진 화면(알림함 아래의 홈)은 푸시에 묻지 않고 다시 보일 때 묻는다 */
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      const leave = fetchOnce();
      return () => {
        focused.current = false;
        leave?.();
      };
    }, [fetchOnce]),
  );
  // 쓰는 중에 푸시가 오면(배너와 함께 — 결정 076) 보이는 화면만 다시 묻는다(푸시 한 번에 한 번).
  // 오늘의 하늘 푸시는 알림 줄을 만들지 않는다 — 오늘의 하늘 카드(useTodaySky)가 새로 본다(리뷰 #66 의 8)
  useEffect(
    () =>
      onPushReceived((push) => {
        if (push.type !== 'TODAY_SKY' && focused.current) fetchOnce();
      }),
    [fetchOnce],
  );

  /** 실패 화면의 "다시 보기" · 연결이 돌아왔을 때 */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    fetchOnce();
  }, [fetchOnce]);

  /** 누른 줄을 읽음으로: 화면은 바로 바꾸고 서버에 알린다. 실패해도 그대로 둔다 — 누른 사람은 이동한다(결정 052 의 3) */
  const markRead = useCallback((id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    void api.markNotificationRead(id);
  }, []);

  const shown = useMemo<NotificationsState>(
    () =>
      state.status === 'ready' && readIds.size > 0
        ? { status: 'ready', list: { ...state.list, items: state.list.items.map((item) => (readIds.has(item.id) ? { ...item, read: true } : item)) } }
        : state,
    [state, readIds],
  );

  return { state: shown, retry, markRead };
}
