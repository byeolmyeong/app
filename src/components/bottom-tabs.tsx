import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

export type BottomTab<K extends string> = {
  key: K;
  label: string;
  /** 색을 받아 아이콘을 그린다. 고른 탭은 본문색(ink), 나머지는 흐린 색 */
  icon: (color: string) => ReactNode;
};

export type BottomTabsProps<K extends string> = {
  tabs: BottomTab<K>[];
  value: K;
  /** 지금 있는 탭이 아닌 것을 눌렀을 때 */
  onChange: (key: K) => void;
  /** 지금 있는 탭을 다시 눌렀을 때(탭 안에서 들어간 화면이면 그 탭의 첫 화면으로). 없으면 아무 일도 없다 */
  onReselect?: (key: K) => void;
};

/** 화면 아래의 탭 줄. 아이콘과 이름이 한 벌이고 화면 폭을 탭 수로 똑같이 나눈다. */
export function BottomTabs<K extends string>({ tabs, value, onChange, onReselect }: BottomTabsProps<K>) {
  return (
    <View testID="bottom-tabs" style={styles.bar} accessibilityRole="tablist" accessibilityLabel={strings.common.bottomTabsLabel}>
      {tabs.map((tab) => {
        const on = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) onChange(tab.key);
              else onReselect?.(tab.key);
            }}
            style={styles.tab}
          >
            {tab.icon(on ? Colors.ink : Colors.hint)}
            <Txt variant="badge" color={on ? 'ink' : 'hint'} style={!on && styles.off}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.paper,
    borderTopWidth: LineWidth,
    borderTopColor: Colors.hair,
  },
  tab: { flex: 1, height: Sizes.tabBarHeight, alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs / 2 },
  /** 탭 이름은 11/15(시안 11) — 고른 탭은 600, 나머지는 500 */
  off: { fontWeight: FontWeight.medium },
});
