import type { PushData } from '@/features/push/push-data';
import type { PushTapState } from '@/features/push/push';

/**
 * 웹에는 휴대폰 푸시가 없다(결정 066 의 6 — 웹은 앱 안 알림함만). `push.ts` 와 같은 이름의 빈 구현이라 `expo-notifications` 가
 * 웹 묶음에 들어가지 않는다(그 모듈은 읽기만 해도 토큰 듣기를 걸어 콘솔 경고를 낸다, #64 리뷰).
 */
export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const PUSH_TOKEN_KEY = 'byeolmyeong-device.push-token.v1';

export async function getPushPermission(): Promise<PushPermission> {
  return 'unsupported';
}

export async function requestPushPermission(): Promise<PushPermission> {
  return 'unsupported';
}

export function usePushPermission(): PushPermission | null {
  return 'unsupported';
}

export async function openPushSettings(): Promise<void> {}

export async function registerPushDevice(): Promise<void> {}

export async function unregisterPushDevice(): Promise<void> {}

export function usePushDeviceSync(_signedIn: boolean): void {}

export function usePushTapRouting(_state: PushTapState): void {}

export function onPushReceived(_listener: (push: PushData) => void): () => void {
  return () => {};
}
