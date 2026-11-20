import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, DimColor, Motion, ScreenPaddingX, SheetRadius, Sizes, Spacing } from '@/constants/theme';

export type SheetProps = {
  visible: boolean;
  /** 어두운 바깥을 누르거나, 시트를 아래로 끌어내리거나, 뒤로 가기를 했을 때 */
  onClose: () => void;
  /** 시트 맨 위 가운데의 제목 */
  title?: string;
  /** 제목과 내용 사이 · 내용끼리의 간격. 기본은 24 */
  gap?: number;
  /**
   * 시트의 높이를 정한다(태어난 곳: 화면에서 위 222 · 64 를 뺀 높이 — 안의 목록이 스스로 굴린다).
   * 없으면 내용만큼 늘어나되 화면 위 `Sizes.sheetTop` 은 남기고, 넘치면 시트 안에서 굴린다
   */
  height?: number;
  /** 굴리는 내용 밖, 시트 맨 아래 같은 자리에 둘 주 버튼(결정 061 의 5) */
  footer?: ReactNode;
  /** 아래 여백 없이 내용이 화면 바닥까지 닿는다(목록 아래 흐림이 바닥에 붙게) */
  flush?: boolean;
  children: ReactNode;
};

const OPEN_MS = Motion.openMs;
const CLOSE_MS = Motion.closeMs;
/** 이만큼 넘게 끌어내리고 놓으면 닫는다. 덜 끌면 제자리로 돌아간다 */
const DRAG_CLOSE_DISTANCE = 90;
/**
 * 위쪽에서 끌 수 있는 영역의 높이. 끄는 영역은 내용 위에 그려져 누르기를 다 가져가므로 내용을 덮지 않는다:
 * 제목이 있으면 손잡이 줄부터 제목 줄까지(위 여백 36 + 제목 28 + 간격 16), 없으면 내용이 시작하는 위 여백까지.
 */
const DRAG_AREA_HEIGHT = 80;
const DRAG_AREA_HEIGHT_UNTITLED = Spacing.xl;
const useNativeDriver = Platform.OS !== 'web';
const noCaret = (Platform.OS === 'web' ? { caretColor: 'transparent', outlineWidth: 0 } : {}) as ViewStyle;

/**
 * 화면을 옮기지 않고 아래에서 올라오는 시트. 아래와 양옆은 화면에 빈틈 없이 붙고 위쪽 모서리만 둥글다. 위에 손잡이 줄이 있다.
 * 뒤의 막은 제자리에서 서서히 어두워지고 시트만 올라온다. 위쪽을 잡고 아래로 끌어내리면 닫힌다.
 * 넓은 웹 화면에서도 앱 화면 폭 안에서만 어두워지고 올라온다.
 */
export function Sheet({ visible, onClose, title, gap, height, flush = false, footer, children }: SheetProps) {
  /** 닫히는 움직임이 끝나 화면에서 치웠는가 */
  const [hidden, setHidden] = useState(!visible);
  if (visible && hidden) setHidden(false);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  /** 손으로 끌어내린 거리 */
  const [drag] = useState(() => new Animated.Value(0));
  // 숨어 있을 때 내려가 있는 거리는 화면 높이(어떤 시트보다 길다), 내용만큼인 시트는 화면 위 sheetTop 을 남긴다
  const { height: windowHeight } = useWindowDimensions();
  // 굴리는 칸의 높이와 내용의 높이 — 내용이 넘칠 때만 굴린다(넘치지 않으면 안의 드럼 · 목록과 다투지 않게 굴리지 않는다)
  const [box, setBox] = useState({ view: 0, content: 0 });
  const overflows = box.content > box.view + 1;

  useEffect(() => {
    if (visible) {
      drag.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.bezier(...Motion.openCurve),
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

  const translateY = Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [windowHeight, 0] }), drag);
  const fixed = height !== undefined;
  const contentGap = gap ?? Spacing.lg;

  return (
    <Modal visible={!hidden} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.column}>
          <Animated.View style={[styles.dim, { opacity: progress }]}>
            {/* 키보드 포커스를 받지 않는다. 받으면 웹에서 화면 전체에 포커스 테두리가 그려진다 */}
            <Pressable testID="sheet-dim" focusable={false} tabIndex={-1} style={styles.dimPress} onPress={onClose} />
          </Animated.View>
          <Animated.View
            testID="sheet-panel"
            style={[
              styles.sheet,
              title ? styles.titled : null,
              gap !== undefined && { gap },
              fixed ? { height } : { maxHeight: windowHeight - Sizes.sheetTop },
              flush && styles.flush,
              { transform: [{ translateY }] },
            ]}>
            {title ? (
              <View style={styles.head}>
                <Txt variant="sheetTitle" style={styles.title}>
                  {title}
                </Txt>
              </View>
            ) : null}
            {fixed ? (
              children
            ) : (
              <ScrollView
                testID="sheet-scroll"
                style={styles.scroll}
                contentContainerStyle={{ gap: contentGap }}
                scrollEnabled={overflows}
                bounces={false}
                onLayout={(e) => {
                  const view = e.nativeEvent.layout.height;
                  setBox((b) => (b.view === view ? b : { ...b, view }));
                }}
                onContentSizeChange={(_, content) => setBox((b) => (b.content === content ? b : { ...b, content }))}>
                {children}
              </ScrollView>
            )}
            {footer ? <View testID="sheet-footer">{footer}</View> : null}
            <View testID="sheet-drag" style={[styles.dragArea, !title && styles.dragAreaUntitled]} {...pan.panHandlers}>
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
    paddingBottom: Sizes.stepBottom,
    gap: Spacing.lg,
  },
  /** 제목이 있는 시트: 손잡이(위 10 + 4)와 제목 사이 22(결정 042 시안) */
  titled: { paddingTop: Sizes.sheetTitleTop },
  flush: { paddingBottom: 0 },
  /** 내용만큼 줄고 늘되, 시트의 최대 높이를 넘으면 그 안에서 굴린다 */
  scroll: { flexGrow: 0, flexShrink: 1 },
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
  dragAreaUntitled: { height: DRAG_AREA_HEIGHT_UNTITLED },
  handle: {
    marginTop: 10,
    width: Sizes.handleWidth,
    height: Sizes.handleHeight,
    borderRadius: Sizes.handleHeight,
    backgroundColor: Colors.handle,
  },
  head: { justifyContent: 'center' },
  title: { textAlign: 'center' },
});
