import { StyleSheet } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Spacing } from '@/constants/theme';

export type SectionLabelProps = {
  children: string;
  /** 아래에 먹 선을 그어 구역의 시작을 표시한다 */
  rule?: boolean;
};

/** 구역 위의 작은 회색 라벨. */
export function SectionLabel({ children, rule = false }: SectionLabelProps) {
  return (
    <Txt variant="label" color="gray" style={rule && styles.rule}>
      {children}
    </Txt>
  );
}

const styles = StyleSheet.create({
  rule: { paddingBottom: Spacing.xxs, borderBottomWidth: LineWidth, borderBottomColor: Colors.ink },
});
