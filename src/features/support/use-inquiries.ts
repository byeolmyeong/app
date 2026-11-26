/**
 * 내 문의 내역 · 한 건(결정 058). 로그인이 확인된 뒤, 화면이 보일 때마다 서버에 다시 묻는다 — 새 문의를 보내고 돌아오거나 답이 온 뒤
 * 다시 열면 새 것이 보인다. 다시 묻는 동안에는 받아 둔 것을 그대로 둔다(처음에만 불러오는 중). 실패한 요청을 스스로 다시 하지 않는다
 * ("다시 보기" · 연결이 돌아왔을 때만). 받은 글은 기기 저장소와 로그에 남기지 않는다. 화면의 메모리에만 있다.
 * 로그인 확인 전에 부르면 토큰 없이 나가 401 을 받고, 세션 다시 받기가 보관 토큰을 지운다 — 그래서 기다린다(알림이 바로 여는 주소라).
 * 요청마다 번호를 매겨 마지막 요청의 답만 쓴다 — 늦게 온 "다시 보기" 의 답이 그 뒤에 받은 새 목록을 덮거나, 떠난 뒤 온 답이 쓰이지 않게.
 * 답변 보기를 보는 중에 그 문의의 답 푸시가 오면 배너 대신 화면을 다시 묻는다(결정 076 — 보고 있는 화면의 알림은 배너를 띄우지 않는다).
 * 내역은 이번 실행 메모리(`device-memory` 의 메모리 전용 — 기기 저장소 아님)에도 두어, 다시 열면 첫 그림부터 지난 목록을 그리고 뒤에서 새로 받는다
 * (소유자 "하위 화면이 깨지는 느낌", 뼈대는 내용이 있는데 아직 안 온 때만). 로그아웃 · 새 세션 · 만료 · 탈퇴(clearDeviceData)가 함께 비운다.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSession } from '@/features/auth/use-session';
import { onPushReceived } from '@/features/push/push';
import type { PushData } from '@/features/push/push-data';
import { api, type ApiErrorKind, type ApiResult, type InquiryItem } from '@/lib/api';
import { peekStored, setMemoryOnly } from '@/lib/device-memory';

export type Loaded<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'failed'; error: ApiErrorKind } | { status: 'notFound' };

/** 이번 실행 메모리에 둘 곳 — 키와 그 글자를 되읽는 법(모양이 아니면 null) */
type Memory<T> = { key: string; parse: (value: unknown) => T | null };

function remembered<T>(memory: Memory<T> | undefined): T | null {
  const raw = memory ? peekStored(memory.key) : null;
  if (!memory || !raw) return null;
  try {
    return memory.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

function useFocusedLoad<T>(load: (() => Promise<ApiResult<T>>) | null, refreshOn?: (push: PushData) => boolean, memory?: Memory<T>) {
  const signedIn = useSession().status === 'signedIn';
  const [state, setState] = useState<Loaded<T>>(() => {
    if (!load) return { status: 'notFound' };
    const last = remembered(memory);
    return last !== null ? { status: 'ready', data: last } : { status: 'loading' };
  });
  /** 마지막으로 보낸 요청의 번호. 답이 왔을 때 이 번호가 아니면 버린다 */
  const latest = useRef(0);

  const fetchOnce = useCallback(() => {
    if (!signedIn || !load) return;
    const mine = ++latest.current;
    void load().then((res) => {
      if (latest.current !== mine) return;
      if (res.ok) {
        if (memory) setMemoryOnly(memory.key, JSON.stringify(res.data));
        setState({ status: 'ready', data: res.data });
      }
      else if (res.code === 'NOT_FOUND') setState({ status: 'notFound' });
      // 받아 둔 것이 있으면 실패해도 그대로 둔다(다시 볼 때의 끊김)
      else setState((prev) => (prev.status === 'ready' ? prev : { status: 'failed', error: res.error }));
    });
    return () => {
      // 화면을 떠나면 그 요청의 답을 버린다
      if (latest.current === mine) latest.current++;
    };
  }, [load, signedIn, memory]);

  /** 이 화면이 보이고 있는가 — 쓰는 중에 온 푸시로 다시 물을지 정할 때 본다 */
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
  // 보고 있는 화면이 가리키는 푸시가 쓰는 중에 오면(배너는 띄우지 않는다 — 결정 076) 받아 둔 것은 둔 채 다시 묻는다
  useEffect(() => {
    if (!refreshOn) return;
    return onPushReceived((push) => {
      if (focused.current && refreshOn(push)) fetchOnce();
    });
  }, [fetchOnce, refreshOn]);

  /** 실패 화면의 "다시 보기" · 연결이 돌아왔을 때: 불러오는 중으로 돌리고 다시 묻는다(앞의 요청의 답은 버린다) */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    fetchOnce();
  }, [fetchOnce]);

  return { state, retry };
}

/** 내 문의 내역(새것부터) */
const INQUIRIES_MEMORY: Memory<InquiryItem[]> = {
  key: 'byeolmyeong.inquiries.memory',
  parse: (v) => (Array.isArray(v) && v.every((i) => typeof i === 'object' && i !== null && typeof (i as InquiryItem).id === 'string') ? (v as InquiryItem[]) : null),
};

export function useInquiries() {
  return useFocusedLoad<InquiryItem[]>(useCallback(() => api.getInquiries(), []), undefined, INQUIRIES_MEMORY);
}

/** 문의 한 건과 답. 남의 것 · 없는 것은 notFound. 주소에 식별자가 없으면 묻지 않고 notFound */
export function useInquiryItem(id: string) {
  const load = useCallback(() => api.getInquiry(id), [id]);
  const answeredHere = useCallback((push: PushData) => push.type === 'INQUIRY_ANSWERED' && push.inquiryId === id, [id]);
  return useFocusedLoad<InquiryItem>(id === '' ? null : load, answeredHere);
}
