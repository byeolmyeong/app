/**
 * 내 계정(`GET /account` — 닉네임 · 프로필 그림 · 연결된 계정 · 동의 · 정지)의 기기 보관 · 메모리(소유자 "이름이랑 프로필이 늦게 와").
 * 받은 계정을 기기(`byeolmyeong.account.v1`)와 이번 실행의 메모리에 두어, 화면은 첫 그림부터 그리고 뒤에서 새로 받아 바뀐 것만 갈아 끼운다.
 * 정지 문 · 홈 · 마이가 함께 물어도 서버는 한 번(받는 중인 요청을 함께 기다린다). 정지 판정은 지금처럼 서버 값(api.getMyAccount 가 알림).
 * 서버 응답에 계정을 가리는 값이 없어 로그인할 때(다른 계정일 수 있다) · 로그아웃 · 탈퇴 · 출생 정보 바꾸기(기기를 지울 때) 잊는다 —
 * 받는 사이 지웠으면 세대 표식으로 늦은 답을 두지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { api, type ApiResult, type MyAccount } from '@/lib/api';
import { isSameGeneration, storageGeneration } from '@/lib/storage-generation';

export const ACCOUNT_STORAGE_KEY = 'byeolmyeong.account.v1';
const GENERATION_KEY = 'byeolmyeong.accountGen.v1';

/** undefined: 아직 모름(기기에도 없고 이번 로그인에서 받기 전 — 자리표) · null: 받지 못했다(이름 줄 · 그림 없이) */
let current: MyAccount | null | undefined;
/** 기기를 읽었는가(이번 실행에 한 번) */
let readDone = false;
let reading: Promise<void> | null = null;
let fetching: Promise<ApiResult<MyAccount>> | null = null;
/** 이번 로그인에서 서버에 물었는가(받는 중 포함) — 화면이 붙을 때마다 다시 묻지 않게. 못 받으면 다시 false */
let fetchedThisLogin = false;
/** 잊을 때마다 하나씩 — 잊기 전에 시작한 읽기 · 묻기의 늦은 답은 쓰지 않는다(로그인 직후 새 계정을 앞 세션의 답으로 끝내지 않게, #96 리뷰 R2) */
let epoch = 0;
const listeners = new Set<() => void>();

function publish(next: MyAccount | null | undefined) {
  current = next;
  listeners.forEach((l) => l());
}

const isAccount = (v: unknown): v is MyAccount =>
  typeof v === 'object' && v !== null && 'provider' in v && typeof (v as MyAccount).provider === 'string' && typeof (v as MyAccount).suspended === 'boolean';

/** 기기에 둔 계정을 메모리로(이번 실행에 한 번). 메모리에 이미 있으면 읽지 않는다 */
function readOnce(): Promise<void> {
  if (readDone || current !== undefined) return Promise.resolve();
  const started = epoch;
  reading ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(ACCOUNT_STORAGE_KEY);
      const v: unknown = raw ? JSON.parse(raw) : null;
      const account = typeof v === 'object' && v !== null && isAccount((v as { account?: unknown }).account) ? (v as { account: MyAccount }).account : null;
      if (started === epoch && current === undefined && account) publish(account);
    } catch {
      // 읽지 못하면 서버의 답을 기다린다
    }
    readDone = true;
  })().finally(() => {
    reading = null;
  });
  return reading;
}

async function save(account: MyAccount, gen: string | null) {
  if (gen === null || !(await isSameGeneration(GENERATION_KEY, gen))) return;
  await AsyncStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify({ account })).catch(() => undefined);
}

/** 서버에 새로 묻는다(받는 중이면 함께 기다린다). 받으면 메모리 · 기기에, 못 받으면 보관본 그대로. 결과를 그대로 돌려준다 */
export function refreshAccount(): Promise<ApiResult<MyAccount>> {
  fetchedThisLogin = true;
  if (fetching) return fetching;
  const started = epoch;
  const asking: Promise<ApiResult<MyAccount>> = (async () => {
    const gen = await storageGeneration(GENERATION_KEY).catch(() => null);
    const r = await api.getMyAccount();
    const same = started === epoch && gen !== null && (await isSameGeneration(GENERATION_KEY, gen));
    if (r.ok && same) {
      publish(r.data);
      await save(r.data, gen);
    } else if (!r.ok && same) {
      // 못 받았으면 기기의 것 — 화면보다 먼저 물어(정지 문) 아직 읽지 않았으면 읽는다. 그래도 모르면 null(#96 리뷰 R1)
      await readOnce();
      if (started === epoch && current === undefined) publish(null);
    }
    if (!r.ok && started === epoch) fetchedThisLogin = false;
    return r;
  })().finally(() => {
    if (fetching === asking) fetching = null;
  });
  fetching = asking;
  return asking;
}

/** 이번 로그인에서 아직 묻지 않았거나 못 받았을 때만 묻는다(정지 문이 로그인 때 묻고, 홈 · 알림함은 그 답을 같이 쓴다 — /account 한 번) */
export function ensureAccount(): Promise<ApiResult<MyAccount>> | null {
  if (fetchedThisLogin) return fetching;
  return refreshAccount();
}

/** 저장(PATCH /account)의 응답으로 바로 갈아 끼운다 */
export async function setAccountLocal(account: MyAccount): Promise<void> {
  publish(account);
  await save(account, await storageGeneration(GENERATION_KEY).catch(() => null));
}

/** 잊는다: 로그인할 때(다른 계정일 수 있다) · 기기를 지울 때. 기기 · 메모리 · 세대 표식 모두, 받는 중 · 읽는 중인 것은 버린다(늦은 답을 쓰지 않는다) */
export async function forgetAccount(): Promise<void> {
  epoch += 1;
  fetching = null;
  reading = null;
  fetchedThisLogin = false;
  readDone = true;
  publish(undefined);
  await AsyncStorage.multiRemove([ACCOUNT_STORAGE_KEY, GENERATION_KEY]).catch(() => undefined);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => current;

/** 지금 아는 계정(첫 그림부터 — 메모리, 없으면 기기를 읽어 채운다). 아직 모르면 undefined(자리표), 받지 못했으면 null */
export function useStoredAccount(): MyAccount | null | undefined {
  const account = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    void readOnce();
  }, []);
  return account;
}

/** 시험용 */
export function resetAccountStoreForTest(): void {
  current = undefined;
  readDone = false;
  reading = null;
  fetching = null;
  fetchedThisLogin = false;
  listeners.clear();
}
