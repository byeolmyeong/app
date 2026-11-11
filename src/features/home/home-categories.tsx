import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const M = strings.main;

/** 홈에서 갈 수 있는 화면. 아직 없는 기능의 항목은 path 가 null 이다 */
export type HomePath = '/reading' | '/chart';

export type HomeCategoriesProps = {
  /** 넣어 둔 출생 정보 한 줄(예: "2000. 6. 15. 오후 9:00 · 서울특별시 마포구") */
  birthSummary: string;
  onOpen: (path: HomePath) => void;
  onEditBirth: () => void;
};

/**
 * 홈의 카테고리 네 칸(나 · 관계 · 궁합 · 시기, 결정 019). 있는 기능의 항목만 누를 수 있고,
 * 아직 없는 기능은 "준비 중" 으로 미리 보여 준다. 항목이 모두 준비 중인 칸은 칸 머리에 표시한다.
 */
export function HomeCategories({ birthSummary, onOpen, onEditBirth }: HomeCategoriesProps) {
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Txt variant="display">{M.title}</Txt>
        <Txt variant="table" color="gray">
          {birthSummary}
        </Txt>
        <TextLink label={M.editBirth} onPress={onEditBirth} />
      </View>
      {M.categories.map((category) => {
        const allSoon = category.items.every((item) => item.path === null);
        return (
          <View key={category.title} testID="home-category" accessibilityLabel={category.title} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.cardTitle}>
                <Txt variant="heading">{category.title}</Txt>
                <Txt variant="label" color="gray">
                  {category.caption}
                </Txt>
              </View>
              {allSoon ? (
                <View testID="home-category-soon" style={styles.tag}>
                  <Txt variant="label" color="gray">
                    {M.soon}
                  </Txt>
                </View>
              ) : null}
            </View>
            {category.items.map((item) => {
              const path = item.path as HomePath | null;
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: path === null }}
                  disabled={path === null}
                  onPress={() => path && onOpen(path)}
                  style={styles.item}
                >
                  <Txt variant="body" color={path ? 'ink' : 'muted'} style={path ? styles.itemOn : undefined}>
                    {item.label}
                  </Txt>
                  {path ? (
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M9 6l6 6-6 6"
                        stroke={Colors.hint}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  ) : allSoon ? null : (
                    <Txt variant="label" color="muted">
                      {M.soon}
                    </Txt>
                  )}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.md, paddingBottom: Spacing.lg },
  head: { gap: Spacing.xs, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  card: {
    backgroundColor: Colors.fill,
    borderRadius: CardRadius,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  cardTitle: { gap: Spacing.xxs / 2 },
  tag: {
    backgroundColor: Colors.hair,
    borderRadius: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs / 2,
  },
  item: {
    height: Sizes.listRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: LineWidth,
    borderTopColor: Colors.hair,
  },
  itemOn: { fontWeight: '500' },
});
