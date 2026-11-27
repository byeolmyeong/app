import { useContext, useSyncExternalStore } from 'react';
import { Dimensions, Keyboard, LayoutAnimation, Platform, type EmitterSubscription, type KeyboardEvent, type KeyboardMetrics } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/**
 * 화면 키패드가 창 바닥을 덮은 높이(결정 085). 떠 있지 않으면 0. 웹은 use-keyboard-height.web.ts.
 * iOS: 키패드가 움직이기 시작할 때(keyboardWillChangeFrame) 끝 자리로 잰다 — 창 높이 − 키패드 위 끝.
 * 키패드가 올라오거나 높이가 바뀔 때만 화면 칸이 키패드와 같은 시간 · 곡선으로 움직이게 LayoutAnimation 을 한 번 건다.
 * 내려갈 때(0)는 걸지 않고 바로 제자리로 — 버튼이 천천히 내려오지 않게(소유자 2026-11-27).
 * 안드로이드: 다 올라온 뒤(keyboardDidShow)의 높이. RN 이 아래 시스템 막대를 빼고 주므로(edge-to-edge 창은 줄지 않는다)
 * 쓰는 쪽에서 아래 안전 영역을 더한다.
 * 화면이 여럿 들어도 알림은 여기 한 곳에서만 듣고, 듣는 화면이 없으면 끊는다.
 */
let height = 0;
const listeners = new Set<() => void>();
let subscriptions: EmitterSubscription[] = [];

/** iOS 는 창 바닥에서 덮은 높이, 안드로이드는 RN 이 준 높이(시스템 막대를 뺀 값) */
const measure = (e: KeyboardMetrics) =>
  Platform.OS === 'ios' ? Math.max(0, Dimensions.get('window').height - e.screenY) : e.height;

function update(next: number, e?: KeyboardEvent) {
  if (next === height) return;
  if (Platform.OS === 'ios' && e?.duration && next > 0) {
    const duration = Math.max(e.duration, 10);
    LayoutAnimation.configureNext({ duration, update: { duration, type: LayoutAnimation.Types[e.easing] ?? LayoutAnimation.Types.keyboard } });
  }
  height = next;
  for (const listener of listeners) listener();
}

function start() {
  // 듣기 전에 이미 떠 있었으면 그 자리에서 시작한다
  const metrics = Keyboard.isVisible() ? Keyboard.metrics() : undefined;
  height = metrics ? measure(metrics) : 0;
  subscriptions =
    Platform.OS === 'ios'
      ? [
          Keyboard.addListener('keyboardWillChangeFrame', (e) => update(measure(e.endCoordinates), e)),
          Keyboard.addListener('keyboardWillHide', (e) => update(0, e)),
        ]
      : [
          Keyboard.addListener('keyboardDidShow', (e) => update(measure(e.endCoordinates))),
          Keyboard.addListener('keyboardDidHide', () => update(0)),
        ];
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    for (const subscription of subscriptions) subscription.remove();
    subscriptions = [];
  };
}

const ignore = () => () => {};
const current = () => height;

/** 화면 키패드가 창 바닥을 덮은 높이. enabled 가 false 면 듣지 않고 0 */
export function useKeyboardHeight(enabled = true): number {
  const raw = useSyncExternalStore(enabled ? subscribe : ignore, current);
  // 안전 영역을 모르면(제공자가 없는 시험 환경) 0 으로 본다
  const insetBottom = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  if (!enabled || raw === 0) return 0;
  return Platform.OS === 'android' ? raw + insetBottom : raw;
}
