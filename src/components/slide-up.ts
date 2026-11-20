/**
 * 아래에서 올라오는 창(결정 067 의 1): 약관 글처럼 하던 일 위에 잠깐 펼쳐 읽고 닫는 화면.
 * iOS · 안드로이드는 화면 쌓기(native stack)가 아래에서 올리고 내린다(`slideUpScreenOptions`).
 * 웹의 화면 쌓기는 움직이지 않아(Expo Router SDK 58) 앞 화면을 남겨 두고(`transparentModal`) 화면이 스스로 올라오고 내려간다(`useSlideUp`).
 * 기기의 동작 줄이기가 켜져 있으면 움직이지 않는다.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/components/byeoli';
import { Colors } from '@/constants/theme';

/** 아래 시트(Sheet)와 같은 빠르기 · 곡선 */
const OPEN_MS = 300;
const CLOSE_MS = 220;

/** Stack.Screen 의 options 로 넘기는 값 */
export type SlideUpScreenOptions =
  | { animation: 'slide_from_bottom' | 'none'; contentStyle: { backgroundColor: string } }
  | { presentation: 'transparentModal'; contentStyle: { backgroundColor: 'transparent' } };

/** 그 플랫폼에서 아래에서 올라오는 화면의 옵션. 바탕은 처음부터 paper(웹은 화면 쪽이 paper 로 올라온다) */
export function slideUpScreenOptions(os: typeof Platform.OS, reduceMotion: boolean): SlideUpScreenOptions {
  if (os === 'web') return { presentation: 'transparentModal', contentStyle: { backgroundColor: 'transparent' } };
  return { animation: reduceMotion ? 'none' : 'slide_from_bottom', contentStyle: { backgroundColor: Colors.paper } };
}

/** 루트 레이아웃이 약관 글 화면들에 쓴다 */
export function useSlideUpScreenOptions(): SlideUpScreenOptions {
  return slideUpScreenOptions(Platform.OS, useReduceMotion());
}

/**
 * 웹에서 화면이 스스로 아래에서 올라오고(열릴 때) 내려간다(close). style 은 화면 전체를 감싼 Animated.View 에 준다.
 * 앱 안에서 열었을 때만 움직인다 — 주소로 바로 열어 돌아갈 앞 화면이 없거나, 동작 줄이기거나, iOS · 안드로이드(화면 쌓기가 움직인다)면 그대로 두고
 * close 는 바로 다음 일을 한다.
 */
export function useSlideUp(): { style: Animated.WithAnimatedValue<ViewStyle>; close: (after: () => void) => void } {
  const reduce = useReduceMotion();
  const [moves] = useState(() => Platform.OS === 'web' && !reduce && router.canGoBack());
  const [progress] = useState(() => new Animated.Value(moves ? 0 : 1));
  const closing = useRef(false);

  useEffect(() => {
    if (!moves) return;
    Animated.timing(progress, { toValue: 1, duration: OPEN_MS, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: false }).start();
  }, [moves, progress]);

  function close(after: () => void) {
    if (!moves) return after();
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: CLOSE_MS, easing: Easing.in(Easing.ease), useNativeDriver: false }).start(() => after());
  }

  const style = moves
    ? { flex: 1, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] }) }] }
    : { flex: 1 };
  return { style, close };
}
