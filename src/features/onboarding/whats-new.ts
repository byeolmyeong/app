/**
 * 1.1.0 의 새로워진 점 창을 띄울지(결정 109 의 6 · 113 의 1): 1.1.0 을 처음 켤 때 한 번, 1.0.x 에서 올라온 기기만.
 * - 새 기록(`WHATS_NEW_KEY`)이 없으면 이 기기에서 1.1.0 이 처음 켜진 것이다. 그때 이번 실행이 처음 읽은 소개 기록(1.0.x 를 켠 기기는 모두 있다)을 본다:
 *   있었으면 띄울 기기(로그인한 홈이 띄운다), 없었으면 새로 깐 기기 — 곧바로 "새 기기" 를 적어 소개만 보고 끈 사람이 다음 실행에 보지 않게 한다.
 * - 닫기 · 궁합 보러 가기를 누르면 "봤음" 을 적는다. 저장소를 읽지 못하면 띄우지 않는다(새 사람의 첫 화면을 막지 않는 쪽).
 * 사람이 아니라 기기에 붙는 값이라 로그아웃 · 탈퇴가 지우는 머리(`byeolmyeong.`)를 일부러 피한다(소개 기록과 같다). 웹도 같은 규칙이다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { introSeenAtLaunch } from '@/features/onboarding/intro-seen';

export const WHATS_NEW_KEY = 'byeolmyeong-device.whatsNew110.v1';
/** 적는 값: 새로 깐 기기(띄우지 않음) · 창을 봤다 */
const FRESH = 'fresh';
const SEEN = 'seen';

let due = false;
let settling: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setDue(value: boolean) {
  due = value;
  listeners.forEach((listener) => listener());
}

async function write(value: string) {
  try {
    await AsyncStorage.setItem(WHATS_NEW_KEY, value);
  } catch {
    // 적지 못하면 다음 실행에 한 번 더 정한다
  }
}

/** 앱을 켤 때 루트가 한 번 부른다(공유 페이지 말고). 소개 기록은 이 실행이 적기 전의 값을 쓴다 */
export function settleWhatsNew(): Promise<void> {
  settling ??= (async () => {
    // 소개 기록부터 — 이번 실행의 소개 화면이 적기 전에 읽힌 값이다
    const before = introSeenAtLaunch();
    let record: string | null;
    try {
      record = await AsyncStorage.getItem(WHATS_NEW_KEY);
    } catch {
      return;
    }
    if (record !== null) return;
    const seenBefore = await before;
    if (seenBefore === true) setDue(true);
    else if (seenBefore === false) await write(FRESH);
  })();
  return settling;
}

/** 창을 닫거나 궁합 보러 가기를 눌렀다 — 다시 띄우지 않는다 */
export async function markWhatsNewSeen(): Promise<void> {
  setDue(false);
  await write(SEEN);
}

/** 지금 띄울 차례인가(정하기 전이면 false) */
export const whatsNewDue = () => due;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** 홈이 쓴다 */
export function useWhatsNewDue(): boolean {
  return useSyncExternalStore(subscribe, whatsNewDue, whatsNewDue);
}

/** 시험용 — 앱을 새로 켠 것처럼 이번 실행의 메모리를 비운다 */
export function resetWhatsNew(): void {
  due = false;
  settling = null;
}
