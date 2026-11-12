import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Radius, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { RELATIONS, type Relation } from '@/lib/api';

export type RelationChipsProps = {
  /** 고른 관계. 아직 고르지 않았으면 null */
  value: Relation | null;
  onChange: (relation: Relation) => void;
  invalid?: boolean;
};

/** 관계 유형(연애 · 친구 · 일 · 가족)을 고르는 칩 한 줄. 고른 칩은 옅은 초록 바탕과 초록 테두리다. */
export function RelationChips({ value, onChange, invalid = false }: RelationChipsProps) {
  return (
    <View style={styles.row}>
      {RELATIONS.map((relation) => {
        const on = relation === value;
        return (
          <Pressable
            key={relation}
            testID="relation-chip"
            accessibilityRole="button"
            accessibilityLabel={strings.synastry.relations[relation]}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(relation)}
            style={[styles.chip, invalid && styles.invalid, on && styles.on]}
          >
            <Txt variant="table" color={on ? 'ink' : 'gray'} style={on && styles.onText}>
              {strings.synastry.relations[relation]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.xs },
  chip: {
    flex: 1,
    height: Sizes.chipHeight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.fill,
    borderRadius: Radius,
    borderWidth: LineWidth,
    borderColor: 'transparent',
  },
  invalid: { borderColor: Colors.danger },
  on: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  onText: { fontWeight: '700' },
});
