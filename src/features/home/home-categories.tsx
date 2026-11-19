import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const M = strings.main;
const PER_ROW = 4;
type Category = (typeof M.categories)[number];

/** 홈에서 갈 수 있는 화면. 아직 없는 기능의 항목은 path 가 null 이다 */
export type HomePath =
  | '/reading'
  | '/chart'
  | '/report'
  | '/report?area=RELATIONSHIP'
  | '/direction'
  | '/synastry'
  | '/synastry/ranking'
  | '/report?area=TIMING';

export type HomeCategoriesProps = {
  onOpen: (path: HomePath) => void;
};

/**
 * 홈의 카테고리(나 · 관계 · 궁합 · 시기, 결정 019 · 021). 아이콘과 그 아래 이름만 있는 타일을 한 줄에 넷씩, 양끝을 화면 여백에 맞춰 놓는다.
 * 타일을 누르면 그 칸의 항목이 아래 시트로 올라온다. 항목이 모두 준비 중인 칸은 흐리게 그리고 누를 수 없다.
 */
export function HomeCategories({ onOpen }: HomeCategoriesProps) {
  const [opened, setOpened] = useState<Category | null>(null);
  /** 시트가 닫히는 동안에도 내용이 남아 있게, 마지막으로 연 칸을 따로 둔다 */
  const [shown, setShown] = useState<Category | null>(null);

  // 한 줄에 넷씩 끊는다. 마지막 줄이 모자라면 빈 자리로 채워 앞줄과 세로로 맞춘다.
  const rows: (Category | null)[][] = [];
  for (let i = 0; i < M.categories.length; i += PER_ROW) {
    const row: (Category | null)[] = M.categories.slice(i, i + PER_ROW);
    while (row.length < PER_ROW) row.push(null);
    rows.push(row);
  }

  function open(category: Category) {
    setShown(category);
    setOpened(category);
  }

  return (
    <View style={styles.root}>
      {rows.map((row, index) => (
        <View key={index} testID="home-category-row" style={styles.row}>
          {row.map((category, slot) => {
            if (!category) return <View key={slot} style={styles.tile} />;
            const soon = category.items.every((item) => item.path === null);
            return (
              <Pressable
                key={category.key}
                testID="home-category"
                accessibilityRole="button"
                accessibilityLabel={category.title}
                accessibilityState={{ disabled: soon }}
                disabled={soon}
                hitSlop={Spacing.sm}
                onPress={() => open(category)}
                style={styles.tile}
              >
                <View testID="home-category-icon" style={styles.icon}>
                  <CategoryIcon name={category.key} color={soon ? Colors.muted : Colors.ink} />
                </View>
                <Txt variant="table" color={soon ? 'muted' : 'ink'}>
                  {category.title}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      ))}

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
  root: { paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  // 한 줄의 양끝을 화면 여백에 맞춘다: 첫 아이콘의 왼쪽 끝이 머리의 표식과 같은 선에 온다.
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  // 타일의 너비는 아이콘과 같다. 이름은 그 가운데에 놓이고 넘쳐도 된다.
  tile: { width: Sizes.categoryIcon, alignItems: 'center', gap: Spacing.xs, overflow: 'visible' },
  // 바탕도 좌우 여백도 없다. 누르는 자리는 hitSlop 으로 넓힌다.
  icon: { width: Sizes.categoryIcon, height: Sizes.categoryIcon },
  item: {
    height: Sizes.listRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.hair,
  },
  itemOn: { fontWeight: FontWeight.medium },
});
