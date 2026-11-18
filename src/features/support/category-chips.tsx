import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Radius, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { INQUIRY_CATEGORIES, type InquiryCategory } from '@/lib/api';

export type CategoryChipsProps = {
  /** 고른 종류. 아직 고르지 않았으면 null */
  value: InquiryCategory | null;
  onChange: (category: InquiryCategory) => void;
  invalid?: boolean;
};

/** 문의 종류를 고르는 칩. 궁합의 관계 유형 칩과 같은 모양이고(고른 칩은 옅은 주색), 다섯 개라 줄을 넘기면 다음 줄로 간다. */
export function CategoryChips({ value, onChange, invalid = false }: CategoryChipsProps) {
  return (
    <View style={styles.row}>
      {INQUIRY_CATEGORIES.map((category) => {
        const on = category === value;
        return (
          <Pressable
            key={category}
            accessibilityRole="button"
            accessibilityLabel={strings.inquiry.categories[category]}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(category)}
            style={[styles.chip, invalid && styles.invalid, on && styles.on]}
          >
            <Txt variant="table" color={on ? 'ink' : 'gray'} style={on && styles.onText}>
              {strings.inquiry.categories[category]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    height: Sizes.chipHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.fill,
    borderRadius: Radius,
    borderWidth: LineWidth,
    borderColor: 'transparent',
  },
  invalid: { borderColor: Colors.danger },
  on: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  onText: { fontWeight: '700' },
});
