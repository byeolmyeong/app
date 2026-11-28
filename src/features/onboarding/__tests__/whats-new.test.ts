import AsyncStorage from '@react-native-async-storage/async-storage';

import { INTRO_SEEN_KEY, introSeenAtLaunch, markIntroSeen, resetIntroSeen } from '@/features/onboarding/intro-seen';
import { WHATS_NEW_KEY, markWhatsNewSeen, resetWhatsNew, settleWhatsNew, whatsNewDue } from '@/features/onboarding/whats-new';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/** 앱을 새로 켠다 — 이번 실행의 메모리를 비운다 */
const launch = () => {
  resetIntroSeen();
  resetWhatsNew();
};

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
  launch();
});

// 결정 109 의 6 · 113 의 1: 1.1.0 을 처음 켤 때 한 번, 1.0.0 에서 업데이트한 기기만
describe('새로워진 점을 띄울 기기', () => {
  it('1.0.x 가 남긴 소개 기록이 있고 새 기록이 없으면 띄운다', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    await settleWhatsNew();
    expect(whatsNewDue()).toBe(true);
  });

  it('새로 깐 기기(소개 기록 없음)는 띄우지 않고 곧바로 "새 기기" 를 적는다 — 소개만 보고 끈 뒤 다음 실행에도 띄우지 않는다', async () => {
    await settleWhatsNew();
    expect(whatsNewDue()).toBe(false);
    expect(await AsyncStorage.getItem(WHATS_NEW_KEY)).not.toBeNull();
    // 이번 실행에 소개를 보고(소개 기록을 적고) 앱을 끈다
    await markIntroSeen();
    launch();
    await settleWhatsNew();
    expect(whatsNewDue()).toBe(false);
  });

  it('이번 실행이 소개 기록을 적어도 처음 읽은 값으로 정한다 — 소개 화면은 그 값을 읽은 뒤에 뜬다', async () => {
    const before = introSeenAtLaunch();
    await markIntroSeen();
    expect(await before).toBe(false);
    expect(await introSeenAtLaunch()).toBe(false);
    await settleWhatsNew();
    expect(whatsNewDue()).toBe(false);
  });

  it('본 것을 적으면 다시 띄우지 않는다(다음 실행에도)', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    await settleWhatsNew();
    expect(whatsNewDue()).toBe(true);
    await markWhatsNewSeen();
    expect(whatsNewDue()).toBe(false);
    launch();
    await settleWhatsNew();
    expect(whatsNewDue()).toBe(false);
  });

  it('저장소를 읽지 못하면 띄우지 않는다 — 새 사람의 첫 화면을 막지 않는다', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    // 소개 기록 · 새 기록 둘 다(한 번씩만 — 저장소의 가짜는 시험 사이에 남는다)
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage')).mockRejectedValueOnce(new Error('storage'));
    await settleWhatsNew();
    expect(whatsNewDue()).toBe(false);
  });

  it('소개 기록을 읽지 못한 채 시작했으면(1.0.x 인지 모름) 띄우지 않고 적지도 않는다', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage'));
    await settleWhatsNew();
    expect(whatsNewDue()).toBe(false);
    expect(await AsyncStorage.getItem(WHATS_NEW_KEY)).toBeNull();
  });

  it('새 기록은 기기 값(byeolmyeong-device.) — 로그아웃 · 탈퇴가 지우지 않는다', () => {
    expect(WHATS_NEW_KEY.startsWith('byeolmyeong-device.')).toBe(true);
  });
});
