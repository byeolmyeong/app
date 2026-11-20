/**
 * 아래에서 올라오는 창(결정 067 의 1): 약관 글처럼 하던 일 위에 잠깐 펼쳐 읽고 닫는 화면.
 * iOS · 안드로이드는 화면 쌓기(native stack)가 아래에서 올리고 내린다(`slideUpScreenOptions`).
 * 웹의 화면 쌓기는 움직이지 않아(Expo Router SDK 58) 앞 화면을 남겨 두고(`transparentModal`) 화면이 스스로 올라오고 내려간다(`useSlideUp`).
 * 기기의 동작 줄이기가 켜져 있으면 움직이지 않는다.
 */
import { useCanGoBack, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Animated, Easing, Platform, type View, type ViewStyle } from 'react-native';

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

/** 오른쪽에서 밀려 들어오는 화면(가입 단계 사이)의 옵션: 앱은 화면 쌓기의 기본(오른쪽에서) 그대로, 웹만 앞 화면을 남긴다 */
export function slideInScreenOptions(os: typeof Platform.OS): Partial<SlideUpScreenOptions> {
  return os === 'web' ? { presentation: 'transparentModal', contentStyle: { backgroundColor: 'transparent' } } : {};
}

/** 루트 레이아웃이 약관 글 화면들에 쓴다 */
export function useSlideUpScreenOptions(): SlideUpScreenOptions {
  return slideUpScreenOptions(Platform.OS, useReduceMotion());
}

/**
 * 웹에서 화면이 스스로 아래에서 올라오고(열릴 때) 내려간다(close). from 이 right 면 오른쪽에서 밀려 들어오고 오른쪽으로 나간다(가입 단계 사이 — 앱의 밀어 넣기와 같게). style 은 화면 전체를 감싼 Animated.View 에 준다.
 * 앱 안에서 열었을 때만 움직인다 — 주소로 바로 열어 돌아갈 앞 화면이 없거나, 동작 줄이기거나, iOS · 안드로이드(화면 쌓기가 움직인다)면 그대로 두고
 * close 는 바로 다음 일을 한다.
 */
export function useSlideUp(from: 'bottom' | 'right' = 'bottom'): {
  style: Animated.WithAnimatedValue<ViewStyle>;
  close: (after: () => void) => void;
  /** 감싼 Animated.View 에 준다: 웹에서 위에 다른 화면이 올라와 가려진 동안(앞 화면을 남기는 transparentModal) 누름 · 포커스 · 화면 읽기를 막는다 */
  ref: RefObject<ComponentRef<typeof View> | null>;
  hidden: boolean;
} {
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const hidden = Platform.OS === 'web' && !focused;
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (Platform.OS === 'web' && el) el.inert = hidden;
  }, [hidden]);
  // 그리는 중에는 router.canGoBack() 이 이 화면을 넣기 전 쌓기를 볼 수 있어(낡은 값) 그리는 중에 읽어도 되는 훅을 쓴다
  const canGoBack = useCanGoBack();
  const [moves] = useState(() => Platform.OS === 'web' && !reduce && canGoBack);
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
    Animated.timing(progress, { toValue: 0, duration: CLOSE_MS, easing: Easing.in(Easing.ease), useNativeDriver: false }).start(({ finished }) => {
      // 내려가는 중에 화면이 사라지면(브라우저 뒤로 등) 이미 돌아갔으니 다시 하지 않는다
      if (finished) after();
    });
  }

  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] });
  const style = moves ? { flex: 1, transform: [from === 'right' ? { translateX: offset } : { translateY: offset }] } : { flex: 1 };
  return { style, close, ref, hidden };
}
