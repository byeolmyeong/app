import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import BirthStep from '@/app/signup/birth';
import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { clearDraft, setDraft } from '@/features/auth/signup-draft';
import { useAuth } from '@/features/auth/use-session';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({
  usePreventRemove: jest.fn(),
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn(), canDismiss: jest.fn(() => true) },
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), api: { listPlaces: jest.fn(), createChart: jest.fn() } }));

const H = strings.home;
const completeSignup = jest.fn();
const terms = { termsVersion: '2026-11-19', privacyVersion: '2026-11-19', pushConsent: false, marketingConsent: false };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  clearDraft();
  setDraft({ ...terms, nickname: '새벽별', avatar: 2 });
  (useAuth as jest.Mock).mockReturnValue({ status: 'signingUp', lastError: null, completeSignup });
  (api.listPlaces as jest.Mock).mockResolvedValue({ ok: true, data: fixtures.places });
  (api.createChart as jest.Mock).mockResolvedValue({ ok: true, data: fixtures.chart });
  completeSignup.mockResolvedValue({ ok: true, data: { token: 't' } });
});

const submit = () => screen.getByRole('button', { name: H.submit });
const submitDisabled = () => submit().props.accessibilityState?.disabled === true;
const sheetClosed = () => waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());

async function pickPlace(region: string, district: string) {
  await fireEvent.press(screen.getByTestId('place-field'));
  await fireEvent.press(await screen.findByText(region));
  await fireEvent.press(await screen.findByText(district));
  await sheetClosed();
}

async function pickTime() {
  await fireEvent.press(screen.getByTestId('time-field'));
  await fireEvent.press(await screen.findByTestId('time-period-PM'));
  await fireEvent.press(screen.getByTestId('time-hour-3'));
  await fireEvent.press(screen.getByTestId('time-minute-20'));
  await fireEvent.press(screen.getByText(H.timeConfirm));
  await sheetClosed();
}

// 가입 3단계: 출생 정보(결정 042, 보드 8 · 8-1 · 8-2 · 8-3 · 8-4)
describe('출생 정보 단계', () => {
  it('진행 막대 3/3, 위 안내 문구 없음, 세 칸이 비어 있으면 내 별명 읽기를 누를 수 없다', async () => {
    await render(<BirthStep />);
    expect(screen.getByLabelText(`3${strings.steps.separator}3`)).toBeTruthy();
    expect(screen.getByText(strings.login.signupTitle)).toBeTruthy();
    expect(screen.getByText(H.timeUnknownValue)).toBeTruthy();
    expect(submitDisabled()).toBe(true);
  });

  it('닉네임 단계를 건너뛰고 들어오면(닉네임이 없으면) 닉네임 단계로 돌려보낸다', async () => {
    clearDraft();
    setDraft(terms);
    await render(<BirthStep />);
    expect(screen.getByText('redirect:/signup/nickname')).toBeTruthy();
  });

  it('시 · 도 → 시 · 군 · 구 를 고르면 칸에 "서울 강남구"', async () => {
    await render(<BirthStep />);
    await pickPlace('서울', '강남구');
    expect(screen.getByText('서울 강남구')).toBeTruthy();
  });

  it('"모름" 을 켜면 시각 칸이 흐려지고 안내가 보이며, 시각 값 없이 보낸다(태어난 곳 칸은 그대로)', async () => {
    await render(<BirthStep />);
    await fireEvent.changeText(screen.getByLabelText(H.dateLabel), '19990308');
    await fireEvent.press(screen.getByRole('checkbox', { name: H.timeUnknown }));
    expect(screen.getByText(H.timeUnknownNote)).toBeTruthy();
    expect(screen.getByTestId('time-field').props.accessibilityState).toMatchObject({ disabled: true });
    expect(StyleSheet.flatten(screen.getByTestId('time-field').props.style).backgroundColor).toBe(Colors.fieldOff);
    expect(screen.getByTestId('place-field')).toBeTruthy();
    await pickPlace('서울', '강남구');
    expect(submitDisabled()).toBe(false);
    await fireEvent.press(submit());
    await waitFor(() => expect(completeSignup).toHaveBeenCalled());
    expect(completeSignup.mock.calls[0][0].birth).toEqual({ date: '1999-03-08', time: null, placeId: null });
  });

  it('세 칸을 채우면 누를 수 있고, 시각 · 곳을 함께 보낸다', async () => {
    await render(<BirthStep />);
    await fireEvent.changeText(screen.getByLabelText(H.dateLabel), '20000615');
    await pickTime();
    expect(submitDisabled()).toBe(true);
    await pickPlace('서울', '강남구');
    expect(submitDisabled()).toBe(false);
    await fireEvent.press(submit());
    const gangnam = fixtures.places.find((p) => p.name === '서울특별시 강남구')!;
    await waitFor(() => expect(completeSignup).toHaveBeenCalled());
    expect(completeSignup.mock.calls[0][0].birth).toEqual({ date: '2000-06-15', time: '15:20', placeId: gangnam.id });
  });

  it('만 14세 미만이면(서버 판정) 생년월일 칸 아래 빨강 안내(보드 8-4)', async () => {
    completeSignup.mockResolvedValue({ ok: false, error: 'SERVER', status: 403, code: 'UNDER_AGE' });
    await render(<BirthStep />);
    await fireEvent.changeText(screen.getByLabelText(H.dateLabel), '20140211');
    await fireEvent.press(screen.getByRole('checkbox', { name: H.timeUnknown }));
    await fireEvent.press(submit());
    expect(await screen.findByText(H.errors.underAge)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
    // 안내가 떠도 버튼은 켜진 채(보드 8-4) — 누르면 로그인으로 가고 로그인 화면이 안내한다(세션)
    expect(submitDisabled()).toBe(false);
  });

  it('내 별명 읽기를 두 번 눌러도 가입은 한 번 보내고, 보내는 동안은 뒤로 가지 않는다(리뷰 A1 · A9)', async () => {
    let resolve: (v: unknown) => void = () => {};
    completeSignup.mockImplementation(() => new Promise((r) => (resolve = r)));
    await render(<BirthStep />);
    await fireEvent.changeText(screen.getByLabelText(H.dateLabel), '19990308');
    await fireEvent.press(screen.getByRole('checkbox', { name: H.timeUnknown }));
    await fireEvent.press(submit());
    await fireEvent.press(submit());
    expect(completeSignup).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(router.back).not.toHaveBeenCalled();
    await act(async () => resolve({ ok: false, error: 'NETWORK' }));
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('뒤로 가면 닉네임 단계로', async () => {
    await render(<BirthStep />);
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(router.back).toHaveBeenCalled();
  });
});
