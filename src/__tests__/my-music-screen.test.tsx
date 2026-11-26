import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import MusicRoute from '@/app/my/music';
import { MusicSettingsScreen as MusicScreen } from '@/features/audio/music-screen';
import { strings } from '@/content/strings';
import { MUSIC_STORAGE_KEY, loadMusicSettings, resetMusicSettingsForTest } from '@/features/audio/music-settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));

const MU = strings.my.music;
const sw = (label: string) => screen.getByRole('switch', { name: label });

beforeEach(async () => {
  await AsyncStorage.clear();
  resetMusicSettingsForTest();
});

describe('1.0.0 의 /my/music(결정 069)', () => {
  it('음악을 꺼 두어 주소로 들어와도 마이로 보낸다(스위치를 보이지 않는다)', async () => {
    await render(<MusicRoute />);
    expect(screen.getByTestId('redirect').props.children).toBe('/my');
    expect(screen.queryByRole('switch')).toBeNull();
  });
});

describe('음악 화면(1.1.0 에서 열림, 보드 16-11)', () => {
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
