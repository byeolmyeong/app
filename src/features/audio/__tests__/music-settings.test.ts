import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_MUSIC,
  MUSIC_STORAGE_KEY,
  loadMusicSettings,
  resetMusicSettingsForTest,
  setMusicSetting,
  subscribeMusicSettings,
} from '@/features/audio/music-settings';

beforeEach(async () => {
  await AsyncStorage.clear();
  resetMusicSettingsForTest();
  jest.restoreAllMocks();
});

describe('마이 › 음악 설정(결정 062 의 3)', () => {
  it('처음엔 셋 다 켬이고, 기기에 붙는 값이라 로그아웃 · 탈퇴가 지우는 머리(byeolmyeong.)를 쓰지 않는다', async () => {
    expect(await loadMusicSettings()).toEqual({ background: true, opening: true, waiting: true });
    expect(MUSIC_STORAGE_KEY.startsWith('byeolmyeong-device.')).toBe(true);
  });

  it('저장된 값을 읽고, 모르는 칸 · 참거짓이 아닌 칸 · 망가진 글은 켬으로 본다', async () => {
    await AsyncStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify({ background: false, opening: 'no', extra: 1 }));
    expect(await loadMusicSettings()).toEqual({ background: false, opening: true, waiting: true });
    resetMusicSettingsForTest();
    await AsyncStorage.setItem(MUSIC_STORAGE_KEY, '{망가짐');
    expect(await loadMusicSettings()).toEqual(DEFAULT_MUSIC);
  });

  it('저장소를 읽지 못하면 모두 켬', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage'));
    expect(await loadMusicSettings()).toEqual(DEFAULT_MUSIC);
  });

  it('하나를 바꾸면 듣는 쪽에 바로 알리고 기기에 적는다. 적지 못해도 이번 실행에서는 바뀐 대로다', async () => {
    const heard = jest.fn();
    subscribeMusicSettings(heard);
    await setMusicSetting('waiting', false);
    expect(heard).toHaveBeenLastCalledWith({ background: true, opening: true, waiting: false });
    expect(JSON.parse((await AsyncStorage.getItem(MUSIC_STORAGE_KEY)) ?? 'null')).toEqual({ background: true, opening: true, waiting: false });

    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage'));
    await expect(setMusicSetting('background', false)).resolves.toBeUndefined();
    expect(await loadMusicSettings()).toEqual({ background: false, opening: true, waiting: false });
  });
});
