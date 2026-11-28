import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { strings } from '@/content/strings';
import { isViewingTarget, parsePushData, pushTarget, type PushData } from '@/features/push/push-data';
import { api } from '@/lib/api';

/**
 * 휴대폰 푸시(결정 057 · 066, 계획 A8-1): 권한 · 이 기기 등록 · 누르면 이동 · 쓰는 중에 온 푸시 알림.
 * 홈의 알림 받기 권유(11-10 · 11-11)와 마이 › 알림(16-2-1)이 쓰는 공유 파일이다. 웹에는 푸시가 없다(066 의 6) — 웹은 `push.web.ts` 가
 * 같은 이름의 빈 구현을 주어 `expo-notifications` 를 웹 묶음에 넣지 않는다.
 */
export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/** 이 기기를 서버에 등록한 Expo 푸시 토큰 — 로그아웃 때 서버에서 지우려고 둔다. 기기에 붙는 값이라 로그아웃 정리가 지우지 않는다(결정 042) */
export const PUSH_TOKEN_KEY = 'byeolmyeong-device.push-token.v1';
/** 안드로이드 알림 채널(이름은 휴대폰 설정에 보인다): 보통 알림 */
const CHANNEL_ID = 'default';
/** 조용한 채널 — 서버가 밤 9시 ~ 아침 8시에 1.1.0 이상 안드로이드로 가는 알림에 이 id 를 싣는다(서버 S4-4). 채널이 없는 기기에는 그 알림이 보이지 않는다 */
const QUIET_CHANNEL_ID = 'quiet';

function permissionOf(s: Notifications.NotificationPermissionsStatus): PushPermission {
  // iOS 는 바탕의 status 보다 ios.status 를 본다(임시 허용 · 잠깐 허용도 받는 것이다 — Expo 문서)
  if (Platform.OS === 'ios' && s.ios) {
    const S = IosAuthorizationStatus;
    if (s.ios.status === S.NOT_DETERMINED) return 'undetermined';
    if (s.ios.status === S.DENIED) return 'denied';
    return 'granted';
  }
  if (s.granted) return 'granted';
  if (s.status === 'undetermined') return 'undetermined';
  // 안드로이드 13+ 는 아직 묻지 않았어도 알림이 꺼져 있으면 denied 로 온다 — 다시 물을 수 있으면 아직 묻지 않은 것으로 본다(#65 리뷰)
  if (Platform.OS === 'android' && s.canAskAgain) return 'undetermined';
  return 'denied';
}

/** 권한을 물은 뒤 다시 읽어야 하는 화면들(usePushPermission) — 앱이 잠깐 비활성이 되지 않아도 결과가 바로 보이게 */
const permissionListeners = new Set<() => void>();

/**
 * 안드로이드 13 이상은 채널이 하나도 없으면 권한 창이 뜨지 않고 토큰도 받지 못한다 — 묻기 · 토큰 전에 만든다.
 * 중요도 HIGH 라야 위에서 내려오는 배너로 뜬다(결정 098). 이미 만든 채널의 중요도는 안드로이드가 바꾸지 않는다 — 전에 DEFAULT 로 만든 기기는 다시 깔아야 한다.
 * 조용한 채널(quiet)은 알림 칸에 보이되 소리 · 진동이 없다 — 중요도 DEFAULT(위에서 내려오지 않음)에 소리 없음 · 진동 끔(계획 A1-5 · 결정 114)
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: strings.push.channel,
    importance: AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync(QUIET_CHANNEL_ID, {
    name: strings.push.quietChannel,
    importance: AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
  });
}

/** 지금 휴대폰 알림 권한(창을 띄우지 않는다) */
export async function getPushPermission(): Promise<PushPermission> {
  return permissionOf(await Notifications.getPermissionsAsync());
}

