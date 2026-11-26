import { useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * 밀기 끝을 듣지 못할 때(첫 화면 · 이벤트를 주지 않는 경우) 이만큼 뒤에는 그린다 — iOS 기본 밀기(약 0.35초)보다 조금 길게.
 * 0.6초는 휠이 글보다 한참 늦게 보였다(소유자 빌드 14) — 밀기가 끝나자마자에 가깝게 0.4초
 */
export const PUSH_SETTLE_FALLBACK_MS = 400;

/**
 * 들어오는 밀기(iOS 기본 push)가 끝났는가. 무거운 그림(내 하늘 지도의 휠 SVG)을 미는 동안에는 같은 크기의 자리만 두고 끝난 뒤 그리게 한다 —
 * 화면이 붙을 때 그릴 것이 적어야 밀기가 바로 시작되고 끊기지 않는다(소유자 "아이폰 기본 밀기 그대로, 매끄럽게", 빌드 10).
 * 네이티브 스택의 `transitionEnd`(들어올 때 `closing: false`)를 듣는다. 웹은 밀기 움직임이 없어 첫 프레임 다음 프레임에 참이 된다.
 * RN 0.88 에는 `InteractionManager` 가 없다(코어에서 빠짐).
 */
export function usePushSettled(): boolean {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (settled) return;
    const done = () => setSettled(true);
    if (Platform.OS === 'web') {
      const frame = requestAnimationFrame(done);
      return () => cancelAnimationFrame(frame);
    }
    const off = navigation.addListener('transitionEnd', (e) => {
      if (!e.data?.closing) done();
    });
    const timer = setTimeout(done, PUSH_SETTLE_FALLBACK_MS);
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [navigation, settled]);
  return settled;
}
