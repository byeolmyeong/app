/**
 * 기기에 출생 정보가 없을 때 서버에 저장된 것으로 되살린다(결정 029). 새 기기 · 다시 깐 앱에서 다시 입력하지 않게.
 * 서버에 저장된 것이 없을 때(404 `NO_PROFILE`)만 화면이 입력부터 받는다. 있는지 알 수 없거나 차트를 받지 못하면 실패로 알려
 * 화면이 다시 보기를 보인다 — 있는 사람이 조금 다르게 다시 넣으면 `PUT /profile` 이 풀이 · 리포트를 지운다(결정 112).
 * 받은 출생 정보는 로그에 남기지 않는다.
 */
import { useEffect, useRef, useState } from 'react';

import type { StoredBirth } from '@/features/chart/use-birth-profile';
import { api } from '@/lib/api';

/**
 * `GET /profile` 의 출생 정보로 기기에 둘 값을 만든다: 차트는 `POST /charts` 로 받고, 곳의 이름은 `GET /places` 에서 찾는다.
 * 저장된 것이 없으면(404 `NO_PROFILE`) 'none', 그 밖에 묻지 못했거나 차트를 받지 못하면 'failed'. 곳의 이름만 찾지 못했으면 식별자만 두고 이름은 비운다.
 */
export async function restoreBirth(): Promise<StoredBirth | 'none' | 'failed'> {
  const saved = await api.getProfile();
  if (!saved.ok) return saved.status === 404 && saved.code === 'NO_PROFILE' ? 'none' : 'failed';
  const { date, time, placeId } = saved.data;
  if (time === null) {
    const chart = await api.createChart({ date, time, placeId: null });
    return chart.ok ? { profile: { date, time, place: null }, chart: chart.data } : 'failed';
  }
  // 시각이 있는데 곳이 없는 값은 계약에 없다 — 되살릴 수 없으니 입력부터(지금과 같다)
  if (placeId === null) return 'none';
  const [chart, places] = await Promise.all([api.createChart({ date, time, placeId }), api.listPlaces()]);
  if (!chart.ok) return 'failed';
  const name = (places.ok ? places.data.find((p) => p.id === placeId)?.name : undefined) ?? '';
  return { profile: { date, time, place: { id: placeId, name } }, chart: chart.data };
}

/** 되살리기의 진행: 해 보는 중 · 끝남(되살렸거나 서버에 없다) · 실패(다시 보기 — 화면이 처음부터 다시 붙어 다시 해 본다) */
export type BirthRestoreState = 'pending' | 'settled' | 'failed';

/**
 * enabled 가 처음 참이 될 때 한 번 되살리기를 해 보고, 되살렸으면 save 로 기기에 둔다.
 * 끝나기 전에는 화면이 입력 칸 대신 불러오는 중을, 실패면 입력 칸 대신 다시 보기를 보여 준다.
 */
export function useBirthRestore(enabled: boolean, save: (value: StoredBirth) => Promise<void>): BirthRestoreState {
  const [state, setState] = useState<BirthRestoreState>('pending');
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void restoreBirth()
      .then(async (result) => {
        if (result === 'failed') return 'failed' as const;
        if (result !== 'none') await save(result);
        return 'settled' as const;
      })
      .catch(() => 'failed' as const)
      .then(setState);
  }, [enabled, save]);

  return state;
}