/**
 * 휴대폰 권한 창(11-11). 아직 묻지 않았을 때만 창이 뜨고, 이미 정해졌으면 그 값만 돌려준다(거절은 다시 띄울 수 없다).
 * 허용이면 이 기기를 서버에 등록한다 — 등록이 실패해도 결과에는 영향이 없다. 채널을 못 만들어도 묻기는 한다.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  try {
    await ensureChannel();
  } catch {
    // 채널이 없으면 안드로이드 13+ 는 창이 뜨지 않을 수 있다 — 결과(거절)가 그대로 돌아온다
  }
  let permission = await getPushPermission();
  if (permission === 'undetermined') {
    permission = permissionOf(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }));
    permissionListeners.forEach((l) => l());
  }
  if (permission === 'granted') void registerPushDevice();
  return permission;
}

/** 화면이 보이는 동안의 휴대폰 권한 — 앱으로 돌아올 때(설정에서 켜고 왔을 때) 다시 읽는다. 읽기 전에는 null */
export function usePushPermission(): PushPermission | null {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  useEffect(() => {
    let alive = true;
    const read = () => void getPushPermission().then((p) => alive && setPermission(p));
    read();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && read());
    permissionListeners.add(read);
    return () => {
      alive = false;
      sub.remove();
      permissionListeners.delete(read);
    };
  }, []);
  return permission;
}

/** 휴대폰 설정의 이 앱 화면을 연다(16-2-1 "설정 열기") */
export async function openPushSettings(): Promise<void> {
  await Linking.openSettings();
}

/** 로그아웃할 때마다 하나 올린다 — 그 전에 시작한 등록은 서버에 보내거나 기억하기 전에 멈춘다(#64 리뷰) */
let generation = 0;
/** 지금 하고 있는 등록 — 겹쳐 부르면 같은 것을 기다린다(권한 창 뒤 등록과 루트의 등록이 두 번 나가지 않게) */
let registering: Promise<void> | null = null;

async function register(): Promise<void> {
  const mine = generation;
  try {
    if ((await getPushPermission()) !== 'granted') return;
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (typeof projectId !== 'string') return;
    await ensureChannel();
    const { data: expoToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    // 토큰을 받는 사이 로그아웃이 시작됐다 — 앞사람 계정으로 보내지 않는다
    if (generation !== mine) return;
    const res = await api.registerPushDevice({ expoToken, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' });
    if (!res.ok) return;
    // 보내는 사이 로그아웃이 시작됐다 — 로그아웃이 이 등록을 기다리므로 세션이 아직 있다, 바로 지운다
    if (generation !== mine) {
      await api.deletePushDevice(expoToken);
      return;
    }
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, expoToken);
  } catch {
    // 토큰을 못 받거나(네트워크 · 프로젝트 아이디 없음) 서버가 받지 못해도(S⑩ 전) 화면에는 영향이 없다 — 다음에 켤 때 다시 한다
  }
}

/** 이 기기를 내 계정에 등록한다(`POST /push/devices`, 같은 토큰이면 서버가 지금 계정으로 옮긴다). 권한이 없으면 하지 않는다 */
export function registerPushDevice(): Promise<void> {
  registering ??= register().finally(() => {
    registering = null;
  });
  return registering;
}

/**
 * 로그아웃 때(세션을 지우기 전에) 이 기기 등록을 서버에서 지우고, 알림 센터에 남은 앞사람의 알림 · 배지를 걷는다.
 * 하던 등록이 있으면 끝나기를 기다린다. 지우지 못해도 기억은 버린다 — 세션이 없으면 다시 지울 수 없고, 같은 기기로 누가 로그인하면
 * 서버가 등록을 그 계정으로 옮긴다.
 */
export async function unregisterPushDevice(): Promise<void> {
  generation += 1;
  try {
    await registering;
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      await api.deletePushDevice(token);
    }
  } catch {
    // 로그아웃은 그대로 한다
  }
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // 걷지 못해도 로그아웃은 그대로 한다
  }
}

/**
 * 루트에서 한 번: 로그인이 확인되면(켤 때 · 로그인할 때) 이 기기를 다시 등록하고, 휴대폰이 토큰을 바꾸면 다시 한다.
 * 앱으로 돌아왔을 때는 아직 등록하지 못했을 때만(설정에서 권한을 켜고 온 경우) 한 번 다시 해 본다 — 서버가 받지 못할 때 돌아올 때마다
 * 되풀이하지 않게.
 */
