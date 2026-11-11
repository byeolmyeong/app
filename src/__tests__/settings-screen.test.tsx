import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import MyScreen from '@/app/my';
import SettingsScreen from '@/app/settings/index';
import PrivacyScreen from '@/app/settings/privacy';
import TermsScreen from '@/app/settings/terms';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// 테스트에는 expo 설정이 실리지 않는다. 화면이 설정의 버전을 그대로 적는지만 본다.
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '9.8.7' } } }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
const S = strings.settings;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await saveBirth({ profile, chart: fixtures.chart });
});

describe('마이에서 설정으로', () => {
  it('마이의 "설정" 을 누르면 /settings 로 간다', async () => {
    await render(<MyScreen />);
    await fireEvent.press(await screen.findByText(strings.my.settings));
    expect(router.push).toHaveBeenCalledWith('/settings');
  });
});

describe('설정(/settings)', () => {
  it('처리방침 · 약관 · 문의 · 앱 버전 줄을 보여 준다', async () => {
    await render(<SettingsScreen />);
    for (const label of [S.privacy, S.terms, S.contact, S.version]) expect(screen.getByText(label)).toBeTruthy();
    // 앱 버전은 expo 설정에서 온다
    expect(Constants.expoConfig?.version).toBe('9.8.7');
    expect(screen.getByText('9.8.7')).toBeTruthy();
    // 로그아웃과 알림은 아직 없다(소셜 로그인 · 푸시 뒤)
    expect(screen.queryByText(/로그아웃/)).toBeNull();
  });

  it('처리방침 · 약관 줄은 그 글 화면으로 간다', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText(S.privacy));
    expect(router.push).toHaveBeenLastCalledWith('/settings/privacy');
    await fireEvent.press(screen.getByText(S.terms));
    expect(router.push).toHaveBeenLastCalledWith('/settings/terms');
  });

  it('문의 줄은 주소를 보여 주고, 누르면 그 주소로 메일 쓰기를 연다', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText(S.contactEmail)).toBeTruthy();
    await fireEvent.press(screen.getByText(S.contact));
    expect(Linking.openURL).toHaveBeenCalledWith(`mailto:${S.contactEmail}`);
  });

  it('메일 앱을 열지 못해도 화면은 그대로다', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no handler'));
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText(S.contact));
    expect(screen.getByText(S.contactEmail)).toBeTruthy();
  });
});

describe('처리방침 · 약관 글 화면', () => {
  it.each([
    ['처리방침', PrivacyScreen, strings.legal.privacy],
    ['약관', TermsScreen, strings.legal.terms],
  ])('%s: 제목과 본문을 보여 주고, 아직 자리표시 글임을 밝힌다', async (_name, Component, doc) => {
    await render(<Component />);
    expect(screen.getByText(doc.title)).toBeTruthy();
    expect(screen.getByText(strings.legal.placeholderNotice)).toBeTruthy();
    for (const paragraph of doc.paragraphs) expect(screen.getByText(paragraph)).toBeTruthy();
  });
});
