/**
 * 기기 보관의 이번 실행 메모리(소유자 "화면 · 탭을 넘길 때 미리 그려져 있지 않은 느낌"). 아래 탭은 루트 Stack 의 replace 라 탭을 바꿀 때마다
 * 화면이 새로 붙고, 기기 보관(AsyncStorage)은 비동기라 첫 그림이 비거나 바뀌었다. 이번 실행에서 읽거나 둔 값(보관된 글자 그대로)을 메모리에도
 * 두어, 다시 붙은 화면은 첫 그림부터 동기로 그린다(peekStored). 기기는 뒤에서 읽어 확인한다(같은 값이라 화면은 바뀌지 않는다).
 * 쓰는 곳: 출생 정보 · 요약 해석 · 자세한 풀이(나 탭 · 시기) · 이번 달 · 오늘의 하늘. 로그아웃 · 탈퇴 · 출생 정보 바꾸기(clearDeviceData)가 비운다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 키 → 보관된 글자(없으면 null). 키가 없으면 아직 모름 */
const memory = new Map<string, string | null>();
/** 비울 때마다 하나씩 — 비우기 전에 시작한 읽기는 비운 뒤에 끝나도 메모리에 두지 않는다(앞사람 값이 돌아오지 않게, #96 리뷰 R3) */
let generation = 0;

/** 메모리에 있는 값 — 동기. 아직 읽지 않았으면 undefined, 기기에 없으면 null */
export const peekStored = (key: string): string | null | undefined => memory.get(key);

/**
 * 기기에서 읽고 메모리를 맞춘다. 첫 그림은 메모리(peekStored)로 그리고, 이것은 기기의 값으로 확인한다 — 앱에서는 모든 쓰기가 setStored 이고
 * 지우기는 forgetMemory 와 함께라 같은 값이 와서 화면이 바뀌지 않는다. 못 읽으면 메모리의 것(없으면 null).
 */
export async function getStored(key: string): Promise<string | null> {
  const started = generation;
  try {
    const value = await AsyncStorage.getItem(key);
    if (started === generation) memory.set(key, value);
    return value;
  } catch {
    return memory.get(key) ?? null;
  }
}

/** 기기와 메모리에 둔다 */
export async function setStored(key: string, value: string): Promise<void> {
  memory.set(key, value);
  await AsyncStorage.setItem(key, value);
}

/** 메모리에만 둔다(기기에 두지 않는 이번 실행의 값 — 알림함 목록처럼 서버가 원본인 것). 기기를 지울 때 함께 비워진다 */
export function setMemoryOnly(key: string, value: string): void {
  memory.set(key, value);
}

/** 메모리를 비운다 — 기기를 지울 때(로그아웃 · 탈퇴 · 출생 정보 바꾸기) 함께 */
export function forgetMemory(): void {
  memory.clear();
  generation += 1;
}
