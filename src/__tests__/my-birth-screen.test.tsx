import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import BirthChangeScreen from '@/app/my/birth';
import { strings } from '@/content/strings';
import { loadBirth, saveBirth } from '@/features/chart/use-birth-profile';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => true), dismissAll: jest.fn() },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createChart: jest.fn(), saveProfile: jest.fn(), listPlaces: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const B = strings.my.birth;
const H = strings.home;
const profile = { date: '1999-03-08', time: null, place: null };
const DEVICE_KEY = 'byeolmyeong-device.music.v1';

const date = () => screen.getByLabelText(H.dateLabel);
const submit = () => screen.getByRole('button', { name: B.submit });

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  await saveBirth({ profile, chart: fixtures.chartTimeUnknown });
  await AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key: 'old', reading: fixtures.reading }));
  await AsyncStorage.setItem(DEVICE_KEY, '{"background":false}');
});

describe('출생 정보 바꾸기(/my/birth, 보드 16-4)', () => {
  it('안내 · 넣어 둔 값으로 채운 세 칸 · 맨 아래 "바꾸기"', async () => {
    await render(<BirthChangeScreen />);
    expect(await screen.findByText(B.notice)).toBeTruthy();
    expect(date().props.value).toBe('1999-03-08');
    expect(submit()).toBeTruthy();
  });

  it('바뀐 것이 없으면 묻지 않고 돌아간다(서버를 부르지 않는다)', async () => {
    await render(<BirthChangeScreen />);
    await screen.findByText(B.notice);
    await fireEvent.press(submit());
    expect(router.back).toHaveBeenCalled();
    expect(screen.queryByText(B.confirm.title)).toBeNull();
    expect(mockApi.createChart).not.toHaveBeenCalled();
  });

  it('바꾸면 가운데 창으로 묻고, 취소하면 아무것도 바꾸지 않는다', async () => {
    await render(<BirthChangeScreen />);
    await screen.findByText(B.notice);
    await fireEvent.changeText(date(), '20000615');
    await fireEvent.press(submit());
    expect(screen.getByText(B.confirm.title)).toBeTruthy();
    expect(screen.getByText(B.confirm.body)).toBeTruthy();
    await fireEvent.press(screen.getByText(B.confirm.cancel));
    expect(screen.queryByText(B.confirm.title)).toBeNull();
    expect(mockApi.createChart).not.toHaveBeenCalled();
    expect((await loadBirth())?.profile).toEqual(profile);
  });

  it('"바꾸기" 면 차트를 받아 서버에 저장하고, 이 사람의 기기 보관을 지운 뒤 새 출생 정보만 두고 별명 짓는 중(/reading)으로', async () => {
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
    mockApi.saveProfile.mockResolvedValue({ ok: true, data: { date: '2000-06-15', time: null, placeId: null } });
    await render(<BirthChangeScreen />);
    await screen.findByText(B.notice);
    await fireEvent.changeText(date(), '20000615');
    await fireEvent.press(submit());
    await fireEvent.press(within(screen.getByTestId('dialog')).getByRole('button', { name: B.confirm.ok }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: null, placeId: null });
    expect(mockApi.saveProfile).toHaveBeenCalledWith({ date: '2000-06-15', time: null, placeId: null });
    expect((await loadBirth())?.profile).toEqual({ date: '2000-06-15', time: null, place: null });
    // 옛 출생 정보로 받은 별명은 지우고, 기기 값(음악 설정)은 남긴다
    expect(await AsyncStorage.getItem(READING_STORAGE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(DEVICE_KEY)).toBe('{"background":false}');
    expect(router.dismissAll).toHaveBeenCalled();
  });

  it('만 14세 미만 날짜면(서버 403 UNDER_AGE) 생년월일 칸 아래에 알리고 기기의 것은 그대로', async () => {
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
    mockApi.saveProfile.mockResolvedValue({ ok: false, error: 'SERVER', status: 403, code: 'UNDER_AGE' });
    await render(<BirthChangeScreen />);
    await screen.findByText(B.notice);
    await fireEvent.changeText(date(), '20140211');
    await fireEvent.press(submit());
    await fireEvent.press(within(screen.getByTestId('dialog')).getByRole('button', { name: B.confirm.ok }));
    expect(await screen.findByText(H.requestErrors.UNDER_AGE)).toBeTruthy();
    expect((await loadBirth())?.profile).toEqual(profile);
    expect(await AsyncStorage.getItem(READING_STORAGE_KEY)).not.toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('차트를 받지 못하면 짧은 알림, 서버 · 기기 모두 그대로', async () => {
    mockApi.createChart.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<BirthChangeScreen />);
    await screen.findByText(B.notice);
    await fireEvent.changeText(date(), '20000615');
    await fireEvent.press(submit());
    await fireEvent.press(within(screen.getByTestId('dialog')).getByRole('button', { name: B.confirm.ok }));
    expect(await screen.findByText(H.requestErrors.NETWORK)).toBeTruthy();
    expect(mockApi.saveProfile).not.toHaveBeenCalled();
    expect((await loadBirth())?.profile).toEqual(profile);
  });

  it('바꾸는 동안에는 버튼이 꺼진다', async () => {
    let finish: (r: { ok: true; data: typeof fixtures.chartTimeUnknown }) => void = () => {};
    mockApi.createChart.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mockApi.saveProfile.mockResolvedValue({ ok: true, data: { date: '2000-06-15', time: null, placeId: null } });
    await render(<BirthChangeScreen />);
    await screen.findByText(B.notice);
    await fireEvent.changeText(date(), '20000615');
    await fireEvent.press(submit());
    await fireEvent.press(within(screen.getByTestId('dialog')).getByRole('button', { name: B.confirm.ok }));
    expect(submit().props.accessibilityState?.disabled).toBe(true);
    await act(async () => finish({ ok: true, data: fixtures.chartTimeUnknown }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).toHaveBeenCalledTimes(1);
  });
});
