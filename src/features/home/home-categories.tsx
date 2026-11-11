import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Sheet } from '@/components/sheet';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const M = strings.main;
type Category = (typeof M.categories)[number];

/** 홈에서 갈 수 있는 화면. 아직 없는 기능의 항목은 path 가 null 이다 */
export type HomePath = '/reading' | '/chart';

export type HomeCategoriesProps = {
  /** 넣어 둔 출생 정보 한 줄(예: "2000. 6. 15. 오후 9:00 · 서울특별시 마포구") */
  birthSummary: string;
  onOpen: (path: HomePath) => void;
  onEditBirth: () => void;
};

/**
 * 홈의 카테고리(나 · 관계 · 궁합 · 시기, 결정 019). 아이콘과 이름이 한 벌인 타일을 한 줄에 둘씩 놓는다.
 * 타일을 누르면 그 칸의 항목이 아래 시트로 올라온다. 항목이 모두 준비 중인 칸은 타일에 표시하고 누를 수 없다.
 */
export function HomeCategories({ birthSummary, onOpen, onEditBirth }: HomeCategoriesProps) {
  const [opened, setOpened] = useState<Category | null>(null);
  /** 시트가 닫히는 동안에도 내용이 남아 있게, 마지막으로 연 칸을 따로 둔다 */
  const [shown, setShown] = useState<Category | null>(null);

  function open(category: Category) {
    setShown(category);
    setOpened(category);
  }

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Txt variant="display">{M.title}</Txt>
        <Txt variant="table" color="gray">
          {birthSummary}
        </Txt>
        <TextLink label={M.editBirth} onPress={onEditBirth} />
      </View>
      <View style={styles.grid}>
        {M.categories.map((category) => {
          const soon = category.items.every((item) => item.path === null);
          return (
            <View key={category.key} testID="home-category-cell" style={styles.cell}>
              <Pressable
                testID="home-category"
                accessibilityRole="button"
                accessibilityLabel={category.title}
                accessibilityState={{ disabled: soon }}
                disabled={soon}
                onPress={() => open(category)}
                style={styles.tile}
              >
                <View style={styles.tileTop}>
                  <View testID="home-category-icon" style={styles.icon}>
                    <CategoryIcon name={category.key} color={soon ? Colors.muted : Colors.ink} />
                  </View>
                  {soon ? (
                    <View testID="home-category-soon" style={styles.tag}>
                      <Txt variant="label" color="gray">
                        {M.soon}
                      </Txt>
                    </View>
                  ) : null}
                </View>
                <View style={styles.tileText}>
                  <Txt variant="heading" color={soon ? 'hint' : 'ink'}>
                    {category.title}
                  </Txt>
                  <Txt variant="label" color={soon ? 'muted' : 'gray'}>
                    {category.caption}
                  </Txt>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Sheet visible={opened !== null} onClose={() => setOpened(null)} title={shown?.title}>
        <View>
          {shown?.items.map((item) => {
            const path = item.path as HomePath | null;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: path === null }}
                disabled={path === null}
                onPress={() => {
                  if (!path) return;
                  setOpened(null);
                  onOpen(path);
                }}
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
                ) : (
                  <Txt variant="label" color="muted">
                    {M.soon}
                  </Txt>
                )}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

/** 칸마다의 선 아이콘: 나(사람) · 관계(마음) · 궁합(겹친 두 원) · 시기(시계). */
function CategoryIcon({ name, color }: { name: Category['key']; color: string }) {
  const stroke = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  } as const;
  return (
    <Svg width={Sizes.categoryIcon} height={Sizes.categoryIcon} viewBox="0 0 24 24" fill="none">
      {name === 'me' ? (
        <>
          <Circle cx={12} cy={8} r={3.5} {...stroke} />
          <Path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" {...stroke} />
        </>
      ) : null}
      {name === 'relation' ? (
        <Path d="M12 20s-7-4.4-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.6 12 20 12 20z" {...stroke} />
      ) : null}
      {name === 'synastry' ? (
        <>
          <Circle cx={9} cy={12} r={5.5} {...stroke} />
          <Circle cx={15} cy={12} r={5.5} {...stroke} />
        </>
      ) : null}
      {name === 'timing' ? (
        <>
          <Circle cx={12} cy={12} r={8} {...stroke} />
          <Path d="M12 7.5V12l3 2" {...stroke} />
        </>
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.md, paddingBottom: Spacing.lg },
  head: { gap: Spacing.xs, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  // 타일을 같은 너비로 한 줄에 둘씩. 타일 사이는 칸의 안쪽 여백으로 띄운다.
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -Spacing.xs / 2 },
  cell: { width: '50%', padding: Spacing.xs / 2 },
  tile: {
    backgroundColor: Colors.fill,
    borderRadius: CardRadius,
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  icon: {
    width: Sizes.categoryIconBox,
    height: Sizes.categoryIconBox,
    borderRadius: Sizes.categoryIconBox / 2,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { gap: Spacing.xxs / 2 },
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
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.hair,
  },
  itemOn: { fontWeight: '500' },
});
