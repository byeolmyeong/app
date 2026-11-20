import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';
import BirthStep from '@/app/signup/birth';
import NicknameStep from '@/app/signup/nickname';
import TermsStep from '@/app/signup/terms';

// 가입 중간에 나갔다 돌아오기(결정 068 의 1): 앱을 다시 켜거나 웹을 새로 고치면(조각 불러오기 실패 뒤 새로 고침 포함)
// 진짜 세션 · 가드 · 루트 레이아웃으로 하던 단계에 돌아온다. 세션은 한 번만 시작하므로 장면마다 파일을 나눈다(출생 정보 단계는 signup-resume-birth).
jest.mock('expo-secure-store', () => {
  const kept = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => kept.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void kept.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void kept.delete(key)),
  };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    api: {
      getAppConfig: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
      getSession: jest.fn(async () => ({ ok: false, error: 'LOGIN_REQUIRED', status: 401 })),
      listPlaces: jest.fn(async () => ({ ok: true, data: [] })),
    },
  };
});

const KEY = 'byeolmyeong.signup.v1';
const terms = { termsVersion: '2026-11-19', privacyVersion: '2026-11-19', pushConsent: false, marketingConsent: true };

async function openApp(step: 'nickname' | 'birth', issuedAt = Date.now()) {
  await AsyncStorage.setItem('byeolmyeong-device.introSeen.v1', '1');
  await SecureStore.setItemAsync(KEY, JSON.stringify({ signupToken: 't', provider: 'KAKAO', issuedAt, step, draft: { ...terms, nickname: '새벽별', avatar: 2 } }));
  await renderRouter(
    {
      _layout: RootLayout,
      index: () => null,
      login: () => <Text>login-screen</Text>,
      intro: () => null,
      'signup/terms': TermsStep,
      'signup/nickname': NicknameStep,
      'signup/birth': BirthStep,
    },
    { initialUrl: '/' },
  );
}

it('닉네임 단계에서 나갔으면(앱을 다시 켬 · 웹 새로 고침) 닉네임 단계로, 적던 닉네임 그대로', async () => {
  await openApp('nickname');
  expect(await screen.findByDisplayValue('새벽별')).toBeTruthy();
  expect(screen).toHavePathname('/signup/nickname');
});
