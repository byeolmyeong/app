import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';

/** 구역의 제목 한 줄. 제목 바로 옆에 설명 버튼 같은 작은 것을 둘 수 있다. */
export function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Txt variant="heading">{title}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
