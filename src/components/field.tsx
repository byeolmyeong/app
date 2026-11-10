import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';

export type FieldProps = {
  label: string;
  /** 오른쪽 끝의 작은 도움말 */
  hint?: string;
  /** 있으면 도움말 대신 인주색으로 보여 준다 */
  error?: string;
  /** 묶음의 첫 줄이면 위에 먹 선을 긋는다 */
  first?: boolean;
  /** 값. 글자면 그대로 그리고, 입력 부품을 넣어도 된다 */
  children: ReactNode;
};

/** 라벨 · 값 · 도움말이 한 줄인 입력 줄. 아래에 옅은 선. */
export function Field({ label, hint, error, first = false, children }: FieldProps) {
  return (
    <View style={[styles.row, first && styles.first]}>
      <Txt variant="label" color="gray" style={styles.label}>
        {label}
      </Txt>
      <View style={styles.value}>
        {typeof children === 'string' ? <Txt variant="body">{children}</Txt> : children}
      </View>
      {error ? (
        <Txt variant="label" color="seal">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="label" color="gray">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.hair,
  },
  first: { borderTopWidth: LineWidth, borderTopColor: Colors.ink },
  label: { width: Sizes.fieldLabelWidth },
  value: { flex: 1 },
});
