import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import MyScreen from '@/app/my';
import MarketingScreen from '@/app/settings/marketing';
import PrivacyScreen from '@/app/settings/privacy';
import PrivacyConsentScreen from '@/app/settings/privacy-consent';
import TermsScreen from '@/app/settings/terms';
import TermsStep from '@/app/signup/terms';
import { marketing, privacy, privacyConsent, terms } from '@/content/legal';
import { strings } from '@/content/strings';
import { clearDraft } from '@/features/auth/signup-draft';
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
  'settings/privacy-consent': PrivacyConsentScreen,
  'settings/marketing': MarketingScreen,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  // 가입 초안은 메모리라 같은 파일의 시험끼리 남는다(앱에서는 로그인 화면이 지운다)
  clearDraft();
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
    ['terms', '/settings/terms', terms],
    // 개인정보 수집 · 이용의 "보기" 는 처리방침이 아니라 개인정보 수집 · 이용 동의 글을 연다(결정 045)
    ['privacy', '/settings/privacy-consent', privacyConsent],
    ['marketing', '/settings/marketing', marketing],
  ] as const)('가입 약관 단계의 %s "보기" 로 연 글에서 뒤로 가면 약관 단계로 돌아가고, 켜 둔 동의는 그대로다', async (key, path, doc) => {
    const T = strings.terms;
    await renderRouter(routes, { initialUrl: '/signup/terms' });
    const required = `${T.required} ${T.items.terms}`;
    await fireEvent.press(screen.getByRole('checkbox', { name: required }));
    await fireEvent.press(screen.getByRole('link', { name: T.viewLabels[key] }));
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

// 약관 보기의 동의하기(결정 044, 보드 6-2 → 6-1): 가입 약관 단계에서 연 글에서만, 누르면 그 항목을 켜고 약관 단계로 돌아간다
describe('약관 글의 동의하기', () => {
  const T = strings.terms;
  const L = strings.legal;
  const names = {
    terms: `${T.required} ${T.items.terms}`,
    privacy: `${T.required} ${T.items.privacy}`,
    marketing: `${T.optional} ${T.items.marketing}`,
  } as const;
  const checked = (name: string) => screen.getByRole('checkbox', { name }).props.accessibilityState?.checked === true;

  it.each([
    ['terms', '/settings/terms'],
    ['privacy', '/settings/privacy-consent'],
    ['marketing', '/settings/marketing'],
  ] as const)('%s: 보기 → 동의하기 → 약관 단계에서 그 항목만 켜져 있다', async (key, path) => {
    await renderRouter(routes, { initialUrl: '/signup/terms' });
    for (const name of Object.values(names)) expect(checked(name)).toBe(false);
    await fireEvent.press(screen.getByRole('link', { name: T.viewLabels[key] }));
    expect(screen).toHavePathname(path);
    await fireEvent.press(screen.getByRole('button', { name: L.agree }));
    expect(screen).toHavePathname('/signup/terms');
    for (const [k, name] of Object.entries(names)) expect(checked(name)).toBe(k === key);
  });

  it('필수 둘을 보기에서 동의하면 다음을 누를 수 있다', async () => {
    await renderRouter(routes, { initialUrl: '/signup/terms' });
    for (const key of ['terms', 'privacy'] as const) {
      await fireEvent.press(screen.getByRole('link', { name: T.viewLabels[key] }));
      await fireEvent.press(screen.getByRole('button', { name: L.agree }));
    }
    expect(screen.getByRole('button', { name: T.next }).props.accessibilityState?.disabled).toBe(false);
  });

  it('마이에서 연 글에는 동의하기가 없다', async () => {
    await renderRouter(routes, { initialUrl: '/my' });
    await fireEvent.press(await screen.findByText(strings.settings.terms));
    expect(screen).toHavePathname('/settings/terms');
    expect(screen.queryByRole('button', { name: L.agree })).toBeNull();
  });
});
