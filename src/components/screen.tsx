import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, ScreenPaddingX, Sizes, Spacing } from '@/constants/theme';

export type ScreenProps = {
  /** 화면 머리(NavBar). 스크롤되지 않는다 */
  nav?: ReactNode;
  children: ReactNode;
};

/** 모든 화면의 바탕. 종이색, 좌우 여백 24, 넓은 화면에서는 가운데 한 단. */
export function Screen({ nav, children }: ScreenProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.column}>
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
  root: { flex: 1, backgroundColor: Colors.paper, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: Sizes.maxContentWidth },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: ScreenPaddingX, paddingBottom: Spacing.lg, gap: Spacing.md },
});
