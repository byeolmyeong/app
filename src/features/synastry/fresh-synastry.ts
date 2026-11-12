/**
 * 방금 계산한 궁합 하나를 메모리에만 들고 있는다: 겹친 휠(`overlay`)과 입력 화면에서 넣은 상대의 출생 정보.
 * 서버는 상대의 출생 정보와 위치를 저장하지 않고 `POST /synastry/direct` 의 응답에만 휠을 싣는다(서버 결정 008).
 * 앱도 이 둘을 기기 저장소에 두지 않는다. 앱을 다시 켜거나 다른 궁합을 계산하면 사라진다.
 * 그 뒤에 연 결과에는 휠이 없고, 리포트를 처음 요청할 때는 상대의 출생 정보를 다시 입력받는다.
 * 이 값은 로그에 남기지 않는다.
 */
import type { BirthInput, Synastry } from '@/lib/api';

/** birth 는 상대의 출생 정보. 리포트가 다 쓰이면 더 쓸 일이 없어 null 로 비운다 */
export type FreshSynastry = { synastry: Synastry; birth: BirthInput | null };

let fresh: FreshSynastry | null = null;

export function rememberFresh(value: FreshSynastry) {
  fresh = value;
}

/** 방금 계산한 궁합이 이 id 의 것이면 돌려준다 */
export function freshOf(id: string): FreshSynastry | null {
  return fresh && fresh.synastry.id === id ? fresh : null;
}

/** 이 궁합의 상대 출생 정보만 버린다(휠은 남긴다) */
export function forgetFreshBirth(id: string) {
  if (fresh && fresh.synastry.id === id) fresh = { ...fresh, birth: null };
}

export function forgetFresh() {
  fresh = null;
}
