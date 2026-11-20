import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, InquiryLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { INQUIRY_CATEGORIES, type InquiryCategory } from '@/lib/api';

export type CategoryChipsProps = {
  /** 고른 종류. 아직 고르지 않았으면 null */
  value: InquiryCategory | null;
  onChange: (category: InquiryCategory) => void;
};

/** 문의 종류 칩 넷(결정 058, 보드 16-8): 한 줄에 같은 폭, 고른 칩은 밝은 바탕에 어두운 글자, 나머지는 떠 있는 면에 회색 글자 */
export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {INQUIRY_CATEGORIES.map((category) => {
        const on = category === value;
        return (
          <Pressable
            key={category}
            accessibilityRole="radio"
            accessibilityLabel={strings.inquiry.categories[category]}
            accessibilityState={{ selected: on, checked: on }}
            onPress={() => onChange(category)}
            style={[styles.chip, on ? styles.on : styles.off]}>
            <Txt variant="table" color={on ? 'paper' : 'gray'} style={on ? styles.onText : null}>
              {strings.inquiry.categories[category]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: L.category.gap },
  chip: { flex: 1, height: L.category.height, borderRadius: L.category.radius, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: Colors.ink },
  off: { backgroundColor: Colors.raised },
  onText: { fontWeight: FontWeight.semibold },
});
