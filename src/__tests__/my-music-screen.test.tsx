import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import MusicScreen from '@/app/my/music';
import { strings } from '@/content/strings';
import { MUSIC_STORAGE_KEY, loadMusicSettings, resetMusicSettingsForTest } from '@/features/audio/music-settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() } }));

const MU = strings.my.music;
const sw = (label: string) => screen.getByRole('switch', { name: label });

beforeEach(async () => {
  await AsyncStorage.clear();
  resetMusicSettingsForTest();
});

describe('음악(/my/music, 보드 16-11)', () => {
  it('배경 음악 · 앱 열 때 음악 · 기다릴 때 음악 세 스위치, 처음엔 모두 켬', async () => {
    await render(<MusicScreen />);
    await waitFor(() => expect(sw(MU.background)).toBeTruthy());
    for (const label of [MU.background, MU.opening, MU.waiting]) expect(sw(label).props.accessibilityState.checked).toBe(true);
    const shown = JSON.stringify(screen.toJSON());
    expect(shown.indexOf(MU.background)).toBeLessThan(shown.indexOf(MU.opening));
    expect(shown.indexOf(MU.opening)).toBeLessThan(shown.indexOf(MU.waiting));
  });

  it('누르면 그 스위치만 바뀌고 기기에 적힌다', async () => {
    await render(<MusicScreen />);
    await waitFor(() => expect(sw(MU.waiting)).toBeTruthy());
    await fireEvent.press(sw(MU.waiting));
    await waitFor(() => expect(sw(MU.waiting).props.accessibilityState.checked).toBe(false));
    expect(sw(MU.background).props.accessibilityState.checked).toBe(true);
    expect(await loadMusicSettings()).toEqual({ background: true, opening: true, waiting: false });
    expect(JSON.parse((await AsyncStorage.getItem(MUSIC_STORAGE_KEY)) ?? 'null')).toEqual({ background: true, opening: true, waiting: false });
  });

  it('저장된 값으로 시작한다', async () => {
    await AsyncStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify({ background: false, opening: true, waiting: true }));
    await render(<MusicScreen />);
    await waitFor(() => expect(sw(MU.background).props.accessibilityState.checked).toBe(false));
  });
});
