import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, Sizes } from '@/constants/theme';

export type ScrollPickerItem<V extends string | number> = { value: V; label: string };

export type ScrollPickerProps<V extends string | number> = {
  items: ScrollPickerItem<V>[];
  value: V;
  onChange: (value: V) => void;
  /** 끝에서 처음으로 이어지게 한다(시·분처럼 한 바퀴 도는 값). 목록을 앞뒤로 한 벌씩 더 그린다 */
  loop?: boolean;
  /** 열의 너비. 기본은 `Sizes.pickerWidth` */
  width?: number;
  /** 가운데 줄 뒤의 띠를 이 열에 그린다. 여러 열을 한 띠로 묶을 때는 끄고 부모가 그린다 */
  band?: boolean;
  /** 줄마다 `${testID}-${value}`, 굴리는 영역에 `${testID}-scroll` 로 붙는다. loop 이면 가운데 벌의 줄에만 붙는다 */
  testID?: string;
};

const ROW = Sizes.pickerRow;
const PAD = ROW * Math.floor(Sizes.pickerRows / 2);
/** loop: 굴리다 멈춘 뒤 이만큼 지나면 가운데 벌로 옮긴다 */
const SETTLE_MS = 120;
/** 마우스를 이만큼 넘게 움직이면 누른 것이 아니라 끈 것으로 본다 */
const DRAG_SLOP = 4;
/** 가운데에서 멀어질수록 흐리게(가운데 · 한 줄 · 두 줄 이상, 결정 042 시안) */
const FADE = [1, 0.45, 0.2];

const isWeb = Platform.OS === 'web';
// 웹에서는 브라우저의 스크롤 맞춤으로 줄에 딱 멈추게 한다(React Native 의 snapToInterval 은 웹에 없다).
const webSnap = (isWeb ? { scrollSnapType: 'y mandatory' } : {}) as ViewStyle;
const webSnapRow = (isWeb ? { scrollSnapAlign: 'center' } : {}) as ViewStyle;
const webGrab = (isWeb ? { cursor: 'grab', userSelect: 'none' } : {}) as ViewStyle;

type MouseLike = { clientY: number; preventDefault?: () => void };

/**
 * 드럼롤 선택 한 열. 위아래로 굴리면 가운데 줄이 골라지고, 줄을 눌러도 골라진다.
 * 웹에서는 마우스 휠로 굴리거나 마우스로 잡고 끌어도 된다.
 */
