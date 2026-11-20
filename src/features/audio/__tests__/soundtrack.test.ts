import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState, Platform } from 'react-native';

import { MUSIC_STORAGE_KEY, resetMusicSettingsForTest, setMusicSetting } from '@/features/audio/music-settings';
import { createSoundtrack } from '@/features/audio/soundtrack';
import { FADE_MS, TRACK_SOURCES, TRACK_VOLUME, type Track } from '@/features/audio/tracks';

type FakePlayer = { source: unknown; volume: number; loop: boolean; playing: boolean; play: jest.Mock; pause: jest.Mock; seekTo: jest.Mock; remove: jest.Mock };

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn((source: unknown) => {
    const p = {
      source,
      volume: 1,
      loop: false,
      playing: false,
      play: jest.fn(() => {
        p.playing = true;
      }),
      pause: jest.fn(() => {
        p.playing = false;
      }),
      seekTo: jest.fn(async () => {}),
      remove: jest.fn(),
    };
    return p;
  }),
  setAudioModeAsync: jest.fn(async () => {}),
}));
// 시험에서는 소리 파일 셋이 같은 가짜로 읽히니, 곡을 가려낼 수 있게 서로 다른 값을 준다
jest.mock('@/features/audio/tracks', () => ({
  ...jest.requireActual('@/features/audio/tracks'),
  TRACK_SOURCES: { opening: 101, waiting: 102, background: 103 },
}));

const made = () => (createAudioPlayer as jest.Mock).mock.results.map((r) => r.value as FakePlayer);
const playerOf = (track: Track) => made().find((p) => p.source === TRACK_SOURCES[track]);
const playing = () => (['opening', 'waiting', 'background'] as Track[]).filter((t) => playerOf(t)?.playing);
/** 기기 저장소 읽기 같은 약속을 다 풀어 준다 */
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const fadeDone = async () => {
  jest.advanceTimersByTime(FADE_MS + 100);
  await flush();
};

let appStateHandler: (state: string) => void = () => {};
let stops: (() => void)[] = [];

beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  await AsyncStorage.clear();
  resetMusicSettingsForTest();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler as (state: string) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});
