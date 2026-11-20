/**
 * 받은 공유 카드 기억(소유자 지적 — 다시 열 때 `POST /shares` 를 기다리지 않게). 미리 받기는 하지 않는다 — 서버가 공유하지 않은 사람의
 * 공개 스냅샷을 저장하게 되므로(서버 결정 012). 서버에 저장하지 않는 미리보기 길이 생기면 다시 본다(소유자 결정 대기).
 * - 카드(`card` — 출생 정보가 없다, 결정 053 의 4)만 키마다 따로 둔다: `byeolmyeong.shareCards.v1.<NICKNAME | ME_AREA:영역 | DAY_SKY:날짜 | NEXT_BIG>`.
 *   머리가 `byeolmyeong.` 이라 로그아웃 · 계정 삭제 · 출생 정보 바꾸기가 함께 지운다(features/auth/delete-account.ts). 공유 식별자는 두지 않는다.
 * - 세대 표식(`…gen`)을 요청을 시작할 때 읽고, 끝났을 때 같을 때만 쓴다 — 그 사이 기기를 지웠으면(표식도 지워진다) 앞사람 카드를 다시 써 넣지 않는다.
 * - 진행 중 요청을 같이 쓰지 않는다(미리 받기가 없어 겹칠 일이 드물고, 멈춘 요청이 "다시 시도" 를 막지 않게).
 * - 공유할 것이 없어지면(404) 그 키를 지우고, 그 밖의 실패에는 남긴다. 그날의 하늘을 둘 때 한국 날짜로 지난 날의 것은 지운다.
 * - 궁합 카드(SCORE · RANKING)는 내 이름 · 이름 표시에 따라 달라 기억하지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, isShareCard, type ApiResult, type ShareCard, type ShareCreated, type ShareRequest } from '@/lib/api';
import { koreanToday } from '@/lib/korea-date';

export const SHARE_CARDS_STORAGE_PREFIX = 'byeolmyeong.shareCards.v1.';
const GENERATION_KEY = `${SHARE_CARDS_STORAGE_PREFIX}gen`;
const DAY_SKY = 'DAY_SKY:';

/** 세대 표식을 만드는 중(처음 동시에 부른 요청들이 같은 세대를 쓰게) */
let creating: Promise<string> | null = null;

/** 기억하는 키. 기억하지 않는 종류는 null */
export function shareKeyOf(request: ShareRequest): string | null {
  switch (request.kind) {
    case 'NICKNAME':
    case 'NEXT_BIG':
      return request.kind;
    case 'ME_AREA':
      return `ME_AREA:${request.area}`;
    case 'DAY_SKY':
      return `${DAY_SKY}${request.date}`;
    default:
      return null;
  }
}

/** 지금 세대. 없으면(처음 · 기기를 지운 뒤) 새로 만든다 */
async function generation(): Promise<string> {
  const current = await AsyncStorage.getItem(GENERATION_KEY);
  if (current) return current;
  creating ??= (async () => {
    const next = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(GENERATION_KEY, next);
    return next;
  })().finally(() => {
    creating = null;
  });
  return creating;
}

/** 그날의 하늘을 둘 때: 한국 날짜로 오늘보다 앞선 날의 그날의 하늘 기억을 지운다 */
async function pruneDaySky(): Promise<void> {
  const today = koreanToday();
  const old = (await AsyncStorage.getAllKeys()).filter((k) => {
    if (!k.startsWith(`${SHARE_CARDS_STORAGE_PREFIX}${DAY_SKY}`)) return false;
    return k.slice(SHARE_CARDS_STORAGE_PREFIX.length + DAY_SKY.length) < today;
  });
  if (old.length > 0) await AsyncStorage.multiRemove(old);
}

/** 결과로 기억을 고친다. 요청을 시작할 때의 세대와 지금 세대가 같을 때만(그 사이 기기를 지웠으면 쓰지 않는다) */
async function remember(key: string, gen: string, card: ShareCard | null): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(GENERATION_KEY)) !== gen) return;
    if (!card) return await AsyncStorage.removeItem(`${SHARE_CARDS_STORAGE_PREFIX}${key}`);
    await AsyncStorage.setItem(`${SHARE_CARDS_STORAGE_PREFIX}${key}`, JSON.stringify(card));
    if (key.startsWith(DAY_SKY)) await pruneDaySky();
  } catch {
    // 기억하지 못해도 공유는 된다(다음에 다시 받는다)
  }
}

/** 기기에 기억한 카드. 없거나 계약의 모양이 아니거나 그 키의 종류가 아니면 null */
export async function readCachedShare(key: string): Promise<ShareCard | null> {
  try {
    const raw = await AsyncStorage.getItem(`${SHARE_CARDS_STORAGE_PREFIX}${key}`);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return isShareCard(value) && value.kind === key.split(':')[0] ? value : null;
  } catch {
    return null;
  }
}

/** `POST /shares` 를 부르고 결과로 기억을 고친다(시작할 때의 세대가 그대로일 때만) */
export async function fetchShare(request: ShareRequest): Promise<ApiResult<ShareCreated>> {
  const key = shareKeyOf(request);
  if (!key) return api.createShare(request);
  let gen: string;
  try {
    gen = await generation();
  } catch {
    return api.createShare(request);
  }
  const result = await api.createShare(request);
  if (result.ok) await remember(key, gen, result.data.card);
  else if (result.status === 404) await remember(key, gen, null);
  return result;
}
