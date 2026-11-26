import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Animated, Platform, StyleSheet } from 'react-native';

import TermsScreen from '@/app/settings/terms';
import TermsStep from '@/app/signup/terms';
import { Motion } from '@/constants/theme';
import { strings } from '@/content/strings';
import { clearDraft } from '@/features/auth/signup-draft';
import { useAuth } from '@/features/auth/use-session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({ useAuth: jest.fn() }));

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  'signup/terms': TermsStep,
  'settings/terms': TermsScreen,
};

const translateY = () => StyleSheet.flatten(screen.getByTestId('slide-up-page').props.style).transform?.[0]?.translateY;

// 가입 흐름은 소개 → replace(/login) → replace(/signup/terms) 라 쌓기가 하나다. 그 위에 "보기" 로 연 글도 웹에서 올라와야 한다(결정 067 의 1).
// router.canGoBack 을 가짜로 두지 않고 진짜 라우터의 쌓기로 본다.
describe('웹: 가입 약관 단계의 "보기" 가 올라온다', () => {
  const original = Platform.OS;
  beforeEach(async () => {
    await AsyncStorage.clear();
    clearDraft();
    (useAuth as jest.Mock).mockReturnValue({ status: 'signingUp', cancelSignup: jest.fn() });
  });
  afterEach(() => {
    Platform.OS = original;
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
    jest.restoreAllMocks();
  });

  it('쌓기가 하나뿐인 약관 단계에서 연 글도 화면 아래(100%)에서 시작해 올라온다', async () => {
    await renderRouter(routes, { initialUrl: '/signup/terms' });
    // 화면을 띄운 다음 웹으로 본다(동작 줄이기 꺼짐)
    Platform.OS = 'web';
    (window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
    const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start: () => {}, stop: () => {}, reset: () => {} });
    await fireEvent.press(screen.getByRole('link', { name: strings.terms.viewLabels.terms }));
    expect(screen).toHavePathname('/settings/terms');
    expect(translateY()).toBe('100%');
    expect(timing.mock.calls.some(([, config]) => config.toValue === 1 && config.duration === Motion.openMs)).toBe(true);
  });
});
