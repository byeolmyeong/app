/**
 * 직접 입력 궁합을 계산해 달라고 하는 상태. 서버가 글을 다 쓸 때까지 기다렸다 답해 수십 초가 걸릴 수 있다.
 * 받은 결과(겹친 휠 포함)와 보낸 상대의 출생 정보는 메모리에만 둔다([rememberFresh]). 기기에 보관하지 않는다.
 * 점수는 서버가 준 값이다. 실패한 요청을 스스로 다시 하지 않는다(다시 누를 때만).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { rememberFresh } from '@/features/synastry/fresh-synastry';
import { api, type ApiErrorKind, type BirthInput, type DirectSynastryInput, type Synastry } from '@/lib/api';

/** 서버에 내 출생 정보가 없을 때의 상태(`NO_PROFILE`) */
const NO_PROFILE_STATUS = 404;

export type DirectSynastryState =
  { status: 'idle' } | { status: 'calculating' } | { status: 'failed'; error: ApiErrorKind };

export function useDirectSynastry() {
  const [state, setState] = useState<DirectSynastryState>({ status: 'idle' });
  const busy = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /**
   * input 은 관계 · 부를 이름 · 상대의 출생 정보, mine 은 기기의 내 출생 정보다.
   * 받았으면 궁합을, 실패했거나 이미 계산 중이거나 그사이 화면을 떠났으면 null 을 돌려준다.
   */
  const calculate = useCallback(async (input: DirectSynastryInput, mine: BirthInput): Promise<Synastry | null> => {
    if (busy.current) return null;
    busy.current = true;
    setState({ status: 'calculating' });
    let r = await api.createDirectSynastry(input);
    // 서버에 내 출생 정보가 없으면(이 기능 전에 입력했거나 서버 저장이 비워진 경우) 저장하고 한 번만 더 요청한다.
    if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(mine)).ok)
      r = await api.createDirectSynastry(input);
    busy.current = false;
    if (!alive.current) return null;
    if (!r.ok) {
      setState({ status: 'failed', error: r.error });
      return null;
    }
    rememberFresh({ synastry: r.data, birth: { date: input.date, time: input.time, placeId: input.placeId } });
    setState({ status: 'idle' });
    return r.data;
  }, []);

  return { state, calculate };
}
