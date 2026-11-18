import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import MyScreen from '@/app/my';
import PrivacyScreen from '@/app/settings/privacy';
import TermsScreen from '@/app/settings/terms';
import { strings } from '@/content/strings';
import { DEVICE_STORAGE_PREFIX } from '@/features/auth/delete-account';
import { BIRTH_STORAGE_KEY, saveBirth } from '@/features/chart/use-birth-profile';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { REPORT_STORAGE_KEY } from '@/features/report/use-report';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
// 테스트에는 expo 설정이 실리지 않는다. 화면이 설정의 버전을 그대로 적는지만 본다.
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '9.8.7' } } }));
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => true),
    dismissAll: jest.fn(),
  },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { deleteAccount: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const S = strings.settings;
const M = strings.my;
const D = S.deleteSheet;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const STORED_KEYS = [BIRTH_STORAGE_KEY, READING_STORAGE_KEY, REPORT_STORAGE_KEY];

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  await saveBirth({ profile, chart: fixtures.chart });
  await AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key: 'k', reading: fixtures.reading }));
  await AsyncStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify({ key: 'k', report: fixtures.report }));
});

describe('마이(/my) — 설정을 합쳤다(결정 034)', () => {
  it('출생 정보 카드 · 도움(자주 묻는 질문 · 문의하기) · 약관 · 정보(처리방침 · 약관 · 앱 버전) · 계정 삭제를 이 순서로 보여 준다', async () => {
    await render(<MyScreen />);
    expect(await screen.findByText(S.faq)).toBeTruthy();
    expect([M.help, M.info]).toEqual(['도움', '약관 · 정보']);
    const labels = [M.birthLabel, M.help, S.faq, S.inquiry, M.info, S.privacy, S.terms, S.version, S.deleteAccount];
    for (const label of labels) expect(screen.getByText(label)).toBeTruthy();
    const shown = JSON.stringify(screen.toJSON());
    const places = labels.map((label) => shown.indexOf(`"${label}"`));
    expect(places).toEqual([...places].sort((a, b) => a - b));
    // 앱 버전은 expo 설정에서 온다
    expect(Constants.expoConfig?.version).toBe('9.8.7');
    expect(screen.getByText('9.8.7')).toBeTruthy();
    // 로그아웃과 알림은 아직 없다(소셜 로그인 · 푸시 뒤). "설정" 으로 가는 줄도 없다
    expect(screen.queryByText(/로그아웃/)).toBeNull();
    expect(M).not.toHaveProperty('settings');
  });

  it('출생 정보가 없어도 도움 · 약관 · 계정 삭제 줄과 아래 탭은 보이고, 카드 자리에서 출생 정보를 넣으러 간다', async () => {
    await AsyncStorage.clear();
    await render(<MyScreen />);
    expect(await screen.findByText(strings.chart.empty)).toBeTruthy();
    expect(screen.getByTestId('byeoli-face-empty', { includeHiddenElements: true })).toBeTruthy();
    for (const label of [S.faq, S.inquiry, S.privacy, S.terms, S.version, S.deleteAccount]) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(strings.tabs.home)).toBeTruthy();
    expect(screen.queryByText(M.birthLabel)).toBeNull();
    await fireEvent.press(screen.getByText(strings.chart.goHome));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('처리방침 · 약관 줄은 그 글 화면으로 간다', async () => {
    await render(<MyScreen />);
    await screen.findByText(S.faq);
    await fireEvent.press(screen.getByText(S.privacy));
    expect(router.push).toHaveBeenLastCalledWith('/settings/privacy');
    await fireEvent.press(screen.getByText(S.terms));
    expect(router.push).toHaveBeenLastCalledWith('/settings/terms');
  });

  it('자주 묻는 질문 · 문의하기 줄은 그 화면으로 간다', async () => {
    await render(<MyScreen />);
    await screen.findByText(S.faq);
    await fireEvent.press(screen.getByText(S.faq));
    expect(router.push).toHaveBeenLastCalledWith('/settings/faq');
    await fireEvent.press(screen.getByText(S.inquiry));
    expect(router.push).toHaveBeenLastCalledWith('/settings/inquiry');
  });

  it('문의 메일 주소를 어디에도 적지 않는다(결정 024): 화면에도, 문구 전체에도 메일 주소가 없다', async () => {
    await render(<MyScreen />);
    await screen.findByText(S.faq);
    expect(screen.queryByText(/@/)).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/@|mailto/);
    expect(JSON.stringify(strings)).not.toMatch(/@|mailto/);
    expect(S).not.toHaveProperty('contact');
    expect(S).not.toHaveProperty('contactEmail');
  });
});

