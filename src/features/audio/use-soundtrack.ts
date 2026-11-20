import { useEffect } from 'react';

import { createSoundtrack } from '@/features/audio/soundtrack';
import type { Track } from '@/features/audio/tracks';

/** 앱에 하나뿐인 음악 줄(결정 062) */
const soundtrack = createSoundtrack();

/**
 * 이 화면이 떠 있는 동안 그 곡을 청한다(결정 062): 쓰는 중 화면(별명 짓는 중 · 자세한 풀이 · 시기 풀이 · 그날의 하늘 쓰는 중)은 `waiting`,
 * 스플래시는 `opening`. 청하지 않은 화면은 배경 음악이다. 잠깐 불러오는 동안(다시 보기 등)에는 부르지 않는다.
 * 한 화면 안에서 쓰는 중일 때만 청하려면 `active` 를 넘긴다(예: `useSoundtrack('waiting', status === 'writing')`).
 * 다른 기능에서도 쓰는 공유 파일이다(eslint.config.js 의 SHARED_FEATURE_FILES).
 */
export function useSoundtrack(track: Track, active = true) {
  useEffect(() => (active ? soundtrack.request(track) : undefined), [track, active]);
}

/** 루트 레이아웃이 한 번 부른다 — 배경 음악을 깔고, 휴대폰 규칙(무음 · 섞기 · 뒤로 가면 멈춤)과 웹의 첫 누름을 지킨다 */
export function useSoundtrackRoot() {
  useEffect(() => soundtrack.start(), []);
}
