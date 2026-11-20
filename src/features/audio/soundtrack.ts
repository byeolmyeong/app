import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState, Platform } from 'react-native';

import { loadMusicSettings, subscribeMusicSettings, type MusicSettings } from '@/features/audio/music-settings';
import { FADE_MS, FADE_STEP_MS, TRACK_LOOPS, TRACK_SOURCES, TRACK_VOLUME, type Track } from '@/features/audio/tracks';

/**
 * 앱 전체의 음악 한 줄(결정 062). 루트가 `start` 하면 배경 음악이 기본이고, 화면이 `request` 로 다른 곡(앱 열 때 · 기다릴 때)을 청하면
 * 가장 나중에 청한 곡이 울린다. 놓으면 앞의 곡으로 돌아간다. 곡이 바뀔 때는 앞 곡을 줄이고 새 곡을 키운다(겹치지 않게).
 * - 꺼 둔 곡(마이 › 음악)은 틀지 않는다 — 그 곡을 청한 화면에서는 소리가 없고, 놓으면 배경(켜 두었으면)으로 돌아간다.
 * - 휴대폰 규칙(062 의 4): 무음 모드면 안 난다 · 다른 앱 소리에 섞이고 끼어들지 않는다 · 앱이 뒤로 가면 바로 멈추고 돌아오면 이어서 난다.
 * - 웹(062 의 5 · 계획 A9-1): 브라우저가 누르기 전 소리를 막으므로 처음 누른 뒤부터 배경 음악만 튼다(앱 열 때 · 기다릴 때 음악은 웹에서 안 틂).
 * 기다릴 때 · 앱 열 때 음악은 청할 때마다 처음부터, 배경 음악과 뒤에서 돌아온 곡은 멈춘 자리에서 이어서 난다.
 */
export function createSoundtrack() {
  let started = false;
  let unlocked = Platform.OS !== 'web';
  let foreground = AppState.currentState !== 'background';
  /** 기기에서 읽기 전에는 null — 그동안은 틀지 않는다 */
  let settings: MusicSettings | null = null;
  const requests: { id: number; track: Track }[] = [];
  let nextId = 0;
  const players: Partial<Record<Track, AudioPlayer>> = {};
  /** 지금 울리는(키우는 중인) 곡 */
  let current: Track | null = null;
  let fading: ReturnType<typeof setInterval> | null = null;
  /** 줄이는 중인 앞 곡 — 줄이기가 끝나면 멈춘다 */
  let fadingOut: AudioPlayer | null = null;
  /** 뒤로 갈 때 울리던 곡 — 돌아와 같은 곡이면 되감지 않고 이어서 */
  let pausedTrack: Track | null = null;

  function player(track: Track): AudioPlayer {
    const made = players[track];
    if (made) return made;
    const p = createAudioPlayer(TRACK_SOURCES[track]);
    p.loop = TRACK_LOOPS[track];
    players[track] = p;
    return p;
  }

  function wanted(): Track | null {
    if (!started || !unlocked || !foreground || !settings) return null;
    let top: Track = requests.length > 0 ? requests[requests.length - 1].track : 'background';
    if (Platform.OS === 'web') top = 'background';
    return settings[top] ? top : null;
  }

  function stopFade() {
    if (fading) clearInterval(fading);
    fading = null;
    fadingOut?.pause();
    fadingOut = null;
  }

  function switchTo(next: Track | null, resume: boolean) {
    stopFade();
    const prev = current ? player(current) : null;
    current = next;
    const incoming = next ? player(next) : null;
    if (next && incoming) {
      if (next !== 'background' && !resume) void incoming.seekTo(0);
      incoming.volume = 0;
      incoming.play();
    }
    const from = prev ? prev.volume : 0;
    fadingOut = prev;
    const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / steps);
      if (prev) prev.volume = from * (1 - t);
      if (next && incoming) incoming.volume = TRACK_VOLUME[next] * t;
      if (step < steps) return;
      clearInterval(timer);
      fading = null;
      prev?.pause();
      fadingOut = null;
    }, FADE_STEP_MS);
    fading = timer;
  }

  /** 뒤로 갈 때: 줄이지 않고 바로 모두 멈춘다(뒤에서는 시계가 서기도 한다) */
  function pauseNow() {
    stopFade();
    for (const p of Object.values(players)) p?.pause();
    pausedTrack = current ?? pausedTrack;
    current = null;
  }

  function apply() {
    const next = wanted();
    if (next === current) return;
    const resume = next !== null && next === pausedTrack;
    if (next !== null) pausedTrack = null;
    switchTo(next, resume);
  }

  /** 루트가 한 번 켠다. 돌려준 함수는 끈다(시험 · 루트가 사라질 때) */
  function start(): () => void {
    if (started) return () => {};
    started = true;
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
    const offSettings = subscribeMusicSettings((s) => {
      settings = s;
      apply();
    });
    void loadMusicSettings().then((s) => {
      settings = s;
      apply();
    });
    const appState = AppState.addEventListener('change', (state) => {
      foreground = state !== 'background';
      if (!foreground) return pauseNow();
      // iOS 는 뒤로 갈 때 울리던 플레이어를 돌아올 때 스스로 다시 튼다(JS 의 pause 로 지워지지 않는다) — 모두 멈춘 뒤 고른 곡만 다시 튼다
      for (const p of Object.values(players)) p?.pause();
      apply();
    });
    let offUnlock = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // 누른 그 순간에 틀어야 브라우저가 막지 않는다. 터치의 pointerdown 은 허락을 만들지 않아 pointerup · touchend · keydown 으로 받는다.
      // 브라우저가 그래도 막았거나(설정을 읽기 전에 누름) 아직 못 틀었으면 다음 누름에서 다시 튼다 — 그래서 듣기를 끝까지 둔다.
      const unlock = () => {
        unlocked = true;
        apply();
        const playingNow = current ? players[current] : undefined;
        if (playingNow && !playingNow.playing) playingNow.play();
      };
      const events = ['pointerup', 'touchend', 'keydown'] as const;
      events.forEach((type) => document.addEventListener(type, unlock));
      offUnlock = () => events.forEach((type) => document.removeEventListener(type, unlock));
    }
    apply();
    return () => {
      started = false;
      offSettings();
      appState.remove();
      offUnlock();
      pauseNow();
      pausedTrack = null;
      // 만든 플레이어는 스스로 놓이지 않는다(expo-audio) — 끌 때 놓는다
      for (const [track, p] of Object.entries(players)) {
        p?.remove();
        delete players[track as Track];
      }
    };
  }

  /** 화면이 곡을 청한다. 돌려준 함수로 놓는다 */
  function request(track: Track): () => void {
    const id = ++nextId;
    requests.push({ id, track });
    apply();
    return () => {
      const i = requests.findIndex((r) => r.id === id);
      if (i >= 0) requests.splice(i, 1);
      apply();
    };
  }

  return { start, request, currentTrack: () => current };
}