describe('마이를 불러오는 동안', () => {
  it('기기 저장소를 읽는 동안에도 아래 탭이 보인다', async () => {
    // 읽기가 끝나지 않은 채로 둔다
    const pending = jest.spyOn(AsyncStorage, 'getItem').mockReturnValue(new Promise(() => {}));
    try {
      await render(<MyScreen />);
      expect(screen.queryByText(S.faq)).toBeNull();
      expect(screen.getByText(strings.tabs.home)).toBeTruthy();
    } finally {
      pending.mockRestore();
    }
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

describe('계정 삭제', () => {
  it('줄을 누르면 먼저 확인 시트로 묻는다. 취소하면 서버를 부르지 않고 기기의 것도 그대로다', async () => {
    await render(<MyScreen />);
    await screen.findByText(S.faq);
    expect(screen.queryByText(D.title)).toBeNull();
    await fireEvent.press(screen.getByText(S.deleteAccount));
    expect(await screen.findByText(D.title)).toBeTruthy();
    expect(screen.getByText(D.body)).toBeTruthy();
    expect(mockApi.deleteAccount).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(D.cancel));
    await waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());
    expect(mockApi.deleteAccount).not.toHaveBeenCalled();
    expect(await AsyncStorage.getAllKeys()).toEqual(expect.arrayContaining(STORED_KEYS));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('확인하면 서버에 한 번 요청하고, 기기에 둔 것과 세션 토큰을 비운 뒤 첫 화면으로 간다', async () => {
    mockApi.deleteAccount.mockResolvedValue({ ok: true, data: null });
    await render(<MyScreen />);
    await screen.findByText(S.faq);
    await fireEvent.press(screen.getByText(S.deleteAccount));
    await fireEvent.press(await screen.findByText(D.confirm));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(mockApi.deleteAccount).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    // 마이 아래에 쌓인 화면이 있으면 걷어 내고 첫 화면만 남긴다
    expect(router.dismissAll).toHaveBeenCalledTimes(1);
  });

  it('마이가 탭으로 열려 걷어 낼 화면이 없으면 걷지 않고 첫 화면으로 바꾼다(뒤로 가기로 마이에 돌아갈 수 없다)', async () => {
    (router.canDismiss as jest.Mock).mockReturnValue(false);
    mockApi.deleteAccount.mockResolvedValue({ ok: true, data: null });
    await render(<MyScreen />);
    await fireEvent.press(await screen.findByText(S.deleteAccount));
    await fireEvent.press(await screen.findByText(D.confirm));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(router.dismissAll).not.toHaveBeenCalled();
    (router.canDismiss as jest.Mock).mockReturnValue(true);
  });

  it('삭제하는 동안에는 다시 누를 수 없다', async () => {
    let finish: (r: { ok: true; data: null }) => void = () => {};
    mockApi.deleteAccount.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<MyScreen />);
    await screen.findByText(S.faq);
    await fireEvent.press(screen.getByText(S.deleteAccount));
    await fireEvent.press(await screen.findByText(D.confirm));
    await fireEvent.press(await screen.findByText(D.deleting));
    expect(mockApi.deleteAccount).toHaveBeenCalledTimes(1);
    finish({ ok: true, data: null });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it.each([
    ['NETWORK', D.failed.NETWORK],
    ['SERVER', D.failed.OTHER],
    ['LOGIN_REQUIRED', D.failed.OTHER],
  ] as const)('서버가 지우지 못하면(%s) 이유를 보여 주고 기기의 것은 그대로 둔다', async (error, message) => {
    mockApi.deleteAccount.mockResolvedValue({ ok: false, error });
    await render(<MyScreen />);
    await screen.findByText(S.faq);
    await fireEvent.press(screen.getByText(S.deleteAccount));
    await fireEvent.press(await screen.findByText(D.confirm));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(await AsyncStorage.getAllKeys()).toEqual(expect.arrayContaining(STORED_KEYS));
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.dismissAll).not.toHaveBeenCalled();
    // 시트는 열려 있고, 다시 누르면 다시 요청한다
    mockApi.deleteAccount.mockResolvedValue({ ok: true, data: null });
    await fireEvent.press(screen.getByText(D.confirm));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(mockApi.deleteAccount).toHaveBeenCalledTimes(2);
  });

  it('기능들이 기기에 두는 키는 모두 삭제 때 지우는 머리(byeolmyeong.)로 시작한다', () => {
    for (const key of STORED_KEYS) expect(key.startsWith(DEVICE_STORAGE_PREFIX)).toBe(true);
  });
});
