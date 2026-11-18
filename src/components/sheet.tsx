import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, DimColor, ScreenPaddingX, SheetRadius, Sizes, Spacing } from '@/constants/theme';

export type SheetProps = {
  visible: boolean;
  /** 어두운 바깥을 누르거나, 시트를 아래로 끌어내리거나, 뒤로 가기를 했을 때 */
  onClose: () => void;
  /** 시트 맨 위 가운데의 제목 */
  title?: string;
  children: ReactNode;
};

const OPEN_MS = 300;
const CLOSE_MS = 220;
/** 시트가 숨어 있을 때 아래로 내려가 있는 거리. 어떤 시트보다도 길면 된다 */
const HIDDEN_OFFSET = 720;
/** 이만큼 넘게 끌어내리고 놓으면 닫는다. 덜 끌면 제자리로 돌아간다 */
const DRAG_CLOSE_DISTANCE = 90;
/** 위쪽에서 끌 수 있는 영역의 높이. 손잡이 줄부터 제목 줄까지 덮는다(그 아래는 드럼롤처럼 굴리는 것이 있어 넓히지 않는다) */
const DRAG_AREA_HEIGHT = 80;
const useNativeDriver = Platform.OS !== 'web';
const noCaret = (Platform.OS === 'web' ? { caretColor: 'transparent', outlineWidth: 0 } : {}) as ViewStyle;

/**
 * 화면을 옮기지 않고 아래에서 올라오는 시트. 아래와 양옆은 화면에 빈틈 없이 붙고 위쪽 모서리만 둥글다. 위에 손잡이 줄이 있다.
 * 뒤의 막은 제자리에서 서서히 어두워지고 시트만 올라온다. 위쪽을 잡고 아래로 끌어내리면 닫힌다.
 * 넓은 웹 화면에서도 앱 화면 폭 안에서만 어두워지고 올라온다.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  /** 닫히는 움직임이 끝나 화면에서 치웠는가 */
  const [hidden, setHidden] = useState(!visible);
  if (visible && hidden) setHidden(false);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  /** 손으로 끌어내린 거리 */
  const [drag] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      drag.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.ease),
      useNativeDriver,
    }).start(({ finished }) => {
      if (finished) setHidden(true);
    });
  }, [visible, progress, drag]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)), // 아래로만 따라간다
        onPanResponderRelease: (_, g) => {
          if (g.dy > DRAG_CLOSE_DISTANCE) onClose();
          else Animated.timing(drag, { toValue: 0, duration: CLOSE_MS, useNativeDriver }).start();
        },
        onPanResponderTerminate: () =>
          Animated.timing(drag, { toValue: 0, duration: CLOSE_MS, useNativeDriver }).start(),
      }),
    [drag, onClose],
  );

  const translateY = Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [HIDDEN_OFFSET, 0] }), drag);

  return (
    <Modal visible={!hidden} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.column}>
          <Animated.View style={[styles.dim, { opacity: progress }]}>
            {/* 키보드 포커스를 받지 않는다. 받으면 웹에서 화면 전체에 포커스 테두리가 그려진다 */}
            <Pressable testID="sheet-dim" focusable={false} tabIndex={-1} style={styles.dimPress} onPress={onClose} />
          </Animated.View>
          <Animated.View testID="sheet-panel" style={[styles.sheet, { transform: [{ translateY }] }]}>
            {title ? (
              <View style={styles.head}>
                <Txt variant="heading" style={styles.title}>
                  {title}
                </Txt>
              </View>
            ) : null}
            {children}
            <View testID="sheet-drag" style={styles.dragArea} {...pan.panHandlers}>
              <View testID="sheet-handle" style={styles.handle} />
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 웹에서 시트가 포커스를 받으면 글자 커서가 깜빡인다. 치는 칸이 없으므로 커서를 숨긴다.
  root: { flex: 1, alignItems: 'center', ...noCaret },
  column: { flex: 1, width: '100%', maxWidth: Sizes.maxContentWidth, justifyContent: 'flex-end', overflow: 'hidden' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: DimColor },
  dimPress: { flex: 1, outlineWidth: 0 },
  sheet: {
    backgroundColor: Colors.raised,
    borderTopLeftRadius: SheetRadius,
    borderTopRightRadius: SheetRadius,
    paddingHorizontal: ScreenPaddingX,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  /** 시트 맨 위의, 잡고 끌 수 있는 영역 */
  dragArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: DRAG_AREA_HEIGHT,
    alignItems: 'center',
    cursor: 'grab',
  },
  handle: {
    marginTop: 10,
    width: Sizes.handleWidth,
    height: Sizes.handleHeight,
    borderRadius: Sizes.handleHeight,
    backgroundColor: Colors.muted,
  },
  head: { justifyContent: 'center' },
  title: { textAlign: 'center' },
});
