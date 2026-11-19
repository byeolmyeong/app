import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { GlowShape, useSvgIds, type GlowShapeName } from '@/components/glow';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, Sizes, Spacing } from '@/constants/theme';
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
                  <CategoryTile name={category.key} soon={soon} />
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

/** 칸마다의 빛나는 모양(결정 035): 나 별 · 관계 불꽃 · 궁합 하트 · 시기 달. 카드는 칸마다 조금씩 기운다 */
const SHAPE: Record<Category['key'], GlowShapeName> = { me: 'star', relation: 'flame', synastry: 'heart', timing: 'moon' };
const TILT: Record<Category['key'], number> = { me: -4, relation: 3, synastry: -3, timing: 4 };

/** 검은 카드 위의 빛나는 모양. 준비 중인 칸은 빛 없이 흐리게 */
function CategoryTile({ name, soon }: { name: Category['key']; soon: boolean }) {
  const ids = useSvgIds();
  const fill = `tile${ids.halo}`;
  return (
    <>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id={fill} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={BrandColors.tileTop} />
            <Stop offset="1" stopColor={BrandColors.tileBottom} />
          </LinearGradient>
        </Defs>
        <G transform={`rotate(${TILT[name]} 60 60)`}>
          <Rect x={10} y={10} width={100} height={100} rx={22} fill={`url(#${fill})`} stroke={BrandColors.tileLine} strokeWidth={1.5} />
        </G>
      </Svg>
      <GlowShape shape={SHAPE[name]} size={Sizes.homeTile} dim={soon} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  // 한 줄의 양끝을 화면 여백에 맞춘다: 첫 아이콘의 왼쪽 끝이 머리의 표식과 같은 선에 온다.
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  // 타일의 너비는 카드와 같다. 이름은 그 가운데에 놓이고 넘쳐도 된다.
  tile: { width: Sizes.homeTile, alignItems: 'center', gap: Spacing.xs, overflow: 'visible' },
  // 카드 그림만 있고 좌우 여백은 없다. 누르는 자리는 hitSlop 으로 넓힌다.
  icon: { width: Sizes.homeTile, height: Sizes.homeTile },
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
