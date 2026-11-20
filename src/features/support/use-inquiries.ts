/**
 * 내 문의 내역 · 한 건(결정 058). 로그인이 확인된 뒤, 화면이 보일 때마다 서버에 다시 묻는다 — 새 문의를 보내고 돌아오거나 답이 온 뒤
 * 다시 열면 새 것이 보인다. 다시 묻는 동안에는 받아 둔 것을 그대로 둔다(처음에만 불러오는 중). 실패한 요청을 스스로 다시 하지 않는다
 * ("다시 보기" · 연결이 돌아왔을 때만). 받은 글은 기기 저장소와 로그에 남기지 않는다. 화면의 메모리에만 있다.
 * 로그인 확인 전에 부르면 토큰 없이 나가 401 을 받고, 세션 다시 받기가 보관 토큰을 지운다 — 그래서 기다린다(알림이 바로 여는 주소라).
 * 요청마다 번호를 매겨 마지막 요청의 답만 쓴다 — 늦게 온 "다시 보기" 의 답이 그 뒤에 받은 새 목록을 덮거나, 떠난 뒤 온 답이 쓰이지 않게.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useSession } from '@/features/auth/use-session';
import { api, type ApiErrorKind, type ApiResult, type InquiryItem } from '@/lib/api';

export type Loaded<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'failed'; error: ApiErrorKind } | { status: 'notFound' };

function useFocusedLoad<T>(load: (() => Promise<ApiResult<T>>) | null) {
  const signedIn = useSession().status === 'signedIn';
  const [state, setState] = useState<Loaded<T>>(load ? { status: 'loading' } : { status: 'notFound' });
  /** 마지막으로 보낸 요청의 번호. 답이 왔을 때 이 번호가 아니면 버린다 */
  const latest = useRef(0);

  const fetchOnce = useCallback(() => {
    if (!signedIn || !load) return;
    const mine = ++latest.current;
    void load().then((res) => {
      if (latest.current !== mine) return;
      if (res.ok) setState({ status: 'ready', data: res.data });
      else if (res.code === 'NOT_FOUND') setState({ status: 'notFound' });
      // 받아 둔 것이 있으면 실패해도 그대로 둔다(다시 볼 때의 끊김)
      else setState((prev) => (prev.status === 'ready' ? prev : { status: 'failed', error: res.error }));
    });
    return () => {
      // 화면을 떠나면 그 요청의 답을 버린다
      if (latest.current === mine) latest.current++;
    };
  }, [load, signedIn]);

  useFocusEffect(fetchOnce);

  /** 실패 화면의 "다시 보기" · 연결이 돌아왔을 때: 불러오는 중으로 돌리고 다시 묻는다(앞의 요청의 답은 버린다) */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    fetchOnce();
  }, [fetchOnce]);

  return { state, retry };
}

/** 내 문의 내역(새것부터) */
export function useInquiries() {
  return useFocusedLoad<InquiryItem[]>(useCallback(() => api.getInquiries(), []));
}

/** 문의 한 건과 답. 남의 것 · 없는 것은 notFound. 주소에 식별자가 없으면 묻지 않고 notFound */
export function useInquiryItem(id: string) {
  const load = useCallback(() => api.getInquiry(id), [id]);
  return useFocusedLoad<InquiryItem>(id === '' ? null : load);
}