export function ScrollPicker<V extends string | number>({
  items,
  value,
  onChange,
  loop = false,
  width = Sizes.pickerWidth,
  band = true,
  testID,
}: ScrollPickerProps<V>) {
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offset = useRef(0);
  /** 마우스로 끄는 중의 시작 위치. 끌고 있지 않으면 null */
  const mouse = useRef<{ y: number; offset: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const count = items.length;
  /** 그리는 줄. loop 이면 같은 목록 세 벌이고 가운데 벌에서 시작한다 */
  const rows = loop ? [...items, ...items, ...items] : items;
  const base = loop ? count : 0;
  /** 가운데 벌에서 고른 값이 놓인 줄 */
  const selected =
    base +
    Math.max(
      0,
      items.findIndex((item) => item.value === value),
    );
  const [center, setCenter] = useState(selected);
  /** 처음 자리. 굴리는 동안 값이 바뀌어도 바꾸지 않는다 — 바뀌면 iOS 가 굴리던 판을 그 자리로 옮겨 손가락 밑에서 튄다 */
  const [startOffset] = useState(() => ({ x: 0, y: selected * ROW }));
  const clamp = (index: number) => Math.min(rows.length - 1, Math.max(0, index));
  const valueAt = (index: number) => items[index % count].value;

  /** loop: 앞뒤 벌에 멈췄으면 같은 값의 가운데 벌 줄로 소리 없이 옮겨, 어느 쪽으로든 계속 굴릴 수 있게 한다 */
  function recenter(index: number) {
    if (!loop) return;
    const middle = count + (index % count);
    if (middle === index) return;
    ref.current?.scrollTo({ y: middle * ROW, animated: false });
    offset.current = middle * ROW;
    setCenter(middle);
  }

  // 처음 열릴 때 고른 줄이 가운데에 오게 한다.
  useEffect(() => {
    offset.current = selected * ROW;
    const timer = setTimeout(() => ref.current?.scrollTo({ y: selected * ROW, animated: false }), 0);
    return () => {
      clearTimeout(timer);
      if (settle.current) clearTimeout(settle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만 맞춘다
  }, []);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    offset.current = e.nativeEvent.contentOffset.y;
    const index = clamp(Math.round(offset.current / ROW));
    setCenter(index);
    if (settle.current) clearTimeout(settle.current);
    if (mouse.current) return; // 끄는 동안은 정하지 않는다. 놓을 때 정한다
    // 가운데 줄의 값을 바로 알린다 — 멈추기를 기다리면 빠르게 굴리고 곧바로 "확인" 을 누를 때 옛 값을 저장한다
    if (valueAt(index) !== value) onChange(valueAt(index));
    settle.current = setTimeout(() => recenter(index), SETTLE_MS);
  }

  function select(index: number) {
    ref.current?.scrollTo({ y: index * ROW, animated: true });
    setCenter(index);
    onChange(valueAt(index));
  }

  function onPressRow(index: number) {
    // 끌다가 놓은 자리의 줄이 눌린 것으로 잡히지 않게 한다
    if (mouse.current?.moved) return;
    select(index);
  }

  // 웹: 마우스로 잡고 끌어 굴린다. 놓으면 가장 가까운 줄에 맞춘다.
  const mouseHandlers = isWeb
    ? {
        onMouseDown: (e: MouseLike) => {
          mouse.current = { y: e.clientY, offset: offset.current, moved: false };
        },
        onMouseMove: (e: MouseLike) => {
          const start = mouse.current;
          if (!start) return;
          const dy = e.clientY - start.y;
          if (!start.moved && Math.abs(dy) < DRAG_SLOP) return;
          if (!start.moved) {
            start.moved = true;
            setDragging(true);
          }
          e.preventDefault?.();
          ref.current?.scrollTo({ y: start.offset - dy, animated: false });
        },
        onMouseUp: endMouseDrag,
        onMouseLeave: endMouseDrag,
      }
    : {};

  function endMouseDrag() {
    const start = mouse.current;
    if (!start) return;
    if (start.moved) {
      setDragging(false);
      select(clamp(Math.round(offset.current / ROW)));
      // 같은 누름에서 따라오는 줄 누름을 무시한 뒤에 지운다
      setTimeout(() => {
        mouse.current = null;
      }, 0);
    } else {
      mouse.current = null;
    }
  }

  return (
    <View style={[styles.column, { width }, webGrab]} {...mouseHandlers}>
      {band ? <View pointerEvents="none" style={styles.band} /> : null}
      <ScrollView
        ref={ref}
        testID={testID ? `${testID}-scroll` : undefined}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentOffset={startOffset}
        contentContainerStyle={styles.content}
        // 끄는 동안은 줄 맞춤을 꺼야 마우스를 그대로 따라온다
        style={dragging ? undefined : webSnap}>
        {rows.map((item, index) => (
          <Pressable
            key={`${Math.floor(index / count)}-${item.value}`}
            testID={testID && index >= base && index < base + count ? `${testID}-${item.value}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected: index === center }}
            onPress={() => onPressRow(index)}
            style={[styles.row, webSnapRow]}>
            <Txt
              variant={index === center ? 'pickerOn' : 'picker'}
              numberOfLines={1}
              style={{ opacity: FADE[Math.min(FADE.length - 1, Math.abs(index - center))] }}>
              {item.label}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { height: ROW * Sizes.pickerRows },
  /** 가운데 줄 뒤의 옅은 띠 */
  band: {
    position: 'absolute',
    top: PAD,
    left: 0,
    right: 0,
    height: ROW,
    borderRadius: Sizes.pickerBandRadius,
    backgroundColor: Colors.sheetFill,
  },
  content: { paddingVertical: PAD },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
});
