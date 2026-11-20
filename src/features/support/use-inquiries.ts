/**
 * 내 문의 내역 · 한 건(결정 058). 화면이 보일 때마다 서버에 다시 묻는다 — 새 문의를 보내고 돌아오거나 답이 온 뒤 다시 열면 새 것이 보인다.
 * 다시 묻는 동안에는 받아 둔 것을 그대로 둔다(처음에만 불러오는 중). 실패한 요청을 스스로 다시 하지 않는다("다시 보기" 를 누를 때만).
 * 받은 글은 기기 저장소와 로그에 남기지 않는다. 화면의 메모리에만 있다.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { api, type ApiResult } from '@/lib/api';

export type Loaded<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'failed' } | { status: 'notFound' };

function useFocusedLoad<T>(load: () => Promise<ApiResult<T>>) {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  /** 한 번 묻는다. 돌려준 함수를 부르면 그 답을 버린다(화면을 떠났을 때) */
  const fetchOnce = useCallback(() => {
    let alive = true;
    void load().then((res) => {
      if (!alive) return;
      if (res.ok) setState({ status: 'ready', data: res.data });
      else if (res.code === 'NOT_FOUND') setState({ status: 'notFound' });
      // 받아 둔 것이 있으면 실패해도 그대로 둔다(다시 볼 때의 끊김)
      else setState((prev) => (prev.status === 'ready' ? prev : { status: 'failed' }));
    });
    return () => {
      alive = false;
    };
  }, [load]);
  useFocusEffect(fetchOnce);
  /** 실패 화면의 "다시 보기": 불러오는 중으로 돌리고 다시 묻는다 */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    fetchOnce();
  }, [fetchOnce]);
  return { state, retry };
}

/** 내 문의 내역(새것부터) */
export function useInquiries() {
  return useFocusedLoad(useCallback(() => api.getInquiries(), []));
}

/** 문의 한 건과 답. 남의 것 · 없는 것은 notFound */
export function useInquiryItem(id: string) {
  return useFocusedLoad(useCallback(() => api.getInquiry(id), [id]));
}
