import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Dimensions, Keyboard, StyleSheet, Text, type KeyboardEvent, type StyleProp, type ViewStyle } from 'react-native';

import BirthScreen from '@/app/birth';
import HomeScreen from '@/app/index';
import BirthChangeScreen from '@/app/my/birth';
import NewInquiryScreen from '@/app/my/inquiries/new';
import NicknameScreen from '@/app/my/nickname';
import { Button } from '@/components/button';
import { Sizes, Spacing, StateLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { SignupStep } from '@/features/auth/signup-step';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api, type MyAccount } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => true),
    dismissAll: jest.fn(),
    dismissTo: jest.fn(),
  },
  usePreventRemove: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
  // 가입 단계는 앱처럼(움직이지 않음)
  useCanGoBack: () => false,
  useIsFocused: () => true,
  useNavigation: () => ({ addListener: () => () => undefined }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    getMyAccount: jest.fn(),
    updateAccount: jest.fn(),
    checkMyNickname: jest.fn(),
    listPlaces: jest.fn(),
    createChart: jest.fn(),
    saveProfile: jest.fn(),
    createInquiry: jest.fn(),
    getProfile: jest.fn(async () => ({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' })),
    getNotifications: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getTimingReport: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getMeReport: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getMonth: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    postDaySky: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  ...jest.requireActual('@/features/auth/use-session'),
  getSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const account = { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } as MyAccount;

type Handler = (e: KeyboardEvent) => void;

/** 키패드 알림을 흉내 낸다(iOS). 종류마다 붙은 손잡이를 모두 부른다 */
function fakeKeyboard() {
  const handlers: Record<string, Handler[]> = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation((type, handler) => {
    (handlers[type] ??= []).push(handler as Handler);
    return {
      remove: () => {
        handlers[type] = handlers[type].filter((h) => h !== handler);
      },
    } as unknown as ReturnType<typeof Keyboard.addListener>;
  });
  return (types: string[], e: KeyboardEvent) =>
    act(async () => {
      for (const type of types) for (const h of handlers[type] ?? []) h(e);
    });
}

const WINDOW = Dimensions.get('window').height;
const KEYBOARD = 336;
const iosEvent = (height: number): KeyboardEvent => ({
  duration: 250,
  easing: 'keyboard',
  startCoordinates: { screenX: 0, screenY: WINDOW, width: 390, height: KEYBOARD },
  endCoordinates: { screenX: 0, screenY: WINDOW - height, width: 390, height: height || KEYBOARD },
  isEventFromThisApp: true,
});
const SHOW = ['keyboardWillShow', 'keyboardWillChangeFrame'];
const HIDE = ['keyboardWillHide', 'keyboardWillChangeFrame'];

/** 주 버튼의 아래 끝에서 화면 바닥까지: 버튼과 감싼 칸들의 아래 여백(padding · margin)을 더한다 */
function spaceBelow(label: string) {
  const bottomOf = (style: unknown) => {
    const s: ViewStyle = StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {};
    return Number(s.paddingBottom ?? s.paddingVertical ?? s.padding ?? 0) + Number(s.marginBottom ?? s.marginVertical ?? s.margin ?? 0);
  };
  const button = screen.getByRole('button', { name: label });
  const own = StyleSheet.flatten(button.props.style) ?? {};
  let sum = Number(own.marginBottom ?? 0);
  // 굴러가는 칸은 안쪽 여백을 contentContainerStyle 로 받는다
  for (let node = button.parent; node; node = node.parent)
    sum += bottomOf(node.props.style) + (node.type === 'RCTScrollView' ? bottomOf(node.props.contentContainerStyle) : 0);
  return sum;
}

/** 주 버튼이 굴러가는 칸 안에 있는가 */
function insideScroll(label: string) {
  for (let node = screen.getByRole('button', { name: label }).parent; node; node = node.parent) if (node.type === 'RCTScrollView') return true;
  return false;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: account });
  mockApi.checkMyNickname.mockResolvedValue({ ok: true, data: { available: true } });
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
});

/** 화면 · 그리기 · 주 버튼 · 키패드가 없을 때의 지금 바닥 여백 · 그리기 전에 할 일 */
type Case = { name: string; ui: () => ReactElement; label: string; rest: number; before?: () => Promise<void> };
const SCREENS: Case[] = [
  {
    name: '가입 단계',
    ui: () => (
      <SignupStep step={2} onBack={() => {}} title="제목" footer={<Button label="다음" onPress={() => {}} />}>
        <Text>내용</Text>
      </SignupStep>
    ),
    label: '다음',
    rest: Sizes.stepBottom,
  },
  { name: '마이 닉네임', ui: () => <NicknameScreen />, label: strings.my.nickname.save, rest: StateLayout.bottom },
  {
    name: '마이 출생 정보',
    ui: () => <BirthChangeScreen />,
    label: strings.my.birth.submit,
    rest: StateLayout.bottom,
    before: () => saveBirth({ profile: { date: '1999-03-08', time: null, place: null }, chart: fixtures.chartTimeUnknown }),
  },
  { name: '새 문의', ui: () => <NewInquiryScreen />, label: strings.inquiry.form.submit, rest: StateLayout.bottom },
  { name: '출생 정보 입력(홈)', ui: () => <HomeScreen />, label: strings.home.submit, rest: Spacing.lg },
  { name: '출생 정보 바꾸기(/birth)', ui: () => <BirthScreen />, label: strings.home.submit, rest: Spacing.lg },
];

// 결정 085: 키패드가 뜨면 맨 아래 주 버튼이 키패드 바로 위(12, 보드 7-1). 키패드가 내려가면 화면마다 지금의 바닥 여백 그대로
describe('키패드 위 주 버튼(결정 085)', () => {
  it.each(SCREENS)('$name: 키패드가 뜨면 키패드 12 위, 내려가면 지금 바닥 여백 그대로', async ({ ui, label, rest, before }) => {
    const emit = fakeKeyboard();
    await before?.();
    await render(ui());
    await screen.findByRole('button', { name: label });
    expect(spaceBelow(label)).toBe(rest);
    await emit(SHOW, iosEvent(KEYBOARD));
    expect(spaceBelow(label)).toBe(KEYBOARD + 12);
    await emit(HIDE, iosEvent(0));
    expect(spaceBelow(label)).toBe(rest);
  });

  it.each(SCREENS)('$name: 주 버튼은 굴러가는 칸 밖, 맨 아래 같은 자리', async ({ ui, label, before }) => {
    fakeKeyboard();
    await before?.();
    await render(ui());
    await screen.findByRole('button', { name: label });
    expect(insideScroll(label)).toBe(false);
  });
});
