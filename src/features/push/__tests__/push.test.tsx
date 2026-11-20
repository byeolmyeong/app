import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { parsePushData, pushTarget } from '@/features/push/push-data';
import {
  getPushPermission,
  onPushReceived,
  PUSH_TOKEN_KEY,
  registerPushDevice,
  requestPushPermission,
  unregisterPushDevice,
  usePushDeviceSync,
  usePushTapRouting,
} from '@/features/push/push';
import { api } from '@/lib/api';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'project-1' } } }, easConfig: null } }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { registerPushDevice: jest.fn(), deletePushDevice: jest.fn() },
}));

const N = Notifications as jest.Mocked<typeof Notifications>;
const mockApi = api as jest.Mocked<typeof api>;
const S = IosAuthorizationStatus;
const perm = (iosStatus: number, granted = iosStatus === S.AUTHORIZED) =>
  ({ granted, status: granted ? 'granted' : iosStatus === S.NOT_DETERMINED ? 'undetermined' : 'denied', canAskAgain: true, expires: 'never', ios: { status: iosStatus } }) as never;
const response = (id: string, data: object) => ({ actionIdentifier: 'default', notification: { request: { identifier: id, content: { data } } } }) as never;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  N.getPermissionsAsync.mockResolvedValue(perm(S.NOT_DETERMINED));
  N.getExpoPushTokenAsync.mockResolvedValue({ type: 'expo', data: 'ExponentPushToken[abc]' });
  N.getLastNotificationResponseAsync.mockResolvedValue(null);
  N.addNotificationResponseReceivedListener.mockImplementation(() => ({ remove: jest.fn() }));
  mockApi.registerPushDevice.mockResolvedValue({ ok: true, data: null });
  mockApi.deletePushDevice.mockResolvedValue({ ok: true, data: null });
});

describe('휴대폰 알림 권한(결정 066)', () => {
  it.each([
    [S.NOT_DETERMINED, 'undetermined'],
    [S.DENIED, 'denied'],
    [S.AUTHORIZED, 'granted'],
    // 임시 허용도 받는 것이다(Expo 문서 — iOS 는 ios.status 를 본다)
    [S.PROVISIONAL, 'granted'],
  ])('iOS 상태 %s → %s', async (status, expected) => {
    N.getPermissionsAsync.mockResolvedValue(perm(status, false));
    expect(await getPushPermission()).toBe(expected);
  });

  it('아직 묻지 않았으면 권한 창을 띄우고(소리 · 배지 · 알림), 허용이면 이 기기를 등록해 토큰을 기억한다', async () => {
    N.requestPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    N.getPermissionsAsync.mockResolvedValueOnce(perm(S.NOT_DETERMINED)).mockResolvedValue(perm(S.AUTHORIZED));
    expect(await requestPushPermission()).toBe('granted');
    expect(N.requestPermissionsAsync).toHaveBeenCalledWith({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    await act(async () => {});
    expect(N.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'project-1' });
    expect(mockApi.registerPushDevice).toHaveBeenCalledWith({ expoToken: 'ExponentPushToken[abc]', platform: 'IOS' });
    expect(await AsyncStorage.getItem(PUSH_TOKEN_KEY)).toBe('ExponentPushToken[abc]');
  });

  it('이미 거절했으면 창을 다시 띄우지 않고 거절을 돌려준다(등록도 안 함)', async () => {
    N.getPermissionsAsync.mockResolvedValue(perm(S.DENIED));
    expect(await requestPushPermission()).toBe('denied');
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockApi.registerPushDevice).not.toHaveBeenCalled();
  });

  it('창에서 거절하면 거절 — 등록하지 않는다', async () => {
    N.requestPermissionsAsync.mockResolvedValue(perm(S.DENIED));
    expect(await requestPushPermission()).toBe('denied');
    expect(mockApi.registerPushDevice).not.toHaveBeenCalled();
  });

  it('웹은 푸시가 없다 — 무엇도 부르지 않고 "unsupported"', async () => {
    const os = Platform.OS;
    Platform.OS = 'web';
    try {
      expect(await getPushPermission()).toBe('unsupported');
      expect(await requestPushPermission()).toBe('unsupported');
      await registerPushDevice();
      expect(N.getPermissionsAsync).not.toHaveBeenCalled();
      expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(mockApi.registerPushDevice).not.toHaveBeenCalled();
    } finally {
      Platform.OS = os;
    }
  });

  it('안드로이드는 채널을 먼저 만든 뒤 묻는다(13 이상은 채널이 없으면 창이 뜨지 않는다)', async () => {
    const os = Platform.OS;
    Platform.OS = 'android';
    try {
      N.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'undetermined', canAskAgain: true, expires: 'never' } as never);
      N.requestPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true, expires: 'never' } as never);
      expect(await requestPushPermission()).toBe('granted');
      expect(N.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({ name: '알림' }));
      expect(N.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(N.requestPermissionsAsync.mock.invocationCallOrder[0]);
    } finally {
      Platform.OS = os;
    }
  });
});

