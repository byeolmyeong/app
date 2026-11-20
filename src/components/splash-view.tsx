import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SplashArt } from '@/components/splash-art';

/** 웹 스플래시가 너무 빨리 걷혀 깜빡이지 않게 보이는 최소 시간 */
const MIN_MS = 800;
/** 아무리 늦어도 이만큼 뒤에는 걷는다(확인이 끝나지 않거나 문이 놓지 않아도 갇히지 않게): 앱의 네이티브 스플래시 · 웹 스플래시 */
const NATIVE_MAX_MS = 5000;
const WEB_MAX_MS = 10_000;

/**
 * 스플래시(보드 1, 결정 067 의 3): 밤색 바탕 · 가운데 위쪽의 옅은 빛 · 가운데 별이와 로고 그림.
 * 웹에는 네이티브 스플래시가 없어 앱이 처음 열릴 때 이것을 그린다. 카카오 웹에서 돌아오는 화면처럼 서버를 기다리는 동안 화면이 따로 있어야 하는 곳도 이 모양이다.
 * busyLabel 을 주면 화면 읽기에 그 이름과 기다리는 중(busy)을 알린다(글이 없는 화면이라).
 */
export function SplashView({ busyLabel }: { busyLabel?: string } = {}) {
  return (
    <Screen scroll={false}>
      <View
        testID="splash"
        accessible={busyLabel !== undefined}
        accessibilityLabel={busyLabel}
        accessibilityState={busyLabel !== undefined ? { busy: true } : undefined}
        style={styles.center}>
        <SplashArt />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

/**
 * 스플래시를 걷어도 되는가. ready(처음 확인할 것이 다 끝났다)이고 웹이면 처음 그린 뒤 0.8초가 지났을 때 true 가 되고, 한 번 true 면 그대로다
 * (나중에 다시 확인 중이 되어도 스플래시를 다시 그리지 않는다). 앱은 네이티브 스플래시가 앱이 켜질 때부터 보였으므로 최소 시간이 없다.
 * 확인이 끝나지 않아도 앱은 5초, 웹은 10초 뒤에는 걷는다. skip 이면 처음부터 걷힌 것이다(공유 페이지 — 그 뒤 홈으로 가도 다시 그리지 않는다).
 */
export function useSplashDone(ready: boolean, skip = false): boolean {
  const web = Platform.OS === 'web';
  const [minPassed, setMinPassed] = useState(!web);
  const [maxPassed, setMaxPassed] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const min = web ? setTimeout(() => setMinPassed(true), MIN_MS) : null;
    const max = setTimeout(() => setMaxPassed(true), web ? WEB_MAX_MS : NATIVE_MAX_MS);
    return () => {
      if (min) clearTimeout(min);
      clearTimeout(max);
    };
  }, [web]);
  // skip: 스플래시를 아예 보이지 않는 곳(공유 페이지, 결정 068 의 3) — 처음부터 걷힌 것으로 둔다
  const now = skip || (ready && minPassed) || maxPassed;
  if (!done && now) setDone(true);
  useEffect(() => {
    if (done || now) markSplashGone();
  }, [done, now]);
  return done || now;
}

/** 이번 실행에서 스플래시가 걷혔는가 — 루트가 한 번 걷으면 다시 그리지 않는다 */
let splashGone = false;
const goneListeners = new Set<() => void>();
function markSplashGone() {
  if (splashGone) return;
  splashGone = true;
  goneListeners.forEach((l) => l());
}

/**
 * 스플래시가 걷힌 뒤에 true(이번 실행 동안 그대로). 화면 위에 뜨는 시트가 스플래시 · 정지 확인보다 먼저 올라오지 않게 기다릴 때 쓴다
 * (홈의 알림 받기 권유, #67 리뷰). 루트의 useSplashDone 이 걷을 때 알린다.
 */
export function useSplashGone(): boolean {
  return useSyncExternalStore(
    (listener) => {
      goneListeners.add(listener);
      return () => goneListeners.delete(listener);
    },
    () => splashGone,
  );
}

/** 시험에서만: 스플래시가 걷혔는지 정한다(걷히면 기다리던 쪽에 알린다) */
export function setSplashGoneForTest(gone: boolean) {
  splashGone = false;
  if (gone) markSplashGone();
}
