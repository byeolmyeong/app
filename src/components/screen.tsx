import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, LineWidth, ScreenPaddingX, Sizes, Spacing } from '@/constants/theme';

export type ScreenProps = {
  /** 화면 머리(NavBar). 스크롤되지 않는다 */
  nav?: ReactNode;
  children: ReactNode;
};

/**
 * 모든 화면의 바탕. 흰색, 좌우 여백 20.
 * 넓은 웹 화면에서는 가운데에 앱 화면 폭의 한 단만 보이고, 그 밖은 흰색이며 옅은 선으로 나뉜다.
 */
export function Screen({ nav, children }: ScreenProps) {
  // 화면 폭은 그린 뒤에 잰다. 서버가 먼저 그린 것과 달라지지 않게 처음에는 좁은 화면으로 본다.
  const [wide, setWide] = useState(false);
  return (
    <View style={styles.root} onLayout={(e) => setWide(e.nativeEvent.layout.width > Sizes.maxContentWidth)}>
      <SafeAreaView style={[styles.column, wide && styles.framed]}>
        {nav}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
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
