/**
 * 소개를 이 기기에서 봤는지(결정 042 · 104 의 12 — 세 장). 앱을 처음 받아 처음 켰을 때 한 번만 보인다.
 * 기기 저장소는 AsyncStorage 다 — 앱을 지우면 함께 지워져 "처음 받았을 때" 와 맞는다(키체인 `expo-secure-store` 는 앱을 지워도 남는다).
 * 개인정보가 아니고 사람이 아니라 기기에 붙는 값이라, 로그아웃 · 탈퇴가 지우는 머리(`byeolmyeong.`)를 일부러 피한 키를 쓴다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

/** 로그아웃 · 탈퇴의 `clearDeviceData` 가 지우지 않게 `byeolmyeong.` 으로 시작하지 않는다 */
export const INTRO_SEEN_KEY = 'byeolmyeong-device.introSeen.v1';

/** null 은 아직 읽지 않음 */
let seen: boolean | null = null;
let reading: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function set(value: boolean) {
  seen = value;
  listeners.forEach((listener) => listener());
}

/** 이 기기에서 소개를 봤는가. 저장소를 읽지 못하면 본 것으로 친다 — 같은 사람에게 두 번 보이는 것보다 낫다 */
export async function hasSeenIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(INTRO_SEEN_KEY)) !== null;
  } catch {
    return true;
  }
}

/** 소개가 처음 뜨는 순간 부른다. 적지 못해도 이번 실행에서는 본 것으로 둔다 */
export async function markIntroSeen(): Promise<void> {
  set(true);
  try {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // 다음 실행에서 한 번 더 보일 수 있다. 화면은 막지 않는다.
  }
}

/**
 * 이번 실행이 처음 읽은 소개 기록 — 이 실행이 소개를 적기 전의 값이다(소개 화면은 이 값을 읽은 뒤에야 뜬다). 읽지 못했으면 null.
 * 1.1.0 의 새로워진 점이 1.0.x 에서 올라온 기기를 가리는 데 쓴다(결정 113 의 1). 루트가 앱을 켤 때 부른다
 */
let launchRead: Promise<boolean | null> | null = null;
export function introSeenAtLaunch(): Promise<boolean | null> {
  launchRead ??= AsyncStorage.getItem(INTRO_SEEN_KEY).then(
    (value) => value !== null,
    () => null,
  );
  return launchRead;
}

function load(): Promise<boolean> {
  // 저장소를 읽지 못하면 본 것으로 친다 — 같은 사람에게 두 번 보이는 것보다 낫다
  reading ??= introSeenAtLaunch().then((read) => {
    const value = read ?? true;
    if (seen === null) set(value);
    return value;
  });
  return reading;
}

/** 시험용 — 앱을 새로 켠 것처럼 이번 실행의 메모리를 비운다 */
export function resetIntroSeen(): void {
  seen = null;
  reading = null;
  launchRead = null;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => seen;

/** 루트 가드가 쓴다. 처음 쓰일 때 저장소를 읽는다(enabled 가 false 면 읽지 않는다 — 공유 페이지) */
export function useIntroSeen(enabled = true): boolean | null {
  useEffect(() => {
    if (enabled) void load();
  }, [enabled]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
