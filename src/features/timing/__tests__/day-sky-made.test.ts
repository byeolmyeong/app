import AsyncStorage from '@react-native-async-storage/async-storage';

import { DAY_SKY_MADE_STORAGE_KEY, daySkyMadeGeneration, markDaySkyMade, wasDaySkyMade } from '@/features/timing/day-sky-made';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const birth = JSON.stringify(['2000-06-15', '21:00', 1841277]);
const other = JSON.stringify(['1999-01-01', null, null]);
let nowSpy: jest.SpyInstance;
beforeEach(async () => {
  await AsyncStorage.clear();
  // 한국 날짜 2026-11-19
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T01:00:00Z'));
});
afterEach(() => nowSpy.mockRestore());

describe('그날의 하늘 "만든 적 있음"(결정 075 의 2)', () => {
  it('받은 날을 출생 정보별로 기억하고, 다른 출생 정보 · 안 받은 날은 모른다', async () => {
    const gen = await daySkyMadeGeneration();
    await markDaySkyMade(birth, '2026-11-21', gen);
    expect(await wasDaySkyMade(birth, '2026-11-21')).toBe(true);
    expect(await wasDaySkyMade(birth, '2026-11-22')).toBe(false);
    expect(await wasDaySkyMade(other, '2026-11-21')).toBe(false);
    expect(DAY_SKY_MADE_STORAGE_KEY.startsWith('byeolmyeong.')).toBe(true);
  });

  it('달력 범위 밖(지난달 1일 전)의 날은 지운다 — 다른 출생 정보로 받으면 새로 시작', async () => {
    const gen = await daySkyMadeGeneration();
    await markDaySkyMade(birth, '2026-09-30', gen);
    await markDaySkyMade(birth, '2026-10-01', gen);
    await markDaySkyMade(birth, '2026-11-19', gen);
    expect(JSON.parse((await AsyncStorage.getItem(DAY_SKY_MADE_STORAGE_KEY))!).dates).toEqual(['2026-10-01', '2026-11-19']);
    await markDaySkyMade(other, '2026-11-19', gen);
    expect(await wasDaySkyMade(birth, '2026-11-19')).toBe(false);
    expect(await wasDaySkyMade(other, '2026-11-19')).toBe(true);
  });

  it('받는 사이 기기를 지웠으면(로그아웃 · 탈퇴) 기억하지 않는다(세대 표식)', async () => {
    const gen = await daySkyMadeGeneration();
    await AsyncStorage.clear();
    await markDaySkyMade(birth, '2026-11-19', gen);
    expect(await AsyncStorage.getItem(DAY_SKY_MADE_STORAGE_KEY)).toBeNull();
  });
});
