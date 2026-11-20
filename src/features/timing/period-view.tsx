import { StyleSheet, View } from 'react-native';

import { GlowBackdrop } from '@/components/glow';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, ReasonLayout, TimingLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ReasonLine } from '@/features/reason/reason-line';
import { formatMonthOnly, formatPeriod, periodNow } from '@/features/timing/dates';
import { Skeleton, SkeletonGroup, SkeletonText } from '@/components/skeleton';
import { PracticeCards, PracticeCardsSkeleton, SkBlock, Tag, TimingArt, areaLabel } from '@/features/timing/timing-parts';
import type { Chart, TimingDetail, TimingInterval } from '@/lib/api';

const T = strings.timing;
const H = L.hero;
const P = L.period;
const SECTIONS: (keyof TimingDetail)[] = ['changes', 'howTo', 'after'];

/** 시작 ~ 끝 줄(보드 14-3): 지나온 만큼 주색, 남은 만큼 옅은 선. "지금" 자리는 점만 — 숫자를 적지 않는다(결정 049 의 5) */
function Track({ interval, today }: { interval: TimingInterval; today: string }) {
  const now = periodNow(interval.from, interval.to, today);
  // 아직 시작 전이면 비어 있고, 끝났으면 다 찬다
  const filled = now ?? (today > interval.to ? 1 : 0);
  return (
    <View>
      <View testID="period-track" style={styles.track}>
        <View style={styles.trackLine} />
        <View style={[styles.trackFill, { width: `${filled * 100}%` }]} />
        <View style={[styles.trackDot, styles.trackStart]} />
        <View style={[styles.trackDot, styles.trackEnd]} />
        {now !== null ? <View testID="period-now" style={[styles.trackNow, { left: `${now * 100}%` }]} /> : null}
      </View>
      <View style={styles.labels}>
        <Txt variant="badge" color="hint" style={[styles.regular, styles.labelStart]}>
          {`${formatMonthOnly(interval.from)}${T.period.start}`}
        </Txt>
        {now !== null ? (
          <View style={[styles.nowLabel, { left: `${now * 100}%` }]}>
            <Txt variant="badge">{T.period.now}</Txt>
          </View>
        ) : null}
        <Txt variant="badge" color="hint" style={[styles.regular, styles.labelEnd]}>
          {`${formatMonthOnly(interval.to)}${T.period.end}`}
        </Txt>
      </View>
    </View>
  );
}

/**
 * 시기 자세히(결정 049 의 5, 캔버스 14-3): 머리 카드(지금 지나는 중 · 다가오는 시기 딱지 · 이름 · 영역 · 기간 · 시작 ~ 끝 줄의 "지금") ·
 * 이렇게 풀이한 이유(지나가는 별 — 작은 지도 없음, 결정 054 의 4) · 01 무엇이 달라지나요 · 02 이렇게 지내 보세요 · 03 이 시기가 지나면 · 작은 실천.
 */
export function PeriodView({ interval, detail, today, chart }: { interval: TimingInterval; detail: TimingDetail; today: string; chart: Chart | null }) {
  const area = areaLabel(interval.area);
  const badge = interval.from <= today && today <= interval.to ? T.period.ongoing : interval.from > today ? T.period.upcoming : null;
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View testID="period-hero" style={styles.hero}>
          <GlowBackdrop color={BrandColors.cardGlow} extent={H.glow.extent} centerX={H.glow.x} centerY={H.glow.y} />
          <View style={styles.heroArt}>
            <TimingArt size={H.art} />
          </View>
          {badge ? (
            <View style={[styles.badge, badge === T.period.upcoming && styles.badgeSoft]}>
              <Txt variant="label" style={styles.semibold}>
                {badge}
              </Txt>
            </View>
          ) : null}
          <Txt variant="title" keepAll style={styles.title}>
            {interval.title}
          </Txt>
          <View style={styles.meta}>
            {area ? <Tag label={area} /> : null}
            <Txt variant="desc" color="gray">
              {formatPeriod(interval.from, interval.to)}
            </Txt>
          </View>
          <View style={styles.trackTop}>
            <Track interval={interval} today={today} />
          </View>
        </View>
        {interval.reason ? (
          <View testID="period-reason">
            <ReasonLine reason={interval.reason} chart={chart} />
          </View>
        ) : null}
      </View>
      {SECTIONS.map((key) => (
        <View key={key} testID="period-section">
          <Txt variant="label" color="primaryBright" style={styles.number}>
            {T.period.numbers[key]}
          </Txt>
          <Txt variant="paragraphTitle" accessibilityRole="header" keepAll style={styles.sectionTitle}>
            {T.period.sections[key]}
          </Txt>
          <Txt variant="paragraph" color="inkSoft" keepAll style={styles.sectionBody}>
            {detail[key]}
          </Txt>
        </View>
      ))}
      {interval.practices ? <PracticeCards practices={interval.practices} /> : null}
    </View>
  );
}

