import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { Track } from '@/features/audio/tracks';

/**
 * 마이 › 음악의 스위치 셋(결정 062 의 3). 기기에만 둔다 — 이 기기의 소리 환경이라 사람이 아니라 기기에 붙는 값으로 보고
 * `byeolmyeong-device.` 로 지어 로그아웃 · 계정 삭제가 지우지 않는다(결정 042 의 기기 값 규칙).
 */
export const MUSIC_STORAGE_KEY = 'byeolmyeong-device.music.v1';

export type MusicSettings = Record<Track, boolean>;

/** 처음엔 모두 켬 */
export const DEFAULT_MUSIC: MusicSettings = { background: true, opening: true, waiting: true };

let cached: MusicSettings | null = null;
let loading: Promise<MusicSettings> | null = null;
const listeners = new Set<(settings: MusicSettings) => void>();

/** 저장된 값의 모양을 본다: 아는 칸 중 참거짓인 것만 쓰고 나머지는 기본값(켬) */
function parse(raw: string | null): MusicSettings {
  if (raw === null) return DEFAULT_MUSIC;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null) return DEFAULT_MUSIC;
    const o = v as Record<string, unknown>;
    const pick = (key: Track) => (typeof o[key] === 'boolean' ? (o[key] as boolean) : DEFAULT_MUSIC[key]);
    return { background: pick('background'), opening: pick('opening'), waiting: pick('waiting') };
  } catch {
    return DEFAULT_MUSIC;
  }
}

/** 저장된 설정(처음 한 번 기기에서 읽고 그 뒤로는 메모리). 읽지 못하면 모두 켬 */
export function loadMusicSettings(): Promise<MusicSettings> {
  if (cached) return Promise.resolve(cached);
  loading ??= AsyncStorage.getItem(MUSIC_STORAGE_KEY)
    .catch(() => null)
    .then((raw) => {
      cached ??= parse(raw);
      return cached;
    });
  return loading;
}

/** 스위치 하나를 바꾼다. 바로 알리고(지금 울리는 곡이 따라 바뀐다) 기기에 적는다 — 적지 못해도 이번 실행에서는 바뀐 대로 둔다 */
export async function setMusicSetting(track: Track, on: boolean): Promise<void> {
  const next = { ...(await loadMusicSettings()), [track]: on };
  cached = next;
  listeners.forEach((fn) => fn(next));
  await AsyncStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
}

export function subscribeMusicSettings(fn: (settings: MusicSettings) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 음악 화면의 스위치 값. 기기에서 읽기 전에는 null */
export function useMusicSettings(): MusicSettings | null {
  const [settings, setSettings] = useState<MusicSettings | null>(cached);
  useEffect(() => {
    let alive = true;
    void loadMusicSettings().then((s) => {
      if (alive) setSettings(s);
    });
    const off = subscribeMusicSettings(setSettings);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return settings;
}

/** 시험에서만: 메모리에 읽어 둔 값을 버린다 */
export function resetMusicSettingsForTest(): void {
  cached = null;
  loading = null;
  listeners.clear();
}
