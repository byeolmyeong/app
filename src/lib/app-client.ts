/**
 * 이 앱이 어느 플랫폼의 몇 버전인가(결정 027). 서버에 보내는 버전 헤더와 강제 업데이트 판정이 함께 쓴다.
 * 웹은 언제나 최신이라 null 이다(헤더를 보내지 않고 막지도 않는다).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type AppClient = { platform: 'ios' | 'android'; version: string };

/** 네이티브가 아니거나 버전을 읽지 못했으면 null */
export function appClientOf(os: string, version: unknown): AppClient | null {
  if (os !== 'ios' && os !== 'android') return null;
  return typeof version === 'string' && version.length > 0 ? { platform: os, version } : null;
}

/** 버전은 expo 설정(app.json)의 `version` 이다 */
export const appClient = appClientOf(Platform.OS, Constants.expoConfig?.version);
