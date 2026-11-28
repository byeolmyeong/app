/**
 * 홈 메뉴판(결정 102 의 1, 시안 "홈 (1.1.0)" A): 세 카드는 같은 뼈대 — 작은 분류 · 질문 제목 · 메뉴.
 * 나 · 나의 시기는 아이콘 격자(한 줄에 셋), 나의 사람들은 한 줄에 하나씩(아이콘 · 이름 · 한 줄 · 꺾쇠).
 * 아이콘은 선으로 그린 작은 것(시안의 선 1.8), 주색 계열 한 색 — 궁합 두 줄만 별 지도의 사이 색(연애 분홍 · 친구 하늘).
 * 아이콘은 장식이라 화면 읽기에서 숨기고, 메뉴 이름이 읽힌다. 어디로 가는지는 화면(app/index)이 정한다.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, HomeMenuLayout as L, LineWidth, RelationColors } from '@/constants/theme';

/** 메뉴 아이콘 — 시안의 24 칸 그림 그대로 */
export type HomeMenuIcon =
  | 'nickname'
  | 'personality'
  | 'love'
  | 'relationship'
  | 'work'
  | 'emotion'
  | 'month'
  | 'year'
  | 'life'
  | 'synastryLove'
  | 'synastryFriend';

const HEART = 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z';

/** 아이콘마다 그 색과 그림(선의 굵기 · 끝은 Icon 이 준다). 채운 점은 그 색으로 채운다 */
const ICONS: Record<HomeMenuIcon, { color: string; draw: (color: string) => ReactNode }> = {
  nickname: { color: Colors.accentText, draw: () => <Path d="M12 3.5Q13.4 10.6 20.5 12Q13.4 13.4 12 20.5Q10.6 13.4 3.5 12Q10.6 10.6 12 3.5Z" /> },
  personality: {
    color: Colors.accentText,
    draw: () => (
      <>
        <Circle cx={12} cy={12} r={8.5} />
        <Path d="M8.8 14.2c1.8 1.8 4.6 1.8 6.4 0" />
        <Path d="M9 9.8v.4M15 9.8v.4" />
      </>
    ),
  },
  love: { color: Colors.accentText, draw: () => <Path d={HEART} /> },
  relationship: {
    color: Colors.accentText,
    draw: () => (
      <>
        <Circle cx={9} cy={8.5} r={3} />
        <Path d="M3.5 19.5c0-3.2 2.5-5.7 5.5-5.7s5.5 2.5 5.5 5.7" />
        <Circle cx={16.5} cy={9.5} r={2.5} />
        <Path d="M16 14c2.6.2 4.5 2.4 4.5 5" />
      </>
    ),
  },
  work: {
    color: Colors.accentText,
    draw: () => (
      <>
        <Rect x={3.5} y={7.5} width={17} height={12} rx={2.5} />
        <Path d="M9 7.5V6a1.8 1.8 0 0 1 1.8-1.8h2.4A1.8 1.8 0 0 1 15 6v1.5M3.5 12.5h17" />
      </>
    ),
  },
  emotion: { color: Colors.accentText, draw: () => <Path d="M12 3.8c3.2 4.1 6 7.2 6 10.6a6 6 0 0 1-12 0c0-3.4 2.8-6.5 6-10.6z" /> },
  month: {
    color: Colors.accentText,
    draw: () => (
      <>
        <Rect x={4} y={5.5} width={16} height={14.5} rx={2.5} />
        <Path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" />
      </>
    ),
  },
  year: {
    color: Colors.accentText,
    draw: (color) => (
      <>
        <Circle cx={12} cy={12} r={8} />
        <Circle cx={12} cy={12} r={2} />
        <Circle cx={12} cy={4} r={1.6} fill={color} />
      </>
    ),
  },
  life: {
    color: Colors.accentText,
    draw: (color) => (
      <>
        <Path d="M4 19c4 0 3-6 8-6s4-6 8-6" />
        <Circle cx={4} cy={19} r={1.6} fill={color} />
        <Circle cx={20} cy={7} r={1.6} fill={color} />
      </>
    ),
  },
  // 하트 둘(시안: 0.72 배로 줄여 겹친다 — 선 굵기는 그대로)
  synastryLove: {
    color: RelationColors.LOVE,
    draw: () => (
      <>
        <Path transform="translate(0.5 3.5) scale(0.72)" vectorEffect="non-scaling-stroke" d={HEART} />
        <Path transform="translate(6.5 0.5) scale(0.72)" vectorEffect="non-scaling-stroke" d={HEART} />
      </>
    ),
  },
  // 말풍선 둘
  synastryFriend: {
    color: RelationColors.FRIEND,
    draw: () => (
      <>
        <Path d="M3.5 6.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H8.5L5.5 15.5v-2.6a2 2 0 0 1-2-1.9z" />
        <Path d="M17 9h1.5a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 1.9v2.6l-3-2.5H12a2 2 0 0 1-2-2" />
      </>
    ),
  },
};

