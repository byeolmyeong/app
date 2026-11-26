import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import BirthStep from '@/app/signup/birth';
import { strings } from '@/content/strings';
import { clearDraft, getDraft, setDraft, signedUpNickname, takeNicknameRejection, takeTermsRejection } from '@/features/auth/signup-draft';
import { useAuth } from '@/features/auth/use-session';
import { loadBirth } from '@/features/chart/use-birth-profile';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('expo-router', () => ({
  // 가입 단계는 웹에서 오른쪽에서 밀려 들어온다 — 이 시험들은 앱(움직이지 않음)
  useCanGoBack: () => false,
  useIsFocused: () => true,
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
const draft = {
  termsVersion: '2026-11-19',
  privacyVersion: '2026-11-19',
  pushConsent: true,
  marketingConsent: false,
  nickname: '새벽별',
  avatar: 4 as const,
};
const failure = (status: number, code: string) => ({ ok: false, error: status === 401 ? 'LOGIN_REQUIRED' : 'SERVER', status, code });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  clearDraft();
  setDraft(draft);
  (useAuth as jest.Mock).mockReturnValue({ status: 'signingUp', lastError: null, completeSignup });
  (api.listPlaces as jest.Mock).mockResolvedValue({ ok: true, data: fixtures.places });
  (api.createChart as jest.Mock).mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
  completeSignup.mockResolvedValue({ ok: true, data: { token: 't' } });
});

/** 날짜만 치고 시각 "모름" 으로 "내 별명 읽기" 를 누른다 */
async function submit() {
  await render(<BirthStep />);
  await fireEvent.changeText(screen.getByLabelText(H.dateLabel), '19990308');
  await fireEvent.press(screen.getByRole('checkbox', { name: H.timeUnknown }));
  await fireEvent.press(screen.getByRole('button', { name: H.submit }));
  await waitFor(() => expect(completeSignup).toHaveBeenCalledTimes(1));
}

// 가입 마치기(결정 042): 앞 단계 값을 모아 POST /auth/signup 한 번. 오류마다 돌아갈 단계가 다르다
describe('가입 마치기', () => {
  it('보내는 값: 출생 정보 + 닉네임 · 프로필 · 약관 버전 둘 · 동의 둘(일곱 값)', async () => {
    await submit();
    expect(completeSignup).toHaveBeenCalledWith({
      birth: { date: '1999-03-08', time: null, placeId: null },
      nickname: '새벽별',
      avatar: 4,
      termsVersion: '2026-11-19',
      privacyVersion: '2026-11-19',
      pushConsent: true,
      marketingConsent: false,
    });
  });

  it('성공하면 초안을 비우고 차트를 받아 둔 뒤 별명 짓는 중(풀이 글)으로 간다', async () => {
    await submit();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/reading', params: { from: 'signup' } }));
    expect(getDraft()).toBeNull();
    // 별명 공개(결정 044, 보드 10)가 쓸 닉네임만 메모리에 남는다(서버가 받은 값 — 기기 저장소에는 없다)
    expect(signedUpNickname()).toBe(draft.nickname);
    expect(JSON.stringify(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()))).not.toContain(draft.nickname);
    expect((await loadBirth())?.profile).toEqual({ date: '1999-03-08', time: null, place: null });
  });

  it('그사이 누가 닉네임을 가져갔으면(NICKNAME_TAKEN) 닉네임 단계로 돌아가 "이미 있는 닉네임" 을 알린다', async () => {
    completeSignup.mockResolvedValue(failure(409, 'NICKNAME_TAKEN'));
    await submit();
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/signup/nickname'));
    expect(takeNicknameRejection()).toBe('NICKNAME_TAKEN');
    expect(getDraft()).toMatchObject({ nickname: '새벽별' });
  });

  it('닉네임이 규칙에 어긋나면(INVALID_NICKNAME) 닉네임 단계로', async () => {
    completeSignup.mockResolvedValue(failure(400, 'INVALID_NICKNAME'));
    await submit();
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/signup/nickname'));
    expect(takeNicknameRejection()).toBe('INVALID_NICKNAME');
  });

  it('약관 동의가 모자라면(TERMS_REQUIRED) 약관 단계로 — 동의를 다시 받는다', async () => {
    completeSignup.mockResolvedValue(failure(400, 'TERMS_REQUIRED'));
    await submit();
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/signup/terms'));
    expect(getDraft()).toBeNull();
    expect(takeTermsRejection()).toBe(true);
  });

  it('만 14세 미만(UNDER_AGE)이면 생년월일 칸 아래 빨강 안내 — 다른 단계로 가지 않는다', async () => {
    completeSignup.mockResolvedValue(failure(403, 'UNDER_AGE'));
    await submit();
    expect(await screen.findByText(H.errors.underAge)).toBeTruthy();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('가입 시간이 지났으면(SIGNUP_EXPIRED) 이 화면은 아무 데도 보내지 않는다 — 세션이 로그인 전이 되고 가드가 로그인으로', async () => {
    completeSignup.mockResolvedValue(failure(401, 'SIGNUP_EXPIRED'));
    await submit();
    await waitFor(() => expect(completeSignup).toHaveBeenCalled());
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('모르는 오류(INVALID_REQUEST · INVALID_AVATAR 등)와 인터넷 끊김은 버튼 위 일반 안내', async () => {
    completeSignup.mockResolvedValueOnce(failure(400, 'INVALID_REQUEST'));
    await submit();
    expect(await screen.findByText(H.requestErrors.OTHER)).toBeTruthy();
    completeSignup.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await fireEvent.press(screen.getByRole('button', { name: H.submit }));
    expect(await screen.findByText(H.requestErrors.NETWORK)).toBeTruthy();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});