/** 시기 자세히의 뼈대(결정 071): 머리 카드(딱지 · 이름 두 줄 · 영역과 기간 · 시작 ~ 끝 줄) · 이유 상자 · 01 ~ 03 · 작은 실천 셋 */
export function PeriodSkeleton() {
  return (
    <SkeletonGroup testID="period-skeleton">
      <View style={styles.root}>
      <View style={styles.head}>
        <SkBlock of="period-hero" style={styles.hero}>
          <Skeleton width={P.badgeBar} height={L.tag.height} pill />
          <View style={styles.title}>
            <SkeletonText widths={['90%']} variant="title" />
            <SkeletonText widths={['44%']} variant="title" />
          </View>
          <View style={styles.meta}>
            <Skeleton width={L.skeleton.tag} height={L.tag.height} pill />
            <SkeletonText widths={['44%']} variant="desc" />
          </View>
          <View style={styles.trackTop}>
            <View style={styles.track}>
              <View style={styles.trackLine} />
            </View>
            <View style={styles.labels} />
          </View>
        </SkBlock>
        <SkBlock of="period-reason" style={styles.reasonBox}>
          <SkeletonText widths={['28%']} variant="label" />
          {/* 이유 문장은 한 글 안의 두 줄 — 줄 사이 틈 없이 */}
          <View>
            <SkeletonText widths={['96%']} variant="reason" />
            <SkeletonText widths={['40%']} variant="reason" />
          </View>
        </SkBlock>
      </View>
      {/* 줄 수는 시안 14-3 의 글(세 줄 · 두 줄 · 두 줄) */}
      {SECTIONS.map((key, n) => (
        <SkBlock key={key} of="period-section">
          <SkeletonText widths={[P.numberBar]} variant="label" />
          <SkeletonText widths={['44%']} variant="paragraphTitle" style={styles.sectionTitle} />
          <View style={styles.sectionBody}>
            <SkeletonText widths={['100%']} variant="paragraph" />
            {n === 0 ? <SkeletonText widths={['96%']} variant="paragraph" /> : null}
            <SkeletonText widths={['38%']} variant="paragraph" />
          </View>
        </SkBlock>
      ))}
      <PracticeCardsSkeleton />
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  root: { gap: L.sectionGap, paddingTop: P.top },
  head: { gap: P.reasonGap },
  regular: { fontWeight: FontWeight.regular },
  semibold: { fontWeight: FontWeight.semibold },
  hero: {
    overflow: 'hidden',
    paddingTop: H.padTop,
    paddingHorizontal: H.padX,
    paddingBottom: H.padBottom,
    borderRadius: H.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  heroArt: { position: 'absolute', right: H.artInset, top: H.artInset },
  badge: {
    alignSelf: 'flex-start',
    height: L.tag.height,
    paddingHorizontal: P.badgePadX,
    borderRadius: L.tag.radius,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
  },
  badgeSoft: { backgroundColor: Colors.hair },
  title: { marginTop: P.titleTop, marginRight: H.titleRight },
  meta: { flexDirection: 'row', alignItems: 'center', gap: H.metaGap, marginTop: H.metaTop },
  trackTop: { marginTop: P.trackTop },
  track: { height: P.track, marginHorizontal: P.trackInset },
  trackLine: { position: 'absolute', left: 0, right: 0, top: (P.track - LineWidth * 2) / 2, height: LineWidth * 2, backgroundColor: Colors.hair },
  trackFill: { position: 'absolute', left: 0, top: (P.track - LineWidth * 2) / 2, height: LineWidth * 2, backgroundColor: Colors.primary },
  trackDot: { position: 'absolute', top: (P.track - P.dot) / 2, width: P.dot, height: P.dot, borderRadius: P.dot / 2 },
  trackStart: { left: -P.trackInset, backgroundColor: Colors.primaryBright },
  trackEnd: { right: -P.trackInset, backgroundColor: Colors.muted },
  trackNow: {
    position: 'absolute',
    top: 0,
    width: P.now,
    height: P.now,
    marginLeft: -P.now / 2,
    borderRadius: P.now / 2,
    backgroundColor: BrandColors.core,
    boxShadow: `0 0 10px ${Colors.primary}`,
  },
  labels: { marginTop: P.labelsTop, height: P.labels },
  labelStart: { position: 'absolute', left: 0 },
  labelEnd: { position: 'absolute', right: 0 },
  nowLabel: { position: 'absolute', width: H.art, marginLeft: P.trackInset - H.art / 2, alignItems: 'center' },
  number: { fontWeight: FontWeight.semibold, letterSpacing: L.period.numberTracking },
  /** 이유 상자의 뼈대 — ReasonLine(접힌 상자)의 여백 · 모서리 그대로 */
  reasonBox: {
    gap: ReasonLayout.textGap,
    paddingTop: ReasonLayout.padTop,
    paddingRight: ReasonLayout.padRight,
    paddingBottom: ReasonLayout.padBottom,
    paddingLeft: ReasonLayout.padLeft,
    borderRadius: ReasonLayout.radius,
    backgroundColor: Colors.raised,
  },
  sectionTitle: { marginTop: P.sectionTitleTop },
  sectionBody: { marginTop: P.sectionBodyTop },
});
