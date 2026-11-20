/**
 * 음악 세 곡(결정 062): 앱 열 때 · 기다릴 때 · 배경. 앱 안에 파일로 싣는다(서버에서 받지 않는다).
 * 파일을 바꿔 끼우는 법은 `assets/audio/README.md`. 지금은 1초 무음 자리표시다(계획 A9-1 — 진짜 음원은 A9-3).
 */
export type Track = 'opening' | 'waiting' | 'background';

export const TRACK_SOURCES: Record<Track, number> = {
  opening: require('@/assets/audio/opening.wav'),
  waiting: require('@/assets/audio/waiting.wav'),
  background: require('@/assets/audio/background.wav'),
};

/** 곡마다의 음량(0~1). 배경은 작게 깐다(결정 062 의 1) */
export const TRACK_VOLUME: Record<Track, number> = { opening: 0.8, waiting: 0.6, background: 0.35 };

/** 앱 열 때 음악만 한 번 울리고, 나머지는 되풀이한다 */
export const TRACK_LOOPS: Record<Track, boolean> = { opening: false, waiting: true, background: true };

/** 곡이 바뀔 때 앞 곡을 줄이고 새 곡을 키우는 시간과 한 걸음(결정 062 의 2 "겹치지 않게 짧게 줄였다 키운다") */
export const FADE_MS = 400;
export const FADE_STEP_MS = 50;
