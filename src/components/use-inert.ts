import { useEffect, useRef, type ComponentRef } from 'react';
import { Platform, type View } from 'react-native';

/**
 * 웹에서 active 인 동안 그 칸(View)을 inert 로 둔다 — 누름 · 포커스 · 화면 읽기를 받지 않는다(위에 덮인 화면 · 스플래시 아래).
 * 돌려준 ref 를 그 View 에 준다. 화면 읽기는 aria-hidden 도 함께 준다(부르는 쪽). 앱(iOS · 안드로이드)은 아무것도 하지 않는다.
 */
export function useInert(active: boolean) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    // 웹에서 View 는 DOM 요소다
    const el = ref.current as unknown as HTMLElement | null;
    if (Platform.OS === 'web' && el) el.inert = active;
  }, [active]);
  return ref;
}
