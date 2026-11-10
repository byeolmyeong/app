import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Spacing } from '@/constants/theme';

export type TabsProps<K extends string> = {
  tabs: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
};

/** 글자 탭. 고른 탭은 먹색 굵은 글씨와 밑줄, 나머지는 회색. */
export function Tabs<K extends string>({ tabs, value, onChange }: TabsProps<K>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const on = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, on && styles.on]}>
            <Txt variant="table" color={on ? 'ink' : 'gray'} style={on && styles.onText}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.md, borderBottomWidth: LineWidth, borderBottomColor: Colors.ink },
  tab: { paddingVertical: Spacing.xs, borderBottomWidth: LineWidth * 2, borderBottomColor: 'transparent' },
  on: { borderBottomColor: Colors.ink },
  onText: { fontWeight: '800' },
});