describe('이 기기 등록 · 해제(서버 S10-2)', () => {
  it('권한이 없으면 토큰을 받지 않는다', async () => {
    await registerPushDevice();
    expect(N.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('토큰을 못 받거나 서버가 받지 못해도(S⑩ 전) 던지지 않고, 기억하지 않는다', async () => {
    N.getPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    N.getExpoPushTokenAsync.mockRejectedValueOnce(new Error('network'));
    await expect(registerPushDevice()).resolves.toBeUndefined();
    expect(mockApi.registerPushDevice).not.toHaveBeenCalled();
    mockApi.registerPushDevice.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404 });
    await registerPushDevice();
    expect(await AsyncStorage.getItem(PUSH_TOKEN_KEY)).toBeNull();
  });

  it('로그아웃 때 기억한 토큰으로 DELETE 하고 기억을 버린다 — 실패해도 던지지 않는다', async () => {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, 'ExponentPushToken[abc]');
    mockApi.deletePushDevice.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await expect(unregisterPushDevice()).resolves.toBeUndefined();
    expect(mockApi.deletePushDevice).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(await AsyncStorage.getItem(PUSH_TOKEN_KEY)).toBeNull();
    await unregisterPushDevice();
    expect(mockApi.deletePushDevice).toHaveBeenCalledTimes(1);
  });

  it('루트: 로그인돼 있을 때만 켤 때 다시 등록한다', async () => {
    N.getPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    function Sync({ signedIn }: { signedIn: boolean }) {
      usePushDeviceSync(signedIn);
      return null;
    }
    const view = await render(<Sync signedIn={false} />);
    await act(async () => {});
    expect(mockApi.registerPushDevice).not.toHaveBeenCalled();
    await view.rerender(<Sync signedIn />);
    await act(async () => {});
    expect(mockApi.registerPushDevice).toHaveBeenCalledTimes(1);
  });
});

describe('푸시 data 와 누르면 갈 곳(결정 066 의 4)', () => {
  it.each([
    [{ type: 'TODAY_SKY', date: '2026-11-21' }, '/today'],
    [{ type: 'READING_DONE' }, '/reading'],
    [{ type: 'ME_REPORT_DONE' }, '/me'],
    [{ type: 'TIMING_REPORT_DONE' }, '/timing'],
    [{ type: 'INQUIRY_ANSWERED', inquiryId: 'q1' }, { pathname: '/my/inquiries/[id]', params: { id: 'q1' } }],
    [{ type: 'INQUIRY_ANSWERED', inquiryId: 42 }, { pathname: '/my/inquiries/[id]', params: { id: '42' } }],
    [{ type: 'EVENT', target: '/timing' }, '/timing'],
  ])('%j → %j', (raw, href) => {
    const data = parsePushData(raw);
    expect(data).not.toBeNull();
    expect(pushTarget(data!)).toEqual(href);
  });

  it.each([
    [null],
    [{ type: 'UNKNOWN' }],
    [{ type: 'TODAY_SKY' }],
    [{ type: 'INQUIRY_ANSWERED', inquiryId: '' }],
    // 광고 푸시가 앱 밖으로 보내지 않게
    [{ type: 'EVENT', target: 'https://example.com' }],
    [{ type: 'EVENT', target: '//example.com' }],
  ])('모르는 종류 · 빠진 값 · 앱 밖 주소는 버린다: %j', (raw) => {
    expect(parsePushData(raw)).toBeNull();
  });

  it('쓰는 중에 온 푸시는 알아본 것만 알리고, 돌려준 함수로 그만 듣는다', () => {
    const remove = jest.fn();
    let deliver: (n: never) => void = () => {};
    N.addNotificationReceivedListener.mockImplementation((l) => {
      deliver = l as never;
      return { remove };
    });
    const listener = jest.fn();
    const stop = onPushReceived(listener);
    deliver({ request: { content: { data: { type: 'READING_DONE' } } } } as never);
    deliver({ request: { content: { data: { type: 'NOPE' } } } } as never);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ type: 'READING_DONE' });
    stop();
    expect(remove).toHaveBeenCalled();
  });
});

describe('알림을 누르면(루트)', () => {
  function Tap({ ready }: { ready: boolean }) {
    usePushTapRouting(ready);
    return null;
  }

  it('쓰는 중 배너는 띄우지 않는다(결정 066 의 5)', async () => {
    await render(<Tap ready />);
    const handler = N.setNotificationHandler.mock.calls[0][0];
    expect(await handler?.handleNotification({} as never)).toEqual({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false });
  });

  it('알림으로 처음 켜면 화면들이 준비될 때까지 기다렸다가 한 번 간다 — 같은 알림이 듣기로 또 와도 한 번', async () => {
    let tap: (r: never) => void = () => {};
    N.getLastNotificationResponseAsync.mockResolvedValue(response('n1', { type: 'INQUIRY_ANSWERED', inquiryId: 'q1' }));
    N.addNotificationResponseReceivedListener.mockImplementation((l) => {
      tap = l as never;
      return { remove: jest.fn() };
    });
    const view = await render(<Tap ready={false} />);
    await act(async () => {});
    expect(router.push).not.toHaveBeenCalled();
    await view.rerender(<Tap ready />);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/my/inquiries/[id]', params: { id: 'q1' } });
    await act(async () => tap(response('n1', { type: 'INQUIRY_ANSWERED', inquiryId: 'q1' })));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(N.clearLastNotificationResponseAsync).toHaveBeenCalled();
  });

  it('켜져 있을 때 누르면 바로 간다. 모르는 종류는 가지 않는다', async () => {
    let tap: (r: never) => void = () => {};
    N.addNotificationResponseReceivedListener.mockImplementation((l) => {
      tap = l as never;
      return { remove: jest.fn() };
    });
    await render(<Tap ready />);
    await act(async () => tap(response('n2', { type: 'NOPE' })));
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => tap(response('n3', { type: 'TIMING_REPORT_DONE' })));
    expect(router.push).toHaveBeenCalledWith('/timing');
  });
});
