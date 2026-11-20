import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SplashArt } from '@/components/splash-art';

/** 웹 스플래시가 너무 빨리 걷혀 깜빡이지 않게 보이는 최소 시간 */
const MIN_MS = 800;
/** 앱의 네이티브 스플래시를 아무리 늦어도 이만큼 뒤에는 걷는다(확인이 끝나지 않는 일이 있어도 갇히지 않게) */
const NATIVE_MAX_MS = 5000;

/**
 * 스플래시(보드 1, 결정 067 의 3): 밤색 바탕 · 가운데 위쪽의 옅은 빛 · 가운데 별이와 로고 그림.
 * 웹에는 네이티브 스플래시가 없어 앱이 처음 열릴 때 이것을 그린다. 카카오 웹에서 돌아오는 화면처럼 서버를 기다리는 동안 화면이 따로 있어야 하는 곳도 이 모양이다.
 */
export function SplashView() {
  return (
    <Screen scroll={false}>
      <View testID="splash" style={styles.center}>
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
 * (나중에 다시 확인 중이 되어도 스플래시를 다시 그리지 않는다). 앱은 네이티브 스플래시가 앱이 켜질 때부터 보였으므로 최소 시간이 없고,
 * 확인이 끝나지 않아도 5초 뒤에는 걷는다.
 */
export function useSplashDone(ready: boolean): boolean {
  const web = Platform.OS === 'web';
  const [minPassed, setMinPassed] = useState(!web);
  const [maxPassed, setMaxPassed] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = web ? setTimeout(() => setMinPassed(true), MIN_MS) : setTimeout(() => setMaxPassed(true), NATIVE_MAX_MS);
    return () => clearTimeout(timer);
  }, [web]);
  const now = (ready && minPassed) || maxPassed;
  if (!done && now) setDone(true);
  return done || now;
}
