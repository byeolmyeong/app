/**
 * 출생 정보와 받은 차트의 기기 보관. 다시 열 때 서버에 요청하지 않으려고 차트도 함께 둔다.
 * 보관된 값은 로그에 남기지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { BirthProfile } from '@/features/chart/birth-input';
import { isChart, type Chart } from '@/lib/api';

export const BIRTH_STORAGE_KEY = 'byeolmyeong.birth.v1';

/** chart 는 profile 의 입력으로 서버가 계산해 준 차트다 */
export type StoredBirth = { profile: BirthProfile; chart: Chart };

/**
 * 보관된 값을 출생 정보로 읽는다. 모양이 다르면 null.
 * 시각 "모름" 이면 곳이 없어도 되고, 예전에 함께 보관된 곳은 쓰지 않으므로 버린다(결정 020).
 */
function readBirthProfile(v: unknown): BirthProfile | null {
  if (typeof v !== 'object' || v === null) return null;
  const p = v as Record<string, unknown>;
  if (typeof p.date !== 'string') return null;
  if (p.time === null) return { date: p.date, time: null, place: null };
  const place = p.place as Record<string, unknown> | null | undefined;
  if (
    typeof p.time !== 'string' ||
    typeof place !== 'object' ||
    place === null ||
    typeof place.id !== 'number' ||
    typeof place.name !== 'string'
  )
    return null;
  return { date: p.date, time: p.time, place: { id: place.id, name: place.name } };
}

/** 보관된 값이 없거나 깨졌으면 null */
export async function loadBirth(): Promise<StoredBirth | null> {
  try {
    const raw = await AsyncStorage.getItem(BIRTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { chart } = parsed as Record<string, unknown>;
    const profile = readBirthProfile((parsed as Record<string, unknown>).profile);
    return profile && isChart(chart) ? { profile, chart } : null;
  } catch {
    return null;
  }
}

export async function saveBirth(value: StoredBirth): Promise<void> {
  await AsyncStorage.setItem(BIRTH_STORAGE_KEY, JSON.stringify(value));
}

/**
 * 보관된 출생 정보와 차트. 처음 그릴 때(서버 렌더링 포함)는 loaded 가 false 이고
 * 화면이 뜬 뒤 기기 저장소를 읽어 채운다.
 */
export function useBirthProfile() {
  const [state, setState] = useState<{ loaded: boolean; stored: StoredBirth | null }>({ loaded: false, stored: null });

  useEffect(() => {
    let alive = true;
    loadBirth().then((stored) => {
      if (alive) setState({ loaded: true, stored });
    });
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback(async (value: StoredBirth) => {
    await saveBirth(value);
    setState({ loaded: true, stored: value });
  }, []);

  return {
    loaded: state.loaded,
    profile: state.stored?.profile ?? null,
    chart: state.stored?.chart ?? null,
    save,
  };
}
