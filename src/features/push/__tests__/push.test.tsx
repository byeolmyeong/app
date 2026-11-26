import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';
import { router } from 'expo-router';
import { AppState, Linking, Platform } from 'react-native';

import { isViewingTarget, parsePushData, pushTarget } from '@/features/push/push-data';
import {
  getPushPermission,
  onPushReceived,
  openPushSettings,
  PUSH_TOKEN_KEY,
  registerPushDevice,
  requestPushPermission,
  unregisterPushDevice,
  usePushDeviceSync,
  usePushPermission,
  usePushTapRouting,
} from '@/features/push/push';
import { api } from '@/lib/api';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'project-1' } } }, easConfig: null } }));
// 지금 보고 있는 화면은 시험이 정한다(기본: 홈)
let mockPathname = '/';
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, usePathname: () => mockPathname }));
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
  mockPathname = '/';
  await AsyncStorage.clear();
  N.getPermissionsAsync.mockResolvedValue(perm(S.NOT_DETERMINED));
  N.getExpoPushTokenAsync.mockResolvedValue({ type: 'expo', data: 'ExponentPushToken[abc]' });
  N.getLastNotificationResponse.mockReturnValue(null);
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

  it('웹은 푸시가 없다 — 빈 구현(push.web.ts)이 무엇도 부르지 않고 "unsupported"', async () => {
    const web = jest.requireActual<typeof import('@/features/push/push.web')>('@/features/push/push.web');
    expect(await web.getPushPermission()).toBe('unsupported');
    expect(await web.requestPushPermission()).toBe('unsupported');
    await web.registerPushDevice();
    await web.unregisterPushDevice();
    await web.openPushSettings();
    web.onPushReceived(() => {})();
    expect(N.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mockApi.registerPushDevice).not.toHaveBeenCalled();
  });

  it('화면이 보이는 동안의 권한은 앱으로 돌아오면 다시 읽는다(16-2-1)', async () => {
    let onChange: (state: string) => void = () => {};
    // 한 번만 바꿔 끼운다(되돌리면 react-native 가짜의 원래 구현까지 지워진다)
    jest.spyOn(AppState, 'addEventListener').mockImplementationOnce((_t, h) => {
      onChange = h as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
    N.getPermissionsAsync.mockResolvedValue(perm(S.DENIED));
    let seen: string | null = null;
    function Probe() {
      seen = usePushPermission();
      return null;
    }
    await render(<Probe />);
    await act(async () => {});
    expect(seen).toBe('denied');
    N.getPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    await act(async () => onChange('active'));
    expect(seen).toBe('granted');
  });

  it('"설정 열기" 는 휴대폰 설정을 연다', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await openPushSettings();
    expect(open).toHaveBeenCalled();
    open.mockRestore();
  });

  it.each([
    [true, 'undetermined'],
    [false, 'denied'],
  ])('안드로이드 13+ 는 아직 묻지 않아도 denied 로 온다 — 다시 물을 수 있으면(%s) %s(#65 리뷰)', async (canAskAgain, expected) => {
    const os = Platform.OS;
    Platform.OS = 'android';
    try {
      N.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied', canAskAgain, expires: 'never' } as never);
      expect(await getPushPermission()).toBe(expected);
    } finally {
      Platform.OS = os;
    }
  });

  it('권한을 물은 뒤에는 화면의 권한을 바로 다시 읽는다(앱이 비활성이 되지 않아도)', async () => {
    let seen: string | null = null;
    function Probe() {
      seen = usePushPermission();
      return null;
    }
    await render(<Probe />);
    await act(async () => {});
    expect(seen).toBe('undetermined');
    N.requestPermissionsAsync.mockResolvedValue(perm(S.DENIED));
    N.getPermissionsAsync.mockResolvedValueOnce(perm(S.NOT_DETERMINED)).mockResolvedValue(perm(S.DENIED));
    await act(async () => {
      await requestPushPermission();
    });
    expect(seen).toBe('denied');
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

  it('겹쳐 부르면 한 번만 보낸다(권한 창 뒤 등록과 루트의 등록)', async () => {
    N.getPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    await Promise.all([registerPushDevice(), registerPushDevice()]);
    expect(mockApi.registerPushDevice).toHaveBeenCalledTimes(1);
  });

  it('토큰을 받는 사이 로그아웃이 시작되면 앞사람 계정으로 보내지 않는다(#64 리뷰)', async () => {
    N.getPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    let give: (t: { type: 'expo'; data: string }) => void = () => {};
    N.getExpoPushTokenAsync.mockReturnValueOnce(new Promise((r) => (give = r)) as never);
    const reg = registerPushDevice();
    await act(async () => {});
    const out = unregisterPushDevice();
    give({ type: 'expo', data: 'ExponentPushToken[abc]' });
    await reg;
    await out;
    expect(mockApi.registerPushDevice).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(PUSH_TOKEN_KEY)).toBeNull();
  });

  it('서버에 보내는 사이 로그아웃이 시작되면, 로그아웃이 기다렸다가 그 등록을 바로 지운다(세션이 있을 때)', async () => {
    N.getPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    let answer: (r: { ok: true; data: null }) => void = () => {};
    mockApi.registerPushDevice.mockReturnValueOnce(new Promise((r) => (answer = r)));
    const reg = registerPushDevice();
    await act(async () => {});
    await act(async () => {});
    expect(mockApi.registerPushDevice).toHaveBeenCalledTimes(1);
    let unregistered = false;
    const out = unregisterPushDevice().then(() => (unregistered = true));
    await act(async () => {});
    expect(unregistered).toBe(false);
    answer({ ok: true, data: null });
    await reg;
    await out;
    expect(mockApi.deletePushDevice).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(await AsyncStorage.getItem(PUSH_TOKEN_KEY)).toBeNull();
  });

  it('로그아웃하면 알림 센터에 남은 앞사람의 알림과 배지를 걷는다', async () => {
    await unregisterPushDevice();
    expect(N.dismissAllNotificationsAsync).toHaveBeenCalled();
    expect(N.setBadgeCountAsync).toHaveBeenCalledWith(0);
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
    // 오늘의 하늘은 /today(A④)
    // 오늘의 하늘은 /today — 그날을 함께 넘겨 서버가 미리 만든 날로 연다(리뷰 #87 의 4)
    [{ type: 'TODAY_SKY', date: '2026-11-21' }, { pathname: '/today', params: { date: '2026-11-21' } }],
    [{ type: 'READING_DONE' }, '/reading'],
    [{ type: 'ME_REPORT_DONE' }, '/me'],
    [{ type: 'TIMING_REPORT_DONE' }, '/timing'],
    [{ type: 'INQUIRY_ANSWERED', inquiryId: 'q1' }, { pathname: '/my/inquiries/[id]', params: { id: 'q1' } }],
    [{ type: 'INQUIRY_ANSWERED', inquiryId: 42 }, { pathname: '/my/inquiries/[id]', params: { id: '42' } }],
    [{ type: 'EVENT', target: '/timing' }, '/timing'],
    [{ type: 'EVENT', target: '/my/inquiries' }, '/my/inquiries'],
    [{ type: 'EVENT', target: '/today' }, '/today'],
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
    // 없는 주소로는 보내지 않는다(길 잃은 화면)
    [{ type: 'EVENT', target: '/nowhere' }],
  ])('모르는 종류 · 빠진 값 · 앱 밖 주소는 버린다: %j', (raw) => {
    expect(parsePushData(raw)).toBeNull();
  });

  it.each([
    [{ type: 'TODAY_SKY', date: '2026-11-21' }, ['/', '/today'], ['/me', '/timing']],
    [{ type: 'READING_DONE' }, ['/reading', '/me'], ['/', '/timing']],
    [{ type: 'ME_REPORT_DONE' }, ['/me'], ['/', '/reading']],
    [{ type: 'TIMING_REPORT_DONE' }, ['/timing'], ['/', '/me']],
    [{ type: 'INQUIRY_ANSWERED', inquiryId: 'q1' }, ['/my/inquiries/q1'], ['/my/inquiries', '/my/inquiries/q2', '/']],
    [{ type: 'EVENT', target: '/timing?from=push' }, ['/timing'], ['/', '/me']],
    [{ type: 'EVENT', target: '/timing/' }, ['/timing'], ['/', '/me']],
  ])('그 알림이 가리키는 화면을 보고 있는가(결정 076): %j', (raw, viewing, elsewhere) => {
    const data = parsePushData(raw)!;
    for (const path of viewing) expect(isViewingTarget(data, path)).toBe(true);
    for (const path of elsewhere) expect(isViewingTarget(data, path)).toBe(false);
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
  function Tap({ ready, suspended = false, signedOut = false }: { ready: boolean; suspended?: boolean; signedOut?: boolean }) {
    usePushTapRouting({ ready, suspended, signedOut });
    return null;
  }

  const incoming = (data: object) => ({ request: { identifier: 'n', content: { data } } }) as never;
  const shown = { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false };
  const hidden = { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };

  it('쓰는 중에 온 푸시도 배너 · 목록으로 띄운다(소리 없이) — 그 알림이 가리키는 화면을 보고 있으면 띄우지 않는다(결정 076)', async () => {
    mockPathname = '/me';
    const view = await render(<Tap ready />);
    const handler = N.setNotificationHandler.mock.calls[0][0]!;
    expect(await handler.handleNotification(incoming({ type: 'INQUIRY_ANSWERED', inquiryId: 'q1' }))).toEqual(shown);
    expect(await handler.handleNotification(incoming({ type: 'ME_REPORT_DONE' }))).toEqual(hidden);
    // 화면을 옮기면 그 화면을 기준으로(처리기는 한 번만 건다)
    mockPathname = '/my/inquiries/q1';
    await view.rerender(<Tap ready />);
    expect(N.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(await handler.handleNotification(incoming({ type: 'INQUIRY_ANSWERED', inquiryId: 'q1' }))).toEqual(hidden);
    expect(await handler.handleNotification(incoming({ type: 'ME_REPORT_DONE' }))).toEqual(shown);
    // 알아보지 못한 data 도 띄운다(서버가 보낸 알림을 삼키지 않는다)
    expect(await handler.handleNotification(incoming({ type: 'NOPE' }))).toEqual(shown);
  });

  it('알림으로 처음 켜면 화면들이 준비될 때까지 기다렸다가 한 번 간다 — 같은 알림이 듣기로 또 와도 한 번', async () => {
    let tap: (r: never) => void = () => {};
    N.getLastNotificationResponse.mockReturnValue(response('n1', { type: 'INQUIRY_ANSWERED', inquiryId: 'q1' }));
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
    expect(N.clearLastNotificationResponse).toHaveBeenCalled();
  });

  it('정지된 계정이면 문의 답변만 보내고 나머지는 버린다(정지 화면 위에 다른 화면이 쌓이지 않게, #64 리뷰)', async () => {
    let tap: (r: never) => void = () => {};
    N.addNotificationResponseReceivedListener.mockImplementation((l) => {
      tap = l as never;
      return { remove: jest.fn() };
    });
    await render(<Tap ready suspended />);
    await act(async () => tap(response('n4', { type: 'TIMING_REPORT_DONE' })));
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => tap(response('n5', { type: 'INQUIRY_ANSWERED', inquiryId: 'q9' })));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/my/inquiries/[id]', params: { id: 'q9' } });
  });

  it('로그인 전으로 확인되면 들고 있던 갈 곳을 버린다 — 다음에 로그인하는 사람에게 가지 않는다', async () => {
    N.getLastNotificationResponse.mockReturnValue(response('n6', { type: 'INQUIRY_ANSWERED', inquiryId: 'A-inquiry' }));
    const view = await render(<Tap ready={false} signedOut />);
    await act(async () => {});
    await view.rerender(<Tap ready />);
    expect(router.push).not.toHaveBeenCalled();
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
