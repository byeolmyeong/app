/**
 * 궁합 하나를 지운다(`DELETE /synastry/{id}`). 서버가 그 궁합의 리포트와 방향성 글도 함께 지운다(이미 만든 공유 링크는 남는다).
 * 서버가 지운 뒤에만 메모리의 방금 계산한 결과를 버리고 목록 · 랭킹이 다시 받게 알린다. 이미 지워진 것(404)도 지운 것으로 친다.
 */
import { forgetFresh, freshOf } from '@/features/synastry/fresh-synastry';
import { api, type ApiResult } from '@/lib/api';

const NOT_FOUND_STATUS = 404;

/** 궁합이 지워질 때마다 하나씩 는다. 목록 · 랭킹이 이 값이 바뀌면 서버에서 다시 받는다 */
let deletions = 0;
const listeners = new Set<() => void>();

export const getSynastryDeletions = () => deletions;

export function subscribeSynastryDeletions(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function deleteSynastry(id: string): Promise<ApiResult<null>> {
  const r = await api.deleteSynastry(id);
  if (!r.ok && r.status !== NOT_FOUND_STATUS) return r;
  if (freshOf(id)) forgetFresh();
  deletions += 1;
  listeners.forEach((listener) => listener());
  return { ok: true, data: null };
}