function Icon({ name }: { name: HomeMenuIcon }) {
  const { color, draw } = ICONS[name];
  return (
    <Svg
      testID={`home-menu-icon-${name}`}
      width={L.grid.icon}
      height={L.grid.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      {draw(color)}
    </Svg>
  );
}

/** 카드 하나: 작은 분류 · 질문 제목 · 메뉴 */
export function HomeMenuCard({ testID, eyebrow, title, children }: { testID: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <View testID={testID} style={styles.card}>
      <Txt variant="captionStrong" color="hint">
        {eyebrow}
      </Txt>
      <Txt variant="section" accessibilityRole="header" keepAll style={styles.title}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

export type HomeMenuGridItem = { key: string; label: string; icon: HomeMenuIcon; onPress: () => void };

/** 아이콘 격자 — 한 줄에 셋. 칸마다 아이콘 칸과 그 아래 이름 */
export function HomeMenuGrid({ items }: { items: HomeMenuGridItem[] }) {
  return (
    <View testID="home-menu-grid" style={styles.grid}>
      {items.map((item) => (
        <Pressable key={item.key} testID="home-menu-item" accessibilityRole="button" accessibilityLabel={item.label} onPress={item.onPress} style={styles.item}>
          <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.box}>
            <Icon name={item.icon} />
          </View>
          <Txt variant="table" color="inkSoft">
            {item.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

export type HomeMenuRowItem = { key: string; title: string; body: string; icon: HomeMenuIcon; onPress: () => void };

/** 한 줄에 하나씩 — 아이콘 · 이름과 한 줄 · 꺾쇠 */
export function HomeMenuList({ items }: { items: HomeMenuRowItem[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable key={item.key} testID="home-menu-row" accessibilityRole="button" onPress={item.onPress} style={styles.row}>
          <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.rowBox}>
            <Icon name={item.icon} />
          </View>
          <View style={styles.rowText}>
            <Txt variant="subhead">{item.title}</Txt>
            <Txt variant="caption" color="gray" keepAll>
              {item.body}
            </Txt>
          </View>
          <Svg width={L.list.chevron} height={L.list.chevron} viewBox="0 0 24 24" fill="none">
            <Path d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: L.card.padTop,
    paddingHorizontal: L.card.padX,
    paddingBottom: L.card.padBottom,
    borderRadius: L.card.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  title: { marginTop: L.card.titleTop },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: L.grid.top, rowGap: L.grid.rowGap, columnGap: L.grid.columnGap },
  /** 한 줄에 셋 — 셋째 칸까지 한 줄에 들어가는 바탕 폭(30%)에서 칸 사이를 뺀 나머지를 똑같이 나눈다 */
  item: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: L.grid.itemGap },
  box: { width: L.grid.box, height: L.grid.box, borderRadius: L.grid.boxRadius, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' },
  list: { marginTop: L.list.top, gap: L.list.gap },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.list.iconGap,
    minHeight: L.list.row,
    marginHorizontal: -L.list.padH,
    paddingVertical: L.list.padV,
    paddingHorizontal: L.list.padH,
    borderRadius: L.list.radius,
  },
  rowBox: { width: L.list.box, height: L.list.box, borderRadius: L.list.boxRadius, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: L.list.textGap },
});
