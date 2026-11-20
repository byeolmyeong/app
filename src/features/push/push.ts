import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { strings } from '@/content/strings';
import { parsePushData, pushTarget, type PushData } from '@/features/push/push-data';
import { api } from '@/lib/api';

/**
 * 휴대폰 푸시(결정 057 · 066, 계획 A8-1): 권한 · 이 기기 등록 · 누르면 이동 · 쓰는 중에 온 푸시 알림.
 * 홈의 알림 받기 권유(11-10 · 11-11, 길 A)와 마이 › 알림(16-2-1)이 쓰는 공유 파일이다. 웹에는 푸시가 없다(066 의 6) — 모두 아무것도 하지 않는다.
 */
export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/** 이 기기를 서버에 등록한 Expo 푸시 토큰 — 로그아웃 때 서버에서 지우려고 둔다. 기기에 붙는 값이라 로그아웃 정리가 지우지 않는다(결정 042) */
export const PUSH_TOKEN_KEY = 'byeolmyeong-device.push-token.v1';
/** 안드로이드 알림 채널 하나(이름은 휴대폰 설정에 보인다) */
const CHANNEL_ID = 'default';
/** 웹에는 푸시가 없다(결정 066 의 6). 부를 때마다 본다 */
const isWeb = () => Platform.OS === 'web';

function permissionOf(s: Notifications.NotificationPermissionsStatus): PushPermission {
  // iOS 는 바탕의 status 보다 ios.status 를 본다(임시 허용 · 잠깐 허용도 받는 것이다 — Expo 문서)
  if (Platform.OS === 'ios' && s.ios) {
    const S = IosAuthorizationStatus;
    if (s.ios.status === S.NOT_DETERMINED) return 'undetermined';
    if (s.ios.status === S.DENIED) return 'denied';
    return 'granted';
  }
  if (s.granted) return 'granted';
  return s.status === 'undetermined' ? 'undetermined' : 'denied';
}

/** 안드로이드 13 이상은 채널이 하나도 없으면 권한 창이 뜨지 않고 토큰도 받지 못한다 — 묻기 · 토큰 전에 만든다 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: strings.push.channel,
    importance: AndroidImportance.DEFAULT,
  });
}

/** 지금 휴대폰 알림 권한(창을 띄우지 않는다) */
export async function getPushPermission(): Promise<PushPermission> {
  if (isWeb()) return 'unsupported';
  return permissionOf(await Notifications.getPermissionsAsync());
}

