/**
 * 문의를 보내는 상태(결정 058). 실패한 요청을 스스로 다시 하지 않는다(다시 누를 때만).
 * 보낸 내용은 기기 저장소와 로그에 남기지 않는다. 화면의 메모리에만 있다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, type ApiResult, type InquiryCreated, type InquiryInput } from '@/lib/api';

export type InquiryState = { status: 'idle' } | { status: 'sending' } | { status: 'sent' } | { status: 'failed' };

export function useInquiry() {
  const [state, setState] = useState<InquiryState>({ status: 'idle' });
  const busy = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** 보낸 결과를 돌려준다(화면이 실패 알림을 고른다). 이미 보내는 중이면 다시 보내지 않고 null(두 번 눌러도 한 번만) */
  const send = useCallback(async (input: InquiryInput): Promise<ApiResult<InquiryCreated> | null> => {
    if (busy.current) return null;
    busy.current = true;
    setState({ status: 'sending' });
    const r = await api.createInquiry(input);
    busy.current = false;
    if (alive.current) setState(r.ok ? { status: 'sent' } : { status: 'failed' });
    return r;
  }, []);

  return { state, send };
}
