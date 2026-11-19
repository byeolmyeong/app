import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';

import { BIRTH_STORAGE_KEY, loadBirth, saveBirth, useBirthProfile } from '@/features/chart/use-birth-profile';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };

beforeEach(() => AsyncStorage.clear());

describe('기기 보관', () => {
  it('보관한 출생 정보와 차트를 다시 읽는다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    expect(await loadBirth()).toEqual({ profile, chart: fixtures.chart });
  });

  it('보관한 적이 없으면 null 이다', async () => {
    expect(await loadBirth()).toBeNull();
  });

  it('깨진 값이나 모양이 다른 값은 버린다', async () => {
    await AsyncStorage.setItem(BIRTH_STORAGE_KEY, '{not json');
    expect(await loadBirth()).toBeNull();
    await AsyncStorage.setItem(BIRTH_STORAGE_KEY, JSON.stringify({ profile: { date: 20000615 }, chart: {} }));
    expect(await loadBirth()).toBeNull();
    await AsyncStorage.setItem(BIRTH_STORAGE_KEY, JSON.stringify({ profile, chart: { timeKnown: true } }));
    expect(await loadBirth()).toBeNull();
  });

  it('시각 "모름" 이면 곳 없이 보관하고 다시 읽는다(결정 020)', async () => {
    const unknown = { date: '2000-06-15', time: null, place: null };
    await saveBirth({ profile: unknown, chart: fixtures.chartTimeUnknown });
    expect(await loadBirth()).toEqual({ profile: unknown, chart: fixtures.chartTimeUnknown });
    // place 가 아예 없는 값도 읽는다
    await AsyncStorage.setItem(
      BIRTH_STORAGE_KEY,
      JSON.stringify({ profile: { date: '2000-06-15', time: null }, chart: fixtures.chartTimeUnknown }),
    );
    expect(await loadBirth()).toEqual({ profile: unknown, chart: fixtures.chartTimeUnknown });
  });

  it('시각 "모름" + 곳으로 보관된 값은 곳까지 읽는다(입력 칸을 채울 때 쓴다, 결정 041)', async () => {
    await AsyncStorage.setItem(
      BIRTH_STORAGE_KEY,
      JSON.stringify({ profile: { ...profile, time: null }, chart: fixtures.chartTimeUnknown }),
    );
    expect(await loadBirth()).toEqual({
      profile: { date: '2000-06-15', time: null, place: profile.place },
      chart: fixtures.chartTimeUnknown,
    });
  });

  it('시각이 있는데 곳이 없는 값은 버린다', async () => {
    await AsyncStorage.setItem(
      BIRTH_STORAGE_KEY,
      JSON.stringify({ profile: { date: '2000-06-15', time: '21:00', place: null }, chart: fixtures.chart }),
    );
    expect(await loadBirth()).toBeNull();
  });
});

describe('useBirthProfile', () => {
  it('처음에는 읽는 중이고, 읽고 나면 보관된 값을 준다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    const { result } = await renderHook(() => useBirthProfile());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.profile).toEqual(profile);
    expect(result.current.chart).toEqual(fixtures.chart);
  });

  it('save 하면 값이 바뀌고 기기에 남는다', async () => {
    const { result } = await renderHook(() => useBirthProfile());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.profile).toBeNull();
    await result.current.save({ profile, chart: fixtures.chartTimeUnknown });
    await waitFor(() => expect(result.current.profile).toEqual(profile));
    expect((await loadBirth())?.chart.timeKnown).toBe(false);
  });
});
