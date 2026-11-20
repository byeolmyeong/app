import { useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/button';
import { GlowBackdrop } from '@/components/glow';
import { Skeleton, SkeletonCard } from '@/components/skeleton';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, TimingLayout as L, type ColorName } from '@/constants/theme';
import { strings } from '@/content/strings';
import { lookup } from '@/features/reason/reason-sentence';
import { formatPeriod } from '@/features/timing/dates';
import type { TimingInterval } from '@/lib/api';

const T = strings.timing;
const H = L.hero;
const D = L.detail;
const K = L.locked;
const S = L.skeleton;

/** 시기 탭의 칩: 이번 달 · 올해 · 인생 */
export const TIMING_CHIPS = ['month', 'year', 'life'] as const;
export type TimingChip = (typeof TIMING_CHIPS)[number];

/** 영역 이름(일 · 사람 · 인연 · 나 자신 · 돈). 모르는 영역은 null — 그 줄 · 딱지를 숨긴다 */
export const areaLabel = (area: string): string | null => lookup<string>(T.areas, area) ?? null;

/** 눈여겨볼 날 · 그날의 칩 이름(사람 · 일 · 마음). 모르는 칩은 null */
export const categoryLabel = (category: string): string | null => lookup<string>(T.categories, category) ?? null;

/** 칩마다의 색(보드 14-1 의 달력 점 · 딱지 글자): 사람 옅은 보라 · 일 주색 글자 · 마음 밝은 보라(딱지 글자는 옅은 보라) */
export const CATEGORY_DOT: Record<string, ColorName> = { PEOPLE: 'keywordText', WORK: 'accentText', MIND: 'primaryBright' };
export const CATEGORY_TEXT: Record<string, ColorName> = { PEOPLE: 'keywordText', WORK: 'accentText', MIND: 'keywordText' };

/** 옅은 보라 딱지(영역 · 칩) */
export function Tag({ label, color = 'keywordText' }: { label: string; color?: ColorName }) {
  return (
    <View testID="timing-tag" style={styles.tag}>
      <Txt variant="label" color={color}>
        {label}
      </Txt>
    </View>
  );
}