afterEach(() => {
  stops.forEach((stop) => stop());
  stops = [];
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function started(soundtrack = createSoundtrack()) {
  stops.push(soundtrack.start());
  await flush();
  return soundtrack;
}

describe('음악 한 줄(결정 062)', () => {
  it('켜면 무음 모드를 따르고 · 다른 소리에 섞이고 · 뒤에서는 틀지 않게 정한 뒤, 배경 음악을 되풀이하며 작게 키운다', async () => {
    await started();
    expect(setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
    expect(playing()).toEqual(['background']);
    expect(playerOf('background')?.loop).toBe(true);
    expect(playerOf('background')?.volume).toBe(0);
    await fadeDone();
    expect(playerOf('background')?.volume).toBeCloseTo(TRACK_VOLUME.background);
  });

  it('루트가 켜기 전에는 화면이 청해도 틀지 않는다', async () => {
    const soundtrack = createSoundtrack();
    stops.push(soundtrack.request('waiting'));
    await flush();
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  it('쓰는 중 화면이 기다릴 때 음악을 청하면 배경을 줄여 멈추고 기다릴 때 음악을 처음부터 키운다. 놓으면 배경이 멈춘 자리에서 이어진다', async () => {
    const soundtrack = await started();
    await fadeDone();
    const release = soundtrack.request('waiting');
    expect(playerOf('waiting')?.seekTo).toHaveBeenCalledWith(0);
    expect(playing()).toEqual(['waiting', 'background']);
    jest.advanceTimersByTime(FADE_MS / 2);
    // 둘 다 반쯤: 배경은 줄고 기다릴 때 음악은 커진다
    expect(playerOf('background')!.volume).toBeLessThan(TRACK_VOLUME.background);
    expect(playerOf('waiting')!.volume).toBeGreaterThan(0);
    await fadeDone();
    expect(playing()).toEqual(['waiting']);
    expect(playerOf('waiting')?.volume).toBeCloseTo(TRACK_VOLUME.waiting);

    release();
    await fadeDone();
    expect(playing()).toEqual(['background']);
    // 배경은 처음으로 되감지 않는다
    expect(playerOf('background')?.seekTo).not.toHaveBeenCalled();
    expect(soundtrack.currentTrack()).toBe('background');
  });

  it('앱 열 때 음악은 한 번만 울리고(되풀이하지 않음), 놓으면 배경으로 간다', async () => {
    const soundtrack = createSoundtrack();
    const release = soundtrack.request('opening');
    await started(soundtrack);
    expect(playing()).toEqual(['opening']);
    expect(playerOf('opening')?.loop).toBe(false);
    release();
    await fadeDone();
    expect(playing()).toEqual(['background']);
  });

  it.each([
    ['배경만 끔', { background: false }, 'waiting', ['waiting'], []],
    ['기다릴 때만 끔 — 쓰는 중에는 소리 없음', { waiting: false }, 'waiting', [], ['background']],
    ['앱 열 때만 끔 — 스플래시에는 소리 없음', { opening: false }, 'opening', [], ['background']],
    ['모두 끔', { background: false, opening: false, waiting: false }, 'waiting', [], []],
  ] as const)('설정(%s): 청한 곡 · 놓은 뒤', async (_name, off, track, whileRequested, afterRelease) => {
    await AsyncStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify({ background: true, opening: true, waiting: true, ...off }));
    const soundtrack = await started();
    const release = soundtrack.request(track);
    await fadeDone();
    expect(playing()).toEqual(whileRequested);
    release();
    await fadeDone();
    expect(playing()).toEqual(afterRelease);
  });

  it('마이 › 음악에서 끄면 바로 멈추고, 켜면 다시 튼다', async () => {
    await started();
    await fadeDone();
    await setMusicSetting('background', false);
    await fadeDone();
    expect(playing()).toEqual([]);
    await setMusicSetting('background', true);
    await fadeDone();
    expect(playing()).toEqual(['background']);
  });

  it('앱이 뒤로 가면 줄이지 않고 바로 멈추고, 돌아오면 같은 곡을 되감지 않고 이어서 튼다', async () => {
    const soundtrack = await started();
    await fadeDone();
    soundtrack.request('waiting');
    await fadeDone();
    expect(playerOf('waiting')?.seekTo).toHaveBeenCalledTimes(1);
    appStateHandler('background');
    expect(playing()).toEqual([]);
    appStateHandler('active');
    await fadeDone();
    expect(playing()).toEqual(['waiting']);
    // 처음 청할 때 한 번만 되감았다
    expect(playerOf('waiting')?.seekTo).toHaveBeenCalledTimes(1);
  });

  it('iOS 가 돌아올 때 뒤로 가기 전의 플레이어를 스스로 다시 틀어도, 고른 곡 하나만 울린다', async () => {
    const soundtrack = await started();
    await fadeDone();
    const release = soundtrack.request('waiting');
    jest.advanceTimersByTime(FADE_MS / 2);
    // 곡이 바뀌는 중에 뒤로 갔고, 그동안 쓰기가 끝나 기다릴 때 음악을 놓았다
    appStateHandler('background');
    release();
    // 네이티브가 뒤로 가기 전에 울리던 둘을 다시 튼다
    playerOf('waiting')!.playing = true;
    playerOf('background')!.playing = true;
    appStateHandler('active');
    await fadeDone();
    expect(playing()).toEqual(['background']);
  });

  it('곡이 바뀌는 중에 다시 앞 곡으로 돌아와도 한 곡만 남는다', async () => {
    const soundtrack = await started();
    await fadeDone();
    const release = soundtrack.request('waiting');
    jest.advanceTimersByTime(FADE_MS / 2);
    release();
    await fadeDone();
    expect(playing()).toEqual(['background']);
    expect(playerOf('background')?.volume).toBeCloseTo(TRACK_VOLUME.background);
  });

  it('두 번 켜도 한 번이고, 같은 청을 두 번 놓아도 다른 청은 남는다', async () => {
    const soundtrack = createSoundtrack();
    stops.push(soundtrack.start());
    stops.push(soundtrack.start());
    await flush();
    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    const first = soundtrack.request('waiting');
    soundtrack.request('opening');
    first();
    first();
    await fadeDone();
    expect(soundtrack.currentTrack()).toBe('opening');
  });

  it('끄면 모두 멈추고 만든 플레이어를 놓는다(스스로 놓이지 않는다)', async () => {
    const soundtrack = createSoundtrack();
    const stop = soundtrack.start();
    await flush();
    await fadeDone();
    stop();
    expect(playing()).toEqual([]);
    expect(playerOf('background')?.remove).toHaveBeenCalledTimes(1);
    expect(soundtrack.currentTrack()).toBeNull();
  });

  it('저장된 설정을 읽기 전에는 틀지 않는다', async () => {
    let answer: (v: string | null) => void = () => {};
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const soundtrack = createSoundtrack();
    stops.push(soundtrack.start());
    await flush();
    expect(playing()).toEqual([]);
    answer(null);
    await flush();
    expect(playing()).toEqual(['background']);
  });
});

describe('웹(결정 062 의 5)', () => {
  const listeners: Record<string, () => void> = {};
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
    (globalThis as unknown as { document: object }).document = {
      addEventListener: jest.fn((type: string, fn: () => void) => (listeners[type] = fn)),
      removeEventListener: jest.fn((type: string) => delete listeners[type]),
    };
  });
  afterEach(() => {
    // 끄는 일(듣기 그만두기)이 document 를 쓰니 먼저 끈다
    stops.forEach((stop) => stop());
    stops = [];
    delete (globalThis as unknown as { document?: object }).document;
  });

  it('처음 누르기 전에는 아무것도 틀지 않고, 손을 뗀 그 순간(pointerup · touchend · keydown) 배경을 튼다', async () => {
    await started();
    expect(playing()).toEqual([]);
    // 터치의 pointerdown 은 브라우저가 허락으로 치지 않는다 — 듣지 않는다
    expect(listeners.pointerdown).toBeUndefined();
    listeners.pointerup();
    expect(playing()).toEqual(['background']);
    expect(Object.keys(listeners).sort()).toEqual(['keydown', 'pointerup', 'touchend']);
  });

  it('브라우저가 첫 누름의 재생을 막았으면 다음 누름에서 다시 튼다', async () => {
    await started();
    // 첫 누름: 재생을 부르지만 브라우저가 막는다
    listeners.touchend();
    const bg = playerOf('background')!;
    bg.playing = false;
    expect(bg.play).toHaveBeenCalledTimes(1);
    listeners.touchend();
    expect(bg.play).toHaveBeenCalledTimes(2);
    expect(bg.playing).toBe(true);
  });

  it('웹에서는 앱 열 때 · 기다릴 때 음악 대신 배경만 튼다(계획 A9-1)', async () => {
    const soundtrack = createSoundtrack();
    soundtrack.request('opening');
    soundtrack.request('waiting');
    await started(soundtrack);
    listeners.keydown();
    expect(playing()).toEqual(['background']);
    expect(playerOf('opening')).toBeUndefined();
    expect(playerOf('waiting')).toBeUndefined();
  });
});
