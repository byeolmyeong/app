/**
 * 문의를 보내는 상태(결정 024). 실패한 요청을 스스로 다시 하지 않는다(다시 누를 때만).
 * 보낸 내용과 이메일은 기기 저장소와 로그에 남기지 않는다. 화면의 메모리에만 있다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, type ApiErrorKind, type InquiryInput } from '@/lib/api';

/** failed 의 code 는 서버가 오류 본문에 적어 준 이름(`INVALID_BODY` 등)이다. 없을 수 있다 */
export type InquiryState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent' }
  | { status: 'failed'; error: ApiErrorKind; code?: string };

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

  /** 이미 보내는 중이면 아무것도 하지 않는다(두 번 눌러도 한 번만 보낸다) */
  const send = useCallback(async (input: InquiryInput): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    setState({ status: 'sending' });
    const r = await api.createInquiry(input);
    busy.current = false;
    if (!alive.current) return;
    setState(r.ok ? { status: 'sent' } : { status: 'failed', error: r.error, code: r.code });
  }, []);

  return { state, send };
}
