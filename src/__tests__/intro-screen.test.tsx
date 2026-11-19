import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import IntroScreen from '@/app/intro';
import { strings } from '@/content/strings';
import { signOut } from '@/features/auth/sign-out';
import { guardRedirect } from '@/features/auth/guard';
import { INTRO_SEEN_KEY, hasSeenIntro, markIntroSeen } from '@/features/onboarding/intro-seen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({ signOutSession: jest.fn(async () => {}) }));

const S = strings.intro;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

// 소개 3장은 앱을 처음 받아 처음 켰을 때 한 번만(결정 041, 소유자 2026-11-19)
describe('소개를 봤는지', () => {
  it('처음에는 안 봤고, 적으면 봤다', async () => {
    expect(await hasSeenIntro()).toBe(false);
    await markIntroSeen();
    expect(await hasSeenIntro()).toBe(true);
    expect(await AsyncStorage.getItem(INTRO_SEEN_KEY)).not.toBeNull();
  });

  it('기기 저장소를 읽지 못하면 본 것으로 친다 — 소개를 건너뛰고 로그인으로', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage'));
    const seen = await hasSeenIntro();
    expect(seen).toBe(true);
    expect(guardRedirect('signedOut', undefined, seen)).toBe('/login');
  });

  it('로그아웃해도 지워지지 않는다(다음 로그인 전 상태는 로그인 화면부터)', async () => {
    await markIntroSeen();
    await AsyncStorage.setItem('byeolmyeong.birth.v1', '{}');
    await signOut();
    expect(await AsyncStorage.getItem('byeolmyeong.birth.v1')).toBeNull();
    const seen = await hasSeenIntro();
    expect(seen).toBe(true);
    expect(guardRedirect('signedOut', undefined, seen)).toBe('/login');
  });
});

describe('소개 화면', () => {
  it('처음 뜨는 순간 본 것으로 적는다(건너뛰기 · 시작하기를 기다리지 않는다)', async () => {
    await render(<IntroScreen />);
    await waitFor(async () => expect(await AsyncStorage.getItem(INTRO_SEEN_KEY)).not.toBeNull());
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText(S.slides[0].title)).toBeTruthy();
  });

  it('건너뛰기를 누르면 로그인 화면으로', async () => {
    await render(<IntroScreen />);
    await fireEvent.press(screen.getByText(S.skip));
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  it('다음으로 셋째 장까지 넘기고 시작하기를 누르면 로그인 화면으로', async () => {
    await render(<IntroScreen />);
    expect(screen.getByLabelText(`1${strings.steps.separator}3`)).toBeTruthy();
    await fireEvent.press(screen.getByText(S.next));
    expect(screen.getByLabelText(`2${strings.steps.separator}3`)).toBeTruthy();
    await fireEvent.press(screen.getByText(S.next));
    expect(screen.getByLabelText(`3${strings.steps.separator}3`)).toBeTruthy();
    expect(screen.queryByText(S.next)).toBeNull();
    await fireEvent.press(screen.getByText(S.start));
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});
