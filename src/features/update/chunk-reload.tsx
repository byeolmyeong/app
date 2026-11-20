/**
 * 웹 화면 조각을 불러오지 못했을 때(배포가 바뀌어 열려 있던 탭의 옛 조각이 사라짐 — Vercel 은 새 배포 파일만 둔다) 페이지를 한 번만 새로 고친다.
 * 루트 레이아웃의 오류 경계(Expo Router 의 `ErrorBoundary`)가 부른다: 화면 조각은 그릴 때(React.lazy) 받아 오므로 그 실패는 그리는 중에 던져지고,
 * 루트 레이아웃 아래 모든 화면의 오류가 거기로 온다. 새로 고친 뒤에는 새 배포의 조각을 받는다. 가입 중이면 이어 하기(결정 068)로 하던 단계에 돌아온다.
 * 무한 반복을 막으려고 sessionStorage 에 표시를 남기고, 새로 고친 뒤에도 실패하면 볼 게 없는 화면(20-1)을 보인다. 잘 뜨면 표시를 지운다.
 */
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { SplashView } from '@/components/splash-view';
import { StateScreen } from '@/components/state-screen';
import { strings } from '@/content/strings';

/** 사람이 아니라 이 탭에 붙는 표시라 기기 저장소 머리(`byeolmyeong.`)를 피한다 */
const FLAG = 'byeolmyeong-device.chunkReload.v1';

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };

const browserStorage = (): Storage | null => (typeof sessionStorage === 'undefined' ? null : sessionStorage);
const browserReload = () => window.location.reload();

/** 화면 조각을 불러오지 못한 오류인가(Metro 웹의 AsyncRequireError · 번들러의 ChunkLoadError · "Loading module/chunk … failed") */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'AsyncRequireError' || error.name === 'ChunkLoadError' || /Loading (module|chunk) .* failed/i.test(error.message);
}

/** 아직 새로 고치지 않았으면 표시를 남기고 새로 고친다(true). 이미 고쳤으면(표시가 있음) false */
export function reloadOnceForChunk(storage: Storage | null = browserStorage(), reload: () => void = browserReload): boolean {
  try {
    if (!storage || storage.getItem(FLAG) !== null) return false;
    storage.setItem(FLAG, '1');
  } catch {
    return false;
  }
  reload();
  return true;
}

/** 잘 떴다 — 다음 배포 때 다시 한 번 새로 고칠 수 있게 표시를 지운다 */
export function clearChunkReload(storage: Storage | null = browserStorage()): void {
  try {
    storage?.removeItem(FLAG);
  } catch {
    // 지우지 못하면 다음 조각 실패에서 20-1 을 보인다
  }
}

/** 루트가 잘 뜬 뒤 이만큼 지나면 표시를 지운다(새로 고친 뒤 곧바로 또 실패하면 반복하지 않게) */
const SETTLED_MS = 10_000;

/** 루트 레이아웃이 뜬 뒤 한동안 오류가 없으면 표시를 지운다(웹) */
export function useClearChunkReloadWhenSettled(): void {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const timer = setTimeout(() => clearChunkReload(), SETTLED_MS);
    return () => clearTimeout(timer);
  }, []);
}

type Props = ErrorBoundaryProps & { storage?: Storage | null; reload?: () => void };

/** 루트 레이아웃의 오류 경계. 조각 실패만 받고(웹), 그 밖의 오류는 위(Expo Router 의 기본 경계)로 넘긴다 */
export function ChunkErrorBoundary({ error, storage = browserStorage(), reload = browserReload }: Props) {
  const chunk = Platform.OS === 'web' && isChunkLoadError(error);
  // 처음 그릴 때 한 번 정한다: 새로 고칠지(스플래시 모양으로 기다림) · 이미 고쳤는지(20-1)
  const [reloading] = useState(() => chunk && storage !== null && storage.getItem(FLAG) === null);
  useEffect(() => {
    if (reloading) reloadOnceForChunk(storage, reload);
  }, [reloading, storage, reload]);
  if (!chunk) throw error;
  if (reloading) return <SplashView />;
  const S = strings.states.offlineEmpty;
  return (
    <StateScreen
      title={S.title}
      body={S.body}
      primary={{
        label: S.retry,
        onPress: () => {
          clearChunkReload(storage);
          reload();
        },
      }}
    />
  );
}
