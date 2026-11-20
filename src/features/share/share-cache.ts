/**
 * 공유 카드 기억 · 미리 받기(소유자 지적 — 시트를 열 때마다 `POST /shares` 를 기다리지 않게).
 * - 받은 `{ shareId, card }` 를 종류별 키(NICKNAME · ME_AREA:영역 · DAY_SKY:날짜 · NEXT_BIG)로 기기에 둔다. 카드에는 출생 정보가 없다(결정 053 의 4).
 *   키 머리가 `byeolmyeong.` 이라 로그아웃 · 계정 삭제 · 출생 정보 바꾸기가 함께 지운다(features/auth/delete-account.ts).
 * - 같은 키의 요청이 진행 중이면 그것을 같이 쓴다. 공유할 것이 없어지면(404) 기억도 지우고, 그 밖의 실패에는 남긴다.
 * - 궁합 카드(SCORE · RANKING)는 내 이름 · 이름 표시에 따라 달라 기억하지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api, isShareCard, type ApiResult, type ShareCreated, type ShareRequest } from '@/lib/api';

export const SHARE_CARDS_STORAGE_KEY = 'byeolmyeong.shareCards.v1';

const inFlight = new Map<string, Promise<ApiResult<ShareCreated>>>();

/** 기억하는 키. 기억하지 않는 종류는 null */
export function shareKeyOf(request: ShareRequest): string | null {
  switch (request.kind) {
    case 'NICKNAME':
    case 'NEXT_BIG':
      return request.kind;
    case 'ME_AREA':
      return `ME_AREA:${request.area}`;
    case 'DAY_SKY':
      return `DAY_SKY:${request.date}`;
    default:
      return null;
  }
}

const isStored = (v: unknown, key: string): v is ShareCreated =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as ShareCreated).shareId === 'string' &&
  (v as ShareCreated).shareId.length > 0 &&
  isShareCard((v as ShareCreated).card) &&
  (v as ShareCreated).card.kind === key.split(':')[0];

async function readAll(): Promise<Record<string, unknown>> {
  try {
    const raw = await AsyncStorage.getItem(SHARE_CARDS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function update(key: string, value: ShareCreated | null): Promise<void> {
  try {
    const all = await readAll();
    if (value) all[key] = value;
    else delete all[key];
    await AsyncStorage.setItem(SHARE_CARDS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // 기억하지 못해도 공유는 된다(다음에 다시 받는다)
  }
}

/** 기기에 기억한 카드. 없거나 계약의 모양이 아니면 null */
export async function readCachedShare(key: string): Promise<ShareCreated | null> {
  const value = (await readAll())[key];
  return isStored(value, key) ? value : null;
}

/** `POST /shares`. 같은 키의 진행 중 요청을 같이 쓰고, 결과로 기억을 고친다 */
export function fetchShare(request: ShareRequest): Promise<ApiResult<ShareCreated>> {
  const key = shareKeyOf(request);
  if (!key) return api.createShare(request);
  const running = inFlight.get(key);
  if (running) return running;
  const promise = api
    .createShare(request)
    .then(async (result) => {
      if (result.ok) await update(key, result.data);
      else if (result.status === 404) await update(key, null);
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/** 공유 아이콘이 있는 화면에 들어왔을 때: 기억한 카드가 없으면 미리 받아 둔다(실패는 조용히) */
export function prefetchShare(request: ShareRequest): void {
  const key = shareKeyOf(request);
  if (!key) return;
  void readCachedShare(key).then((cached) => {
    if (!cached) void fetchShare(request);
  });
}

/** 시험용: 진행 중 요청의 기억을 비운다(끝나지 않는 요청을 둔 시험이 다음 시험에 남기지 않게) */
export function resetShareRequests(): void {
  inFlight.clear();
}