/**
 * 휴대폰 권한 창(11-11). 아직 묻지 않았을 때만 창이 뜨고, 이미 정해졌으면 그 값만 돌려준다(거절은 다시 띄울 수 없다).
 * 허용이면 이 기기를 서버에 등록한다 — 등록이 실패해도 결과에는 영향이 없다.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  if (isWeb()) return 'unsupported';
  await ensureChannel();
  let permission = await getPushPermission();
  if (permission === 'undetermined')
    permission = permissionOf(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }));
  if (permission === 'granted') void registerPushDevice();
  return permission;
}

/** 화면이 보이는 동안의 휴대폰 권한 — 앱으로 돌아올 때(설정에서 켜고 왔을 때) 다시 읽는다. 읽기 전에는 null */
export function usePushPermission(): PushPermission | null {
  const [permission, setPermission] = useState<PushPermission | null>(isWeb() ? 'unsupported' : null);
  useEffect(() => {
    if (isWeb()) return;
    let alive = true;
    const read = () => void getPushPermission().then((p) => alive && setPermission(p));
    read();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && read());
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return permission;
}

/** 휴대폰 설정의 이 앱 화면을 연다(16-2-1 "설정 열기") */
export async function openPushSettings(): Promise<void> {
  await Linking.openSettings();
}

/**
 * 이 기기를 내 계정에 등록한다(`POST /push/devices`, 같은 토큰이면 서버가 계정 · 시각만 갱신). 권한이 없으면 하지 않는다.
 * 토큰을 받지 못하거나(네트워크 · 프로젝트 아이디 없음) 서버가 받지 못해도(S⑩ 전) 조용히 넘어간다 — 다음에 켤 때 다시 한다.
 */
export async function registerPushDevice(): Promise<void> {
  if (isWeb()) return;
  try {
    if ((await getPushPermission()) !== 'granted') return;
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (typeof projectId !== 'string') return;
    await ensureChannel();
    const { data: expoToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    const res = await api.registerPushDevice({ expoToken, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' });
    if (res.ok) await AsyncStorage.setItem(PUSH_TOKEN_KEY, expoToken);
  } catch {
    // 화면에는 영향이 없다(위)
  }
}

/**
 * 로그아웃 때 이 기기 등록을 서버에서 지운다(세션이 있을 때 불러야 한다). 지우지 못해도 기억은 버린다 — 세션이 없으면 다시 지울 수 없고,
 * 같은 기기로 누가 로그인하면 등록이 그 계정으로 바뀐다.
 */
export async function unregisterPushDevice(): Promise<void> {
  if (isWeb()) return;
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    await api.deletePushDevice(token);
  } catch {
    // 로그아웃은 그대로 한다
  }
}

/**
 * 루트에서 한 번: 로그인이 확인되면(켤 때 · 로그인할 때) 이 기기를 다시 등록하고, 휴대폰이 토큰을 바꾸면 다시 한다.
 * 앱으로 돌아왔을 때는 아직 등록하지 못했을 때만(설정에서 권한을 켜고 온 경우) 다시 해 본다.
 */
export function usePushDeviceSync(signedIn: boolean): void {
  useEffect(() => {
    if (isWeb() || !signedIn) return;
    void registerPushDevice();
    const token = Notifications.addPushTokenListener(() => void registerPushDevice());
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void AsyncStorage.getItem(PUSH_TOKEN_KEY).then((saved) => {
        if (!saved) void registerPushDevice();
      });
    });
    return () => {
      token.remove();
      app.remove();
    };
  }, [signedIn]);
}

/**
 * 루트에서 한 번: 알림을 누르면 그 종류의 화면으로(결정 066 의 4). 앱을 쓰는 중에 온 푸시는 휴대폰 배너를 띄우지 않는다(066 의 5 — 홈 종에 점만).
 * `ready`(화면들이 그려졌고 로그인돼 있다)가 될 때까지 갈 곳을 들고 있다가 보낸다 — 알림으로 앱을 처음 켤 때 스플래시 · 로그인 확인 뒤에 간다.
 * 같은 알림을 두 번(켤 때의 마지막 응답 + 듣기) 받아도 한 번만 간다.
 */
export function usePushTapRouting(ready: boolean): void {
  const pending = useRef<Href | null>(null);
  const handled = useRef<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isWeb()) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
    });
    let alive = true;
    const take = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (!alive || handled.current === id) return;
      handled.current = id;
      const data = parsePushData(response.notification.request.content.data);
      if (!data) return;
      pending.current = pushTarget(data);
      setTick((t) => t + 1);
    };
    void Notifications.getLastNotificationResponseAsync().then((response) => response && take(response));
    const sub = Notifications.addNotificationResponseReceivedListener(take);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const target = pending.current;
    if (!ready || !target) return;
    pending.current = null;
    router.push(target);
    void Notifications.clearLastNotificationResponseAsync();
  }, [ready, tick]);
}

/** 앱을 쓰는 중에 온 푸시마다 부른다(홈 종 점 · 알림함이 다시 읽게, 길 A 의 A④). 모르는 종류는 부르지 않는다. 돌려준 함수로 그만 듣는다 */
export function onPushReceived(listener: (push: PushData) => void): () => void {
  if (isWeb()) return () => {};
  const sub = Notifications.addNotificationReceivedListener((notification) => {
    const data = parsePushData(notification.request.content.data);
    if (data) listener(data);
  });
  return () => sub.remove();
}
