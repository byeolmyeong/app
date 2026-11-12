/**
 * 기기에 출생 정보가 없을 때 서버에 저장된 것으로 되살린다(결정 029). 새 기기 · 다시 깐 앱에서 다시 입력하지 않게.
 * 되살리지 못하면 아무것도 하지 않는다(화면은 입력부터 받는다). 받은 출생 정보는 로그에 남기지 않는다.
 */
import { useEffect, useRef, useState } from 'react';

import type { StoredBirth } from '@/features/chart/use-birth-profile';
import { api } from '@/lib/api';

/**
 * `GET /profile` 의 출생 정보로 기기에 둘 값을 만든다: 차트는 `POST /charts` 로 받고, 곳의 이름은 `GET /places` 에서 찾는다.
 * 저장된 것이 없거나 차트를 받지 못하면 null. 곳의 이름만 찾지 못했으면 식별자만 두고 이름은 비운다.
 */
export async function restoreBirth(): Promise<StoredBirth | null> {
  const saved = await api.getProfile();
  if (!saved.ok) return null;
  const { date, time, placeId } = saved.data;
  if (time === null) {
    const chart = await api.createChart({ date, time, placeId: null });
    return chart.ok ? { profile: { date, time, place: null }, chart: chart.data } : null;
  }
  if (placeId === null) return null;
  const [chart, places] = await Promise.all([api.createChart({ date, time, placeId }), api.listPlaces()]);
  if (!chart.ok) return null;
  const name = (places.ok ? places.data.find((p) => p.id === placeId)?.name : undefined) ?? '';
  return { profile: { date, time, place: { id: placeId, name } }, chart: chart.data };
}

/**
 * enabled 가 처음 참이 될 때 한 번 되살리기를 해 보고, 되살렸으면 save 로 기기에 둔다.
 * 돌려주는 값은 "해 보았고 끝났는가" 다. 끝나기 전에는 화면이 입력 칸 대신 불러오는 중을 보여 준다.
 */
export function useBirthRestore(enabled: boolean, save: (value: StoredBirth) => Promise<void>): boolean {
  const [settled, setSettled] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void restoreBirth()
      .then((stored) => (stored ? save(stored) : undefined))
      .catch(() => undefined)
      .then(() => setSettled(true));
  }, [enabled, save]);

  return settled;
}