export function usePushDeviceSync(signedIn: boolean): void {
  useEffect(() => {
    if (!signedIn) return;
    void registerPushDevice();
    let retried = false;
    const token = Notifications.addPushTokenListener(() => void registerPushDevice());
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || retried) return;
      void AsyncStorage.getItem(PUSH_TOKEN_KEY).then((saved) => {
        if (saved || retried) return;
        retried = true;
        void registerPushDevice();
      });
    });
    return () => {
      token.remove();
      app.remove();
    };
  }, [signedIn]);
}

export type PushTapState = {
  /** 화면들이 그려졌고 로그인 · 이용 정지 확인이 끝났다 */
  ready: boolean;
  /** 정지된 계정 — 정지 중에도 열리는 문의 답변만 보내고 나머지는 버린다(그 위에 다른 화면이 쌓이지 않게) */
  suspended: boolean;
  /** 로그인 전으로 확인됐다 — 들고 있던 갈 곳은 버린다(다음에 로그인하는 다른 사람에게 가지 않게) */
  signedOut: boolean;
};

/**
 * 루트에서 한 번: 알림을 누르면 그 종류의 화면으로(결정 066 의 4). 앱을 쓰는 중에 온 푸시도 배너로 띄우되, 그 알림이 가리키는 화면을 보고 있으면 띄우지 않는다(결정 076).
 * `ready` 가 될 때까지 갈 곳을 들고 있다가 보낸다 — 알림으로 앱을 처음 켤 때 스플래시 · 로그인 · 정지 확인 뒤에 간다.
 * 같은 알림을 두 번(켤 때의 마지막 응답 + 듣기) 받아도 한 번만 간다.
 */
export function usePushTapRouting({ ready, suspended, signedOut }: PushTapState): void {
  // 지금 보고 있는 화면 — 쓰는 중에 온 알림을 띄울지 정할 때 본다(알림 처리기는 한 번만 걸어 두고 이 값을 읽는다)
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  const pending = useRef<PushData | null>(null);
  const handled = useRef<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // 앱을 쓰는 중에 온 푸시도 위에 배너로 — 그 알림이 가리키는 화면을 지금 보고 있으면 띄우지 않는다(결정 076).
    // iOS 는 소리 없이. 안드로이드는 조용하게 만든 알림을 위로 띄우지 않아 소리를 허용한다(채널의 소리 · 진동을 따른다, 결정 098)
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = parsePushData(notification.request.content.data);
        const show = !(data && isViewingTarget(data, pathRef.current));
        return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show && Platform.OS === 'android', shouldSetBadge: false };
      },
    });
    let alive = true;
    const take = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (!alive || handled.current === id) return;
      handled.current = id;
      const data = parsePushData(response.notification.request.content.data);
      if (!data) return;
      pending.current = data;
      setTick((t) => t + 1);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) take(last);
    const sub = Notifications.addNotificationResponseReceivedListener(take);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const data = pending.current;
    if (!data) return;
    if (signedOut) {
      pending.current = null;
      Notifications.clearLastNotificationResponse();
      return;
    }
    if (!ready) return;
    pending.current = null;
    Notifications.clearLastNotificationResponse();
    if (suspended && data.type !== 'INQUIRY_ANSWERED') return;
    router.push(pushTarget(data));
  }, [ready, suspended, signedOut, tick]);
}

/** 앱을 쓰는 중에 온 푸시마다 부른다(홈 종 점 · 알림함이 다시 읽게, 길 A 의 A④). 모르는 종류는 부르지 않는다. 돌려준 함수로 그만 듣는다 */
export function onPushReceived(listener: (push: PushData) => void): () => void {
  const sub = Notifications.addNotificationReceivedListener((notification) => {
    const data = parsePushData(notification.request.content.data);
    if (data) listener(data);
  });
  return () => sub.remove();
}
