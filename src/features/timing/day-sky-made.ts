/**
 * 그날의 하늘 · 오늘의 하늘을 "만든 적 있음"(결정 075 의 2): 받은 날을 출생 정보별로 기억한다. 만든 적이 없는 날은 뼈대 없이 곧바로 만드는 중,
 * 만든 적이 있는 날은 서버의 저장본이 곧 오므로 늦을 때만 뼈대. 달력 범위(지난달 1일 이후)만 남긴다. 머리 `byeolmyeong.` 이라 로그아웃 · 탈퇴 ·
 * 출생 정보 바꾸기가 지우고, 받는 사이 기기를 지웠으면 세대 표식으로 다시 쓰지 않는다. 날짜 글자를 견주기만 한다(점성 계산 없음).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { shiftMonth } from '@/features/timing/dates';
import { koreanToday } from '@/lib/korea-date';
import { isSameGeneration, storageGeneration } from '@/lib/storage-generation';

export const DAY_SKY_MADE_STORAGE_KEY = 'byeolmyeong.daySkyMade.v1';
const GENERATION_KEY = 'byeolmyeong.daySkyMadeGen.v1';

type Stored = { key: string; dates: string[] };

async function read(): Promise<Stored | null> {
  try {
    const raw = await AsyncStorage.getItem(DAY_SKY_MADE_STORAGE_KEY);
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (typeof v !== 'object' || v === null) return null;
    const s = v as Partial<Stored>;
    return typeof s.key === 'string' && Array.isArray(s.dates) && s.dates.every((d) => typeof d === 'string') ? (s as Stored) : null;
  } catch {
    return null;
  }
}

/** 요청을 시작할 때 읽어 두는 세대 — 답이 왔을 때 markDaySkyMade 에 넘긴다 */
export const daySkyMadeGeneration = () => storageGeneration(GENERATION_KEY).catch(() => null);

/** 이 출생 정보(birthKey)로 그날(date)을 받은 적이 있는가 */
export async function wasDaySkyMade(birthKey: string, date: string): Promise<boolean> {
  const s = await read();
  return s !== null && s.key === birthKey && s.dates.includes(date);
}

/** 그날을 받았다고 기억한다(세대가 그대로일 때만). 지난달 1일 전의 날은 지운다 */
export async function markDaySkyMade(birthKey: string, date: string, gen: string | null): Promise<void> {
  if (gen === null || !(await isSameGeneration(GENERATION_KEY, gen))) return;
  const s = await read();
  const from = `${shiftMonth(koreanToday().slice(0, 7), -1)}-01`;
  const dates = [...new Set([...(s && s.key === birthKey ? s.dates : []), date])].filter((d) => d >= from).sort();
  await AsyncStorage.setItem(DAY_SKY_MADE_STORAGE_KEY, JSON.stringify({ key: birthKey, dates } satisfies Stored)).catch(() => undefined);
}
