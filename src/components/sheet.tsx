import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Colors, DimColor, LineWidth, ScreenPaddingX, Sizes, Spacing } from '@/constants/theme';

export type SheetProps = {
  visible: boolean;
  /** 어두운 바깥을 누르거나 뒤로 가기를 했을 때 */
  onClose: () => void;
  children: ReactNode;
};

/** 화면을 옮기지 않고 아래에서 올라오는 시트. 모서리를 둥글리지 않는다. */
export function Sheet({ visible, onClose, children }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* 넓은 웹 화면에서도 앱 화면 폭 안에서만 어두워지고 올라온다 */}
        <View style={styles.column}>
          <Pressable testID="sheet-dim" accessibilityRole="button" style={styles.dim} onPress={onClose} />
          <View style={styles.sheet}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: Sizes.maxContentWidth, justifyContent: 'flex-end' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: DimColor },
  sheet: {
    backgroundColor: Colors.paper,
    borderTopWidth: LineWidth * 1.5,
    borderTopColor: Colors.ink,
    paddingHorizontal: ScreenPaddingX,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
});
