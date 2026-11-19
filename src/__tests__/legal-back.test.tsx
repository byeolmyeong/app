import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import MyScreen from '@/app/my';
import MarketingScreen from '@/app/settings/marketing';
import PrivacyScreen from '@/app/settings/privacy';
import TermsScreen from '@/app/settings/terms';
import TermsStep from '@/app/signup/terms';
import { marketing, privacy, terms } from '@/content/legal';
import { strings } from '@/content/strings';
import { useAuth } from '@/features/auth/use-session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '9.8.7' } } }));
jest.mock('@/features/auth/use-session', () => ({ useAuth: jest.fn() }));

const back = () => fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));

// 진짜 라우터(Stack)로 연다. 마이에서 연 글은 마이로, 가입 약관 단계의 "보기" 로 연 글은 약관 단계로 돌아간다.
const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  my: MyScreen,
  'signup/terms': TermsStep,
  'settings/terms': TermsScreen,
  'settings/privacy': PrivacyScreen,
  'settings/marketing': MarketingScreen,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  (useAuth as jest.Mock).mockReturnValue({ status: 'signingUp', cancelSignup: jest.fn() });
});

describe('약관 글에서 뒤로 가기', () => {
  it.each([
    [strings.settings.terms, '/settings/terms', terms],
    [strings.settings.privacy, '/settings/privacy', privacy],
  ])('마이의 "%s" 줄로 연 글에서 뒤로 가면 마이로 돌아간다', async (label, path, doc) => {
    await renderRouter(routes, { initialUrl: '/my' });
    await fireEvent.press(await screen.findByText(label));
    expect(screen).toHavePathname(path);
    expect(screen.getByText(doc.closing)).toBeTruthy();
    await back();
    expect(screen).toHavePathname('/my');
  });

  it.each([
    [0, '/settings/terms', terms],
    [1, '/settings/privacy', privacy],
  ])('가입 약관 단계의 %d번째 "보기" 로 연 글에서 뒤로 가면 약관 단계로 돌아가고, 켜 둔 동의는 그대로다', async (index, path, doc) => {
    const T = strings.terms;
    await renderRouter(routes, { initialUrl: '/signup/terms' });
    const required = `${T.required} ${T.items.terms}`;
    await fireEvent.press(screen.getByRole('checkbox', { name: required }));
    await fireEvent.press(screen.getAllByRole('link', { name: T.view })[index]);
    expect(screen).toHavePathname(path);
    expect(screen.getByText(doc.closing)).toBeTruthy();
    await back();
    expect(screen).toHavePathname('/signup/terms');
    expect(screen.getByRole('checkbox', { name: required }).props.accessibilityState?.checked).toBe(true);
  });

  it('주소로 바로 열어 돌아갈 곳이 없으면 홈(/)으로 간다: 마케팅 정보 수신 동의 약관', async () => {
    await renderRouter({ ...routes, index: () => null }, { initialUrl: '/settings/marketing' });
    expect(screen.getByText(marketing.closing)).toBeTruthy();
    await back();
    expect(screen).toHavePathname('/');
  });
});