/** 다른 화면으로 가는 줄의 꺾쇠 › */
export function ChevronRight({ size = L.card.chevron, color = Colors.hint }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 네 갈래 별(-1~1) */
const STAR = 'M0,-1 Q0.18,-0.18 1,0 Q0.18,0.18 0,1 Q-0.18,0.18 -1,0 Q-0.18,-0.18 0,-1Z';
const STEPS = 'M18 80 H38 V64 H56 V48 H74';

/** 시기의 그림(보드 14 · 14-3 · 14 받기 전): 옅은 빛무리 위의 계단과 별 — 브랜드 자리의 장식이라 화면 읽기에서 숨긴다 */
export function TimingArt({ size }: { size: number }) {
  const id = `timingArt${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor={BrandColors.haloCenter} stopOpacity={0.7} />
            <Stop offset="1" stopColor={BrandColors.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={48} fill={`url(#${id})`} />
        <Path d={`${STEPS} V80 Z`} fill={BrandColors.stepFill} />
        <Path d={STEPS} fill="none" stroke={BrandColors.glowSoft} strokeWidth={2.5} strokeLinejoin="round" />
        <Path transform="translate(66 30) scale(14)" d={STAR} fill={BrandColors.core} />
      </Svg>
    </View>
  );
}

/** 맨 위 "지금 나의 시기" 카드(보드 14 · 14-1 · 14-2): 대표 구간의 이름 · 영역 · 기간 · 한 줄. 누르면 시기 자세히(자세한 글이 있을 때) */
export function NowCard({ interval, onPress }: { interval: TimingInterval; onPress?: () => void }) {
  const area = areaLabel(interval.area);
  return (
    <Pressable
      testID="timing-now-card"
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={styles.hero}>
      <GlowBackdrop color={BrandColors.cardGlow} extent={H.glow.extent} centerX={H.glow.x} centerY={H.glow.y} />
      <View style={styles.heroArt}>
        <TimingArt size={H.art} />
      </View>
      <Txt variant="captionStrong" color="accentText">
        {T.now}
      </Txt>
      <Txt variant="title" keepAll style={styles.heroTitle}>
        {interval.title}
      </Txt>
      <View style={styles.meta}>
        {area ? <Tag label={area} /> : null}
        <Txt variant="desc" color="gray">
          {formatPeriod(interval.from, interval.to)}
        </Txt>
      </View>
      {interval.summary ? (
        <Txt variant="body" color="inkSoft" keepAll style={styles.summary}>
          {interval.summary}
        </Txt>
      ) : null}
    </Pressable>
  );
}

/** 칩 셋(보드 14): 고른 칩은 밝은 바탕에 어두운 글씨. 잠긴 칩(시기 풀이 전의 올해 · 인생)은 흐린 글씨이고 누르면 잠긴 자리를 보인다 */
export function ChipRow({ value, locked, onChange }: { value: TimingChip; locked: boolean; onChange: (chip: TimingChip) => void }) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={T.chipsLabel} style={styles.chips}>
      {TIMING_CHIPS.map((chip) => {
        const on = chip === value;
        const isLocked = locked && chip !== 'month';
        return (
          <Pressable
            key={chip}
            testID={`timing-chip-${chip}`}
            accessibilityRole="tab"
            accessibilityLabel={isLocked ? `${T.chips[chip]}${T.lockedSuffix}` : T.chips[chip]}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(chip)}
            style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
            <Txt variant="desc" color={on ? 'paper' : isLocked ? 'hint' : 'gray'} style={on ? styles.semibold : styles.medium}>
              {T.chips[chip]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 칸 제목(19/27)과 그 아래 한 줄 안내 */
export function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Txt variant="paragraphTitle" accessibilityRole="header" keepAll>
        {title}
      </Txt>
      {note ? (
        <Txt variant="desc" color="gray" keepAll>
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <View style={styles.badge}>
      <Txt variant="label" color="accentText" style={styles.semibold}>
        {String(n)}
      </Txt>
    </View>
  );
}

/** "이 시기의 작은 실천" 카드 셋(보드 14 · 14-1 · 14-2 · 14-3) */
export function PracticeCards({ practices }: { practices: { title: string }[] }) {
  return (
    <View>
      <SectionTitle title={T.practices} />
      <View style={styles.practices}>
        {practices.map((p, i) => (
          <View key={i} testID="timing-practice" style={styles.practice}>
            <Badge n={i + 1} />
            <Txt variant="clause" style={[styles.flex, styles.medium]} keepAll>
              {p.title}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/** 번호 붙은 할 일 줄(카드 없이 — 홈의 작은 실천 · 그날의 작은 실천, 보드 11 · 14-4) */
export function TodoList({ items }: { items: { title: string }[] }) {
  return (
    <View>
      {items.map((p, i) => (
        <View key={i} testID="timing-todo" style={styles.todo}>
          <Badge n={i + 1} />
          <Txt variant="item" color="inkSoft" style={styles.flex} keepAll>
            {p.title}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/** 구간 한 줄(지금 지나는 중 · 다가오는 시기, 보드 14): 이름 · 영역 · 기간. 자세한 글이 있는 구간만 누를 수 있고 꺾쇠가 있다 */
export function IntervalRow({ interval, meta, onPress }: { interval: TimingInterval; meta: string; onPress?: () => void }) {
  const area = areaLabel(interval.area);
  return (
    <Pressable
      testID="timing-interval"
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={styles.row}>
      <View style={styles.rowText}>
        <Txt variant="stat" keepAll>
          {interval.title}
        </Txt>
        <View style={styles.rowMeta}>
          {area ? <Tag label={area} /> : null}
          <Txt variant="caption" color="gray">
            {meta}
          </Txt>
        </View>
      </View>
      {onPress ? <ChevronRight /> : null}
    </Pressable>
  );
}

/**
 * 받기 전 이번 달 아래의 "자세한 풀이" 카드(보드 14 받기 전): 이름표 · 제목 · 설명 · "자세한 풀이 받기". 서버가 지금은 받을 수 없다고 하면
 * 버튼 위에 한 줄(결정 050 의 4). 버튼 아래에는 아무것도 두지 않는다(결정 061 의 5).
 */
export function DetailCard({ blocked, onRequest }: { blocked: boolean; onRequest: () => void }) {
  return (
    <View testID="timing-detail-card" style={styles.detail}>
      <GlowBackdrop color={BrandColors.cardGlow} extent={D.glow.extent} centerX={D.glow.x} centerY={D.glow.y} />
      <View style={styles.detailArt}>
        <TimingArt size={D.art} />
      </View>
      <Txt variant="captionStrong" color="accentText">
        {T.detail.kicker}
      </Txt>
      <Txt variant="cardTitle" keepAll style={styles.detailTitle}>
        {T.detail.title}
      </Txt>
      <Txt variant="desc" color="gray" keepAll style={styles.detailBody}>
        {T.detail.body}
      </Txt>
      {blocked ? (
        <Txt variant="caption" color="gray" style={styles.blocked}>
          {T.detail.blocked}
        </Txt>
      ) : null}
      <View style={styles.request}>
        <Button label={T.detail.request} onPress={onRequest} />
      </View>
    </View>
  );
}

/** 잠긴 자리 뒤의 흐린 모양(보드 14 잠긴 칩 — 시안의 흐림 대신 옅은 막대: 브랜드 자리 밖의 흐림은 쓰지 않는다, DESIGN.md) */
function Ghost() {
  return (
    <View aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.ghost}>
      <Skeleton width="44%" height={S.title} />
      <SkeletonCard>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={S.sub} />
        ))}
      </SkeletonCard>
      <Skeleton width="36%" height={S.title} />
      {['70%', '62%'].map((w) => (
        <SkeletonCard key={w}>
          <Skeleton width={w as `${number}%`} height={S.line} />
          <Skeleton width="40%" height={S.sub} />
        </SkeletonCard>
      ))}
    </View>
  );
}

/** 잠긴 칩을 눌렀을 때(보드 14 잠긴 칩 — 올해 · 인생 같은 모양): 그 자리에 흐린 미리보기와 자물쇠 카드 · "자세한 풀이 받기" */
export function LockedView({ chip, blocked, onRequest }: { chip: 'year' | 'life'; blocked: boolean; onRequest: () => void }) {
  const text = T.locked[chip];
  return (
    <View testID="timing-locked" style={styles.locked}>
      <Ghost />
      <View style={styles.lockedOver}>
        <View style={styles.lockedCard}>
          <View style={styles.lockIcon}>
            <Svg width={K.glyph} height={K.glyph} viewBox="0 0 24 24" fill="none">
              <Rect x={5} y={11} width={14} height={9} rx={2} stroke={Colors.accentText} strokeWidth={1.8} />
              <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={Colors.accentText} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
          </View>
          <Txt variant="paragraphTitle" keepAll style={styles.lockedTitle}>
            {text.title}
          </Txt>
          <Txt variant="desc" color="gray" keepAll style={styles.lockedBody}>
            {text.body}
          </Txt>
          {blocked ? (
            <Txt variant="caption" color="gray" style={styles.blocked}>
              {T.detail.blocked}
            </Txt>
          ) : null}
          <View style={styles.lockedButton}>
            <Button label={T.detail.request} onPress={onRequest} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** 처음 불러올 때 뼈대(보드 24 의 방식 — 시기는 같은 방식): 달 머리 · 달력 카드 · 눈여겨볼 날 둘 */
export function TimingSkeleton() {
  return (
    <View testID="timing-skeleton" style={styles.skeleton}>
      <Skeleton width="40%" height={S.head} />
      <SkeletonCard>
        <Skeleton width="100%" height={S.line} />
        <Skeleton width="100%" height={S.calendar} />
      </SkeletonCard>
      {['60%', '54%'].map((w) => (
        <SkeletonCard key={w}>
          <Skeleton width={w as `${number}%`} height={S.title} />
          <Skeleton width="36%" height={S.sub} />
        </SkeletonCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  semibold: { fontWeight: FontWeight.semibold },
  medium: { fontWeight: FontWeight.medium },
  tag: {
    height: L.tag.height,
    paddingHorizontal: L.tag.padX,
    borderRadius: L.tag.radius,
    borderWidth: LineWidth,
    borderColor: Colors.keywordLine,
    backgroundColor: Colors.keyword,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  hero: {
    overflow: 'hidden',
    marginTop: L.heroTop,
    paddingTop: H.padTop,
    paddingHorizontal: H.padX,
    paddingBottom: H.padBottom,
    borderRadius: H.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  heroArt: { position: 'absolute', right: H.artInset, top: H.artInset },
  heroTitle: { marginTop: H.titleTop, marginRight: H.titleRight },
  meta: { flexDirection: 'row', alignItems: 'center', gap: H.metaGap, marginTop: H.metaTop },
  summary: { marginTop: H.summaryTop },
  chips: { flexDirection: 'row', gap: L.chips.gap },
  chip: { flex: 1, height: L.chips.height, borderRadius: L.chips.height / 2, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: Colors.ink },
  chipOff: { backgroundColor: Colors.raised, borderWidth: LineWidth, borderColor: Colors.hair },
  sectionTitle: { gap: L.life.noteGap },
  practices: { marginTop: L.practicesTop, gap: L.practiceGap },
  practice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.card.gap,
    paddingVertical: L.card.padV,
    paddingHorizontal: L.card.pad,
    borderRadius: L.card.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  badge: {
    width: L.badge,
    height: L.badge,
    borderRadius: L.badge / 2,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todo: { flexDirection: 'row', alignItems: 'center', gap: L.card.gap, minHeight: L.day.todo },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.card.gap,
    padding: L.card.pad,
    borderRadius: L.card.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  rowText: { flex: 1, gap: L.year.itemGap },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: H.metaGap },
  detail: {
    overflow: 'hidden',
    paddingTop: D.padTop,
    paddingHorizontal: D.padX,
    paddingBottom: D.padBottom,
    borderRadius: D.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  detailArt: { position: 'absolute', right: D.artInset, top: D.artInset },
  detailTitle: { marginTop: D.titleTop, marginRight: D.titleRight },
  detailBody: { marginTop: D.bodyTop },
  blocked: { marginTop: D.buttonTop, textAlign: 'center' },
  request: { marginTop: D.buttonTop },
  locked: { height: K.height, overflow: 'hidden' },
  ghost: { gap: L.listGap, paddingTop: K.padTop, opacity: K.ghostOpacity },
  lockedOver: { ...StyleSheet.absoluteFill, justifyContent: 'center', paddingBottom: K.padBottom },
  lockedCard: {
    alignItems: 'center',
    paddingTop: K.cardPadTop,
    paddingHorizontal: K.cardPadX,
    paddingBottom: K.cardPadBottom,
    borderRadius: D.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: K.fill,
  },
  lockIcon: { width: K.icon, height: K.icon, borderRadius: K.icon / 2, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { marginTop: K.titleTop, textAlign: 'center' },
  lockedBody: { marginTop: K.bodyTop, textAlign: 'center' },
  lockedButton: { alignSelf: 'stretch', marginTop: K.buttonTop },
  skeleton: { gap: L.listGap, paddingTop: L.contentTop },
});
