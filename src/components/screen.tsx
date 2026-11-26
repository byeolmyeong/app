import { useContext, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, SafeAreaView } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '@/components/use-keyboard-height';
import { Colors, LineWidth, ScreenPaddingX, Sizes, Spacing } from '@/constants/theme';

export type ScreenProps = {
  /** 화면 머리(NavBar). 스크롤되지 않는다 */
  nav?: ReactNode;
  /** 화면 아래에 붙는 것(아래 탭). 스크롤되지 않는다 */
  footer?: ReactNode;
  /** false 면 굴리지 않고 children 이 남은 칸을 채운다. 좌우 여백도 children 이 정한다(소개 · 로그인 · 가입 단계) */
  scroll?: boolean;
  /** 있으면 아래 안전 영역 대신 둘 중 큰 쪽(안전 영역 · 이 값)만큼 띄운다(시안의 바닥 여백) */
  bottomInset?: number;
  /**
   * true 면 화면 키패드가 떠 있는 동안 아래 안전 영역(또는 bottomInset) 대신 키패드가 덮은 높이만큼 띄운다 —
   * 맨 아래 주 버튼이 키패드 바로 위에 온다. 버튼과 키패드 사이(Sizes.keyboardGap)는 버튼 칸이 둔다(결정 085)
   */
  avoidKeyboard?: boolean;
  children: ReactNode;
};

/**
 * 모든 화면의 바탕. 어두운 바탕색(Colors.paper), 좌우 여백 20.
 * 넓은 웹 화면에서는 가운데에 앱 화면 폭의 한 단만 보이고, 그 밖은 한 단 어두운 색(canvas)이며 옅은 선으로 나뉜다.
 */
export function Screen({ nav, footer, scroll = true, bottomInset, avoidKeyboard = false, children }: ScreenProps) {
  // 화면 폭은 그린 뒤에 잰다. 서버가 먼저 그린 것과 달라지지 않게 처음에는 좁은 화면으로 본다.
  const [wide, setWide] = useState(false);
  // 안전 영역을 모르면(제공자가 없는 시험 환경) 0 으로 본다
  const insetBottom = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const keyboard = useKeyboardHeight(avoidKeyboard);
  const bottom =
    keyboard > 0
      ? { paddingBottom: keyboard }
      : bottomInset === undefined
        ? undefined
        : { paddingBottom: Math.max(insetBottom, bottomInset) };
  return (
    <View style={styles.root} onLayout={(e) => setWide(e.nativeEvent.layout.width > Sizes.maxContentWidth)}>
      <SafeAreaView
        edges={bottom ? ['top', 'left', 'right'] : undefined}
        style={[styles.column, wide && styles.framed, bottom]}>
        {nav}
        {scroll ? (
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={styles.scroll}>{children}</View>
        )}
        {footer}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: Sizes.maxContentWidth, backgroundColor: Colors.paper },
  /** 넓은 웹 화면에서 앱 화면과 바깥을 나누는 옅은 선 */
  framed: { borderLeftWidth: LineWidth, borderRightWidth: LineWidth, borderColor: Colors.hair },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: ScreenPaddingX, paddingBottom: Spacing.lg, gap: Spacing.md },
});
